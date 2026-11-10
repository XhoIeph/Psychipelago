#!/usr/bin/env node
// 不适用（NA）白名单闸：把「断言没验到」和「断言验过了」分开，别让前者混进全绿里。
//
// 背景：地图运行时掉了以后，前置超时的断言会整组从「过」变成「不适用」。CI 页面上一片绿，
// 实际什么都没验。这个闸只做一件事：NA 必须落在已知的客观缺失里，多一条就红。
//
// 两条路径判据不同，别混：
// - present（有 key）：白名单只有 ALLOWED 里那几个。地图掉了会多出 20 多条 NA，闸立刻红。
// - absent（无 key，fork PR）：地图域断言本来就该 NA，这些 id 从 spec 里推（带 envGate 或 absentOk）。
//   但白名单之外仍然一条都不许多——非地图断言在无 key 时也必须全跑。
const fs = require('fs')
const path = require('path')

// 已知客观缺失：该组件在某些档位上本来就不渲染。
const ALLOWED = new Set(['s5-disabled-opacity'])

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
const rows = []
const unexpected = []
let absent = false

for (const file of reports) {
  const report = JSON.parse(fs.readFileSync(file, 'utf8'))
  const mapState = report.mapState || 'auto'
  if (mapState === 'absent') absent = true
  for (const viewport of report.viewports || []) {
    const label = `${viewport.viewport?.width ?? '?'}x${viewport.viewport?.height ?? '?'}`
    for (const check of viewport.checks || []) {
      if (check.pass !== null) continue
      const allowedByState = absent && mapIds.has(check.id)
      rows.push({ label, id: check.id, note: check.note || '', allowedByState })
      if (!ALLOWED.has(check.id) && !allowedByState) {
        unexpected.push(`${check.id} @ ${label}`)
      }
    }
  }
}

const lines = [
  '### 不适用白名单闸',
  '',
  `地图状态：${absent ? 'absent（无 key，地图域断言不参与白名单）' : 'present（白名单之外一条都不允许）'}`,
  '',
  '| 档位 | 断言 | 判定 | 说明 |',
  '| --- | --- | --- | --- |',
]
for (const row of rows) {
  const verdict = row.allowedByState ? '地图域（absent 放行）' : ALLOWED.has(row.id) ? '白名单' : '**超出白名单**'
  lines.push(`| ${row.label} | \`${row.id}\` | ${verdict} | ${row.note.replace(/\|/g, '\\|')} |`)
}
if (rows.length === 0) lines.push('| — | — | — | 无 |')

const summary = `${lines.join('\n')}\n\n地图域断言共 ${mapIds.size} 条（由 spec 的 envGate/absentOk 推出）。白名单：${[...ALLOWED].join(', ')}。\n`
console.log(summary)
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary)

if (unexpected.length > 0) {
  console.error(`白名单外的不适用（${unexpected.length} 条）：${unexpected.join(', ')}`)
  process.exit(1)
}
console.log(`NA 闸通过：不适用 ${rows.length} 条，全部在白名单或地图域内。`)
