import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, cpSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { evaluationComments, reportsFromDocument, reportsWithLocations, doctorsWithLocations, specialtiesFromNote, sourceRows, SOURCE_CAPTURE } from '../scripts/import-kdocs.ts'
import { doctorsFileSchema, reportsFileSchema } from '../lib/schema.ts'
import { LOCATION_EVIDENCE } from '../scripts/lib/amap.ts'
import { hospitalsFromRun, withManualCoordinates } from '../scripts/lib/hospitals.ts'
import { MANUAL_LOCATION_FILE, readManualLocations } from '../scripts/lib/locations.ts'
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

test('三张工作表与每一行有内容的记录都进了库', { skip: !hasSnapshot }, () => {
  // 快照里有什么不管，落到 curated 的一律不带表名与地址。
  assert.ok(sourceReports.every((report) => report.source_url === undefined))
  assert.ok(sourceReports.every((report) => report.evidence_context?.note_title === undefined))
  assert.deepEqual(document.sheets.map((sheet) => sheet.name), ['cptsd', 'osdd-did', '人格障碍'])
  assert.deepEqual(document.sheets.map((sheet) => sheet.values.length), [133, 87, 242])
  const perSheet = Object.fromEntries(document.sheets.map((sheet, index) => [
    index + 1,
    sourceReports.filter((report) => report.id.includes(`-s${index + 1}-`)).length,
  ]))
  assert.deepEqual(perSheet, { 1: 130, 2: 82, 3: 236 })
  assert.equal(sourceReports.length, 448)
  assert.equal(reportsFromDocument(document).length, 448)
  // 合并必须可重放：同一份文档跑两遍得到同一组 id，定位表与断言样本才不会抖。
  assert.deepEqual(reportsFromDocument(document).map((report) => report.id), sourceReports.map((report) => report.id))
  // 整份 curated 必须等于「源转写 + 覆盖层」，多一条少一条都是覆盖层没烘焙。
  assert.deepEqual(reports, expected)
  assert.equal(reportsFileSchema.safeParse(readJson('data/curated/reports.json')).success, true)
  assert.equal(doctorsFileSchema.safeParse(readJson('data/curated/doctors.json')).success, true)
})

test('线索按原始行回溯，只有明确出现或合并的地区才用于定位', { skip: !hasSnapshot }, () => {
  const rows = new Map(sourceRows(document).map(row => [row.reportId, row]))
  assert.equal(rows.size, 454)
  for (const report of sourceReports) {
    const row = rows.get(report.id)
    assert.ok(row, report.id)
    assert.equal(report.evidence_context.index_in_capture, `${row.sheet} · 第${row.row}行`)
    assert.equal(report.source_url, undefined)
    assert.equal(report.source_post_id, undefined)
    assert.equal(report.evidence_context.note_title, undefined)
    assert.equal(report.evidence_context.capture_scope, undefined)
    assert.equal(report.parts_count, undefined)
    if (!overridden(report.id, 'hospital_name_raw')) assert.equal(report.hospital_name_raw, row.hospital)
    if (!overridden(report.id, 'hospital_region')) assert.equal(report.hospital_region, row.region || undefined)
    if (!overridden(report.id, 'department')) assert.equal(report.department, row.department || undefined)
    if (!overridden(report.id, 'doctor_name_raw')) assert.equal(report.doctor_name_raw, row.doctors.join('、') || undefined)
    assert.ok(report.evidence_quote.length <= 200)
    if (report.evidence_full_text) assert.ok(report.evidence_full_text.length <= 2000)
  }
  assert.equal(rows.get('kdocs-s1-r64').region, '湖南')
  assert.equal(rows.get('kdocs-s1-r66').region, '')
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
  assert.deepEqual(byDisorder, { cptsd: 130, 'osdd/did': 82, pd: 236 })
  assert.equal(grouped.filter((report) => report.disorders.includes('cptsd')).length, 130)
  assert.equal(grouped.filter((report) => report.disorders.includes('pd')).length, 236)
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

test('同格多人各有档案，名单线索按原始行保留为一条', { skip: !hasSnapshot }, () => {
  assert.equal(document.doctor_rosters.length, 35)
  assert.equal(document.doctor_rosters.reduce((sum, row) => sum + row.names.length, 0), 102)
  const cards = new Set(doctors.map(doctor => `${doctor.hospital_id}\u0000${doctor.name}`))
  for (const { sheet, row, names } of document.doctor_rosters) {
    const found = sourceReports.filter(report => report.evidence_context.index_in_capture === `${sheet} · 第${row}行`)
    assert.equal(found.length, 1)
    const [report] = found
    assert.equal(report.doctor_name_raw, names.join('、'))
    if (report.hospital_id) for (const name of names) assert.ok(cards.has(`${report.hospital_id}\u0000${name}`))
  }
})

test('医生档案与本批线索、定位和覆盖层可完整重放', { skip: !hasSnapshot }, () => {
  const hospitalIds = new Set(readJson('data/curated/hospitals.json').items.map(item => item.id))
  assert.deepEqual(doctors, applyStoredOverrides('doctors', doctorsWithLocations(document, expected)))
  assert.equal(new Set(doctors.map(doctor => doctor.id)).size, doctors.length)
  for (const doctor of doctors) {
    assert.match(doctor.id, /^kdocs-doctor-[0-9a-f]{12}$/)
    assert.ok(hospitalIds.has(doctor.hospital_id), doctor.hospital_id)
    assert.equal(doctor.title, '')
    assert.doesNotMatch(`${doctor.department}${doctor.title}`, /未录入|未知|暂无/u)
    assert.equal(doctor.last_verified_at, undefined)
    if ((doctor.evaluation ?? '').replace(/\s+/gu, '').length < 20) assert.equal(doctor.evaluation_echoes_report, undefined)
  }
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

test('机构清单等于本轮定位依据加覆盖层，未定位的线索保留院名而不编造坐标', () => {
  // 控制台新增的医院只存在覆盖层里，所以比对基准是「定位依据 + 覆盖层」，与 validate-data 一致。
  assert.deepEqual(
    readJson('data/curated/hospitals.json').items,
    existsSync(LOCATION_EVIDENCE)
      ? withManualCoordinates(applyStoredOverrides('hospitals', hospitalsFromRun(readJson(LOCATION_EVIDENCE))), readManualLocations())
      : [],
  )
  // 机构数从两个互相独立的来源对账：左边是烘焙产物（curated/hospitals.json），
  // 右边是定位依据里的机构数减去覆盖层的 remove 墓碑（各自读各自的文件）。
  // 两边读同一个派生值就成了自证，所以这里刻意不拿 applyStoredOverrides 的结果当基准。
  const evidenceHospitals = existsSync(LOCATION_EVIDENCE) ? hospitalsFromRun(readJson(LOCATION_EVIDENCE)) : []
  assert.equal(evidenceHospitals.length, 159)
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
  assert.equal(unlocated.length, 14)
  assert.ok(unlocated.every((report) => report.hospital_name_raw && report.status === 'unlinked'))
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

test('本批同一原文行的段落保留顺序，跨行同文不合并', () => {
  const sample = ['北京', '甲医院', '', '张三', '', 'alice：第一段\nbob：第二段']
  const mini = { captured_at: '2026-11-21T00:00:00Z', region_mode: 'explicit', sheets: [{index: 0, name: 'cptsd', merges: [], values: [
    ['地区', '医院名称', '诊室', '姓名', '备注', '评价'], sample, sample,
  ]}] }
  const items = reportsFromDocument(mini)
  assert.equal(items.length, 2)
  assert.notEqual(items[0].id, items[1].id)
  for (const item of items) assert.equal(item.evidence_quote, '第一段\n\n第二段')
})

test('高德用机构主体或指定院区，多点和未找到的机构不挂点', () => {
  const { results } = readJson(LOCATION_EVIDENCE)
  const named = name => results.filter(item => item.name === name)
  assert.equal(named('湘雅二医院')[0].chosen.id, 'B02DB02FOO')
  assert.equal(named('上海市第一人民医院')[0].chosen.id, 'B00155KBTT')
  assert.equal(named('河南省郑州大学第一附属医院东区')[0].chosen.id, 'B0FFF90QNJ')
  assert.equal(named('江西省精神卫生中心（南昌）')[0].selection_rule, 'explicit-campus')
  for (const id of ['kdocs-s2-r38', 'kdocs-s3-r216']) {
    const lead = sourceReports.find(item => item.id === id)
    assert.equal(lead.status, 'unlinked')
    assert.equal(lead.hospital_id, undefined)
  }
  assert.deepEqual(results.filter(item => item.status === 'not_found').map(item => item.name).sort(),
    ['天津市公安局安康医院', '杭州桐庐怡乐脑科医院'].sort())
  const hospitals = readJson('data/curated/hospitals.json').items
  const campuses = new Map(results.filter(item => item.chosen && item.campus).map(item => [item.chosen.id, item.campus]))
  for (const item of results.filter(item => item.chosen && item.selection_rule !== 'institution-building')) {
    const hospital = hospitals.find(hospital => hospital.id === `kdocs-amap-${item.chosen.id.toLowerCase()}`)
    const campus = campuses.get(item.chosen.id)
    assert.equal(hospital?.name, campus && !item.chosen.name.includes(campus) ? item.chosen.name + '（' + campus + '）' : item.chosen.name)
  }
  assert.equal(named('云南 桂林医学院附属医院')[0].chosen.id, 'B03050261F')
  const guilin = hospitals.find(hospital => hospital.id === 'kdocs-amap-b03050261f')
  assert.equal(guilin?.province, '广西壮族自治区')
  assert.equal(sourceReports.find(report => report.hospital_id === guilin.id)?.hospital_region, '云南')
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
    for (const path of [LOCATION_EVIDENCE, MANUAL_LOCATION_FILE]) {
      if (!existsSync(path)) continue
      mkdirSync(resolve(fixture, path, '..'), { recursive: true })
      cpSync(path, resolve(fixture, path))
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
})
