/**
 * 主线来源转写：KDocs 电子表格（工作表逐行，一名医生一行）。
 * 地区与医院名以合并单元格的形式只在段首填写，其余行留空继承，因此必须先向下填充。
 */
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import type { Doctor, Hospital, Report } from '../lib/schema.ts'
import { doctorsFileSchema, hospitalsFileSchema, reportsFileSchema } from '../lib/schema.ts'
import { CURATED_FILES, readJson, writeJson } from './lib/paths.ts'
import { LOCATION_EVIDENCE, linkLocationReports } from './lib/amap.ts'
import type { LocationRun } from './lib/amap.ts'
import { hospitalsFromRun } from './lib/hospitals.ts'
import { applyStoredOverrides } from './lib/overrides.ts'

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

/** 一行开头的「昵称:」：署名。剥掉名字，只留正文。 */
function splitSpeaker(line: string): { speaker: string; rest: string } | null {
  const match = line.match(/^([^\s：:][^：:]{0,23})\s*[：:]\s*(.*)$/u)
  if (!match) return null
  const speaker = match[1].trim()
  if (!speaker || LABEL_PREFIX.test(speaker)) return null
  // 带句读的不是昵称，是正文里的一句话
  if (/[。！？；，、!?]/u.test(speaker)) return null
  return { speaker, rest: match[2].trim() }
}

/**
 * 长句末尾又跟了一句「。昵称: 正文」：同一个人写完后别人接着在同一段里回复。
 * 表格里常见这种挤在一起的写法，靠它才能把两个人的话分开。
 */
function splitTrailingSpeaker(line: string): { head: string; speaker: string; rest: string } | null {
  const match = line.match(/^([\s\S]*?[。！？!?…」】）)])\s*([^\s：:，。！？]{1,16})\s*[：:]\s*([\s\S]*)$/u)
  if (!match) return null
  const speaker = match[2].trim()
  if (!speaker || LABEL_PREFIX.test(speaker)) return null
  return { head: match[1].trim(), speaker, rest: match[3].trim() }
}

/** 去掉包裹引号、引用树前缀与多余空行；不保留任何作者标识。 */
function cleanCommentText(text: string): string {
  return text
    .replace(/\r\n?/gu, '\n')
    .split('\n')
    .map(source => source.trim()
      .replace(/^"+(.*?)"+$/u, '$1')
      // 论坛引用树：└ [09-18] [建设全国就诊地图] 昵称: 回复 对象 : 正文
      .replace(/^└\s*(?:\[[^\]]*\]\s*)*(?:[^\s：:]{1,20})\s*[：:]\s*回复\s*(?:[^：:\n]{1,20})\s*[:：]\s*/u, '')
      .trim())
    .filter(Boolean)
    .join('\n')
    .replace(/\n{3,}/gu, '\n\n')
    .trim()
}

/**
 * 按署名把一格评价切成一条条发言。
 *
 * 表格里一格常挤着好几个人：cptsd 第 4 行（梁红）里有劳拉、可颂可颂🥐、小红薯674205EE、神盾局星际巡察员，
 * 第 6 行（王晓莹）里有五个人。并成一条会让读者以为是一个人的完整经历，也看不出是几条评价。
 *
 * 同一署名在同一格里的多段合成一条（同一个人分几次补充自己的经历）。
 * 署名本身只用于切分，不入库；公开数据不保留作者标识。
 */
export function evaluationComments(raw: string): string[] {
  const lines = raw.replace(/\r\n?/gu, '\n').split('\n').map(line => line.trim()).filter(Boolean)
  if (!lines.length) return []
  const marked = lines.some(line => splitSpeaker(line))
  // 没有署名的一格就是一条，保持原样（多行仍属同一条长评）
  if (!marked) return [cleanCommentText(lines.join('\n'))].filter(Boolean)

  type Block = { speaker: string | null; lines: string[] }
  const blocks: Block[] = []
  let current: Block | null = null
  const blockFor = (speaker: string | null): Block => {
    if (speaker) {
      // 同一署名再次出现时并回他那一块，读者看到的是一位用户的一条评价
      const same = blocks.find(block => block.speaker === speaker)
      if (same) return same
    }
    const block: Block = { speaker, lines: [] }
    blocks.push(block)
    return block
  }
  for (const line of lines) {
    const head = splitSpeaker(line)
    if (head) {
      current = blockFor(head.speaker)
      if (head.rest) current.lines.push(head.rest)
      continue
    }
    const tail: { head: string; speaker: string; rest: string } | null = current ? splitTrailingSpeaker(line) : null
    if (tail) {
      // 「……避雷。可颂可颂🥐: 补充：……」：前一句归上一位，后一句换人
      if (current) current.lines.push(tail.head)
      current = blockFor(tail.speaker)
      if (tail.rest) current.lines.push(tail.rest)
      continue
    }
    if (!current) current = blockFor(null)
    current.lines.push(line)
  }
  return blocks.map(block => cleanCommentText(block.lines.join('\n'))).filter(Boolean)
}

function splitName(cell: string): { name: string; annotations: string[] } {
  const annotations = [...cell.matchAll(NAME_ANNOTATION)].map(match => match[1].trim()).filter(Boolean)
  const name = cell.replace(NAME_ANNOTATION, '').replace(/\s+/gu, ' ').trim()
    .replace(/\s*等$/u, '').replace(/医生$/u, '').trim()
  return { name, annotations }
}

/**
 * 姓名格里写的不是人名时（专病门诊、课题组、团队、会诊、整段科室介绍），
 * 它仍然是这一行的主体名称，照原文上卡；写得像一句话时取首个分句，最多 40 字。
 * 整段原文另行留在该行的线索里，不因为取名而丢字。
 */
function subjectName(text: string): string {
  const trimmed = text.replace(/\s+/gu, ' ').trim()
  const head = trimmed.split(/[。；，、]/u)[0]?.trim() ?? ''
  return clip(head || trimmed, 40)
}

export type SourceRow = {
  reportId: string
  sheet: string
  /** Excel 行号（1 起，含表头） */
  row: number
  region: string
  hospital: string
  /** 诊室：只对具体医生写；姓名格不是人名时留空，界面按「无」呈现 */
  department: string
  /** 这一行的主体名称：姓名格里的个人姓名，或姓名格写的那串原文（专病门诊、课题组、团队、会诊） */
  doctor: string
  /** 这条线索应记的全部名称：默认就是姓名格里的内容，人工修正行会补上被评价点到的人 */
  doctors: string[]
  /** 姓名格原文。不是人名时它既是主体名称也是这一行的原文，整段留在线索里 */
  label: string
  /** 姓名格里的状态附注（「（特需）」「（退休）」），单独存放，切段时挂到同一行的发言上 */
  annotation: string
  /** 备注：官方简介、挂号方式这类对整行的说明，不是某一位用户的发言 */
  note: string
  /** 评价按署名切出来的发言，一条一位用户（同一位用户的多段已并成一条） */
  comments: string[]
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
      const departmentCell = cells[2] || inherited(3)
      const nameCell = cells[3] ?? ''
      const { name, annotations } = splitName(nameCell)
      const isPerson = !!name && name.length <= 24 && !SENTENCE.test(name) &&
        !NON_PERSON.test(name) && name !== departmentCell
      // 姓名格写的不是人名时（专病门诊、课题组、团队、会诊、整段科室介绍），
      // 它在这一行里就是「谁」的位置：照原文当名称上卡，不因为是科室或团队就丢掉这条反馈。
      // 姓名格空着而 C 列有诊室时（武汉二七院区那一行），这一行的「谁」就是那句诊室，
      // 否则这条反馈挂不上任何卡片。
      const subjectCell = name || departmentCell
      const entity = isPerson ? name : subjectCell ? subjectName(subjectCell) : ''
      // 诊室只跟着具体医生填。姓名格没有具体医生时，C 列那句话要么就是这个名称本身，
      // 要么是这一行的科室归属，写成「门诊」会让读者以为找到了能挂号的门诊。
      const department = isPerson ? departmentCell : ''
      const annotation = annotations.length ? `（${annotations.join('，')}）` : ''
      const reportId = `kdocs-cp3b7toqal3j-s${sheet.index + 1}-r${index + 1}`
      rows.push({
        reportId,
        sheet: sheet.name,
        row: index + 1,
        region,
        hospital,
        department,
        doctor: entity,
        doctors: entity ? [entity] : [],
        // 姓名格原文：整段科室介绍被截成名称后，原文仍留在这一行的线索里。
        label: isPerson ? '' : name,
        annotation,
        note: (cells[4] ?? '').trim(),
        comments: evaluationComments(cells[5] ?? ''),
        disorders: SHEET_DISORDERS[sheet.name] ?? ['other'],
      })
    }
  }
  return rows
}

/**
 * 一行里的线索：备注一条，评价里每一位用户各一条。
 *
 * 备注是官方简介、挂号方式这类对整行的说明，没有具体发言人，单独成条；
 * 评价里一格常挤着好几个人（cptsd 第 4 行有四位，第 6 行有五位），
 * 并成一条会让读者以为这是一个人的完整经历，也数不出到底有几个人反馈过。
 *
 * 附注与引用符号不是发言：「（特需）」「（退休）」是姓名格里的状态，
 * 「└」「09-16」是引用树和日期戳，「朱鸿儒 课题组」是姓名格的团队名。
 * 它们挂在第一条线索前，既不丢原文，也不各自占一条内容单薄的线索。
 */
function rowLeads(row: SourceRow): string[] {
  // 姓名格原文（团队名、专病门诊、整段科室介绍）就是这一行主体的名称，整段进线索。
  const subject = [row.label, row.annotation].filter(Boolean).join('')
  const leads: string[] = []
  const note = row.note.trim()
  if (note) leads.push(note)
  leads.push(...row.comments)
  if (!leads.length) {
    // 没有备注和评价时，行本身（机构、诊室、姓名）就是可核对的原文。
    const fallback = [row.hospital, row.department, row.doctor].filter(Boolean).join(' · ')
    const text = subject || fallback
    if (text) leads.push(text)
    return leads
  }
  if (subject) leads[0] = `${subject} ${leads[0]}`
  return leads
}

export function reportsFromDocument(document: SourceDocument): Report[] {
  const items: Report[] = []
  for (const row of sourceRows(document)) {
    rowLeads(row).forEach((segment, index) => {
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
        // 姓名格写的是专病门诊、课题组、团队、专家会诊或整段科室介绍时，这一行照样是线索：
        // 姓名格那串原文就是它的名称，按原文上卡；诊室留空（界面显示「无」），
        // 免得把 C 列那句话又说成一处可以挂号的「门诊」。
        status: 'published',
      })
    })
  }
  return mergeDuplicateQuotes(items)
}

/** 病症标签的展示顺序：合并后取并集时按源文档的排列（cptsd → osdd/did → 人格障碍）。 */
const DISORDER_ORDER: Report['disorders'] = ['cptsd', 'bpd', 'osdd', 'did', 'ptsd', 'pd', 'other']

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
    // 评价按来源逐条留：同一格里本来就有好几位用户各说一段，逐条记下才能数条数、回到各自出处。
    // 拼成一个长字符串会让「几条评价」无从回答，也把几个人的话糊成一个人的经历。
    for (const comment of row.comments) {
      if (group.evaluations.some(item => item.text === comment)) continue
      group.evaluations.push({ text: comment, source: `${row.sheet} · 第${row.row}行` })
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

/**
 * hospitals.json 只有一条推导路径：高德定位依据 `hospitalsFromRun` 打底，再叠覆盖层。
 * 控制台新增的医院不在源表里、改名的医院也不在源表里，两条都靠覆盖层落地；
 * 拿现有 hospitals.json 当基准会让 `source_value` 变成自我比对——改过的值再比一次永远相等。
 * 从定位依据起底，`validate` 与这里用的是同一个派生值，覆盖失效才真会红。
 */
export function hospitalsWithOverrides(root?: string): Hospital[] | undefined {
  const run = locationRun()
  if (!run) return undefined
  return applyStoredOverrides('hospitals', hospitalsFromRun(run), root)
}

function locationRun(): LocationRun | undefined {
  if (!existsSync(LOCATION_EVIDENCE)) return undefined
  const run = readJson<LocationRun>(LOCATION_EVIDENCE)
  if (run.source_url !== SOURCE_URL) throw new Error('定位依据必须对应当前主线来源')
  return run
}

/**
 * 撤下一家机构之前先看有没有东西还挂在它上面。
 * 直接写下去会得到一份指向不存在机构的数据：医院页没了，线索和医生卡还指着它，
 * 校验能报出来却报不出该怎么修，等于让人自己推断。这里把条数和处理办法一次说清。
 */
export function removalConflicts(base: Hospital[], kept: Hospital[], reports: Report[], doctors: Doctor[]): string[] {
  const keptIds = new Set(kept.map(hospital => hospital.id))
  const messages: string[] = []
  for (const hospital of base) {
    if (keptIds.has(hospital.id)) continue
    const leads = reports.filter(report => report.hospital_id === hospital.id).length
    const cards = doctors.filter(doctor => doctor.hospital_id === hospital.id).length
    if (!leads && !cards) continue
    messages.push(
      `撤下 ${hospital.name}（${hospital.id}）前先处理指向它的 ${leads} 条线索与 ${cards} 位医生卡：` +
        '给线索改挂别的机构，或连同这些记录一起撤下，再撤机构',
    )
  }
  return messages
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const document = readJson<SourceDocument>(resolve(SOURCE_CAPTURE))
  if (document.url !== SOURCE_URL || document.sheets.length === 0 || document.sheets.some(sheet => sheet.values.length < 2)) {
    throw new Error('来源链接或工作表结构不符')
  }
  const items = applyStoredOverrides('reports', reportsWithLocations(document))
  const updatedAt = document.captured_at.slice(0, 10)
  const reportFile = reportsFileSchema.parse({ schema_version: '1.0.0', updated_at: updatedAt, items })
  const doctors = applyStoredOverrides('doctors', doctorsWithLocations(document, items))
  const doctorFile = doctorsFileSchema.parse({ schema_version: '1.0.0', updated_at: updatedAt, items: doctors })
  // 医院同样在这一步入库：新增、改名、撤下一律由覆盖层决定，基准是定位依据。
  // 没有覆盖层影响时 hospitalsWithOverrides 的结果与现有文件逐字相同，不写盘、不动 updated_at，
  // 免得把定位流程写下的日期改成一个与定位无关的日子。
  const hospitals = hospitalsWithOverrides()
  const run = locationRun()
  const conflicts = hospitals && run ? removalConflicts(hospitalsFromRun(run), hospitals, items, doctors) : []
  if (conflicts.length) {
    throw new Error(`撤下机构前还有记录指向它，未写入：\n${conflicts.map(item => `  - ${item}`).join('\n')}`)
  }
  writeJson(CURATED_FILES.reports, reportFile)
  writeJson(CURATED_FILES.doctors, doctorFile)
  if (hospitals && existsSync(CURATED_FILES.hospitals)) {
    const hospitalFile = readJson<{ schema_version: string; updated_at: string; items: Hospital[] }>(CURATED_FILES.hospitals)
    if (JSON.stringify(hospitals) !== JSON.stringify(hospitalFile.items)) {
      writeJson(CURATED_FILES.hospitals, hospitalsFileSchema.parse({ ...hospitalFile, items: hospitals }))
    }
  }
  console.log(`✓ 新源表格入库：${document.sheets.length} 张工作表，${reportFile.items.length} 条线索，${doctorFile.items.length} 位医生，保留 ${items.filter(report => report.hospital_id).length} 条定位关联`)
}
