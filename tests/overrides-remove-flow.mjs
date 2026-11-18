// 撤下一家机构的完整流程：先把它名下的线索与医生卡一起标墓碑，再撤机构本身。
// 这条链跑通，控制台的「删除」才算真的有出口：单撤机构会被拦住并说明还挂着多少记录。
//
// 手工诊断工具（文件名不带 .test），用法 `node tests/overrides-remove-flow.mjs`，
// 跑完把 data/curated 还原、data/overrides 清空。
import { spawnSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = process.cwd()
const OVERRIDES = resolve(ROOT, 'data/overrides')
const HOSPITAL_ID = 'kdocs-amap-b000a0989a'

const spawn = (args) => spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8' })
const text = (result) => `${result.stdout ?? ''}${result.stderr ?? ''}`
const readCurated = (name) => JSON.parse(spawn(['-e', `process.stdout.write(JSON.stringify(require('./data/curated/${name}.json').items))`]).stdout)

function write(kind, record) {
  mkdirSync(resolve(OVERRIDES, kind), { recursive: true })
  writeFileSync(resolve(OVERRIDES, kind, `${record.id}.json`), `${JSON.stringify(record, null, 2)}\n`, 'utf8')
}

function report(label) {
  const bake = spawn(['scripts/import-kdocs.ts'])
  const lines = text(bake).split('\n').map((line) => line.trim()).filter(Boolean)
  const reason = lines.find((line) => line.startsWith('Error: '))
  console.log(`${label}\n  烘焙 exit ${bake.status} | ${reason ?? lines.at(-1) ?? ''}`)

  const validate = spawn(['scripts/validate-data.ts'])
  const out = text(validate)
  const pass = out.split('\n').find((line) => line.includes('数据校验通过'))?.trim() ?? '(无通过行)'
  const fatal = out.split('\n').filter((line) => /^\s+- (?!hospitals\.json →|reports\.json →|doctors\.json →)/u.test(line))
  console.log(`  validate exit ${validate.status} | ${pass}${fatal.length ? ` | 硬错误：${fatal[0].trim()}` : ''}`)

  const tests = spawn(['--test', 'tests/data-source.test.mjs'])
  const counts = Object.fromEntries([...text(tests).matchAll(/^ℹ (tests|pass|fail) (\d+)$/gmu)].map((match) => [match[1], Number(match[2])]))
  console.log(`  test:data exit ${tests.status} | tests ${counts.tests} pass ${counts.pass} fail ${counts.fail}\n`)
}

rmSync(OVERRIDES, { recursive: true, force: true })
const reports = readCurated('reports').filter((item) => item.hospital_id === HOSPITAL_ID)
const doctors = readCurated('doctors').filter((item) => item.hospital_id === HOSPITAL_ID)
console.log(`回龙观名下：${reports.length} 条线索、${doctors.length} 位医生卡`)

// 第一步：只撤机构，其余不动——应当被拦住。
write('hospitals', { schema_version: '1.0.0', kind: 'hospitals', id: HOSPITAL_ID, action: 'remove', reason: '实测：只撤机构', by: 'manual', at: '2026-11-11' })
report('只撤机构（还应挂着线索，应当被拦住）')

// 第二步：只把线索也撤下——医生卡是从线索推出来的，线索撤空后它们自己就没有归属了，
// 不需要另写墓碑（写了会报「目标记录不存在」）。
for (const item of reports) write('reports', { schema_version: '1.0.0', kind: 'reports', id: item.id, action: 'remove', reason: '实测：随机构一起撤下', by: 'manual', at: '2026-11-11' })
report('连同名下线索一起撤（应当通过）')

spawnSync('git', ['checkout', '--', 'data/curated'], { cwd: ROOT, encoding: 'utf8' })
rmSync(OVERRIDES, { recursive: true, force: true })
console.log('已还原 data/curated，data/overrides 清空')
