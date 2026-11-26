// Chinese form and option values from the PSYMETRA integration in PR #33.
const PDSS = {
  meta: {
    "id": "pdss",
    "name": "PDSS",
    "fullName": "惊恐障碍严重程度量表（自评版）",
    "englishName": "Panic Disorder Severity Scale",
    "category": "伴随困扰与支持",
    "timeframe": "过去一周",
    "instructions": "请评估在【过去的一周内】您的惊恐发作症状、担忧及回避行为的实际严重程度。惊恐发作是指突然爆发的强烈恐惧或极度不适，数分钟内达到顶峰，并伴有心悸、窒息感、发抖、眩晕、濒死感或失控感等反应。",
    "duration": 3,
    "description": "评估惊恐发作、相关回避及其对日常活动的影响。",
    "attribution": {
      "label": "中文题面来源：PSYMETRA",
      "url": "https://psymetra.underlined.ink/"
    }
  },

  defaultOptions: [
    {"label":"没有","value":0},
    {"label":"轻度","value":1},
    {"label":"中度","value":2},
    {"label":"重度","value":3},
    {"label":"极重度","value":4},
  ],

  questions: [
    {"id":1,"text":"惊恐发作的频度：过去一周内，您总共经历了多少次典型的惊恐发作（或突然暴发的有限症状发作）？","dimension":"核心发作症状","options":[{"label":"没有发作","value":0},{"label":"轻度 (1次发作)","value":1},{"label":"中度 (2-3次发作)","value":2},{"label":"重度 (4-6次发作)","value":3},{"label":"极重度 (≥7次发作)","value":4}]},
    {"id":2,"text":"发作时的痛苦程度：在发作期间，您体验到了多大程度的恐惧、痛苦或濒死/失控感？","dimension":"核心发作症状","options":[{"label":"无发作/完全无痛苦","value":0},{"label":"轻度痛苦","value":1},{"label":"中度痛苦","value":2},{"label":"重度痛苦","value":3},{"label":"极重度痛苦","value":4}]},
    {"id":3,"text":"预期焦虑（对再次发作的恐惧）：过去一周中，您有多大比例的时间在担心下一次惊恐发作何时降临？","dimension":"预期与回避行为","options":[{"label":"完全没有担心","value":0},{"label":"轻度担心","value":1},{"label":"中度担心","value":2},{"label":"重度担心","value":3},{"label":"极重度担心","value":4}]},
    {"id":4,"text":"场所恐惧性回避（广场恐惧）：您是否因害怕发作时无法逃离或求助，而回避某些场所（如拥挤封闭商场、地铁、高速路、电梯或独自外出）？","dimension":"预期与回避行为","options":[{"label":"完全没有回避","value":0},{"label":"轻度担忧","value":1},{"label":"中度回避","value":2},{"label":"重度回避","value":3},{"label":"极重度回避","value":4}]},
    {"id":5,"text":"对躯体感觉的回避（内感性回避）：您是否因害怕诱发心跳加速或呼吸急促，而刻意回避某些身体活动（如运动、爬楼梯、咖啡因或情绪激动）？","dimension":"预期与回避行为","options":[{"label":"完全没有回避","value":0},{"label":"轻度回避","value":1},{"label":"中度回避","value":2},{"label":"重度回避","value":3},{"label":"极重度回避","value":4}]},
    {"id":6,"text":"对工作/学业与日常职责的妨碍：在过去一周中，惊恐发作或对发作的担忧在多大程度上影响了您的工作、学业或家庭日常事务？","dimension":"社会功能受损","options":[{"label":"完全没有妨碍","value":0},{"label":"轻度妨碍","value":1},{"label":"中度妨碍","value":2},{"label":"重度妨碍","value":3},{"label":"极重度妨碍","value":4}]},
    {"id":7,"text":"对社交生活与人际交往的妨碍：在过去一周中，惊恐发作或对发作的担忧在多大程度上影响了您的社交生活和人际交往？","dimension":"社会功能受损","options":[{"label":"完全没有妨碍","value":0},{"label":"轻度妨碍","value":1},{"label":"中度妨碍","value":2},{"label":"重度妨碍","value":3},{"label":"极重度妨碍","value":4}]},
  ],

  scoring: {
    "method": "sum",
    "minScore": 0,
    "maxScore": 28,
    "primaryMetricLabel": "PDSS 惊恐严重度总分",
    "primaryMetricUnit": "分"
  },
};

export default PDSS;
