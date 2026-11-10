import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, cpSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { evaluationComments, reportsFromDocument, reportsWithLocations, doctorsWithLocations, SOURCE_CAPTURE, SOURCE_TITLE, SOURCE_URL } from '../scripts/import-kdocs.ts'
import { doctorsFileSchema, reportsFileSchema } from '../lib/schema.ts'
import { LOCATION_EVIDENCE } from '../scripts/lib/amap.ts'
import { hospitalsFromRun } from '../scripts/geocode-hospitals.ts'

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))
const document = readJson(SOURCE_CAPTURE)
const reports = readJson('data/curated/reports.json').items
const doctors = readJson('data/curated/doctors.json').items
const expected = reportsWithLocations(document)

/** 姓名格不是人名、或姓名格空着的行：它们照样是线索，名称取姓名格原文（姓名格空时取诊室那一格）。 */
const subjectIds = new Set([
  'kdocs-cp3b7toqal3j-s1-r2',
  'kdocs-cp3b7toqal3j-s1-r2-p2',
  'kdocs-cp3b7toqal3j-s1-r2-p3',
  'kdocs-cp3b7toqal3j-s1-r43',
  'kdocs-cp3b7toqal3j-s1-r50',
  'kdocs-cp3b7toqal3j-s3-r49',
  'kdocs-cp3b7toqal3j-s3-r51',
  'kdocs-cp3b7toqal3j-s3-r108',
  'kdocs-cp3b7toqal3j-s3-r109',
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

test('三张工作表与每一行有内容的记录都进了库', () => {
  assert.equal(document.url, SOURCE_URL)
  assert.equal(document.title, SOURCE_TITLE)
  assert.deepEqual(document.sheets.map((sheet) => sheet.name), ['cptsd', 'osdd-did', '人格障碍'])
  assert.deepEqual(document.sheets.map((sheet) => sheet.values.length), [57, 55, 184])
  const perSheet = Object.fromEntries(document.sheets.map((sheet, index) => [
    index + 1,
    reports.filter((report) => report.id.includes(`-s${index + 1}-`)).length,
  ]))
  // 线索单位是「一条发言」：备注单独一条，评价里每位署名的用户各一条；
  // 无名分的多行仍在同一格里属同一条长评。跨行、跨表一律不合并。
  assert.deepEqual(perSheet, { 1: 90, 2: 63, 3: 174 })
  assert.equal(reports.length, 327)
  assert.equal(reportsFromDocument(document).length, 327)
  // 合并必须可重放：同一份文档跑两遍得到同一组 id，定位表与断言样本才不会抖。
  assert.deepEqual(reportsFromDocument(document).map((report) => report.id), reports.map((report) => report.id))
  assert.deepEqual(reports, expected)
  assert.equal(reportsFileSchema.safeParse(readJson('data/curated/reports.json')).success, true)
  assert.equal(doctorsFileSchema.safeParse(readJson('data/curated/doctors.json')).success, true)
})

test('每条线索都能回溯到同一张表的同一单元格', () => {
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
  for (const report of reports) {
    assert.equal(report.source_url, SOURCE_URL)
    assert.equal(report.source_post_id, 'cp3b7ToQAl3J')
    assert.equal(report.evidence_context.note_title, document.title)
    assert.equal(report.evidence_context.capture_scope, SOURCE_CAPTURE)
    const [, sheetIndex, excelRow] = report.id.match(/-s(\d+)-r(\d+)(?:-p\d+)?$/u).map(Number)
    const sheet = document.sheets[sheetIndex - 1]
    assert.equal(report.evidence_context.index_in_capture, `${sheet.name} · 第${excelRow}行`)
    const { region, hospital, cells } = filledRow(sheetIndex, excelRow)
    assert.equal(report.hospital_name_raw, hospital)
    if (region) assert.equal(report.hospital_region, region)
    // 诊室只跟具体医生走：姓名格不是人名时，C 列那句话是这个主体的名称或科室归属，
    // 不再写进 department，界面才按「无」显示。
    if (subjectIds.has(report.id.replace(/-p\d+$/u, ''))) assert.equal(report.department, undefined)
    else if (cells[2]) assert.equal(report.department, cells[2])
    // 同一段话在两张表里各抄了一遍时，会被合成一条、姓名栏写成「甲、乙」，
    // 名字可能来自同院另一行，所以要逐个核对，而不是整串出现在这一格里。
    if (cells[3] && report.doctor_name_raw) {
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
    for (const line of (report.evidence_full_text ?? report.evidence_quote).split('\n')) {
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
  const byDisorder = Object.fromEntries(['cptsd', 'osdd/did', 'pd'].map((group) => [
    group,
    reports.filter((report) => report.disorders.join('/') === group).length,
  ]))
  // 一条线索最多只带一个病症组合，跨表同引文合并会带上另一张表的病症标签。
  assert.deepEqual(byDisorder, { cptsd: 84, 'osdd/did': 59, pd: 174 })
  assert.equal(reports.filter((report) => report.disorders.includes('cptsd')).length, 90)
  assert.equal(reports.filter((report) => report.disorders.includes('pd')).length, 183)
  for (const report of reports) {
    assert.equal(report.stage, 'unknown')
    assert.equal(report.published_at, undefined)
    assert.equal(report.published_at_precision, 'unknown')
    assert.equal(report.diagnosis_claimed, undefined)
    assert.equal(report.verification.level, 'unverified')
    assert.equal(report.experience, null)
    assert.equal(report.evidence_source, 'article')
    // 只有挂不上机构的线索不发布；姓名格写科室、团队、整段科室介绍的行也照样发布，
    // 名称用姓名格那串原文（见 m04980：它和具体医生一样上卡，诊室显示「无」）。
    if (!report.hospital_id) {
      assert.equal(report.status, 'unlinked')
      assert.match(report.unlinked_reason, /^机构未定位：/u)
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
  const quotes = reports.map((report) => `${report.evidence_quote}\n${report.evidence_full_text ?? ''}`).join('\n')
  for (const note of ['触发风险', '目前进修中', '挂号要挂特需', '只会英语和德语', '首诊只有潘梁两位主任才能下诊断', '课题组', '团队']) {
    assert.ok(quotes.includes(note), note)
  }
  for (const report of reports) {
    // 状态附注（「（特需）」「（退休）」）仍然剥掉：那是这一行的状态，不是名称的一部分。
    assert.doesNotMatch(report.doctor_name_raw ?? '', /触发风险|离职|退休|进修|特需/u)
    assert.equal(report.doctor_title_raw, undefined)
    assert.equal(report.cost_cny, undefined)
    assert.equal(report.doctor_id, undefined)
  }
  // 姓名格写的是专病门诊、课题组、团队、专家会诊：这串原文就是这一行的名称，和医生一样上卡。
  const named = (id) => reports.find((report) => report.id === `kdocs-cp3b7toqal3j-${id}`)?.doctor_name_raw
  assert.equal(named('s1-r2'), '创伤后应激障碍专病门诊')
  assert.equal(named('s1-r43'), '临床心理科/创伤专病门诊')
  assert.equal(named('s1-r50'), '朱鸿儒 课题组')
  assert.equal(named('s3-r49'), '专家会诊')
  assert.equal(named('s3-r51'), '黄佳团队')
  assert.equal(named('s3-r108'), '郑重 团队')
  // 整段科室介绍：名称取首个分句，整段原文仍在这条线索里，一个字都没丢。
  const intro = reports.find((report) => report.id === 'kdocs-cp3b7toqal3j-s3-r109')
  assert.equal(intro.doctor_name_raw, '心身疾病一科设有“人格障碍专业组”')
  assert.match(intro.evidence_quote, /^心身疾病一科设有“人格障碍专业组”，官网写明/u)
  // 这九条都该有对应档案，诊室留空走「无」。
  for (const name of ['创伤后应激障碍专病门诊', '临床心理科/创伤专病门诊', '朱鸿儒 课题组', '专家会诊', '黄佳团队', '郑重 团队', intro.doctor_name_raw]) {
    const profile = doctors.find((doctor) => doctor.name === name)
    assert.ok(profile, name)
    assert.equal(profile.department, '')
  }
})

test('医生档案只由表格里的诊室、备注、评价生成，且都能落到已定位机构', () => {
  const hospitalIds = new Set(readJson('data/curated/hospitals.json').items.map((item) => item.id))
  assert.equal(doctors.length, 252)
  assert.deepEqual(doctors, doctorsWithLocations(document, expected))
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
  const noName = reports.filter((report) => !report.doctor_name_raw)
  assert.equal(noName.length, 0)
  // 回龙观：13 行共 24 条发言，全部发布；其中 3 条的名称是姓名格写的「创伤后应激障碍专病门诊」。
  const huilongguan = reports.filter((report) => report.hospital_name_raw === '北京回龙观医院')
  assert.equal(huilongguan.length, 24)
  assert.equal(huilongguan.filter((report) => report.status === 'published').length, 24)
  assert.equal(huilongguan.filter((report) => report.doctor_name_raw === '创伤后应激障碍专病门诊').length, 3)
  // 合并过的线索记下合并前的发言条数，单条不写 1：只剩「两张表抄了同一句话」这一类
  const merged = reports.filter((report) => report.parts_count)
  assert.equal(merged.length, 11)
  assert.ok(merged.every((report) => report.parts_count >= 2))
  assert.equal(merged.reduce((total, report) => total + report.parts_count, 0), 22)
  // 合并后正文里不该留下同一句重复两遍
  for (const report of merged) {
    const lines = (report.evidence_full_text ?? report.evidence_quote).split('\n').map((line) => line.trim()).filter(Boolean)
    assert.equal(new Set(lines).size, lines.length, `${report.id} 正文有重复行`)
  }
  // 评价里点到别的医生，不改变这一行属于谁：梁红那行就是梁红，潘伟刚只在自己那行出现一次。
  // 曾经按人工表把这行补成「潘伟刚、梁红」，结果同一个人在医院页并排两张卡。
  assert.equal(reports.find((report) => report.id === 'kdocs-cp3b7toqal3j-s1-r4').doctor_name_raw, '梁红')
  // 梁红那一行有四位用户各说一段，加上备注共五条线索
  const liang = reports.filter((report) => /-s1-r4(?:-p\d+)?$/u.test(report.id))
  assert.deepEqual(liang.map((report) => report.id.slice(-6)), ['-s1-r4', '-r4-p2', '-r4-p3', '-r4-p4', '-r4-p5'])
  assert.equal(reports.filter((report) => (report.doctor_name_raw ?? '').split('、').includes('潘伟刚')).length, 1)
  const pan = doctors.find((doctor) => doctor.name === '潘伟刚')
  assert.ok(pan)
  assert.doesNotMatch(pan.evaluation ?? '', /挂了梁红的/u)
})

test('机构清单等于本轮定位依据，未定位的 1 条线索保留院名而不编造坐标', () => {
  assert.deepEqual(readJson('data/curated/hospitals.json').items, existsSync(LOCATION_EVIDENCE) ? hospitalsFromRun(readJson(LOCATION_EVIDENCE)) : [])
  assert.equal(readJson('data/curated/hospitals.json').items.length, 127)
  const unlocated = reports.filter((report) => !report.hospital_id)
  assert.equal(unlocated.length, 1)
  assert.ok(unlocated.every((report) => report.hospital_name_raw && report.hospital_region))
  assert.equal(readJson('data/curated/provinces.json').items.length, 34)
  assert.equal(readJson('data/curated/disorders.json').items.length, 7)
  assert.ok(!existsSync('data/evidence/manifest.json'))
  assert.ok(!existsSync('data/evidence/xiaohongshu'))
  assert.deepEqual(existsSync('data/runs') ? readdirSync('data/runs') : [], [])
  for (const report of reports) {
    assert.match(report.id, /^kdocs-cp3b7toqal3j-/)
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

test('校验器拒绝私人标识与改动过的引文，并拒绝结构不成立的工作表', () => {
  mkdirSync('tmp', { recursive: true })
  const fixture = mkdtempSync(resolve('tmp/data-source-'))
  try {
    cpSync('data/curated', resolve(fixture, 'data/curated'), { recursive: true })
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
