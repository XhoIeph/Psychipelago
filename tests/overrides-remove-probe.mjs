// 单独复现「撤下一家有线索的医院」，看 validate 与 test:data 的完整输出。
// 手工诊断用，跑完会把 data/curated 还原、data/overrides 清空。
import { spawnSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = process.cwd()
const OVERRIDES = resolve(ROOT, 'data/overrides')
rmSync(OVERRIDES, { recursive: true, force: true })
for (const kind of ['reports', 'doctors', 'hospitals']) mkdirSync(resolve(OVERRIDES, kind), { recursive: true })

const hospital = JSON.parse(spawnSync(process.execPath, ['-e', "process.stdout.write(JSON.stringify(require('./data/curated/hospitals.json').items[0]))"], { cwd: ROOT, encoding: 'utf8' }).stdout)
writeFileSync(
  resolve(OVERRIDES, 'hospitals', `${hospital.id}.json`),
  `${JSON.stringify({ schema_version: '1.0.0', kind: 'hospitals', id: hospital.id, action: 'remove', reason: '实测 remove 一家医院', by: 'manual', at: '2026-11-10' }, null, 2)}\n`,
  'utf8',
)
console.log(`撤下 ${hospital.id}（${hospital.name}）`)

const bake = spawnSync(process.execPath, ['scripts/import-kdocs.ts'], { cwd: ROOT, encoding: 'utf8' })
console.log(`烘焙 exit ${bake.status}: ${(bake.stdout + bake.stderr).trim().split('\n').at(-1)}`)

const validate = spawnSync(process.execPath, ['scripts/validate-data.ts'], { cwd: ROOT, encoding: 'utf8' })
console.log(`validate exit ${validate.status}`)
console.log((validate.stdout + validate.stderr).trim())

const tests = spawnSync(process.execPath, ['--test', 'tests/data-source.test.mjs'], { cwd: ROOT, encoding: 'utf8' })
const out = tests.stdout + tests.stderr
console.log(`test:data exit ${tests.status}`)
for (const match of out.matchAll(/^✖ (.+?) \(\d/gmu)) console.log(`  ✖ ${match[1]}`)
for (const match of out.matchAll(/^\s+(actual|expected): (.+)$/gmu)) console.log(`    ${match[1]}: ${match[2]}`)

spawnSync('git', ['checkout', '--', 'data/curated'], { cwd: ROOT, encoding: 'utf8' })
rmSync(OVERRIDES, { recursive: true, force: true })
console.log('已还原')
