import assert from 'node:assert/strict'
import { test } from 'node:test'
import Engine from '../lib/psy/vendor/engine.js'
import { loadAssessment } from '../lib/psy/registry.ts'

const form = await loadAssessment('itq')
const score = (overrides) => {
  const engine = new Engine(form)
  for (const { id } of form.questions) engine.setAnswer(id, overrides[id] ?? 0)
  return engine.computeResult()
}
const ptsd = { 1: 2, 4: 2, 6: 2, 8: 2 }
const dso = { 11: 2, 13: 2, 15: 2, 18: 2 }

test('ITQ applies the inclusive threshold separately to every cluster and impairment group', () => {
  assert.equal(score(ptsd).classification, 'ptsd')
  assert.equal(score({ ...ptsd, ...dso }).classification, 'cptsd')
  assert.equal(score(dso).classification, 'below-threshold')
  assert.equal(score({ ...ptsd, ...dso, 6: 1 }).classification, 'below-threshold')
  assert.equal(score({ ...ptsd, ...dso, 8: 1 }).classification, 'below-threshold')
  assert.equal(score({ ...ptsd, ...dso, 18: 1 }).classification, 'ptsd')
  assert.equal(score({ ...ptsd, ...dso, 13: 1 }).classification, 'ptsd')
})

test('ITQ identical symptom sums can give different classifications', () => {
  const both = score({ ...ptsd, ...dso })
  const missingCluster = score({ ...ptsd, ...dso, 4: 0, 1: 4 })
  assert.equal(both.primaryScore, 6)
  assert.equal(missingCluster.primaryScore, 6)
  assert.deepEqual(both.secondaryMetrics, missingCluster.secondaryMetrics)
  assert.equal(both.classification, 'cptsd')
  assert.equal(missingCluster.classification, 'below-threshold')
  assert.equal(score(Object.fromEntries(form.questions.map(({ id }) => [id, 4]))).primaryScore, 24)
  assert.equal(both.scoringVersion, form.meta.formVersion)
})

for (const [id, items, cutoffs] of [['phq9', 9, [0, 5, 10, 15, 20]], ['gad7', 7, [0, 5, 10, 15]]]) {
  test(`${id} sums responses and uses the original severity cutoffs`, async () => {
    const assessment = await loadAssessment(id)
    for (const [index, cutoff] of cutoffs.entries()) {
      const engine = new Engine(assessment)
      for (let n = 0; n < items; n++) engine.setAnswer(n + 1, Math.max(0, Math.min(3, cutoff - n * 3)))
      const result = engine.computeResult()
      assert.equal(result.primaryScore, cutoff)
      assert.equal(result.level, assessment.scoring.levels[index].label)
    }
  })
}

test('PCL-5 sums 20 responses, including four cluster scores, and uses the reference cutoff of 33', async () => {
  const assessment = await loadAssessment('pcl5')
  const engine = new Engine(assessment)
  for (const { id } of assessment.questions) engine.setAnswer(id, id <= 8 ? 4 : 0)
  assert.equal(engine.computeResult().level, '低于筛查参考值')
  engine.setAnswer(20, 1)
  const result = engine.computeResult()
  assert.equal(result.primaryScore, 33)
  assert.equal(result.level, '达到筛查参考值')
  assert.deepEqual(result.dimensionScores.map(({ score, max }) => [score, max]), [[20, 20], [8, 8], [4, 28], [1, 24]])
})

test('BSL-23 averages the 23 scored items without inventing levels or subscales', async () => {
  const form = await loadAssessment('bsl23')
  const engine = new Engine(form)
  for (const { id } of form.questions) engine.setAnswer(id, id === 23 ? 3 : 2)
  const result = engine.computeResult()
  assert.equal(result.primaryScore, 2.04)
  assert.equal(result.primaryMetric.max, 4)
  assert.equal(result.level, '')
  assert.equal(result.dimensionScores, undefined)
})

test('MSPSS averages all items and the official four-item subscales', async () => {
  const form = await loadAssessment('mspss')
  const engine = new Engine(form)
  const answers = [7, 1, 3, 4, 2, 5, 6, 7, 1, 2, 3, 4]
  for (const { id } of form.questions) engine.setAnswer(id, answers[id - 1])
  const result = engine.computeResult()
  assert.equal(result.primaryScore, 3.75)
  assert.deepEqual(result.dimensionScores.map(({ score, max }) => [score, max]), [[4.25, 7], [4, 7], [3, 7]])
  assert.equal(result.level, '')
})

function scoredWith(assessment, valueFor) {
  const engine = new Engine(assessment)
  for (const item of assessment.questions) engine.setAnswer(item.id, valueFor(item))
  return engine.computeResult()
}

test('restored scales preserve the item counts and use the correct score ranges', async () => {
  const ranges = [
    ['des2', 28, 0, 100], ['cds', 29, 0, 116], ['ders16', 16, 16, 80],
    ['lpfsbf', 12, 12, 48], ['isi', 7, 0, 28], ['pdss', 7, 0, 28],
  ]
  for (const [id, count, min, max] of ranges) {
    const assessment = await loadAssessment(id)
    assert.equal(assessment.questions.length, count, id)
    const values = (item) => (item.options ?? assessment.defaultOptions).map(({ value }) => value)
    assert.equal(scoredWith(assessment, (q) => Math.min(...values(q))).primaryScore, min, id)
    const result = scoredWith(assessment, (q) => Math.max(...values(q)))
    assert.equal(result.primaryScore, max, id)
    assert.deepEqual([result.primaryMetric.min, result.primaryMetric.max], [min, max], id)
    for (const dimension of result.dimensionScores ?? []) assert.equal(dimension.score, dimension.max, id)
  }
  const des = await loadAssessment('des2')
  assert.equal(scoredWith(des, ({ id }) => id === 1 ? 100 : 0).primaryScore, 3.6)
  for (const id of ['ders16', 'lpfsbf']) {
    const assessment = await loadAssessment(id)
    const result = scoredWith(assessment, ({ id: item }) => item === 1 ? 4 : 1)
    assert.equal(result.primaryScore, assessment.questions.length + 3, id)
    assert.equal(result.dimensionScores[0].score, id === 'ders16' ? 2.5 : 1.5, id)
  }
})

test('PDQ-4+ applies both group thresholds and counts a shared item once in the total', async () => {
  const assessment = await loadAssessment('pdq4plus')
  const only = (...yes) => scoredWith(assessment, ({ id }) => Number(yes.includes(id)))
  assert.equal(assessment.questions.length, 126)
  assert.equal(only().primaryScore, 0)
  const all = scoredWith(assessment, () => 1)
  assert.equal(all.primaryScore, 94)
  assert.equal(all.primaryMetric.max, 94)
  assert.equal(only(106).primaryScore, 0)
  assert.equal(only(106, 107).primaryScore, 1)
  assert.equal(only(112, 113).primaryScore, 0)
  assert.equal(only(112, 113, 126).primaryScore, 1)
  assert.equal(only(60).primaryScore, 1)
  assert.deepEqual(only(60).dimensionScores.filter(({ score }) => score).map(({ name }) => name), ['分裂样型', '分裂型'])
})

test('PDQ-4+ applies dimension and validity cutoffs without adding validity-only items to the total', async () => {
  const assessment = await loadAssessment('pdq4plus')
  const only = (...yes) => scoredWith(assessment, ({ id }) => Number(yes.includes(id)))
  assert.equal(only(8, 20).dimensionScores[6].level, '低于筛查参考值')
  assert.equal(only(8, 20, 33).dimensionScores[6].level, '达到筛查参考值')
  assert.equal(only(51).validityConclusion, undefined)
  assert.ok(only(51, 64).validityConclusion)
  assert.equal(only(12, 51, 64).validityConclusion, undefined)
  assert.equal(only(12, 25, 38, 51, 64, 76).primaryScore, 0)
  assert.equal(only(70, 84).primaryScore, 2)
  assert.ok(only(70, 84).validityConclusion)
})
