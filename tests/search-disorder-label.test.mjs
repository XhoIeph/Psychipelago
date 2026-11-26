import test from 'node:test'
import assert from 'node:assert/strict'
import { matchesSearch, normalizeSearch, searchRelevance } from '../lib/search.ts'
import { isDirectoryOnlyReport } from '../lib/report-directory.ts'
import { DISORDER_DISPLAY_LABELS, DISORDER_FILTER_GROUPS } from '../lib/disorder-labels.ts'
import { readFileSync } from 'node:fs'

const reports = JSON.parse(readFileSync(new URL('../data/curated/reports.json', import.meta.url), 'utf8')).items
const hospitals = JSON.parse(readFileSync(new URL('../data/curated/hospitals.json', import.meta.url), 'utf8')).items
const published = reports.filter((report) => report.status === 'published')

/** 面板里那三个常驻筛选按钮的显示标签，与搜索时用户实际照着打的字一致。 */
const chipLabels = DISORDER_FILTER_GROUPS.map((group) => group.label)

test('界面上的病症标签折回数据 id', () => {
  assert.equal(normalizeSearch(DISORDER_DISPLAY_LABELS.cptsd), 'cptsd')
  assert.equal(normalizeSearch(DISORDER_DISPLAY_LABELS.osdd), 'osdd')
  // 打字时斜杠两侧带空格也算同一个词
  assert.equal(normalizeSearch('PTSD / C-PTSD'), 'cptsd')
})

test('照标签搜索能命中那些医院的病症层', () => {
  for (const label of chipLabels) {
    const hospital = hospitals.find((item) =>
      matchesSearch([...item.departments, ...item.trauma_service.evidence].join(' '), label))
    assert.ok(!hospital, `${label} 不该靠科室名命中（这条只防止用它掩盖下面的 id 匹配）`)
  }
})

test('「OSDD/DID」不是空结果：至少命中带 osdd 或 did 的医院', () => {
  // 标签把 osdd 与 did 合成一个词，检索折回 `osdd`。这条前提是数据里 did 从不单独出现，
  // 一旦出现只有 did 的线索，这条用例就该红：那说明折回规则需要再改。
  const didOnly = published.filter((report) => {
    const ids = report.disorders ?? []
    return ids.includes('did') && !ids.includes('osdd')
  })
  assert.equal(didOnly.length, 0, `有 ${didOnly.length} 条线索只带 did，合成标签会漏掉它们`)

  const expected = new Set(published
    .filter((report) => (report.disorders ?? []).some((id) => id === 'osdd' || id === 'did'))
    .map((report) => report.hospital_id)
    .filter(Boolean))
  assert.ok(expected.size > 0, '数据里应当有 osdd/did 线索，否则这条用例失去意义')

  const matched = hospitals.filter((hospital) => {
    const related = published.filter((report) => report.hospital_id === hospital.id)
    const tiers = [
      [hospital.name, ...hospital.aliases].join(' '),
      [hospital.province, hospital.city].join(' '),
      [...hospital.departments, ...hospital.trauma_service.evidence].join(' '),
      related.flatMap((report) => [report.evidence_quote, report.evidence_full_text ?? '',
        report.doctor_name_raw ?? '', ...(report.disorders ?? [])]).join(' '),
    ]
    return tiers.some((text) => matchesSearch(text, DISORDER_DISPLAY_LABELS.osdd))
  })
  assert.equal(matched.length, expected.size)
})

test('「PTSD/C-PTSD」按 id 命中，而不是只在原文里凑巧写着这串', () => {
  const withCptsd = new Set(published
    .filter((report) => (report.disorders ?? []).includes('cptsd'))
    .map((report) => report.hospital_id)
    .filter(Boolean))
  assert.ok(withCptsd.size > 30, `cptsd 医院应有几十家，实际 ${withCptsd.size}`)

  const matched = hospitals.filter((hospital) => {
    const related = published.filter((report) => report.hospital_id === hospital.id)
    const disorders = related.flatMap((report) => report.disorders ?? []).join(' ')
    return matchesSearch(disorders, DISORDER_DISPLAY_LABELS.cptsd)
  })
  assert.equal(matched.length, withCptsd.size)
})

test('原来的中文全称与裸 id 仍然命中', () => {
  assert.ok(matchesSearch('复杂性创伤后应激障碍', DISORDER_DISPLAY_LABELS.cptsd))
  assert.ok(matchesSearch('cptsd', DISORDER_DISPLAY_LABELS.cptsd))
  assert.ok(matchesSearch('osdd did', DISORDER_DISPLAY_LABELS.osdd))
  assert.ok(matchesSearch('边缘型人格障碍', 'bpd'))
})

test('中英文关键词无空格或有空格都能拆分匹配', () => {
  const text = '喀什地区第一人民医院 · 李健博 · 精神心理科'
  assert.ok(matchesSearch(text, '李健博喀什'))
  assert.ok(matchesSearch(text, '李健博 喀什'))
  assert.ok(matchesSearch('北京 · 心理科', '北京心理'))
  assert.ok(matchesSearch('北京安定医院', '北京安定'))
  assert.equal(matchesSearch(text, '李健博北京'), false)
})

test('搜索排序优先姓名或机构直接命中，而不是只命中线索原文', () => {
  const doctorName = searchRelevance('李健博', ['李健博', '喀什地区第一人民医院', '线索原文'])
  const quoteOnly = searchRelevance('李健博', ['其他姓名', '喀什地区第一人民医院', '喀什地区第一人民医院 · 李健博'])
  const hospitalName = searchRelevance('北京安定医院', ['北京安定医院', '北京', '线索原文'])
  assert.ok(doctorName < quoteOnly)
  assert.equal(hospitalName, 0)
})

test('只由医院、诊室和医生名构成的自动名录引文可单独识别', () => {
  const directory = {
    hospital_name_raw: '喀什地区第一人民医院',
    department: '精神心理科',
    doctor_name_raw: '李健博',
    evidence_quote: '喀什地区第一人民医院 · 精神心理科 · 李健博',
  }
  assert.equal(isDirectoryOnlyReport(directory), true)
  assert.equal(isDirectoryOnlyReport({ ...directory, evidence_quote: `${directory.evidence_quote} · 接诊细致` }), false)
  assert.equal(isDirectoryOnlyReport({ ...directory, doctor_name_raw: undefined }), false)
})

test('医院简称能匹配正式院名，市北仍可按原院区名查找', () => {
  const shandong = hospitals.find(item => item.name === '山东大学附属精神卫生中心')
  assert.ok(shandong && matchesSearch(shandong.aliases.join(' '), '山东省精卫'))
  const qingdao = hospitals.find(item => item.name === '青岛市精神卫生中心（市北院区）')
  assert.ok(qingdao && matchesSearch(qingdao.name, '青岛精卫市北'))
})
