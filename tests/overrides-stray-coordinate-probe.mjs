/**
 * 手工诊断：机构的坐标只能有两个出处——那轮高德定位的证据，和 amap-manual.json 里人工选定的点。
 * 这份探针跑三条，看这道出处的门有没有真的拦住：
 *
 *   一、新增机构自带坐标 → 烘焙直接拒，机构进不了库；
 *   二、新增机构不带坐标 → 过；人工选定后坐标来源是 manual；
 *   三、机构有坐标、人工表那条被删 → data:validate 红（不是等到 build-aggregates 才炸）。
 *
 *   node tests/overrides-stray-coordinate-probe.mjs
 *
 * 会自己写覆盖层与 amap-manual.json、跑烘焙与校验，最后还原 data/curated 与 data/generated。
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = process.cwd()
const HOSPITAL_ID = 'local-probe-stray'
const STRAY = { lat: 39.9, lng: 116.4 }
const POI = {
  id: 'BPROBESTRAY01',
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
const manualFile = resolve(ROOT, 'data/evidence/locations/amap-manual.json')

function clean() {
  rmSync(resolve(ROOT, 'data/overrides'), { recursive: true, force: true })
  for (const kind of ['reports', 'doctors', 'hospitals']) mkdirSync(resolve(ROOT, 'data/overrides', kind), { recursive: true })
  rmSync(manualFile, { force: true })
}

function run(args) {
  const result = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8' })
  const lines = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim().split('\n')
  return { code: result.status, lines, text: lines.join('\n') }
}

const hospitalPayload = (extra = {}) => ({
  id: HOSPITAL_ID,
  name: '测试市精神卫生中心',
  aliases: [],
  adcode: '110000',
  province: '北京市',
  city: '北京市',
  level: '未知',
  category: '其他',
  departments: ['未录入'],
  trauma_service: {
    cptsd_assessment: 'unknown',
    cptsd_bpd_diagnosis: 'unknown',
    icd11_practice: 'unknown',
    evidence: [],
  },
  coordinates: null,
  official_sources: [],
  last_verified_at: '2026-11-11',
  ...extra,
})

function writeInsert(extra) {
  write(`data/overrides/hospitals/${HOSPITAL_ID}.json`, {
    schema_version: '1.0.0',
    kind: 'hospitals',
    id: HOSPITAL_ID,
    action: 'insert',
    reason: '诊断：核对坐标出处这道门',
    by: '小雨',
    at: '2026-11-11',
    set: hospitalPayload(extra),
  })
}

function restore() {
  clean()
  spawnSync('git', ['checkout', '--', 'data/curated', 'data/generated'], { cwd: ROOT })
}

clean()

writeInsert({ coordinates: STRAY, coordinates_source: 'manual' })
const stray = run(['scripts/import-kdocs.ts'])
const strayLanded = read('data/curated/hospitals.json').items.some(item => item.id === HOSPITAL_ID)
console.log('一、新增机构自带坐标')
console.log(`  烘焙 ${stray.code} | ${stray.lines.find(line => line.startsWith('Error: ')) ?? stray.lines.at(-1)}`)
console.log(`  报错点名坐标：${/新增机构不能自带坐标，坐标只能来自高德查询与人工选定/u.test(stray.text) ? '是' : '否'}`)
console.log(`  机构进库：${strayLanded ? '是（不该进）' : '否（被拒，未写入）'}`)

writeInsert({})
const plain = run(['scripts/import-kdocs.ts'])
const bakedPlain = read('data/curated/hospitals.json').items.find(item => item.id === HOSPITAL_ID)
console.log('二、新增机构不带坐标')
console.log(`  烘焙 ${plain.code} | ${plain.lines.find(line => line.startsWith('✓')) ?? plain.lines.at(-1)}`)
console.log(`  机构在库：${bakedPlain ? '是' : '否'}　coordinates=${JSON.stringify(bakedPlain?.coordinates)}　coordinates_source=${bakedPlain?.coordinates_source ?? '-'}`)

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
      picked: { by: '小雨', at: '2026-11-11', reason: '诊断：人工从候选里选定' },
    },
  ],
})
const picked = run(['scripts/import-kdocs.ts'])
const bakedPick = read('data/curated/hospitals.json').items.find(item => item.id === HOSPITAL_ID)
console.log(`  人工选定后再烘焙 ${picked.code}　coordinates=${JSON.stringify(bakedPick?.coordinates)}　coordinates_source=${bakedPick?.coordinates_source ?? '-'}`)
console.log(`  此时校验 ${run(['scripts/validate-data.ts']).code}`)

rmSync(manualFile, { force: true })
const orphan = run(['scripts/validate-data.ts'])
console.log('三、机构有坐标，人工表那条被删')
console.log(`  校验 ${orphan.code}（期望 1）`)
console.log(`  比对基准红：${/hospitals\.json 与本轮高德定位依据不一致/u.test(orphan.text) ? '是' : '否'}`)
console.log(`  出处守卫红：${/有坐标但证据集与 amap-manual\.json 里都没有/u.test(orphan.text) ? '是' : '否'}`)
console.log(`  点名机构：${orphan.text.includes(HOSPITAL_ID) ? '是' : '否'}`)
console.log(`  只报一处就漏了：${/hospitals\.json 与本轮高德定位依据不一致/u.test(orphan.text) && /有坐标但证据集与 amap-manual\.json 里都没有/u.test(orphan.text) ? '两处都红，符合预期' : '只有一处红，查基准是不是没跟 manual 走'}`)

restore()
const restored = read('data/curated/hospitals.json')
console.log(`已还原：${restored.items.some(item => item.id === HOSPITAL_ID) ? '失败，测试机构还在库里' : '通过'}；amap-manual.json ${existsSync(manualFile) ? '还在' : '已清'}`)
