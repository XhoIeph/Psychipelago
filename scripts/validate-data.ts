/**
 * 数据校验：schema + 引用完整性 + 隐私红线。
 * prebuild 阶段运行，任何错误都会让 next build 失败（CI 同样拦截）。
 */
import {
  doctorsFileSchema,
  disordersFileSchema,
  hospitalsFileSchema,
  provincesFileSchema,
  reportsFileSchema,
} from '../lib/schema.ts'
import { CURATED_FILES, readJson } from './lib/paths.ts'
import { existsSync } from 'node:fs'
import { isDeepStrictEqual } from 'node:util'
import { reportsWithLocations, doctorsWithLocations, hospitalsWithOverrides, SOURCE_CAPTURE } from './import-kdocs.ts'
import type { SourceDocument } from './import-kdocs.ts'
import { applyOverrides, loadOverrides } from './lib/overrides.ts'
import type { OverrideKind } from './lib/overrides.ts'
import type { Hospital, Report } from '../lib/schema.ts'

const errors: string[] = []
// 覆盖层的问题单独一栏并先打印：一个写坏的覆盖文件会让后面所有「与转写不一致」的比对一起红，
// 那些红是它的回声，不是新问题。先让人修这一处，比在一长串输出里找它有用。
const overrideErrors: string[] = []
const warnings: string[] = []

function parseOrReport<T extends { safeParse: (value: unknown) => { success: boolean; error?: unknown; data?: unknown } }>(
  label: string,
  schema: T,
  value: unknown,
): unknown {
  const result = schema.safeParse(value)
  if (!result.success) {
    const issues = (result.error as { issues?: Array<{ path: Array<string | number>; message: string }> })
      ?.issues ?? []
    for (const issue of issues.slice(0, 40)) {
      errors.push(`${label} → ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    }
    return null
  }
  return result.data
}

const disordersRaw = readJson<unknown>(CURATED_FILES.disorders)
const hospitalsRaw = readJson<unknown>(CURATED_FILES.hospitals)
const doctorsRaw = readJson<unknown>(CURATED_FILES.doctors)
const reportsRaw = readJson<unknown>(CURATED_FILES.reports)
const provincesRaw = readJson<unknown>(CURATED_FILES.provinces)

function rejectPrivateFields(value: unknown, path: string): void {
  if (!value || typeof value !== 'object') return
  for (const [key, child] of Object.entries(value)) {
    if (/^(?:author_(?:uid|nickname|alias)|parent_author|reply_to_author|ip_location|xsec_token)$/u.test(key)) {
      errors.push(`${path}.${key}: 公开数据不得包含私人标识`)
    }
    rejectPrivateFields(child, `${path}.${key}`)
  }
}
for (const [name, value] of Object.entries({ hospitals: hospitalsRaw, doctors: doctorsRaw, reports: reportsRaw })) {
  rejectPrivateFields(value, name)
}

const disorders = parseOrReport('disorders.json', disordersFileSchema, disordersRaw) as
  | { items: Array<Record<string, unknown>> }
  | null
const hospitals = parseOrReport('hospitals.json', hospitalsFileSchema, hospitalsRaw) as
  | { items: Array<Record<string, unknown>> }
  | null
const doctors = parseOrReport('doctors.json', doctorsFileSchema, doctorsRaw) as
  | { items: Array<Record<string, unknown>> }
  | null
const reports = parseOrReport('reports.json', reportsFileSchema, reportsRaw) as
  | { items: Array<Record<string, unknown>> }
  | null
const provinces = parseOrReport('provinces.json', provincesFileSchema, provincesRaw) as
  | { items: Array<Record<string, unknown>> }
  | null

// 快照只留在本地做保真重放，不进仓库：原表地址与表名都不外流。
// 本地没有快照时明说这次没做重放，不能静默当成通过。
const sourceDocument = existsSync(SOURCE_CAPTURE) ? readJson<SourceDocument>(SOURCE_CAPTURE) : null
if (!sourceDocument) console.log('保真重放跳过：本地无快照')
const sourceStructureValid = !!sourceDocument && Array.isArray(sourceDocument.sheets) &&
  sourceDocument.sheets.length > 0 &&
  sourceDocument.sheets.every((sheet, index) => sheet.index === index && sheet.values.length >= 2)
if (sourceDocument && !sourceStructureValid) {
  errors.push('来源转写必须按工作表顺序包含表头与全部数据行')
}
// 覆盖层：人工改动只能经由 data/overrides 表达。比对基准因此是「源推导结果 + 覆盖层」，
// 判据一点没松——覆盖层之外多出来的差异，仍然是手改。
const overrides = loadOverrides()
overrideErrors.push(...overrides.errors)
function withOverrides<T extends Record<string, unknown>>(kind: OverrideKind, items: T[]): T[] {
  const applied = applyOverrides(kind, items, overrides.byKind[kind])
  overrideErrors.push(...applied.errors)
  return applied.items as T[]
}

// 转写结构不成立时无法重放解析，只报结构错误，避免用残缺来源继续比对。
if (sourceDocument && sourceStructureValid && reports && !isDeepStrictEqual(reports.items, withOverrides('reports', reportsWithLocations(sourceDocument)))) {
  errors.push('reports.json 与主线表格转写不一致；请运行 node scripts/import-kdocs.ts，不能恢复旧源或手改引文')
}
// 机构清单与烘焙走同一个函数：覆盖层之后还要补人工选定的坐标，
// 两边各拼一次迟早会漂，漂出来的差异会伪装成「有人手改数据」。
const expectedHospitals = hospitalsWithOverrides(items => withOverrides('hospitals', items)) ?? []
if (hospitals && !isDeepStrictEqual(hospitals.items, expectedHospitals)) errors.push('hospitals.json 与本轮高德定位依据不一致，不能恢复退役机构或手改坐标')
if (sourceDocument && sourceStructureValid && doctors && reports &&
  !isDeepStrictEqual(doctors.items, withOverrides('doctors', doctorsWithLocations(sourceDocument, reports.items as Report[])))) {
  errors.push('doctors.json 与主线表格里的诊室、备注、评价不一致；请运行 node scripts/import-kdocs.ts，不能手改医生档案')
}

if (disorders && hospitals && doctors && reports && provinces) {
  const disorderIds = new Set(disorders.items.map((item) => String(item.id)))
  const hospitalIds = new Set(hospitals.items.map((item) => String(item.id)))
  const doctorIds = new Set(doctors.items.map((item) => String(item.id)))
  const adcodes = new Set(provinces.items.map((item) => String(item.adcode)))

  const visibleDisorders = disorders.items.filter((item) => item.visible === true)
  if (visibleDisorders.length === 0) errors.push('disorders.json: 至少要有一个 visible=true 的疾病条目')

  const seenHospitalIds = new Set<string>()
  for (const hospital of hospitals.items) {
    const id = String(hospital.id)
    if (seenHospitalIds.has(id)) errors.push(`hospitals.json: id 重复 → ${id}`)
    seenHospitalIds.add(id)
    const adcode = String(hospital.adcode)
    if (!adcodes.has(adcode)) {
      errors.push(`hospitals.json → ${id}: adcode ${adcode} 不在 provinces.json 中`)
    }
    if (Array.isArray(hospital.official_sources) && hospital.official_sources.length === 0) {
      warnings.push(`hospitals.json → ${id}: 没有官方来源，站点会以「未知」呈现其创伤服务能力`)
    }
  }

  const seenDoctorIds = new Set<string>()
  for (const doctor of doctors.items) {
    const id = String(doctor.id)
    if (seenDoctorIds.has(id)) errors.push(`doctors.json: id 重复 → ${id}`)
    seenDoctorIds.add(id)
    if (!hospitalIds.has(String(doctor.hospital_id))) {
      errors.push(`doctors.json → ${id}: hospital_id ${String(doctor.hospital_id)} 不存在`)
    }
  }

  const seenReportIds = new Set<string>()
  for (const report of reports.items) {
    const id = String(report.id)
    if (seenReportIds.has(id)) errors.push(`reports.json: id 重复 → ${id}`)
    seenReportIds.add(id)

    if (report.hospital_id && !hospitalIds.has(String(report.hospital_id))) {
      errors.push(`reports.json → ${id}: hospital_id ${String(report.hospital_id)} 不存在`)
    }
    if (report.doctor_id && !doctorIds.has(String(report.doctor_id))) {
      errors.push(`reports.json → ${id}: doctor_id ${String(report.doctor_id)} 不存在`)
    }

    // 链接与抓取同源的互检只在真有公开原帖时成立：表格摘录类线索没有原帖，两个字段都不写。
    const rawSourceUrl = typeof report.source_url === 'string' ? report.source_url : ''
    const sourceNoteId = rawSourceUrl ? new URL(rawSourceUrl).pathname.split('/').filter(Boolean).at(-1) : undefined
    const recordNoteId = typeof report.source_post_id === 'string'
      ? report.source_post_id.split('#')[0]
      : undefined
    if (sourceNoteId && recordNoteId && recordNoteId !== sourceNoteId) {
      errors.push(`reports.json → ${id}: source_post_id 与 source_url 指向不同原帖`)
    }
    const captureScope = (report.evidence_context as { capture_scope?: string } | undefined)?.capture_scope
    const capturedNoteId = typeof captureScope === 'string'
      ? captureScope.match(/(?:xiaohongshu|comments)[\\/]([0-9a-f]{24})(?:[\\/\\.]|$)/)?.[1]
      : undefined
    if (sourceNoteId && capturedNoteId && capturedNoteId !== sourceNoteId) {
      errors.push(`reports.json → ${id}: 证据截图或评论抓取与 source_url 指向不同原帖`)
    }

    const reportDisorders = Array.isArray(report.disorders) ? report.disorders : []
    for (const disorder of reportDisorders) {
      if (!disorderIds.has(String(disorder))) {
        errors.push(`reports.json → ${id}: 未知疾病条目 ${String(disorder)}`)
      }
    }

    const verification = report.verification as { level?: string } | undefined
    if (verification?.level === 'official' && !report.hospital_id) {
      warnings.push(`reports.json → ${id}: 标记 official 但没有关联医院，建议补充 hospital_id`)
    }

    // 上下文完整性：评论来源的线索必须有「有意义的上下文」，否则必须显式标 context_incomplete
    if (report.evidence_source === 'comment') {
      const ctx = report.evidence_context as
        | { note_title?: string; parent_excerpt?: string; is_reply?: boolean }
        | undefined
      const meaningful = !!ctx && (!!ctx.note_title || !!ctx.parent_excerpt || ctx.is_reply !== undefined)
      if (!meaningful && report.context_incomplete !== true) {
        errors.push(
          `reports.json → ${id}: 评论来源但缺少有意义的 evidence_context（note_title / parent_excerpt / is_reply 至少一项），且未标 context_incomplete`,
        )
      }
    }

    // 占位名不得建立机构关联（2026-09-11 曾把「全国DBT基地名单」当成一家机构登记）
    const PLACEHOLDER_NAME = /未点名|名单|线索|待核实|某精神|某脑科|某顶级/
    const rawName = typeof report.hospital_name_raw === 'string' ? report.hospital_name_raw : ''
    if (rawName && PLACEHOLDER_NAME.test(rawName) && report.hospital_id) {
      errors.push(`reports.json → ${id}: hospital_name_raw 为占位名（${rawName}）却关联了 hospital_id`)
    }

    const flags = report.flags as
      | { contains_minor?: boolean; contains_selfharm_detail?: boolean }
      | undefined
    const status = String(report.status)
    if (flags?.contains_minor && status === 'published') {
      errors.push(`reports.json → ${id}: 涉及未成年人，status 必须是 withheld 或 removed`)
    }
    if (flags?.contains_selfharm_detail && status === 'published') {
      errors.push(`reports.json → ${id}: 含自伤细节，status 必须是 withheld 或 removed`)
    }
    if (status === 'published' && !report.evidence_quote) {
      errors.push(`reports.json → ${id}: 已发布线索必须有原文引文`)
    }
  }

  const published = reports.items.filter((item) => item.status === 'published').length
  console.log(
    `✓ 数据校验通过：疾病 ${disorders.items.length}、医院 ${hospitals.items.length}、医生 ${doctors.items.length}、线索 ${reports.items.length}（已发布 ${published}）、省级行政区 ${provinces.items.length}`,
  )
}

if (overrideErrors.length > 0) {
  console.error(`\n✗ 覆盖层有 ${overrideErrors.length} 个问题，先修这些再跑校验：`)
  for (const error of overrideErrors) console.error(`  - ${error}`)
}

if (warnings.length > 0) {
  console.log(`\n⚠ ${warnings.length} 条提醒：`)
  for (const warning of warnings) console.log(`  - ${warning}`)
}

if (errors.length > 0) {
  console.error(`\n✗ 发现 ${errors.length} 个错误：`)
  for (const error of errors) console.error(`  - ${error}`)
}

if (errors.length > 0 || overrideErrors.length > 0) process.exit(1)
