// 覆盖层保存闸门的现况报告：一条 patch / 一条 insert 落盘并烘焙后，`test:data` 与
// `data:validate` 各是什么结果，以及保真断言为哪个字段让了路。
//
// 这是手工诊断工具，不在 `node --test tests/*.test.mjs` 里跑（文件名不带 .test）。
// 用法：`node tests/overrides-gate-report.mjs`，跑完会把 data/curated 还原、data/overrides 清空。
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = process.cwd()
const OVERRIDES = resolve(ROOT, 'data/overrides')
const TEST_FILE = resolve(ROOT, 'tests/data-source.test.mjs')

const spawn = (args) => spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8' })
const text = (result) => `${result.stdout ?? ''}${result.stderr ?? ''}`

/** 从测试文件里读出「哪个字段的覆盖会让哪些断言让路」，不另存一份名单，避免与实际实现脱节。 */
function skippedAssertions() {
  const lines = readFileSync(TEST_FILE, 'utf8').split('\n')
  const byField = new Map()
  let current = '(文件开头)'
  lines.forEach((line, index) => {
    const title = line.match(/^test\('([^']+)'/u)?.[1]
    if (title) current = title
    if (!/overridden\(|faithful\(/u.test(line)) return
    for (const [, field] of line.matchAll(/(?:overridden\([^)]*?|faithful\()'([a-z_]+)'/gu)) {
      if (!byField.has(field)) byField.set(field, [])
      byField.get(field).push(`:${index + 1} ${current}`)
    }
  })
  return byField
}

function clean() {
  rmSync(OVERRIDES, { recursive: true, force: true })
  for (const kind of ['reports', 'doctors', 'hospitals']) mkdirSync(resolve(OVERRIDES, kind), { recursive: true })
}

function write(kind, record) {
  writeFileSync(resolve(OVERRIDES, kind, `${record.id}.json`), `${JSON.stringify(record, null, 2)}\n`, 'utf8')
}

function bake() {
  const result = spawn(['scripts/import-kdocs.ts'])
  const lines = text(result).split('\n').map((line) => line.trim()).filter(Boolean)
  // 抛出时最后一行只是 Node 版本号，真正的原因在上面几行的 Error: 后面。
  const reason = lines.find((line) => line.startsWith('Error: '))
  const last = (reason ?? lines.at(-1) ?? '').slice(0, 200)
  return `exit ${result.status} | ${last}`
}

function testData() {
  const result = spawn(['--test', 'tests/data-source.test.mjs'])
  const out = text(result)
  const counts = Object.fromEntries([...out.matchAll(/^ℹ (tests|pass|fail) (\d+)$/gmu)].map((match) => [match[1], Number(match[2])]))
  const where = [...new Set([...out.matchAll(/data-source\.test\.mjs:(\d+):\d+/gu)].map((match) => `:${match[1]}`))]
  const heading = [...out.matchAll(/^✖ (.+?) \(\d/gu)].map((match) => match[1].trim())
  const tail = heading.length ? ` | 红在：${heading.join(' / ')} ${where.join(' ')}` : ''
  return `exit ${result.status} | tests ${counts.tests} pass ${counts.pass} fail ${counts.fail}${tail}`
}

function validate() {
  const result = spawn(['scripts/validate-data.ts'])
  const out = text(result)
  const pass = out.split('\n').find((line) => line.includes('数据校验通过'))?.trim() ?? '(无通过行)'
  const fatal = out.split('\n').filter((line) => /^\s+- (?!hospitals\.json →|reports\.json →|doctors\.json →)/u.test(line)).map((line) => line.trim())
  return `exit ${result.status} | ${pass}${fatal.length ? ` | 硬错误：${fatal.slice(0, 2).join(' ; ')}` : ''}`
}

function restore() {
  spawnSync('git', ['checkout', '--', 'data/curated'], { cwd: ROOT, encoding: 'utf8' })
  clean()
}

function report(label, skipped) {
  console.log(label)
  console.log(`  烘焙       ${bake()}`)
  console.log(`  test:data  ${testData()}`)
  console.log(`  validate   ${validate()}`)
  console.log(skipped.length ? `  让路的保真断言\n${skipped.map((item) => `    · ${item}`).join('\n')}` : '  让路的保真断言  无（质量类断言一律照跑）')
  console.log('')
  restore()
}

const skippedByField = skippedAssertions()
const reports = JSON.parse(spawn(['-e', "process.stdout.write(JSON.stringify(require('./data/curated/reports.json').items))"]).stdout)
const target = reports.find((report) => report.id.endsWith('-s1-r4') && report.doctor_name_raw === '梁红')

const cases = [
  ['stage → diagnosed', 'stage', 'diagnosed'],
  ['hospital_region → 上海', 'hospital_region', '上海'],
  ['hospital_name_raw → 北京回龙观医院（本部）', 'hospital_name_raw', '北京回龙观医院（本部）'],
  ['doctor_name_raw → 梁红（心理科）', 'doctor_name_raw', '梁红（心理科）'],
  ['evidence_quote → 改写一句', 'evidence_quote', '触发风险：研究方向为危机干预，有创伤个案访谈与评估的会议发言'],
]

console.log(`patch 目标：${target.id}（${target.doctor_name_raw} / ${target.hospital_name_raw}）\n`)
for (const [label, field, value] of cases) {
  clean()
  write('reports', {
    schema_version: '1.0.0',
    kind: 'reports',
    id: target.id,
    action: 'patch',
    reason: `实测 patch ${field}`,
    by: 'manual',
    at: '2026-11-10',
    source_value: { [field]: target[field] },
    set: { [field]: value },
  })
  report(`patch ${label}`, skippedByField.get(field) ?? [])
}

clean()
write('reports', {
  schema_version: '1.0.0',
  kind: 'reports',
  id: 'local-probe-1',
  action: 'insert',
  reason: '实测 insert 一条线索',
  by: 'manual',
  at: '2026-11-10',
  set: { ...target, id: 'local-probe-1', evidence_quote: '本地新增：回龙观首诊由潘伟刚主任评估，当场给了 cptsd 方向', stage: 'diagnosed' },
})
report('insert 一条线索（新增记录没有源值可比，保真断言不对它让路）', [])

clean()
write('hospitals', {
  schema_version: '1.0.0',
  kind: 'hospitals',
  id: 'local-probe-hosp',
  action: 'insert',
  reason: '实测 insert 一家医院',
  by: 'manual',
  at: '2026-11-10',
  set: {
    id: 'local-probe-hosp',
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
    last_verified_at: '2026-11-10',
  },
})
report('insert 一家医院', [])

// 改医院名与撤下一家医院：基准是定位依据，所以这两条也能在入库时落地。
clean()
const hospital = JSON.parse(spawn(['-e', "process.stdout.write(JSON.stringify(require('./data/curated/hospitals.json').items[0]))"]).stdout)
write('hospitals', {
  schema_version: '1.0.0',
  kind: 'hospitals',
  id: hospital.id,
  action: 'patch',
  reason: '实测 patch 医院名称',
  by: 'manual',
  at: '2026-11-10',
  source_value: { name: hospital.name },
  set: { name: `${hospital.name}（本部）` },
})
report(`patch 医院 name → ${hospital.name}（本部）`, [])

clean()
write('hospitals', {
  schema_version: '1.0.0',
  kind: 'hospitals',
  id: hospital.id,
  action: 'remove',
  reason: '实测 remove 一家医院',
  by: 'manual',
  at: '2026-11-10',
})
report(`remove 医院 ${hospital.name}（它还有线索，撤下应当被拦住）`, [])

// 没有正向 remove 案例可跑：127 家机构每一家都至少挂着一条已发布线索，
// 撤下任何一家都会命中拦截。要验证放行，得先给那家机构的线索全部改挂别处。

console.log('已还原 data/curated，data/overrides 清空')
