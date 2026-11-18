import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { applyOverrides } from '../scripts/lib/overrides.ts'
import { hospitalsFromRun } from '../scripts/lib/hospitals.ts'

const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'))
const run = read('../data/evidence/locations/amap-2026-11-09.json')
const derived = hospitalsFromRun(run)

const insert = {
  schema_version: '1.0.0',
  kind: 'hospitals',
  id: 'local-test-insert',
  action: 'insert',
  reason: '测试：新增机构',
  by: 'manual',
  at: '2026-11-11',
  set: {
    id: 'local-test-insert',
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
}

test('同一条 insert 叠在派生集上，跑几次都是同一份结果', () => {
  const first = applyOverrides('hospitals', derived, [insert])
  const second = applyOverrides('hospitals', derived, [insert])
  assert.deepEqual(first.errors, [], '派生集里没有这家机构，insert 不该报错')
  assert.deepEqual(second.items, first.items, '同样的输入必须得到同样的输出')
  assert.equal(first.items.length, derived.length + 1)
  assert.ok(first.items.some(item => item.id === insert.id))
})

test('拿已烘焙的结果当基准再叠 insert，就会自我否定——这正是要避开的基准', () => {
  const baked = applyOverrides('hospitals', derived, [insert]).items
  const again = applyOverrides('hospitals', baked, [insert])
  assert.match(again.errors.join('\n'), /已是源记录/, '烘焙产物里已经有这个 id，insert 必然撞自己')
})
