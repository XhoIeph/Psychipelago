/**
 * 手工诊断：控制台新增一家机构之后，连续烘焙三次——每次都 exit 0，第二次起 hospitals.json 逐字节不变。
 *
 *   node tests/overrides-insert-idempotent-probe.mjs
 *
 * 「新增 → 定位 → 再保存」是控制台的正常流程，烘焙不能因为上一次自己写下的 insert 而报错。
 * 会自己写覆盖层、跑烘焙，最后还原。
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = process.cwd()
const ID = 'local-probe-insert'
const read = path => JSON.parse(readFileSync(resolve(ROOT, path), 'utf8'))
const write = (path, value) => writeFileSync(resolve(ROOT, path), `${JSON.stringify(value, null, 2)}\n`, 'utf8')

function clean() {
  rmSync(resolve(ROOT, 'data/overrides'), { recursive: true, force: true })
  for (const kind of ['reports', 'doctors', 'hospitals']) mkdirSync(resolve(ROOT, 'data/overrides', kind), { recursive: true })
}

function restore() {
  clean()
  spawnSync('git', ['checkout', '--', 'data/curated', 'data/generated'], { cwd: ROOT })
}

clean()
write(`data/overrides/hospitals/${ID}.json`, {
  schema_version: '1.0.0',
  kind: 'hospitals',
  id: ID,
  action: 'insert',
  reason: '诊断：新增机构的幂等',
  by: 'manual',
  at: '2026-11-11',
  set: {
    id: ID,
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
    last_verified_at: '2026-11-11',
  },
})

let ok = true
let previous
for (const round of [1, 2, 3]) {
  const before = readFileSync(resolve(ROOT, 'data/curated/hospitals.json'))
  const bake = spawnSync(process.execPath, ['scripts/import-kdocs.ts'], { cwd: ROOT, encoding: 'utf8' })
  const after = readFileSync(resolve(ROOT, 'data/curated/hospitals.json'))
  const items = JSON.parse(after.toString('utf8')).items
  const present = items.some(item => item.id === ID)
  const stable = previous === undefined ? true : after.equals(previous)
  if (bake.status !== 0 || !present || !stable) ok = false
  console.log(
    `第 ${round} 次：exit ${bake.status}　总 ${items.length} 家　新增在库 ${present ? '是' : '否'}　` +
      `与上一次${previous === undefined ? '（首次，跳过）' : after.equals(previous) ? '逐字节相同' : '不同'}`,
  )
  if (bake.status !== 0) {
    const message = `${bake.stdout ?? ''}${bake.stderr ?? ''}`.trim().split('\n').filter(line => line.trim())
    console.log(message.slice(-4).map(line => `    ${line}`).join('\n'))
  }
  console.log(`  （首次前 ${before.length} 字节 → 现在 ${after.length} 字节）`)
  previous = after
}

restore()
console.log(`\n判定：${ok ? '幂等，控制台可以连着保存' : '不幂等，新增机构第二次烘焙会挡死'}`)
if (!ok) process.exitCode = 1
