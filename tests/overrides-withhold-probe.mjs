// 撤下一条源表线索的正确做法：改状态，不是删记录。
// `remove` 表达「这条不该存在」，与「表格每一行都进了库」直接冲突；
// 想让它不上页面应该 patch `status`，源转写仍在库里。
//
// 手工诊断工具（文件名不带 .test），用法 `node tests/overrides-withhold-probe.mjs`。
import { spawnSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = process.cwd()
const OVERRIDES = resolve(ROOT, 'data/overrides')
const node = (args) => spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8' })
const text = (result) => `${result.stdout ?? ''}${result.stderr ?? ''}`
const readCurated = (name) => JSON.parse(node(['-e', `process.stdout.write(JSON.stringify(require('./data/curated/${name}.json').items))`]).stdout)

rmSync(OVERRIDES, { recursive: true, force: true })
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
    by: '小雨',
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

const validate = node(['scripts/validate-data.ts'])
const validateOut = text(validate)
const pass = validateOut.split('\n').find((line) => line.includes('数据校验通过'))?.trim() ?? '(无通过行)'
const fatal = validateOut.split('\n').filter((line) => /^\s+- (?!hospitals\.json →|reports\.json →|doctors\.json →)/u.test(line))
console.log(`validate exit ${validate.status} | ${pass}${fatal.length ? ` | 硬错误：${fatal[0].trim()}` : ''}`)

const tests = node(['--test', 'tests/data-source.test.mjs'])
const out = text(tests)
const counts = Object.fromEntries([...out.matchAll(/^ℹ (tests|pass|fail) (\d+)$/gmu)].map((match) => [match[1], Number(match[2])]))
console.log(`test:data exit ${tests.status} | tests ${counts.tests} pass ${counts.pass} fail ${counts.fail}`)
for (const title of new Set([...out.matchAll(/^✖ (.+?) \(\d/gu)].map((match) => match[1].trim()))) console.log(`    ✖ ${title}`)

spawnSync('git', ['checkout', '--', 'data/curated'], { cwd: ROOT, encoding: 'utf8' })
rmSync(OVERRIDES, { recursive: true, force: true })
console.log('已还原 data/curated，data/overrides 清空')
