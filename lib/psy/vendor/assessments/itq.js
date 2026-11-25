// Simplified Chinese translation by Grace W. K. Ho (2017), distributed by Trauma Measures Global.
const sections = [
  { instruction: '以下是一些人们在应对创伤性或压力生活事件有时出现的问题，请仔细阅读每个项目，然后在右边圈出其中一个数字，以显示你在过去一个月被该问题困扰的程度。', items: [
    '出现不愉快的梦境，而那些梦境重现该经历的部分、或明显地与该经历相关?',
    '有时强烈的影像或记忆进入你的思想，使你觉得该经历在此时此刻会再次发生一样?',
    '避免自己内心提起该经历（例如：有关该经历的想法、感受或身体感觉）?',
    '避免从外界环境提起该经历（例如：从人物、地点、对话、事物、活动、或情况）?',
    '处于「超级戒备」、警惕、或防御的状态?',
    '感到提心吊胆或容易受惊?',
  ] },
  { instruction: '在过去一个月，出现以上症状, 因而：', items: [
    '影响你的人际关系或社交生活？',
    '影响你的工作或工作能力？',
    '影响你生活上任何其他重要部分，例如：教养子女、学校或学院的功课，或其他重要活动？',
  ] },
  { instruction: '以下是曾经历压力或创伤事件的人有时会出现的问题或症状。这些问题是关于你一般的感受、你通常对自己的想法、及通常与人相处的方式。请回答下列各陈述在何等程度上能准确地陈述你的想法。', items: [
    '当我感到不快，我需要长时间才能冷静下来。',
    '我感到麻木或情感封闭。',
    '我觉得好像一个失败的人。',
    '我觉得自己没有价值。',
    '我感觉与他人疏离或断绝任何联系。',
    '我感到难以与他人保持亲密的感情。',
  ] },
  { instruction: '在过去一个月，上述有关情绪、自我信念和人际关系上的问题：', items: [
    '对你的人际关系或社交生活造成不安或困扰？',
    '影响你的工作或工作能力？',
    '影响你生活的任何其他重要部分，例如: 教养子女、学校或学院的功课，或其他重要活动？',
  ] },
];

const symptoms = [
  ['再体验', [1, 2]], ['回避', [3, 4]], ['当前威胁感', [5, 6]],
  ['情绪失调', [10, 11]], ['负面自我概念', [12, 13]], ['人际关系困扰', [14, 15]],
];
const impairment = [[7, 8, 9], [16, 17, 18]];
const meta = {
  id: 'itq',
  name: 'ITQ',
  fullName: '国际创伤问卷',
  englishName: 'International Trauma Questionnaire',
  formVersion: 'itq-zh-ho-icd11',
  category: '创伤与解离',
  description: '按照 ICD-11 评估创伤后应激与自我组织困难。',
  instructions: '请想一个最负面 或 创伤的经历，并根据此经历回答以下各题。',
  attribution: { label: '简体中文版由 Grace W. K. Ho（2017）翻译', url: 'https://www.traumameasuresglobal.com/ptsd' },
};
let id = 0;
const questions = sections.flatMap(({ instruction, items }) =>
  items.map((text, index) => ({ id: ++id, text, instruction: index === 0 ? instruction : undefined })),
);
const defaultOptions = ['完全沒有', '有少许', '中度', '相当多', '极度'].map((label, value) => ({ label, value }));

function computeResult(answers) {
  const endorsed = (items) => items.some((item) => answers[item] >= 2);
  const sum = (items) => items.reduce((total, item) => total + answers[item], 0);
  const ptsd = symptoms.slice(0, 3).every(([, items]) => endorsed(items)) && endorsed(impairment[0]);
  const dso = symptoms.slice(3).every(([, items]) => endorsed(items)) && endorsed(impairment[1]);
  const classification = ptsd ? (dso ? 'cptsd' : 'ptsd') : 'below-threshold';
  const level = { cptsd: '达到 CPTSD 筛查标准', ptsd: '达到 PTSD 筛查标准', 'below-threshold': '未达到 PTSD 或 CPTSD 筛查标准' }[classification];
  const primaryScore = sum(symptoms.slice(0, 3).flatMap(([, items]) => items));
  const now = new Date();
  return {
    scaleId: meta.id,
    scaleName: meta.name,
    scaleFullName: meta.fullName,
    scaleEnglishName: meta.englishName,
    scaleCategory: meta.category,
    scoringVersion: meta.formVersion,
    classification,
    primaryScore,
    primaryMetric: { label: 'PTSD 症状', value: primaryScore, max: 24, unit: '分' },
    secondaryMetrics: [{ label: '自我组织困难（DSO）症状', value: sum(symptoms.slice(3).flatMap(([, items]) => items)), max: 24, unit: '分' }],
    level,
    levelType: 'info',
    summary: '每个症状簇至少一项达到 2 分，且对应的生活影响至少一项达到 2 分，才达到该组筛查标准。两组均达到时，结果显示为 CPTSD。',
    dimensionScores: symptoms.map(([name, items]) => ({ name, score: sum(items), max: 8, level: endorsed(items) ? '达到阈值' : '未达到阈值' })),
    answers: questions.map(({ id, text }) => ({ id, text, value: answers[id], scored: answers[id] })),
    timestamp: now.toISOString(),
    completedTimeFormatted: now.toLocaleString('zh-CN', { hour12: false }),
  };
}

export default { meta, questions, defaultOptions, scoring: { computeResult } };
