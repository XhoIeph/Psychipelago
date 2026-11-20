import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { test } from 'node:test'

import { SCALE_LICENSES, licenseOf } from '../lib/psy/licensing.ts'

const catalogue = JSON.parse(
  readFileSync(new URL('../data/psy/catalogue.json', import.meta.url), 'utf8'),
)

const registry = readFileSync(new URL('../lib/psy/registry.ts', import.meta.url), 'utf8')
const loaderIds = [...registry.matchAll(/^ {2}"([a-z0-9]+)": \(\) => import\(/gm)].map((m) => m[1])
const listedIds = (registry.match(/export const ASSESSMENT_IDS: string\[\] = \[(.*?)\];/s)?.[1] ?? '')
  .split(',')
  .map((s) => s.trim().replace(/^"|"$/g, ''))
  .filter(Boolean)

const vendorIds = readdirSync(new URL('../lib/psy/vendor/assessments/', import.meta.url))
  .filter((name) => name.endsWith('.js'))
  .map((name) => name.replace(/\.js$/, ''))
  .sort()

const catalogueIds = catalogue.items.map((item) => item.id)

test('目录 49 条、id 不重复', () => {
  assert.equal(catalogueIds.length, 49)
  assert.equal(new Set(catalogueIds).size, 49)
})

test('每条目录条目都在许可记录里有登记，漏登记直接抛错', () => {
  assert.equal(Object.keys(SCALE_LICENSES).length, 49)
  for (const id of catalogueIds) assert.equal(typeof licenseOf(id).status, 'string')
  assert.throws(() => licenseOf('not-a-scale'), /没有在 lib\/psy\/licensing\.ts 里登记/)
})

test('registry 的 loader、ASSESSMENT_IDS、vendor 文件与目录一一对应', () => {
  assert.equal(loaderIds.length, 49)
  assert.deepEqual([...loaderIds].sort(), catalogueIds.slice().sort())
  assert.deepEqual([...listedIds].sort(), catalogueIds.slice().sort())
  assert.deepEqual(vendorIds, catalogueIds.slice().sort())
})
