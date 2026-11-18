/**
 * 手工诊断：控制台新增一家机构，给它人工选定一个落点，跑烘焙与 build，
 * 看这家机构有没有在 hospitals.json 拿到坐标、在 data/generated/locations.json 里有没有 manual 条目。
 *
 *   node tests/overrides-manual-coordinate-probe.mjs
 *
 * 会自己写覆盖层与 amap-manual.json、跑烘焙与 build-aggregates，最后还原。
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = process.cwd()
const HOSPITAL_ID = 'local-probe-manual'
const POI = {
  id: 'BPROBEMANUAL01',
  name: '测试市精神卫生中心',
  address: '测试路 1 号',
  location: '116.329899,40.066758',
  pname: '北京市',
  cityname: '北京市',
  adcode: '110000',
  typecode: '090100',
}

const read = path => JSON.parse(readFileSync(resolve(ROOT, path), 'utf8'))
const write = (path, value) => writeFileSync(resolve(ROOT, path), `${JSON.stringify(value, null, 2)}\n`, 'utf8')
const overridesDir = resolve(ROOT, 'data/overrides/hospitals')
const manualFile = resolve(ROOT, 'data/evidence/locations/amap-manual.json')

function clean() {
  rmSync(resolve(ROOT, 'data/overrides'), { recursive: true, force: true })
  for (const kind of ['reports', 'doctors', 'hospitals']) mkdirSync(resolve(ROOT, 'data/overrides', kind), { recursive: true })
  rmSync(manualFile, { force: true })
}

function run(args) {
  const result = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8' })
  const out = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim().split('\n')
  return { code: result.status, tail: out.find(line => line.startsWith('✓') || line.startsWith('Error: ')) ?? out.at(-1) ?? '' }
}

function restore() {
  clean()
  spawnSync('git', ['checkout', '--', 'data/curated', 'data/generated'], { cwd: ROOT })
}

clean()
write(`data/overrides/hospitals/${HOSPITAL_ID}.json`, {
  schema_version: '1.0.0',
  kind: 'hospitals',
  id: HOSPITAL_ID,
  action: 'insert',
  reason: '诊断：控制台新增一家机构',
  by: 'manual',
  at: '2026-11-11',
  set: {
    id: HOSPITAL_ID,
    name: '测试市精神卫生中心',
    aliases: [],
    adcode: '110000',
    province: '北京市',
    city: '北京市',
    level: '未知',
    category: '其他',
    departments: ['未录入'],
    trauma_service: { cptsd_assessment: 'unknown', cptsd_bpd_diagnosis: 'unknown', icd11_practice: 'unknown', evidence: [] },
    coordinates: null,
    official_sources: [],
    last_verified_at: '2026-11-11',
  },
})

const added = read('data/curated/hospitals.json')
const before = run(['scripts/import-kdocs.ts'])
const after = read('data/curated/hospitals.json')
const inserted = after.items.find(item => item.id === HOSPITAL_ID)
console.log('一、只新增机构，还没有坐标')
console.log(`  烘焙 ${before.code} | ${before.tail}`)
console.log(`  新增机构在库：${inserted ? '是' : '否'}　coordinates=${inserted ? JSON.stringify(inserted.coordinates) : '-'}　coordinates_source=${inserted?.coordinates_source ?? '-'}`)

write('data/evidence/locations/amap-manual.json', {
  schema_version: '1.0.0',
  provider: 'amap',
  source_crs: 'GCJ-02',
  stored_crs: 'GCJ-02',
  entries: [
    {
      hospital_id: HOSPITAL_ID,
      name: '测试市精神卫生中心',
      status: 'geocoded',
      queried_at: '2026-11-11T00:00:00.000Z',
      query: { keywords: '测试市精神卫生中心', city: '北京市' },
      candidates: [POI],
      shortlist: [POI.id],
      chosen: POI,
      picked: { by: 'manual', at: '2026-11-11', reason: '诊断：人工从候选里选定' },
    },
  ],
})

const picked = run(['scripts/import-kdocs.ts'])
const bakedPick = read('data/curated/hospitals.json').items.find(item => item.id === HOSPITAL_ID)
console.log('二、人工选定落点之后再烘焙')
console.log(`  烘焙 ${picked.code} | ${picked.tail}`)
console.log(`  coordinates=${JSON.stringify(bakedPick?.coordinates)}　coordinates_source=${bakedPick?.coordinates_source ?? '-'}`)

const aggregate = run(['scripts/build-aggregates.ts'])
const generated = read('data/generated/locations.json')
const entry = generated.results.find(item => item.hospital_id === HOSPITAL_ID)
console.log('三、合成 locations.json')
console.log(`  聚合 ${aggregate.code} | ${aggregate.tail}`)
console.log(`  manual 条目：${entry ? `有（status=${entry.status} provenance=${entry.provenance} location=${entry.chosen?.location}）` : '没有'}`)
console.log(`  总条目 ${generated.results.length}，其中 manual ${generated.results.filter(item => item.provenance === 'manual').length}`)

const validate = run(['scripts/validate-data.ts'])
console.log('四、校验')
console.log(`  validate ${validate.code} | ${validate.tail}`)

const untouched = read('data/curated/hospitals.json').items.filter(item => item.id !== HOSPITAL_ID)
console.log(`五、原有机构 ${untouched.length} 家，坐标与改动前一致：${JSON.stringify(untouched.map(item => item.coordinates)) === JSON.stringify(added.items.map(item => item.coordinates)) ? '是' : '否'}`)

restore()
const restored = read('data/curated/hospitals.json')
console.log(`已还原：${restored.items.some(item => item.id === HOSPITAL_ID) ? '失败，测试机构还在库里' : '通过'}；amap-manual.json ${existsSync(manualFile) ? '还在' : '已清'}`)
