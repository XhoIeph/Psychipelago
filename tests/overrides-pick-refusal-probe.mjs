/**
 * 探针：自动定位过的机构被人工选点时，必须当场拒绝，且一个字节都不写进 amap-manual.json。
 *
 * 跑法：node tests/overrides-pick-refusal-probe.mjs
 * 它会临时写一条人工查询记录、跑一次 --pick、核对人工表没被动过、再烘焙一次核对坐标没变，最后还原。
 */
import { spawnSync } from 'node:child_process'
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const manualPath = new URL('../data/evidence/locations/amap-manual.json', import.meta.url)
const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'))

function run(script, args = []) {
  const result = spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: 'utf8' })
  return { status: result.status, out: `${result.stdout ?? ''}${result.stderr ?? ''}`.trim() }
}

const hospitals = read('../data/curated/hospitals.json').items
const target = hospitals.find(hospital => hospital.coordinates_source === 'geocoded')
if (!target) throw new Error('库里没有 geocoded 的机构，这条探针没有可测对象')
const before = structuredClone(target.coordinates)

writeFileSync(
  manualPath,
  `${JSON.stringify(
    {
      schema_version: '1.0.0',
      provider: 'amap',
      source_crs: 'GCJ-02',
      stored_crs: 'GCJ-02',
      entries: [
        {
          hospital_id: target.id,
          name: target.name,
          status: 'queried',
          queried_at: '2026-11-11',
          query: { keywords: target.name, city: '' },
          candidates: [
            {
              id: 'BPICKREFUS01',
              name: '人工挑的点',
              address: '别的路 9 号',
              location: '121.473701,31.230416',
              pname: '上海市',
              cityname: '上海市',
              adcode: '310000',
              typecode: '090100',
            },
          ],
          shortlist: [],
        },
      ],
    },
    null,
    2,
  )}\n`,
  'utf8',
)

console.log(`一、对 ${target.id}（${target.name}，来源 ${target.coordinates_source}）跑 --pick`)
const manualBefore = readFileSync(manualPath)
const pick = run('scripts/geocode-hospitals.ts', ['--pick', target.id, 'BPICKREFUS01'])
console.log(pick.out.split('\n').map(line => `  ${line}`).join('\n'))
console.log(`  exit ${pick.status}`)
const refused = pick.status === 1 && pick.out.includes('不覆盖')
console.log(`  判定为「被拒绝」而不是「已生效」：${refused ? '是' : '否'}`)
const untouched = readFileSync(manualPath).equals(manualBefore)
console.log(`  amap-manual.json 一个字节没动：${untouched ? '是' : '否'}`)

console.log('二、烘焙后核对坐标')
const bake = run('scripts/import-kdocs.ts')
console.log(`  烘焙 ${bake.status}`)
const after = read('../data/curated/hospitals.json').items.find(hospital => hospital.id === target.id)
const unchanged = JSON.stringify(after.coordinates) === JSON.stringify(before) && after.coordinates_source === 'geocoded'
console.log(`  coordinates=${JSON.stringify(after.coordinates)}　coordinates_source=${after.coordinates_source}`)
console.log(`  与改动前一致且仍是 geocoded：${unchanged ? '是' : '否'}`)

rmSync(manualPath, { force: true })
spawnSync('git', ['checkout', '--', 'data/curated', 'data/generated'], { cwd: root })
console.log('三、已删除临时人工记录并还原 data/')

if (!refused || !untouched || !unchanged) process.exitCode = 1
