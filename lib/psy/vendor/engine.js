// Forms can share sum or mean scoring, or supply their own rules.
export default class AssessmentEngine {
  constructor(assessment) {
    this.assessment = assessment;
    this.answers = {};
  }

  setAnswer(questionId, value) {
    this.answers[questionId] = Number(value);
  }

  computeResult() {
    const { assessment: { meta, questions, defaultOptions, scoring }, answers } = this;
    if (scoring.computeResult) return scoring.computeResult(answers);

    const items = questions.map(({ id, text }) => ({ id, text, value: answers[id], scored: answers[id] }));
    const score = (ids, method, precision = 2) => {
      const sum = ids.reduce((total, id) => total + answers[id], 0);
      return method === 'mean' ? Number((sum / ids.length).toFixed(precision)) : sum;
    };
    const primaryScore = score(items.map(({ id }) => id), scoring.method, scoring.precision);
    const level = scoring.levels?.find(({ min, max }) => primaryScore >= min && primaryScore <= max);
    const optionMax = Math.max(...defaultOptions.map(({ value }) => value));
    const dimensionMethod = scoring.dimensionMethod ?? scoring.method;
    const dimensionScores = scoring.dimensions?.map(({ name, items: ids }) => ({
      name,
      score: score(ids, dimensionMethod),
      max: dimensionMethod === 'mean' ? optionMax : ids.length * optionMax,
    }));
    const now = new Date();
    return {
      scaleId: meta.id,
      scaleName: meta.name,
      scaleFullName: meta.fullName,
      scaleEnglishName: meta.englishName,
      scaleCategory: meta.category,
      scaleDescription: meta.description,
      scaleTimeframe: meta.timeframe,
      references: meta.references,
      primaryScore,
      primaryMetric: {
        label: scoring.primaryMetricLabel,
        value: primaryScore,
        unit: scoring.primaryMetricUnit,
        min: scoring.minScore,
        max: scoring.maxScore,
      },
      secondaryMetrics: [
        { label: '评分区间', value: `${scoring.minScore} - ${scoring.maxScore}`, unit: '分' },
        { label: '题目总数', value: questions.length, unit: '题' },
      ],
      level: level?.label ?? '',
      levelType: level?.type,
      dimensionScores,
      answers: items,
      timestamp: now.toISOString(),
      completedTimeFormatted: now.toLocaleString('zh-CN', { hour12: false }),
    };
  }
}
