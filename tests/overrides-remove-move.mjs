// 撤下一家源表机构的真实出口：把它的线索改挂到别的机构，机构名下清空后再撤。
// 直接连同线索一起撤会删掉表格里记着的东西，「每一行都进了库」那条断言必然红——
// 所以这里验证的是改挂路线，而不是删除路线。
//
// 手工诊断工具（文件名不带 .test），用法 `node tests/overrides-remove-move.mjs`，
// 跑完把 data/curated 还原、data/overrides 清空。
import { spawnSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = process.cwd()
const OVERRIDES = resolve(ROOT, 'data/overrides')
const FROM = 'kdocs-amap-b000a0989a'
const TO = 'kdocs-amap-b03a3032b3'

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
  const validateOut = text(validate)
  const pass = validateOut.split('\n').find((line) => line.includes('数据校验通过'))?.trim() ?? '(无通过行)'
  const fatal = validateOut.split('\n').filter((line) => /^\s+- (?!hospitals\.json →|reports\.json →|doctors\.json →)/u.test(line))
  console.log(`  validate exit ${validate.status} | ${pass}${fatal.length ? ` | 硬错误：${fatal[0].trim()}` : ''}`)

  const tests = spawn(['--test', 'tests/data-source.test.mjs'])
  const out = text(tests)
  const counts = Object.fromEntries([...out.matchAll(/^ℹ (tests|pass|fail) (\d+)$/gmu)].map((match) => [match[1], Number(match[2])]))
  console.log(`  test:data exit ${tests.status} | tests ${counts.tests} pass ${counts.pass} fail ${counts.fail}`)
  for (const match of new Set([...out.matchAll(/^✖ (.+?) \(\d/gu)].map((item) => item[1].trim()))) {
    console.log(`    ✖ ${match}`)
  }
  console.log('')
}

rmSync(OVERRIDES, { recursive: true, force: true })
const reports = readCurated('reports').filter((item) => item.hospital_id === FROM)
console.log(`回龙观名下 ${reports.length} 条线索，改挂到 ${TO}`)

for (const item of reports) {
  write('reports', {
    schema_version: '1.0.0',
    kind: 'reports',
    id: item.id,
    action: 'patch',
    reason: '实测：把线索改挂到另一家机构',
    by: 'manual',
    at: '2026-11-11',
    source_value: { hospital_id: item.hospital_id },
    set: { hospital_id: TO },
  })
}
write('hospitals', { schema_version: '1.0.0', kind: 'hospitals', id: FROM, action: 'remove', reason: '实测：名下已无线索后撤下', by: 'manual', at: '2026-11-11' })
report('线索改挂后撤下原机构（应当通过）')

spawnSync('git', ['checkout', '--', 'data/curated'], { cwd: ROOT, encoding: 'utf8' })
rmSync(OVERRIDES, { recursive: true, force: true })
console.log('已还原 data/curated，data/overrides 清空')
