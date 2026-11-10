#!/usr/bin/env node
// 不适用（NA）白名单闸：把「断言没验到」和「断言验过了」分开，别让前者混进全绿里。
//
// 背景：地图运行时掉了以后，前置超时的断言会整组从「过」变成「不适用」。CI 页面上一片绿，
// 实际什么都没验。这个闸管两件事：NA 的数量必须与预期相符，NA 的 id 必须落在已知客观缺失里。
//
// 判据按报告里的 mapState 分支（spec 会写这个字段）：
// - auto（有 key）：1440 = 0，390/375/320 各 1（只有 s5-disabled-opacity）。地图掉了会多出十几条，
//   数量一偏就红。
// - absent（无 key，fork PR）：1440 = 12，390 = 13，375/320 各 1。这些 id 由 spec 的
//   envGate / absentOk 推出（Kiwi 2026-11-11 按表实测），非地图断言在无 key 时也必须全跑。
//
// 数量是硬约束不是提示：多一条代表有断言悄悄没跑，少一条代表地图域被真跑过了——
// 两种都要人看一眼，不该混进绿里。
const fs = require('fs')
const path = require('path')

// 已知客观缺失：该组件在某些档位上本来就不渲染。
const ALLOWED = new Set(['s5-disabled-opacity'])

// 每档 NA 的期望条数。改表就要改这里，改不动就说明表里发生了没人预期的漂移。
const EXPECTED = {
  auto: { '1440x900': 0, '390x844': 1, '375x812': 1, '320x568': 1 },
  absent: { '1440x900': 12, '390x844': 14, '375x812': 1, '320x568': 1 },
}

const specPath = path.join(__dirname, 'ui-spec.json')

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (entry.name === 'spec-report.json') out.push(full)
  }
  return out
}

// 地图域断言 = 前置里声明了 envGate，或断言自己声明了 absentOk。
// 前置字段在 spec 里叫 precondition（早期版本叫 pre，两个都认）。
function mapDomainIds() {
  const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'))
  const ids = new Set()
  for (const check of spec.checks || []) {
    const pre = check.precondition || check.pre || []
    if (Array.isArray(pre) && pre.some(step => step && step.envGate)) ids.add(check.id)
    else if (check.absentOk) ids.add(check.id)
  }
  return ids
}

const root = process.argv[2] || 'artifacts'
const reports = walk(root)
if (reports.length === 0) {
  console.error(`没有找到 spec-report.json（${root}）`)
  process.exit(1)
}

const mapIds = mapDomainIds()
const byViewport = new Map() // label -> { ids: [], absent: bool }
let absent = false

for (const file of reports) {
  const report = JSON.parse(fs.readFileSync(file, 'utf8'))
  const mapState = report.mapState || 'auto'
  if (mapState === 'absent') absent = true
  for (const viewport of report.viewports || []) {
    const label = `${viewport.viewport?.width ?? '?'}x${viewport.viewport?.height ?? '?'}`
    const bucket = byViewport.get(label) || { ids: [], notes: new Map() }
    for (const check of viewport.checks || []) {
      if (check.pass !== null) continue
      bucket.ids.push(check.id)
      bucket.notes.set(check.id, check.note || '')
    }
    byViewport.set(label, bucket)
  }
}

const expected = absent ? EXPECTED.absent : EXPECTED.auto
const problems = []
const lines = [
  '### 不适用白名单闸',
  '',
  `地图状态：${absent ? 'absent（无 key，地图域断言记不适用）' : 'present（有 key，地图域断言必须真跑）'}`,
  '',
  '| 档位 | 不适用 | 期望 | 判定 |',
  '| --- | --- | --- | --- |',
]

for (const [label, want] of Object.entries(expected)) {
  const bucket = byViewport.get(label)
  if (!bucket) {
    lines.push(`| ${label} | 报告缺失 | ${want} | **红** |`)
    problems.push(`${label} 没有报告，无法核对不适用条数`)
    continue
  }
  const got = bucket.ids.length
  const ok = got === want
  lines.push(`| ${label} | ${got} | ${want} | ${ok ? '通过' : '**红**'} |`)
  if (!ok) problems.push(`${label} 不适用 ${got} 条，期望 ${want} 条：${bucket.ids.join(', ') || '（无）'}`)
}

// 表里出现的新档位也要报出来——静默多出一档说明矩阵配置与闸不同步。
for (const label of byViewport.keys()) {
  if (!(label in expected)) problems.push(`${label} 不在闸的档位清单里，请同步 na-budget 的 EXPECTED`)
}

// id 层面的规则：present 只允许已知客观缺失；absent 额外放行地图域。
const idProblems = []
for (const [label, bucket] of byViewport) {
  for (const id of bucket.ids) {
    const allowed = ALLOWED.has(id) || (absent && mapIds.has(id))
    if (!allowed) idProblems.push(`${id} @ ${label}`)
  }
}
if (idProblems.length > 0) problems.push(`白名单外的不适用（${idProblems.length} 条）：${idProblems.join(', ')}`)

// 明细：把每档的 id 摆出来，评审时能逐条对。
if (byViewport.size > 0) {
  lines.push('', '#### 明细', '')
  for (const [label, bucket] of byViewport) {
    if (bucket.ids.length === 0) lines.push(`- ${label}：无`)
    else lines.push(`- ${label}：${bucket.ids.map(id => `\`${id}\``).join('、')}`)
  }
}

lines.push('', `地图域断言共 ${mapIds.size} 条（由 spec 的 envGate/absentOk 推出）。已知客观缺失：${[...ALLOWED].join(', ')}。`)

const summary = `${lines.join('\n')}\n`
console.log(summary)
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary)

if (problems.length > 0) {
  for (const problem of problems) console.error(`NA 闸失败：${problem}`)
  process.exit(1)
}
console.log(`NA 闸通过：${Object.keys(expected).length} 个档位的不适用条数与白名单都符合预期。`)
