import test from 'node:test'
import assert from 'node:assert/strict'
import { matchesSearch, normalizeSearch } from '../lib/search.ts'
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
