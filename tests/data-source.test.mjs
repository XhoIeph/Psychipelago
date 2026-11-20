import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, cpSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { evaluationComments, reportsFromDocument, reportsWithLocations, doctorsWithLocations, specialtiesFromNote, SOURCE_CAPTURE } from '../scripts/import-kdocs.ts'
import { doctorsFileSchema, reportsFileSchema } from '../lib/schema.ts'
import { LOCATION_EVIDENCE } from '../scripts/lib/amap.ts'
import { hospitalsFromRun } from '../scripts/geocode-hospitals.ts'
import { applyStoredOverrides } from '../scripts/lib/overrides.ts'

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))
// 整表快照只在本地留档：原表的地址、表名与逐格内容都不进仓库，CI 上没有这份文件。
// 有快照时跑逐行保真比对；没有时跳过那几条，结构与 schema 类断言照跑，闸门不会因此变哑。
const hasSnapshot = existsSync(SOURCE_CAPTURE)
const document = hasSnapshot ? readJson(SOURCE_CAPTURE) : null
const reports = readJson('data/curated/reports.json').items
const doctors = readJson('data/curated/doctors.json').items
// curated 是「源转写 + 覆盖层」的结果，比对也得走同一条路，否则控制台改一个字这条就红。
const expected = hasSnapshot ? applyStoredOverrides('reports', reportsWithLocations(document)) : reports
// 控制台新增的线索 id 带 local- 前缀，它们不在表格里。凡是「表格每一行都进了库」这类
// 断言只数源转写；curated 与「源 + 覆盖层」的整份比对仍然用 reports，多一条少一条都红。
const sourceReports = reports.filter((report) => !report.id.startsWith('local-'))

// 保真类断言（stage 必须是 unknown、院名与姓名照抄单元格、引文能回溯）只对被覆盖的
// 那个字段让路：人工修正的定义就是偏离表格，两者不可能同时成立。让路依据只有覆盖层
// 文件本身——测试里不写名单，覆盖文件删了，curated 与「源 + 覆盖层」的整份比对就会红。
// 质量类断言（医生卡存在、已发布线索挂到机构）跑合并后的数据，一律不让路。
const OVERRIDES_DIR = 'data/overrides/reports'
const reportOverrides = existsSync(OVERRIDES_DIR)
  ? readdirSync(OVERRIDES_DIR).filter((file) => file.endsWith('.json')).map((file) => readJson(resolve(OVERRIDES_DIR, file)))
  : []
const reportOverrideFields = new Map(reportOverrides.map((record) => [
  record.id,
  new Set([...Object.keys(record.set ?? {}), ...(record.clear ?? [])]),
]))
const patchedIds = reportOverrides.filter((record) => record.action === 'patch').map((record) => record.id)
const overridden = (id, field) => reportOverrideFields.get(id)?.has(field) ?? false
/** 全局计数（病症分布、回龙观条数、某个名字的条数）只数这个字段没被覆盖的记录。 */
const faithful = (field) => sourceReports.filter((report) => !overridden(report.id, field))

/** 姓名格不是人名、或姓名格空着的行：它们照样是线索，名称取姓名格原文（姓名格空时取诊室那一格）。 */
const subjectIds = new Set([
  'kdocs-s1-r2',
  'kdocs-s1-r2-p2',
  'kdocs-s1-r2-p3',
  'kdocs-s1-r43',
  'kdocs-s1-r50',
  'kdocs-s3-r49',
  'kdocs-s3-r51',
  'kdocs-s3-r108',
  'kdocs-s3-r109',
])

/** 工作表里地区与医院名只在段首填写，其余行留空继承。 */
const filledRow = (sheetIndex, excelRow) => {
  const values = document.sheets[sheetIndex - 1].values
  let region = ''
  let hospital = ''
  for (let index = 1; index <= excelRow - 1; index++) {
    if (values[index][0]) region = values[index][0].trim()
    if (values[index][1]) hospital = values[index][1].trim()
  }
  return { region, hospital, cells: values[excelRow - 1].map((cell) => (cell ?? '').trim()) }
}

test('三张工作表与每一行有内容的记录都进了库', { skip: !hasSnapshot }, () => {
  // 快照里有什么不管，落到 curated 的一律不带表名与地址。
  assert.ok(sourceReports.every((report) => report.source_url === undefined))
  assert.ok(sourceReports.every((report) => report.evidence_context?.note_title === undefined))
  assert.deepEqual(document.sheets.map((sheet) => sheet.name), ['cptsd', 'osdd-did', '人格障碍'])
  assert.deepEqual(document.sheets.map((sheet) => sheet.values.length), [57, 55, 184])
  const perSheet = Object.fromEntries(document.sheets.map((sheet, index) => [
    index + 1,
    sourceReports.filter((report) => report.id.includes(`-s${index + 1}-`)).length,
  ]))
  // 线索单位是「一条发言」：备注单独一条，评价里每位署名的用户各一条；
  // 无名分的多行仍在同一格里属同一条长评。跨行、跨表一律不合并。
  assert.deepEqual(perSheet, { 1: 88, 2: 59, 3: 171 })
  assert.equal(sourceReports.length, 318)
  assert.equal(reportsFromDocument(document).length, 318)
  // 合并必须可重放：同一份文档跑两遍得到同一组 id，定位表与断言样本才不会抖。
  assert.deepEqual(reportsFromDocument(document).map((report) => report.id), sourceReports.map((report) => report.id))
  // 整份 curated 必须等于「源转写 + 覆盖层」，多一条少一条都是覆盖层没烘焙。
  assert.deepEqual(reports, expected)
  assert.equal(reportsFileSchema.safeParse(readJson('data/curated/reports.json')).success, true)
  assert.equal(doctorsFileSchema.safeParse(readJson('data/curated/doctors.json')).success, true)
})

test('每条线索都能回溯到同一张表的同一单元格', { skip: !hasSnapshot }, () => {
  // 跨表合并后一条线索可能引用同一机构同一医生在两三张表里的发言，
  // 因此回溯范围是「这家机构这位医生」在全部工作表里的姓名、备注、评价单元格。
  const nameOf = (cell) => (cell ?? '')
    .replace(/[（(][^）)]*[）)]/gu, '')
    .replace(/\s+/gu, ' ')
    .trim()
    .replace(/\s*等$/u, '')
    .replace(/医生$/u, '')
    .trim()
  const corpus = new Map()
  for (const sheet of document.sheets) {
    let hospital = ''
    for (let row = 1; row < sheet.values.length; row++) {
      const cells = sheet.values[row].map((cell) => (cell ?? '').trim())
      if (!cells.some(Boolean)) continue
      if (cells[1]) hospital = cells[1]
      const key = `${hospital}\u0000${nameOf(cells[3])}`
      corpus.set(key, [corpus.get(key), cells[3], cells[4], cells[5]].filter(Boolean).join('\n'))
    }
  }
  // 只核对源转写：控制台新增的线索没有表格单元格可回溯，它们由覆盖层的 insert 校验管。
  for (const report of sourceReports) {
    assert.equal(report.source_url, undefined)
    assert.equal(report.source_post_id, undefined)
    assert.equal(report.evidence_context.note_title, undefined)
    assert.equal(report.evidence_context.capture_scope, SOURCE_CAPTURE)
    const [, sheetIndex, excelRow] = report.id.match(/-s(\d+)-r(\d+)(?:-p\d+)?$/u).map(Number)
    const sheet = document.sheets[sheetIndex - 1]
    assert.equal(report.evidence_context.index_in_capture, `${sheet.name} · 第${excelRow}行`)
    const { region, hospital, cells } = filledRow(sheetIndex, excelRow)
    if (!overridden(report.id, 'hospital_name_raw')) assert.equal(report.hospital_name_raw, hospital)
    if (region && !overridden(report.id, 'hospital_region')) assert.equal(report.hospital_region, region)
    // 诊室只跟具体医生走：姓名格不是人名时，C 列那句话是这个主体的名称或科室归属，
    // 不再写进 department，界面才按「无」显示。
    if (overridden(report.id, 'department')) {
      // 人工改过诊室，表格那一格不再是判定依据
    } else if (subjectIds.has(report.id.replace(/-p\d+$/u, ''))) assert.equal(report.department, undefined)
    else if (cells[2]) assert.equal(report.department, cells[2])
    // 同一段话在两张表里各抄了一遍时，会被合成一条、姓名栏写成「甲、乙」，
    // 名字可能来自同院另一行，所以要逐个核对，而不是整串出现在这一格里。
    if (cells[3] && report.doctor_name_raw && !overridden(report.id, 'doctor_name_raw')) {
      for (const name of report.doctor_name_raw.split('、')) {
        const known = cells[3].includes(name) || [...corpus.entries()].some(([key, text]) => key.startsWith(`${hospital}\u0000`) && text.includes(name))
        assert.ok(known, `${report.id} 姓名对不上：${name}`)
      }
    }
    // 正文必须来自这家机构这位医生的原文单元格，逐行可回溯（署名已剥离，所以只要求是子串）。
    // 没有医生姓名的行（科室、专家会诊）按这一行自己的姓名格与备注、评价回溯。
    // 比较时去掉空白：姓名格的团队名、状态附注会与紧随其后的发言拼进同一段。
    const doctors = (report.doctor_name_raw ?? '').split('、').filter(Boolean)
    const source = [
      `${cells[3] ?? ''}\n${cells[4] ?? ''}\n${cells[5] ?? ''}`,
      ...doctors.map((doctor) => corpus.get(`${hospital}\u0000${doctor}`) ?? ''),
    ].join('\n').replace(/\s+/gu, '')
    // 该行没有备注也没有评价时，正文由姓名格、院名、诊室兜底拼接，不来自发言单元格。
    if (!cells[4] && !cells[5]) continue
    // 引文被人工改过时它本来就不再逐字来自单元格；改过的字样由 source_value 逐字对账守住。
    const quotePatched = overridden(report.id, 'evidence_quote') || overridden(report.id, 'evidence_full_text')
    for (const line of quotePatched ? [] : (report.evidence_full_text ?? report.evidence_quote).split('\n')) {
      const plain = line.replace(/^（[^）]*）/u, '').replace(/…$/u, '').replace(/\s+/gu, '').trim()
      if (plain.length < 2) continue
      // 该行没有备注也没有评价时，正文由院名 · 诊室 · 姓名兜底拼接，不来自任何单元格。
      if (plain.includes('·')) continue
      assert.ok(source.includes(plain), `${report.id} 无法回溯：${plain.slice(0, 40)}`)
    }
    assert.ok(report.evidence_quote.length >= 1 && report.evidence_quote.length <= 200)
    if (report.evidence_full_text) assert.ok(report.evidence_full_text.length <= 2000)
  }
})

test('工作表按病症分组，其他字段保持未知而不是编造', () => {
  // 病症分布说的是表格本身，控制台新增的线索不参与计数；被覆盖过病症的少数几条也不参与，
  // 否则人工改一条就把整组数字带偏。
  const grouped = faithful('disorders')
  const byDisorder = Object.fromEntries(['cptsd', 'osdd/did', 'pd'].map((group) => [
    group,
    grouped.filter((report) => report.disorders.join('/') === group).length,
  ]))
  // 一条线索最多只带一个病症组合，跨表同引文合并会带上另一张表的病症标签。
  assert.deepEqual(byDisorder, { cptsd: 82, 'osdd/did': 56, pd: 171 })
  assert.equal(grouped.filter((report) => report.disorders.includes('cptsd')).length, 88)
  assert.equal(grouped.filter((report) => report.disorders.includes('pd')).length, 179)
  for (const report of sourceReports) {
    // stage 只在没被覆盖时必须是 unknown：人工改过阶段就是层里那个值。
    if (!overridden(report.id, 'stage')) assert.equal(report.stage, 'unknown')
    assert.equal(report.published_at, undefined)
    assert.equal(report.published_at_precision, 'unknown')
    assert.equal(report.diagnosis_claimed, undefined)
    assert.equal(report.verification.level, 'unverified')
    assert.equal(report.experience, null)
    assert.equal(report.evidence_source, 'article')
    // 只有挂不上机构的线索不发布；姓名格写科室、团队、整段科室介绍的行也照样发布，
    // 名称用姓名格那串原文（见 m04980：它和具体医生一样上卡，诊室显示「无」）。
    // 作者要求拿掉某一条时改的是 status，那条不再算 published——这是发布与否的唯一出口。
    if (!report.hospital_id) {
      assert.equal(report.status, 'unlinked')
      assert.match(report.unlinked_reason, /^机构未定位：/u)
    } else if (overridden(report.id, 'status')) {
      assert.equal(report.unlinked_reason, undefined)
    } else {
      assert.equal(report.status, 'published')
      assert.equal(report.unlinked_reason, undefined)
      assert.equal(report.withheld_reason, undefined)
    }
    if (report.disorders.includes('pd')) assert.deepEqual(report.source_topics, ['人格障碍'])
    else assert.equal(report.source_topics, undefined)
  }
})

test('姓名格不是人名的行照原文当名称上卡，状态附注与整段介绍不冒充名称', () => {
  const quotes = sourceReports.map((report) => `${report.evidence_quote}\n${report.evidence_full_text ?? ''}`).join('\n')
  for (const note of ['触发风险', '目前进修中', '挂号要挂特需', '只会英语和德语', '首诊只有潘梁两位主任才能下诊断', '课题组', '团队']) {
    assert.ok(quotes.includes(note), note)
  }
  for (const report of sourceReports) {
    // 状态附注（「（特需）」「（退休）」）仍然剥掉：那是这一行的状态，不是名称的一部分。
    if (!overridden(report.id, 'doctor_name_raw')) {
      assert.doesNotMatch(report.doctor_name_raw ?? '', /触发风险|离职|退休|进修|特需/u)
    }
    assert.equal(report.doctor_title_raw, undefined)
    assert.equal(report.cost_cny, undefined)
    assert.equal(report.doctor_id, undefined)
  }
  // 姓名格写的是专病门诊、课题组、团队、专家会诊：这串原文就是这一行的名称，和医生一样上卡。
  const named = (id) => reports.find((report) => report.id === `kdocs-${id}`)?.doctor_name_raw
  if (!overridden('kdocs-s1-r2', 'doctor_name_raw')) assert.equal(named('s1-r2'), '创伤后应激障碍专病门诊')
  if (!overridden('kdocs-s1-r43', 'doctor_name_raw')) assert.equal(named('s1-r43'), '临床心理科/创伤专病门诊')
  if (!overridden('kdocs-s1-r50', 'doctor_name_raw')) assert.equal(named('s1-r50'), '朱鸿儒 课题组')
  if (!overridden('kdocs-s3-r49', 'doctor_name_raw')) assert.equal(named('s3-r49'), '专家会诊')
  if (!overridden('kdocs-s3-r51', 'doctor_name_raw')) assert.equal(named('s3-r51'), '黄佳团队')
  if (!overridden('kdocs-s3-r108', 'doctor_name_raw')) assert.equal(named('s3-r108'), '郑重 团队')
  // 整段科室介绍：名称取首个分句，整段原文仍在这条线索里，一个字都没丢。
  const intro = reports.find((report) => report.id === 'kdocs-s3-r109')
  if (!overridden(intro.id, 'doctor_name_raw')) assert.equal(intro.doctor_name_raw, '心身疾病一科设有“人格障碍专业组”')
  if (!overridden(intro.id, 'evidence_quote')) {
    assert.match(intro.evidence_quote, /^心身疾病一科设有“人格障碍专业组”，官网写明/u)
  }
  // 这九条都该有对应档案，诊室留空走「无」。名称被人工改过的记录按改后的名字查卡：
  // 「有没有卡」是质量断言，不因覆盖而免除，只是比对的名字换成库里那条。
  const expecting = [
    ['s1-r2', '创伤后应激障碍专病门诊'],
    ['s1-r43', '临床心理科/创伤专病门诊'],
    ['s1-r50', '朱鸿儒 课题组'],
    ['s3-r49', '专家会诊'],
    ['s3-r51', '黄佳团队'],
    ['s3-r108', '郑重 团队'],
    ['s3-r109', intro.doctor_name_raw],
  ]
  for (const [id, expectedName] of expecting) {
    const reportId = `kdocs-${id}`
    const name = overridden(reportId, 'doctor_name_raw')
      ? reports.find((report) => report.id === reportId)?.doctor_name_raw
      : expectedName
    assert.ok(name, reportId)
    const profile = doctors.find((doctor) => doctor.name === name)
    assert.ok(profile, name)
    assert.equal(profile.department, '')
  }
})

test('医生档案只由表格里的诊室、备注、评价生成，且都能落到已定位机构', { skip: !hasSnapshot }, () => {
  const hospitalIds = new Set(readJson('data/curated/hospitals.json').items.map((item) => item.id))
  assert.equal(doctors.length, 252)
  assert.deepEqual(doctors, applyStoredOverrides('doctors', doctorsWithLocations(document, expected)))
  for (const doctor of doctors) {
    assert.match(doctor.id, /^kdocs-doctor-[0-9a-f]{12}$/)
    assert.ok(hospitalIds.has(doctor.hospital_id), doctor.hospital_id)
    // 表里没写的字段留空，界面走「无」；不留「未录入」这类录入过程用语
    assert.equal(doctor.title, '')
    assert.doesNotMatch(`${doctor.department}${doctor.title}`, /未录入|未知|暂无/u)
    // 整批导入日不是逐人核对日，没有依据就不写日期
    assert.equal(doctor.last_verified_at, undefined)
  }
  assert.equal(doctors.filter((doctor) => !doctor.department).length, 132)
  assert.equal(new Set(doctors.map((doctor) => doctor.id)).size, doctors.length)
  assert.equal(doctors.filter((doctor) => doctor.evaluation).length, 64)
  assert.equal(doctors.filter((doctor) => doctor.note).length, 63)
  // 评价是不是某条线索原文的复制：前端只拿到 200 字预览，比对会漏判，所以判定放在数据层。
  // 有评价的 64 位里 43 位评价够长（≥20 字），最长连续共享片段都达到评价长度的 70% 以上。
  const longEvaluation = doctors.filter((doctor) => (doctor.evaluation ?? '').replace(/\s+/gu, '').length >= 20)
  assert.equal(longEvaluation.length, 43)
  assert.equal(longEvaluation.filter((doctor) => doctor.evaluation_echoes_report === true).length, 43)
  assert.equal(longEvaluation.filter((doctor) => doctor.evaluation_echoes_report !== true).length, 0)
  // 太短的评价不参与判定，也就不写这个键：整段都在原文里也只是短语撞车，不该吞掉真实评价
  const shortEvaluation = doctors.filter((doctor) => doctor.evaluation && doctor.evaluation.replace(/\s+/gu, '').length < 20)
  assert.equal(shortEvaluation.length, 21)
  assert.ok(shortEvaluation.every((doctor) => doctor.evaluation_echoes_report === undefined))
  // 姓名格空着的行也发布：名称取同一格的诊室（武汉二七院区那条），否则这条反馈挂不上任何卡片。
  // 现在每条线索都有名称，没有无主的线索了。
  const noName = sourceReports.filter((report) => !report.doctor_name_raw)
  assert.equal(noName.length, 0)
  // 回龙观：13 行共 24 条发言，全部发布；其中 3 条的名称是姓名格写的「创伤后应激障碍专病门诊」。
  // 按转写行归组，不按当前 hospital_id：院名可被人工改，机构退役时线索会被改挂别处，
  // 但「表格里这 24 行属于回龙观」是转写事实，不该随关联漂移。看到数字变小先查改挂，不是断言错。
  const huilongguan = reportsWithLocations(document).filter((report) => report.hospital_id === 'kdocs-amap-b000a0989a')
  assert.equal(huilongguan.length, 24)
  assert.equal(huilongguan.filter((report) => report.status === 'published').length, 24)
  assert.equal(
    faithful('doctor_name_raw').filter((report) => report.doctor_name_raw === '创伤后应激障碍专病门诊').length,
    3,
  )
  // 合并过的线索记下合并前的发言条数，单条不写 1：只剩「两张表抄了同一句话」这一类
  const merged = sourceReports.filter((report) => report.parts_count)
  assert.equal(merged.length, 10)
  assert.ok(merged.every((report) => report.parts_count >= 2))
  assert.equal(merged.reduce((total, report) => total + report.parts_count, 0), 20)
  // 合并后正文里不该留下同一句重复两遍
  for (const report of merged) {
    const lines = (report.evidence_full_text ?? report.evidence_quote).split('\n').map((line) => line.trim()).filter(Boolean)
    assert.equal(new Set(lines).size, lines.length, `${report.id} 正文有重复行`)
  }
  // 评价里点到别的医生，不改变这一行属于谁：梁红那行就是梁红，潘伟刚只在自己那行出现一次。
  // 曾经按人工表把这行补成「潘伟刚、梁红」，结果同一个人在医院页并排两张卡。
  if (!overridden('kdocs-s1-r4', 'doctor_name_raw')) {
    assert.equal(reports.find((report) => report.id === 'kdocs-s1-r4').doctor_name_raw, '梁红')
  }
  // 梁红那一行有四位用户各说一段，加上备注共五条线索
  const liang = reports.filter((report) => /-s1-r4(?:-p\d+)?$/u.test(report.id))
  assert.deepEqual(liang.map((report) => report.id.slice(-6)), ['-s1-r4', '-r4-p2', '-r4-p3', '-r4-p4', '-r4-p5'])
  assert.equal(faithful('doctor_name_raw').filter((report) => (report.doctor_name_raw ?? '').split('、').includes('潘伟刚')).length, 1)
  const pan = doctors.find((doctor) => doctor.name === '潘伟刚')
  assert.ok(pan)
  assert.doesNotMatch(pan.evaluation ?? '', /挂了梁红的/u)
})

test('保真断言的让路只发给覆盖层里真实存在的字段', () => {
  // 让路是绕过保真断言的唯一通道，所以它必须能被对账：每条 patch 覆盖都要命中一条真线索，
  // 每条被让路的记录都要有一份覆盖文件。少一份就说明名单与实际脱节了。
  for (const record of reportOverrides) {
    assert.ok(
      reports.some((report) => report.id === record.id),
      `覆盖层指向了不存在的线索：${record.id}`,
    )
    if (record.action !== 'patch') continue
    assert.ok(reportOverrideFields.get(record.id).size > 0, `${record.id} 的 patch 没有任何字段`)
  }
  const skipped = patchedIds.filter((id) => reportOverrideFields.get(id).size > 0)
  assert.equal(skipped.length, reportOverrides.filter((record) => record.action === 'patch').length)
})

test('已发布线索点到的每个名称，在那家医院都有卡可点开', () => {
  const cards = new Set(doctors.map((doctor) => `${doctor.hospital_id}\u0000${doctor.name}`))
  const missing = []
  for (const report of reports) {
    if (report.status !== 'published' || !report.hospital_id) continue
    for (const name of (report.doctor_name_raw ?? '').split(/[、,，]/u).map((part) => part.trim()).filter(Boolean)) {
      if (!cards.has(`${report.hospital_id}\u0000${name}`)) missing.push(`${report.id} → ${name}`)
    }
  }
  assert.deepEqual(missing, [])
})

test('机构清单等于本轮定位依据加覆盖层，未定位的 1 条线索保留院名而不编造坐标', () => {
  // 控制台新增的医院只存在覆盖层里，所以比对基准是「定位依据 + 覆盖层」，与 validate-data 一致。
  assert.deepEqual(
    readJson('data/curated/hospitals.json').items,
    existsSync(LOCATION_EVIDENCE)
      ? applyStoredOverrides('hospitals', hospitalsFromRun(readJson(LOCATION_EVIDENCE)))
      : [],
  )
  // 机构数从两个互相独立的来源对账：左边是烘焙产物（curated/hospitals.json），
  // 右边是定位依据里的机构数减去覆盖层的 remove 墓碑（各自读各自的文件）。
  // 两边读同一个派生值就成了自证，所以这里刻意不拿 applyStoredOverrides 的结果当基准。
  const evidenceHospitals = existsSync(LOCATION_EVIDENCE) ? hospitalsFromRun(readJson(LOCATION_EVIDENCE)) : []
  assert.equal(evidenceHospitals.length, 127)
  const removedHospitals = existsSync('data/overrides/hospitals')
    ? readdirSync('data/overrides/hospitals')
      .filter((file) => file.endsWith('.json'))
      .map((file) => readJson(resolve('data/overrides/hospitals', file)))
      .filter((record) => record.action === 'remove')
      .map((record) => record.id)
    : []
  assert.deepEqual(
    removedHospitals.filter((id) => !evidenceHospitals.some((hospital) => hospital.id === id)),
    [],
    '墓碑指向了定位依据里不存在的机构',
  )
  // 控制台新增的医院带 local- 前缀，另行计数：它们不在定位依据里。
  assert.equal(
    readJson('data/curated/hospitals.json').items.filter((item) => !item.id.startsWith('local-')).length,
    evidenceHospitals.length - removedHospitals.length,
  )
  const unlocated = reports.filter((report) => !report.hospital_id)
  assert.equal(unlocated.length, 1)
  assert.ok(unlocated.every((report) => report.hospital_name_raw && report.hospital_region))
  assert.equal(readJson('data/curated/provinces.json').items.length, 34)
  assert.equal(readJson('data/curated/disorders.json').items.length, 7)
  assert.ok(!existsSync('data/evidence/manifest.json'))
  assert.ok(!existsSync('data/evidence/xiaohongshu'))
  assert.deepEqual(existsSync('data/runs') ? readdirSync('data/runs') : [], [])
  for (const report of reports) {
    // 源转写的 id 来自 kdocs；控制台新增的按约定带 local- 前缀，两种都算合法来源。
    assert.match(report.id, /^(?:kdocs-|local-)/)
    if (report.hospital_id) assert.match(report.hospital_id, /^kdocs-amap-/)
    assert.doesNotMatch(JSON.stringify(report), /xiaohongshu|xsec_token|author_|parent_author|reply_to_author|ip_location|retired-2026/u)
  }
  for (const folder of ['data/curated', 'data/generated', 'data/evidence']) {
    for (const file of readdirSync(folder, { recursive: true })) {
      if (String(file).endsWith('.json')) assert.doesNotMatch(readFileSync(resolve(folder, String(file)), 'utf8'), /xiaohongshu\.com|xsec_token|parent_author|reply_to_author|ip_location/u)
    }
  }
})

test('常规构建与校验命令不再调用退役的采集入口', () => {
  const scripts = readJson('package.json').scripts
  for (const name of ['prebuild', 'data:validate', 'data:build', 'data:stats']) assert.doesNotMatch(scripts[name], /scripts\/collect|fix-privacy|data\/raw/u)
  assert.ok(!Object.keys(scripts).some((name) => name.startsWith('collect:') || name === 'evidence:manifest' || name === 'audit:sources'))
})

test('校验器拒绝私人标识与改动过的引文，并拒绝结构不成立的工作表', { skip: !hasSnapshot }, () => {
  mkdirSync('tmp', { recursive: true })
  const fixture = mkdtempSync(resolve('tmp/data-source-'))
  try {
    cpSync('data/curated', resolve(fixture, 'data/curated'), { recursive: true })
    // 覆盖层也得一起搬：curated 是「源转写 + 覆盖层」烘焙出来的，只搬一半校验器必然对不上。
    if (existsSync('data/overrides')) cpSync('data/overrides', resolve(fixture, 'data/overrides'), { recursive: true })
    mkdirSync(resolve(fixture, SOURCE_CAPTURE, '..'), { recursive: true })
    cpSync(SOURCE_CAPTURE, resolve(fixture, SOURCE_CAPTURE))
    if (existsSync(LOCATION_EVIDENCE)) {
      mkdirSync(resolve(fixture, LOCATION_EVIDENCE, '..'), { recursive: true })
      cpSync(LOCATION_EVIDENCE, resolve(fixture, LOCATION_EVIDENCE))
    }
    const file = readJson('data/curated/reports.json')
    file.items[0].source_url = 'https://www.xiaohongshu.com/explore/69f19ded0000000036003cb5'
    file.items[0].evidence_context.parent_author = 'test-private-identity'
    writeFileSync(resolve(fixture, 'data/curated/reports.json'), JSON.stringify(file))
    const result = spawnSync(process.execPath, [resolve('scripts/validate-data.ts')], { cwd: fixture, encoding: 'utf8' })
    assert.equal(result.status, 1)
    assert.match(result.stderr, /公开数据不得包含私人标识/u)
    assert.match(result.stderr, /与主线表格转写不一致/u)

    cpSync('data/curated/reports.json', resolve(fixture, 'data/curated/reports.json'))
    const validateSheets = (source) => {
      writeFileSync(resolve(fixture, SOURCE_CAPTURE), JSON.stringify(source))
      return spawnSync(process.execPath, [resolve('scripts/validate-data.ts')], { cwd: fixture, encoding: 'utf8' })
    }
    assert.equal(validateSheets(document).status, 0)
    for (const source of [
      { ...document, sheets: [] },
      { ...document, sheets: document.sheets.map((sheet, index) => ({ ...sheet, index: index + 3 })) },
      { ...document, sheets: document.sheets.map((sheet, index) => (index === 1 ? { ...sheet, values: sheet.values.slice(0, 1) } : sheet)) },
    ]) {
      const invalid = validateSheets(source)
      assert.equal(invalid.status, 1)
      assert.match(invalid.stderr, /按工作表顺序包含表头与全部数据行/u)
    }
  } finally {
    assert.ok(fixture.startsWith(`${resolve('tmp')}/`) || fixture.startsWith(`${resolve('tmp')}\\`))
    rmSync(fixture, { recursive: true })
  }
})

test('昵称独占一行时剥掉，标注前缀不当成第二个人', () => {
  // 原表里常有一格写成「昵称 / 换行 / repo：正文」：昵称不带冒号，正文开头是标注。
  // 以前把「短词 + 冒号」一律当署名，会切出一条只剩昵称的假评价（页面上就是一张只有两个字的卡）。
  assert.deepEqual(
    evaluationComments('尘尘\nrepo：厦门仙岳医院吴为阁医生对创伤有了解\n09-16\n治疗方法倾向于CBT'),
    ['repo：厦门仙岳医院吴为阁医生对创伤有了解\n09-16\n治疗方法倾向于CBT'],
  )
  assert.deepEqual(
    evaluationComments('兰因\n回复 momo : 我只去了一次心理咨询'),
    ['回复 momo : 我只去了一次心理咨询'],
  )
  // 正文中间冒出来的「补一个费用前提：」不是换了个人，但它另起一段：
  // 并进上一条会让这段费用信息只剩在全文里，卡片上看不到（cptsd 第 33 行就是这么丢的）。
  assert.deepEqual(
    evaluationComments('鲸鲸小冰\n来repo一下。\n补一个费用前提：前面做过检查可以沿用'),
    ['来repo一下。', '补一个费用前提：前面做过检查可以沿用'],
  )
  // 一格里真有两个人说话，仍然按署名分开
  assert.deepEqual(evaluationComments('alice：我去了\nbob：我也去过'), ['我去了', '我也去过'])
})

test('平台专长介绍不进线索，落到医生档案的 specialties', () => {
  // 备注格里的「第三方页面显示擅长…」说的是平台怎么写这位医生，不是病友的就诊经历。
  // 当成线索会拿宣传语当病友的话；而且这一行后面若还有作者自己补的话，那句话才是线索。
  const mini = {
    captured_at: '2026-11-09T00:00:00Z',
    sheets: [
      {
        index: 0,
        name: 'cptsd',
        merges: [],
        values: [
          ['地区', '医院名称', '诊室', '姓名', '备注', '评价'],
          ['海南', '海南安宁医院', '精神科', '刘向来', '第三方页面显示擅长创伤后应激障碍、多重人格等', ''],
          ['海南', '海南省安宁医院', '精神科', '张三', '第三方页面显示擅长创伤后应激障碍', '这位医生问得很细'],
        ],
      },
    ],
  }
  const produced = reportsFromDocument(mini)
  assert.equal(produced.length, 1, '只有一句平台专长介绍的行不该产出线索')
  assert.equal(produced[0].evidence_quote, '这位医生问得很细')
  assert.ok(!produced.some((report) => /^第三方页面显示/u.test(report.evidence_quote)))

  // 专长从同一句里解析，尾巴（「等疾病的诊治」「等，出版有…」）要剥掉，引号要脱掉
  assert.deepEqual(specialtiesFromNote('第三方页面显示擅长创伤后应激障碍、多重人格等'), ['创伤后应激障碍', '多重人格'])
  assert.deepEqual(
    specialtiesFromNote('第三方页面显示擅长“创伤应激障碍”'),
    ['创伤应激障碍'],
  )
  assert.deepEqual(
    specialtiesFromNote('第三方页面显示擅长精神分裂症、心境障碍、焦虑、失眠、抑郁、多重人格障碍、分离性障碍等疾病的诊治。'),
    ['精神分裂症', '心境障碍', '焦虑', '失眠', '抑郁', '多重人格障碍', '分离性障碍'],
  )
  assert.deepEqual(
    specialtiesFromNote('第三方页面显示擅长自恋型人格障碍、边缘型人格障碍、摄食障碍、创伤后应激障碍等，出版有《人格障碍的心理咨询与治疗》等书籍'),
    ['自恋型人格障碍', '边缘型人格障碍', '摄食障碍', '创伤后应激障碍'],
  )
  assert.deepEqual(specialtiesFromNote('有小红书账号，初诊只在国际部'), [], '普通备注不解析成专长')
})

test('已发布线索的引文不会是一句平台专长介绍', () => {
  const offenders = reports
    .filter((report) => report.status === 'published' && /^第三方页面显示/u.test(report.evidence_quote ?? ''))
    .map((report) => report.id)
  assert.deepEqual(offenders, [], '平台专长介绍不是病友的话，不能当线索')
  // 这七条搬进档案之后，那几位医生的专长要有值，否则等于信息丢了
  for (const name of ['杨晓敏', '李刚', '吴为阁', '刘向来', '钟华清', '许明智']) {
    const found = doctors.filter((doctor) => doctor.name === name)
    assert.ok(found.length > 0, `${name} 的档案不该消失`)
    assert.ok(found.some((doctor) => doctor.specialties.length > 0), `${name} 的专长要落到 specialties`)
  }
})
