// 地图线索数断言改成派生不变量之后的成对回归：
//   1）撤下一条线索（patch status → withheld）再烘焙，图上的线索总数必须跟着降，
//      而不是撞一个写死的 326；
//   2）人为少给一条 leads，同一断言必须变红。
// 第二条在 tests/map-coordinates.test.mjs 里用 assert.notEqual 固定住了，这里只跑第一条。
//
// 手工诊断工具（文件名不带 .test），用法 `node tests/map-leads-invariant-probe.mjs`。
import { spawnSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = process.cwd()
const OVERRIDES = resolve(ROOT, 'data/overrides')
const node = (args) => spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8' })
const text = (result) => `${result.stdout ?? ''}${result.stderr ?? ''}`
const readCurated = (name) => JSON.parse(node(['-e', `process.stdout.write(JSON.stringify(require('./data/curated/${name}.json').items))`]).stdout)
const publishedLeads = () => readCurated('reports').filter((item) => item.status === 'published' && item.hospital_id).length

rmSync(OVERRIDES, { recursive: true, force: true })
console.log(`撤下前：已发布且挂机构的线索 ${publishedLeads()} 条`)

const target = readCurated('reports').find((item) => item.id.endsWith('-s1-r4') && item.doctor_name_raw === '梁红')
mkdirSync(resolve(OVERRIDES, 'reports'), { recursive: true })
writeFileSync(
  resolve(OVERRIDES, 'reports', `${target.id}.json`),
  `${JSON.stringify({
    schema_version: '1.0.0',
    kind: 'reports',
    id: target.id,
    action: 'patch',
    reason: '实测：这条不再发布',
    by: 'manual',
    at: '2026-11-11',
    source_value: { status: target.status },
    set: { status: 'withheld' },
    clear: [],
  }, null, 2)}\n`,
  'utf8',
)

const bake = node(['scripts/import-kdocs.ts'])
const bakeLines = text(bake).split('\n').map((line) => line.trim()).filter(Boolean)
console.log(`烘焙 exit ${bake.status} | ${bakeLines.find((line) => line.startsWith('Error: ')) ?? bakeLines.at(-1)}`)
console.log(`撤下后：已发布且挂机构的线索 ${publishedLeads()} 条`)

const map = node(['--test', 'tests/map-coordinates.test.mjs'])
const mapOut = text(map)
const counts = Object.fromEntries([...mapOut.matchAll(/^ℹ (tests|pass|fail) (\d+)$/gmu)].map((match) => [match[1], Number(match[2])]))
console.log(`map-coordinates exit ${map.status} | tests ${counts.tests} pass ${counts.pass} fail ${counts.fail}`)
for (const title of new Set([...mapOut.matchAll(/^✖ (.+?) \(\d/gu)].map((match) => match[1].trim()))) console.log(`    ✖ ${title}`)

spawnSync('git', ['checkout', '--', 'data/curated'], { cwd: ROOT, encoding: 'utf8' })
rmSync(OVERRIDES, { recursive: true, force: true })
console.log('已还原 data/curated，data/overrides 清空')
