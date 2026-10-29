import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, cpSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { reportsFromDocument, reportsWithLocations, SOURCE_CAPTURE, SOURCE_URL } from '../scripts/import-kdocs.ts'
import { reportsFileSchema } from '../lib/schema.ts'
import { LOCATION_EVIDENCE } from '../scripts/lib/amap.ts'
import { hospitalsFromRun } from '../scripts/geocode-hospitals.ts'

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))
const document = readJson(SOURCE_CAPTURE)
const reports = readJson('data/curated/reports.json').items
const expected = reportsWithLocations(document)

test('all five pages and every institutional row are represented', () => {
  assert.equal(document.url, SOURCE_URL)
  assert.deepEqual(document.pages.map((page) => page.page), [1, 2, 3, 4, 5])
  assert.deepEqual(document.pages.map((page) => expected.filter((r) => r.id.includes(`-p${page.page}-`)).length), [23, 40, 36, 40, 21])
  assert.equal(reports.length, 160)
  assert.deepEqual(reports, expected)
  assert.equal(document.pages[4].lines.at(-1), '长庚医院：刘嘉逸')
  assert.equal(reportsFileSchema.safeParse(readJson('data/curated/reports.json')).success, true)
})

test('source identity, wording and location cover every report', () => {
  for (const report of reports) {
    assert.equal(report.source_url, SOURCE_URL)
    assert.equal(report.source_post_id, 'crOlzFWeu2GY')
    assert.equal(report.evidence_context.note_title, document.title)
    assert.equal(report.evidence_context.capture_scope, SOURCE_CAPTURE)
    const [, page, line] = report.id.match(/-p(\d+)-l(\d+)$/)
    const lines = document.pages[Number(page) - 1].lines
    const sourceLine = lines[Number(line) - 1]
    assert.equal(report.hospital_name_raw, sourceLine.split('：')[0])
    assert.equal(report.evidence_quote.split('\n')[0], sourceLine)
    if (report.evidence_quote.includes('\n')) assert.equal(report.evidence_quote.split('\n')[1], lines[Number(line)])
  }
})

test('source headings are categories rather than invented diagnoses or dates', () => {
  assert.deepEqual(Object.fromEntries(['cptsd', 'osdd/did', 'other'].map((group) => [group, reports.filter((r) => r.disorders.join('/') === group).length])), { cptsd: 32, 'osdd/did': 36, other: 92 })
  for (const report of reports) {
    assert.equal(report.stage, 'unknown')
    assert.equal(report.published_at, undefined)
    assert.equal(report.published_at_precision, 'unknown')
    assert.equal(report.diagnosis_claimed, undefined)
    assert.equal(report.verification.level, 'unverified')
    if (report.disorders.includes('other')) assert.deepEqual(report.source_topics, ['人格障碍'])
  }
  assert.equal(document.document_updated_at, null)
})

test('notes, fees, teams and departures remain in evidence, not credentials', () => {
  const quotes = reports.map((r) => r.evidence_quote).join('\n')
  for (const note of ['触发风险', '目前进修中', '胡玉凤（已离职）', '苗国栋（退休）', '2400-2520每45分钟', '挂号费1000，线上680', '首诊90分钟起步', '朱鸿儒课题组', '郑重团队', '有些医生在芳村和惠爱两边都出诊', '李苏义和阳琼为网友反馈']) assert.ok(quotes.includes(note), note)
  for (const report of reports) {
    assert.doesNotMatch(report.doctor_name_raw ?? '', /门诊|会诊|团队|课题组|医生|触发风险|离职|退休|进修/u)
    assert.equal(report.doctor_title_raw, undefined)
    assert.equal(report.cost_cny, undefined)
  }
  const xiamen = reports.find((r) => r.hospital_name_raw === '四川大学华西厦门医院')
  assert.equal(xiamen.hospital_region, undefined)
  assert.equal(xiamen.doctor_name_raw, undefined)
})

test('retired reports, entities, evidence and run logs are outside the active tree', () => {
  assert.deepEqual(readJson('data/curated/hospitals.json').items, existsSync(LOCATION_EVIDENCE) ? hospitalsFromRun(readJson(LOCATION_EVIDENCE)) : [])
  assert.deepEqual(readJson('data/curated/doctors.json').items, [])
  assert.equal(readJson('data/curated/provinces.json').items.length, 34)
  assert.equal(readJson('data/curated/disorders.json').items.length, 6)
  assert.ok(!existsSync('data/evidence/manifest.json'))
  assert.ok(!existsSync('data/evidence/xiaohongshu'))
  assert.deepEqual(existsSync('data/runs') ? readdirSync('data/runs') : [], [])
  for (const report of reports) {
    assert.match(report.id, /^kdocs-crolzfweu2gy-/)
    if (report.hospital_id) assert.match(report.hospital_id, /^kdocs-amap-/)
    assert.equal(report.doctor_id, undefined)
    assert.doesNotMatch(JSON.stringify(report), /xiaohongshu|xsec_token|author_|parent_author|reply_to_author|ip_location|retired-2026/u)
  }
  for (const folder of ['data/curated', 'data/generated', 'data/evidence']) {
    for (const file of readdirSync(folder, { recursive: true })) {
      if (String(file).endsWith('.json')) assert.doesNotMatch(readFileSync(resolve(folder, String(file)), 'utf8'), /xiaohongshu\.com|xsec_token|parent_author|reply_to_author|ip_location/u)
    }
  }
})

test('normal build and validation commands never call retired collection entry points', () => {
  const scripts = readJson('package.json').scripts
  for (const name of ['prebuild', 'data:validate', 'data:build', 'data:stats']) assert.doesNotMatch(scripts[name], /scripts\/collect|fix-privacy|data\/raw/u)
  assert.ok(!Object.keys(scripts).some((name) => name.startsWith('collect:') || name === 'evidence:manifest' || name === 'audit:sources'))
})

test('validator rejects retired/private data and incomplete pagination while allowing added pages', () => {
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
    assert.match(result.stderr, /与主线分页转写不一致/u)

    cpSync('data/curated/reports.json', resolve(fixture, 'data/curated/reports.json'))
    const expanded = structuredClone(document)
    expanded.page_count = 6
    expanded.pages.push({ page: 6, lines: ['补充说明'] })
    const validatePages = (source) => {
      writeFileSync(resolve(fixture, SOURCE_CAPTURE), JSON.stringify(source))
      return spawnSync(process.execPath, [resolve('scripts/validate-data.ts')], { cwd: fixture, encoding: 'utf8' })
    }
    assert.equal(validatePages(expanded).status, 0)
    for (const source of [
      { ...expanded, page_count: 0 },
      { ...expanded, page_count: 6.5 },
      { ...expanded, page_count: 5 },
      { ...expanded, pages: [...document.pages, { page: 5, lines: ['补充说明'] }] },
      { ...expanded, pages: [...document.pages, { page: 6, lines: [] }] },
    ]) {
      const invalid = validatePages(source)
      assert.equal(invalid.status, 1)
      assert.match(invalid.stderr, /按序包含全部非空分页/u)
    }
  } finally {
    assert.ok(fixture.startsWith(`${resolve('tmp')}/`) || fixture.startsWith(`${resolve('tmp')}\\`))
    rmSync(fixture, { recursive: true })
  }
})
