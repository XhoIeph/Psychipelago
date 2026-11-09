/**
 * 主线来源转写：KDocs 电子表格（工作表逐行，一名医生一行）。
 * 地区与医院名以合并单元格的形式只在段首填写，其余行留空继承，因此必须先向下填充。
 */
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import type { Doctor, Report } from '../lib/schema.ts'
import { doctorsFileSchema, reportsFileSchema } from '../lib/schema.ts'
import { CURATED_FILES, readJson, writeJson } from './lib/paths.ts'
import { LOCATION_EVIDENCE, linkLocationReports } from './lib/amap.ts'
import type { LocationRun } from './lib/amap.ts'

export const SOURCE_URL = 'https://www.kdocs.cn/l/cp3b7ToQAl3J'
export const SOURCE_TITLE = '副本就诊地图10.25repo添加中'
export const SOURCE_CAPTURE = 'data/evidence/kdocs/2026-11-09/document.json'

export type SourceMerge = { r1: number; c1: number; r2: number; c2: number }
export type SourceSheet = { index: number; name: string; rows: number; cols: number; values: string[][]; merges?: SourceMerge[] }
export type SourceDocument = {
  title: string
  url: string
  captured_at: string
  /** 表格自身的最后修改时间；重抓时与 captured_at 一起写入，便于判断快照是否落后于线上 */
  document_updated_at?: string
  office_type: string
  reading_method: string
  sheets: SourceSheet[]
}

const SHEET_DISORDERS: Record<string, Report['disorders']> = {
  cptsd: ['cptsd'],
  'osdd-did': ['osdd', 'did'],
  人格障碍: ['pd'],
}

/** 姓名格里的状态附注（触发风险、目前已离职等），与姓名分开保存。 */
const NAME_ANNOTATION = /[（(]([^）)]*)[）)]/gu

/** 科室、团队、专病门诊等非个人条目，不能当成医生。 */
const NON_PERSON = /团队|课题组|专家会诊|专病门诊|会诊$|门诊$/u

/** 句子级说明（科室介绍）会被当成线索正文，而不是医生姓名。 */
const SENTENCE = /[。；，、]/u

/** 「诊断：」「费用：」之类的正文前缀不是署名，剥署名时必须跳过。 */
const LABEL_PREFIX = /^(?:诊断|结论|结果|费用|价格|挂号|注意|补充|更新|回复|地址|电话|时间|门诊|备注|提示)$/u

function clip(text: string, limit: number): string {
  if (text.length <= limit) return text
  return `${text.slice(0, limit - 1).trimEnd()}…`
}

/** 一句话里出现这些字，说明是发言而不是昵称。 */
const SPEECH_SIGNAL = /[有没会在要需想觉看挂诊治药医院反馈评情问好差推荐建议]/u

/** 纯状态附注（「（特需）」「（退休）」）：属于这一行，但不是一条发言。 */
function isAnnotationOnly(line: string): boolean {
  return /^（[^）]{1,20}）$/u.test(line)
}

/** 评价格里的引用符号、日期戳、残留署名：切段前先剔掉，免得它们各占一条线索。 */
function isNoise(line: string): boolean {
  if (!/[\u4e00-\u9fff]/u.test(line) && !/\p{Script=Latin}/u.test(line)) return true
  if (/^[^\s：:]{1,20}[：:]\s*$/u.test(line)) return true
  return line.length <= 12 && !SPEECH_SIGNAL.test(line)
}

/** 去掉评价单元格里的署名行、论坛引用树前缀与包裹引号，不保留任何作者标识。 */
export function cleanEvaluation(raw: string): string {
  const lines = raw.replace(/\r\n?/gu, '\n').split('\n')
  const kept: string[] = []
  for (const source of lines) {
    let line = source.trim().replace(/^"+(.*?)"+$/u, '$1').trim()
    // 论坛引用树：└ [09-18] [建设全国就诊地图] 昵称: 回复 对象 : 正文
    line = line.replace(/^└\s*(?:\[[^\]]*\]\s*)*(?:[^\s：:]{1,20})\s*[：:]\s*回复\s*(?:[^：:\n]{1,20})\s*[:：]\s*/u, '').trim()
    if (!line) continue
    // 独占一行的署名：匿名：/ momo：/ Kennie:
    if (/^[^\s：:，。！？]{1,20}\s*[：:]$/u.test(line)) continue
    const leading = line.match(/^([^\s：:，。！？]{1,20})\s*[：:]\s*(.+)$/u)
    if (leading && !LABEL_PREFIX.test(leading[1])) line = leading[2].trim()
    kept.push(line)
  }
  // 首行是裸昵称（工作室名、ID）时丢弃：真句子会含动词或医学名词。
  if (kept.length > 1 && kept[0].length <= 12 && !SPEECH_SIGNAL.test(kept[0])) {
    kept.shift()
  }
  return kept.join('\n').replace(/\n{3,}/gu, '\n\n').trim()
}

function splitName(cell: string): { name: string; annotations: string[] } {
  const annotations = [...cell.matchAll(NAME_ANNOTATION)].map(match => match[1].trim()).filter(Boolean)
  const name = cell.replace(NAME_ANNOTATION, '').replace(/\s+/gu, ' ').trim()
    .replace(/\s*等$/u, '').replace(/医生$/u, '').trim()
  return { name, annotations }
}

export type SourceRow = {
  reportId: string
  sheet: string
  /** Excel 行号（1 起，含表头） */
  row: number
  region: string
  hospital: string
  department: string
  /** 姓名格里的个人姓名，非个人条目为空 */
  doctor: string
  /** 这条线索应记的全部医生姓名：默认就是姓名格里的人，人工修正行会补上被评价点到的人 */
  doctors: string[]
  /** 姓名格里不是个人的内容（团队、专家会诊、科室介绍），保留为原文 */
  label: string
  /** 姓名格里的状态附注（「（特需）」「（退休）」），单独存放，切段时挂到同一行的发言上 */
  annotation: string
  /** 备注 */
  note: string
  /** 剥离署名后的评价正文 */
  evaluation: string
  disorders: Report['disorders']
}

/**
 * 合并单元格在 xlsx 里只有左上角带值，其余格子是空的。
 * 这里还原出「每个被合并覆盖的格应该显示成什么」，用来区分「inherit 自上面一格」与「本来就没写」。
 */
function mergedValues(sheet: SourceSheet): Map<string, string> {
  const inherited = new Map<string, string>()
  for (const range of sheet.merges ?? []) {
    const anchor = (sheet.values[range.r1 - 1]?.[range.c1 - 1] ?? '').trim()
    if (!anchor) continue
    for (let row = range.r1; row <= range.r2; row++) {
      for (let col = range.c1; col <= range.c2; col++) {
        if (row === range.r1 && col === range.c1) continue
        inherited.set(`${row},${col}`, anchor)
      }
    }
  }
  return inherited
}

/**
 * 把合并单元格留空的地区与医院名向下填充，并逐行分出姓名、备注与评价。
 * 报告与医生档案都由这一层推导，保证两者对同一张表的理解一致。
 *
 * 诊室只认合并单元格的继承，不按「上一行有值就沿用」推断：cptsd 表 C2:C7 是合并的六个行共用一个诊室，
 * 其余空的格子是真的没写。按上一行沿用会把上一个医生的诊室安到下一个医生头上。
 */
export function sourceRows(document: SourceDocument): SourceRow[] {
  const rows: SourceRow[] = []
  for (const sheet of document.sheets) {
    let region = ''
    let hospital = ''
    const merged = mergedValues(sheet)
    for (let index = 1; index < sheet.values.length; index++) {
      const cells = sheet.values[index].map(cell => (cell ?? '').trim())
      if (!cells.some(Boolean)) continue
      const excelRow = index + 1
      const inherited = (col: number) => merged.get(`${excelRow},${col}`) ?? ''
      if (cells[0]) region = cells[0]
      else if (inherited(1)) region = inherited(1)
      if (cells[1]) hospital = cells[1]
      else if (inherited(2)) hospital = inherited(2)
      const department = cells[2] || inherited(3)
      const nameCell = cells[3] ?? ''
      const { name, annotations } = splitName(nameCell)
      const isPerson = !!name && name.length <= 24 && !SENTENCE.test(name) &&
        !NON_PERSON.test(name) && name !== department
      const annotation = annotations.length ? `（${annotations.join('，')}）` : ''
      const reportId = `kdocs-cp3b7toqal3j-s${sheet.index + 1}-r${index + 1}`
      rows.push({
        reportId,
        sheet: sheet.name,
        row: index + 1,
        region,
        hospital,
        department,
        doctor: isPerson ? name : '',
        doctors: isPerson ? [name] : [],
        // 团队、专家会诊、科室介绍不是医生，但姓名格里是原文，要留在这一行的线索里。
        label: isPerson ? '' : name,
        annotation,
        note: (cells[4] ?? '').trim(),
        evaluation: cleanEvaluation(cells[5] ?? ''),
        disorders: SHEET_DISORDERS[sheet.name] ?? ['other'],
      })
    }
  }
  return rows
}

/**
 * 源表把同一位医生的多条发言挤在同一格、用换行分开：有的是需求方自己的经历，
 * 有的是不同署名的人对同一行的补充。并成一条会把几个人的独立发言摊成一段长文，
 * 所以每个非空行单独成线索。首行沿用单元格的 id，其余加 -p2、-p3，仍能回指同一行。
 *
 * 附注与引用符号不是发言：「（特需）」「（退休）」是姓名格里的状态，
 * 「└」「09-16」是引用树和日期戳，「朱鸿儒 课题组」是姓名格的团队名。
 * 它们挂到相邻的那一条发言上，既不丢原文，也不各自占一条内容单薄的线索。
 */
function rowSegments(row: SourceRow): string[] {
  // 姓名格里的团队名与状态附注（「黄佳团队（住院）」「（特需）」）属于这一行，
  // 但不是一条发言：挂在紧随其后的那条发言上，既不丢原文，也不各自占一条线索。
  const subject = [row.label, row.annotation].filter(Boolean).join('')
  const lines = [row.note, row.evaluation].filter(Boolean).join('\n')
    .split('\n').map(line => line.trim()).filter(Boolean)
  const segments: string[] = []
  let pending = subject
  for (const line of lines) {
    if (isNoise(line)) {
      // 引用符号、日期戳、残留署名不是发言：并到相邻那段，不单独成条。
      if (segments.length) segments[segments.length - 1] = `${segments[segments.length - 1]} ${line}`
      else pending = pending ? `${pending} ${line}` : line
      continue
    }
    segments.push(pending ? `${pending} ${line}` : line)
    pending = ''
  }
  if (!segments.length) {
    // 没有备注和评价时，行本身（机构、诊室、姓名）就是可核对的原文。
    const fallback = [row.hospital, row.department, row.doctor].filter(Boolean).join(' · ')
    if (fallback) segments.push(pending ? `${pending} ${fallback}` : fallback)
    else if (pending) segments.push(pending)
  }
  return segments
}

export function reportsFromDocument(document: SourceDocument): Report[] {
  const items: Report[] = []
  for (const row of sourceRows(document)) {
    rowSegments(row).forEach((segment, index) => {
      const quote = clip(segment, 200)
      items.push({
        id: index === 0 ? row.reportId : `${row.reportId}-p${index + 1}`,
        platform: 'web',
        source_channel: 'browser_session',
        source_url: document.url,
        source_post_id: 'cp3b7ToQAl3J',
        published_at_precision: 'unknown',
        ...(row.region ? { hospital_region: row.region } : {}),
        hospital_name_raw: row.hospital,
        ...(row.department ? { department: row.department } : {}),
        ...(row.doctors.length ? { doctor_name_raw: row.doctors.join('、') } : {}),
        disorders: row.disorders,
        ...(row.sheet === '人格障碍' ? { source_topics: ['人格障碍'] } : {}),
        stage: 'unknown',
        experience: null,
        evidence_quote: quote,
        // 只有这一行比 200 字长时才单独存全文；与引文相同就不写，免得「展开原文」点了没变化。
        ...(segment.length > quote.length ? { evidence_full_text: clip(segment, 2000) } : {}),
        evidence_context: {
          note_title: document.title,
          index_in_capture: `${row.sheet} · 第${row.row}行`,
          capture_scope: SOURCE_CAPTURE,
        },
        evidence_source: 'article',
        verification: { level: 'unverified' },
        extraction: { tool: 'kdocs-sheet-transcription', captured_at: document.captured_at.slice(0, 10) },
        flags: { contains_minor: false, contains_selfharm_detail: false, sensitive: false },
        status: 'published',
      })
    })
  }
  return mergeDuplicateQuotes(mergeSegmentsByDoctor(items))
}

/** 病症标签的展示顺序：合并后取并集时按源文档的排列（cptsd → osdd/did → 人格障碍）。 */
const DISORDER_ORDER: Report['disorders'] = ['cptsd', 'bpd', 'osdd', 'did', 'ptsd', 'pd', 'other']

/**
 * 同一行拆出来的若干段合成一条线索。
 *
 * 拆段解决的是「一条线索里塞了十几个人的话」，但医院页随即排出同一医生的十几张卡，
 * 读者看到的是同一个名字重复十几次。合并后 id 用第一段的 id，原文按出现顺序用换行连接，
 * 不改写、不加分隔符；段数记在 parts_count，病症取各段并集。
 *
 * 合并只在这一行内部进行，不跨行、不跨表。表格里同一位医生常在两三张表各有一行，
 * 那是不同人分别写的不同经历，行有各自的诊室与出处；按姓名跨行合并会把 A 行的评价挂到
 * B 行的诊室下面——读者点开就会看到不属于这个诊室的发言。内容真的一字不差时，
 * 交给 mergeDuplicateQuotes 处理，那里会保留两边的姓名与病症。
 */
function mergeSegmentsByDoctor(reports: Report[]): Report[] {
  const merged: Report[] = []
  const byKey = new Map<string, Report>()
  for (const report of reports) {
    const key = report.id.replace(/-p\d+$/u, '')
    const target = byKey.get(key)
    if (!target) {
      byKey.set(key, report)
      merged.push(report)
      continue
    }
    const existing = (target.evidence_full_text ?? target.evidence_quote).split('\n').map(line => line.trim()).filter(Boolean)
    const incoming = (report.evidence_full_text ?? report.evidence_quote).split('\n').map(line => line.trim()).filter(Boolean)
    // 同一段话在两张表里各抄了一遍（例如 cptsd 与人格障碍同时收录同一句评价）时只留一份：
    // 合并成一张卡之后，重复的句子会在正文里挨着出现两次，读者看到的就是没去干净。
    const text = [...existing, ...incoming.filter(line => !existing.includes(line))].join('\n')
    const quote = clip(text, 200)
    target.evidence_quote = quote
    if (text.length > quote.length) target.evidence_full_text = clip(text, 2000)
    else delete target.evidence_full_text
    // 合并进来的每一行都要出现在出处里：卡片正文含另一行的原话时，只标第一行的位置等于谎报来源，
    // 读者照着「cptsd 第10行」回去核对，会发现那段话根本不在那一行。
    const positions = new Set([
      ...(target.evidence_context?.index_in_capture ?? '').split('、'),
      report.evidence_context?.index_in_capture ?? '',
    ].map(position => position.trim()).filter(Boolean))
    if (target.evidence_context) {
      target.evidence_context = { ...target.evidence_context, index_in_capture: [...positions].join('、') }
    }
    target.parts_count = (target.parts_count ?? 1) + (report.parts_count ?? 1)
    target.disorders = DISORDER_ORDER.filter(id => target.disorders.includes(id) || report.disorders.includes(id))
    const topics = [...(target.source_topics ?? []), ...(report.source_topics ?? [])]
    if (topics.length) target.source_topics = [...new Set(topics)]
  }
  return merged
}

/**
 * 同一家医院里两位医生共用同一段评价时只留一条。
 *
 * 表格里出现「同一个人写下一句『有反馈书面得到多重人格障碍诊断』，同时挂给同一科室的两位医生」，
 * 拆段与按医生合并都拦不住它：合并后医院页会并排出现两张一字不差的卡。
 * 姓名栏按原表顺序写成「曹晓华、王祎坤」，界面本来就按分隔符拆成两个医生按钮，
 * 两位医生都还点得进去，只是不再重复同一段文字。
 */
function mergeDuplicateQuotes(reports: Report[]): Report[] {
  const normalize = (text: string) => text.replace(/\s+/gu, '')
  const merged: Report[] = []
  const byQuote = new Map<string, Report>()
  for (const report of reports) {
    const key = `${report.hospital_name_raw}\u0000${report.hospital_region ?? ''}\u0000${normalize(report.evidence_quote)}\u0000${normalize(report.evidence_full_text ?? '')}`
    const target = byQuote.get(key)
    if (!target) {
      byQuote.set(key, report)
      merged.push(report)
      continue
    }
    const names = [target.doctor_name_raw, report.doctor_name_raw].filter((name): name is string => Boolean(name))
    if (names.length) target.doctor_name_raw = [...new Set(names.flatMap((name) => name.split('、')))].join('、')
    target.disorders = DISORDER_ORDER.filter(id => target.disorders.includes(id) || report.disorders.includes(id))
    target.parts_count = (target.parts_count ?? 1) + (report.parts_count ?? 1)
    const topics = [...(target.source_topics ?? []), ...(report.source_topics ?? [])]
    if (topics.length) target.source_topics = [...new Set(topics)]
  }
  return merged
}

/** 判为重复所需的最短连续共享片段：短于此长度的重合只是「态度好」这类常见短语撞车。 */
const ECHO_MIN_SHARED = 20

/** 判为重复所需的共享片段占评价长度的比例。 */
const ECHO_MIN_RATIO = 0.7

/** 两段文本的最长连续公共子串长度；入参已去空白，按字符比对。 */
function longestSharedRun(left: string, right: string): number {
  if (!left || !right) return 0
  let best = 0
  let previous = new Array<number>(right.length + 1).fill(0)
  for (let i = 1; i <= left.length; i++) {
    const current = new Array<number>(right.length + 1).fill(0)
    for (let j = 1; j <= right.length; j++) {
      if (left[i - 1] !== right[j - 1]) continue
      const run = previous[j - 1] + 1
      current[j] = run
      if (run > best) best = run
    }
    previous = current
  }
  return best
}

/**
 * 评价是不是这位医生某条线索原文的复制。
 * 前端只拿到截断到 200 字的引文，在浏览器里比对会漏判（评价可能落在原文中段），所以判定放在这里。
 *
 * 判据是「最长连续共享片段 ≥20 字，且 ≥ 评价长度的 70%」：
 * - 只要求整段相等会漏掉「评价比原文多一句结尾」的情况；
 * - 只要求占比会误伤 12–18 字的短评价——整段都在原文里、占比 100%，其实只是「态度好」这类短语撞车，
 *   隐藏它等于吞掉一条真实评价。
 *
 * 任一方向整段包含仍算重复：原文被评价整段吞进去、或评价是原文的一截，
 * 两种情况下读者点开看到的都是同一段话，比例判据会低估它们。
 */
function evaluationEchoesReport(evaluation: string, texts: string[]): boolean {
  const probe = evaluation.replace(/\s+/gu, '')
  if (probe.length < ECHO_MIN_SHARED) return false
  const threshold = Math.max(ECHO_MIN_SHARED, probe.length * ECHO_MIN_RATIO)
  return texts.some((text) => {
    const source = text.replace(/\s+/gu, '')
    if (!source) return false
    if (source.includes(probe) || probe.includes(source)) return true
    return longestSharedRun(probe, source) >= threshold
  })
}

/**
 * 医生档案只承载与个人绑定的字段：诊室取首次出现的非空值，备注与评价按线索合并。
 * 同一医生可能出现在多张表里且备注、评价各不相同，因此合并而不是覆盖。
 * 表里没写的字段一律留空，界面按「无」呈现；不写「未录入」这类录入过程用语。
 * 人工补上的姓名叫（DOCTOR_NAME_FIXES）只进线索，不在这里新建档案：
 * 被提到的人不该继承别人那一行的评价。
 */
export function doctorsFromDocument(document: SourceDocument, reports: Report[]): Doctor[] {
  const hospitalOf = new Map(reports.map(report => [report.id, report.hospital_id]))
  // 跨表合并会把后面那行的线索并进前一行，后一行的 id 就不再出现在 reports 里。
  // 那一行的医生仍然存在（他确实在这家机构出诊），所以按机构名与地区兜底找同一家机构。
  const hospitalByName = new Map<string, string>()
  // 一位医生的线索原文：姓名栏可能是「甲、乙」，两位都要拿到这条线索的正文。
  const textsByDoctor = new Map<string, string[]>()
  for (const report of reports) {
    if (!report.hospital_id) continue
    const key = `${report.hospital_name_raw}\u0000${report.hospital_region ?? ''}`
    if (!hospitalByName.has(key)) hospitalByName.set(key, report.hospital_id)
    const text = [report.evidence_quote, report.evidence_full_text ?? ''].join('\n')
    for (const name of (report.doctor_name_raw ?? '').split('、').map(part => part.trim()).filter(Boolean)) {
      const doctorKey = `${report.hospital_id}\u0000${name}`
      const texts = textsByDoctor.get(doctorKey)
      if (texts) texts.push(text)
      else textsByDoctor.set(doctorKey, [text])
    }
  }
  const groups = new Map<string, { hospitalId: string; name: string; department: string; notes: string[]; evaluations: { text: string; source: string }[] }>()
  for (const row of sourceRows(document)) {
    const hospitalId = hospitalOf.get(row.reportId) ?? hospitalByName.get(`${row.hospital}\u0000${row.region}`)
    if (!row.doctor || !hospitalId) continue
    const key = `${hospitalId}\u0000${row.doctor}`
    const group = groups.get(key) ?? { hospitalId, name: row.doctor, department: '', notes: [], evaluations: [] }
    if (!group.department && row.department) group.department = row.department
    if (row.note && !group.notes.includes(row.note)) group.notes.push(row.note)
    // 评价按来源逐条留：同一位医生在两三张表各有一行时，每行是独立的一条，
    // 拼成一个长字符串就没法数条数，也回不到各自出处。
    if (row.evaluation && !group.evaluations.some(item => item.text === row.evaluation)) {
      group.evaluations.push({ text: row.evaluation, source: `${row.sheet} · 第${row.row}行` })
    }
    groups.set(key, group)
  }
  return [...groups.values()].map(group => {
    const evaluation = group.evaluations.length ? group.evaluations.map(item => item.text).join('\n\n') : undefined
    const echoes = evaluation ? evaluationEchoesReport(evaluation, textsByDoctor.get(`${group.hospitalId}\u0000${group.name}`) ?? []) : false
    return {
      id: `kdocs-doctor-${createHash('sha1').update(`${group.hospitalId}\u0000${group.name}`).digest('hex').slice(0, 12)}`,
      name: group.name,
      hospital_id: group.hospitalId,
      department: group.department,
      // 职称表里没有，留空让界面走「无」，不写占位词
      title: '',
      credentials: [],
      profile_urls: [],
      specialties: [],
      official_sources: [],
      ...(group.notes.length ? { note: group.notes.join('\n') } : {}),
      ...(evaluation ? { evaluation } : {}),
      ...(group.evaluations.length ? { evaluation_items: group.evaluations } : {}),
      // 只有真的重复时才写 true；没有评价、或评价有自己的内容，都不写这个键
      ...(echoes ? { evaluation_echoes_report: true } : {}),
    }
  })
}

/**
 * 挂不上机构的线索标成 unlinked：原文照留，但不算已发布。
 * 全国头行、省份合计、医院页都只数 published，三处才会落到同一个数字；
 * 同时写明为什么挂不上，后续补定位时不至于从头再查一遍。
 */
export function markUnlinked(reports: Report[], run: LocationRun): Report[] {
  return reports.map(report => {
    if (report.hospital_id) return report
    const result = run.results.find(item => item.name === report.hospital_name_raw)
    return {
      ...report,
      status: 'unlinked' as const,
      unlinked_reason: result ? `机构未定位：${result.reason}` : '机构未定位：定位依据里没有这家机构',
    }
  })
}

export function reportsWithLocations(document: SourceDocument): Report[] {
  const reports = reportsFromDocument(document)
  if (!existsSync(LOCATION_EVIDENCE)) return reports
  const run = readJson<LocationRun>(LOCATION_EVIDENCE)
  if (run.source_url !== SOURCE_URL) throw new Error('定位依据必须对应当前主线来源')
  return markUnlinked(linkLocationReports(reports, run), run)
}

export function doctorsWithLocations(document: SourceDocument, reports: Report[]): Doctor[] {
  return doctorsFromDocument(document, reports)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const document = readJson<SourceDocument>(resolve(SOURCE_CAPTURE))
  if (document.url !== SOURCE_URL || document.sheets.length === 0 || document.sheets.some(sheet => sheet.values.length < 2)) {
    throw new Error('来源链接或工作表结构不符')
  }
  const items = reportsWithLocations(document)
  const updatedAt = document.captured_at.slice(0, 10)
  const reportFile = reportsFileSchema.parse({ schema_version: '1.0.0', updated_at: updatedAt, items })
  const doctorFile = doctorsFileSchema.parse({
    schema_version: '1.0.0',
    updated_at: updatedAt,
    items: doctorsWithLocations(document, items),
  })
  writeJson(CURATED_FILES.reports, reportFile)
  writeJson(CURATED_FILES.doctors, doctorFile)
  console.log(`✓ 新源表格入库：${document.sheets.length} 张工作表，${reportFile.items.length} 条线索，${doctorFile.items.length} 位医生，保留 ${items.filter(report => report.hospital_id).length} 条定位关联`)
}
