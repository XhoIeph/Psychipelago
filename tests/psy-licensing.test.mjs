import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import { PSY_FILTERS } from '../lib/psy/categories.ts'
import { SCALE_LICENSES } from '../lib/psy/licensing.ts'
import { ASSESSMENT_IDS, loadAssessment } from '../lib/psy/registry.ts'

const { items } = JSON.parse(readFileSync(new URL('../data/psy/catalogue.json', import.meta.url), 'utf8'))
const retired = 'asrs catq asrm scoff audit mmpi mid ymrs asq bss cssrs isas sbqr ace ctqsf pds pid5 scl90 sds sas dass21 psqi mdq hcl32 bsds rses epds ess nias bes eat26 edeq ocir aqa raadsr cape42 pqb'.split(' ')

test('catalogue, available forms and approval records agree', async () => {
  const ids = items.map(({ id }) => id)
  assert.deepEqual(ids, 'itq pcl5 des2 cds bsl23 ders16 lpfsbf pdq4plus phq9 gad7 isi pdss mspss'.split(' '))
  assert.deepEqual(ASSESSMENT_IDS, ids)
  assert.deepEqual(Object.keys(SCALE_LICENSES), ids)
  const files = readdirSync(new URL('../lib/psy/vendor/assessments/', import.meta.url))
  assert.deepEqual(files.sort(), ids.map((id) => `${id}.js`).sort())
  for (const item of items) {
    const form = await loadAssessment(item.id)
    assert.equal(form.meta.id, item.id)
    assert.equal(form.meta.formVersion, item.formVersion)
    assert.equal(form.meta.attribution.url, SCALE_LICENSES[item.id].source)
    const grouped = form.questions.filter(({ groupPrompt }) => groupPrompt)
    const subtracted = grouped.length - new Set(grouped.map(({ groupPrompt }) => groupPrompt)).size
    assert.equal(form.questions.length - subtracted, item.questionCount)
  }
})

test('retired forms have no quiz loader', async () => {
  assert.equal(new Set(retired).size, 37)
  for (const id of retired) assert.equal(await loadAssessment(id), null, id)
})

test('all 13 entries are browsable in the three catalogue categories', () => {
  assert.equal(new Set(items.map(({ id }) => id)).size, 13)
  assert.deepEqual(PSY_FILTERS.slice(1).map(({ label }) => items.filter(({ category }) => category === label).length), [4, 4, 5])
  assert.ok(items.every(({ id }) => !retired.includes(id)))
})
