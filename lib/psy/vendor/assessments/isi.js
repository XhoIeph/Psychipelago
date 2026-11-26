// Chinese form and option values from the PSYMETRA integration in PR #33.
const ISI = {
  meta: {
    "id": "isi",
    "name": "ISI",
    "fullName": "失眠严重程度指数",
    "englishName": "Insomnia Severity Index",
    "category": "伴随困扰与支持",
    "timeframe": "过去两周",
    "instructions": "请评估在【过去的两周内】您的睡眠问题严重程度。请根据您的实际感受选择最贴切的选项。",
    "duration": 2,
    "description": "了解失眠的程度及其对日常生活的影响。",
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
    {"id":1,"text":"入睡困难（躺下后难以入睡，辗转反侧）的严重程度：","dimension":"夜间睡眠症状"},
    {"id":2,"text":"维持睡眠困难（半夜容易醒来，且醒后难以再次入睡）的严重程度：","dimension":"夜间睡眠症状"},
    {"id":3,"text":"早醒问题（清晨过早醒来，无法再睡着）的严重程度：","dimension":"夜间睡眠症状"},
    {"id":4,"text":"您对自己目前的睡眠模式有多满意/不满意？","dimension":"睡眠满意度与苦恼","options":[{"label":"非常满意","value":0},{"label":"比较满意","value":1},{"label":"中度不满","value":2},{"label":"很不满意","value":3},{"label":"极度不满","value":4}]},
    {"id":5,"text":"您认为您的睡眠问题在多大程度上影响了您的日常日间功能（例如日间疲劳、工作效率、注意力、情绪等）？","dimension":"日间功能损害","options":[{"label":"完全没有","value":0},{"label":"轻度影响","value":1},{"label":"中度影响","value":2},{"label":"严重影响","value":3},{"label":"极度影响","value":4}]},
    {"id":6,"text":"在生活质量方面，您认为身边的其他人注意到了您的睡眠问题给您带来的不良影响吗？","dimension":"日间功能损害","options":[{"label":"完全没有","value":0},{"label":"稍微察觉","value":1},{"label":"明显察觉","value":2},{"label":"相当显著","value":3},{"label":"极度明显","value":4}]},
    {"id":7,"text":"您对目前存在的睡眠问题感到多么担心或苦恼？","dimension":"睡眠满意度与苦恼","options":[{"label":"完全没有","value":0},{"label":"稍有担心","value":1},{"label":"有些苦恼","value":2},{"label":"相当苦恼","value":3},{"label":"极度苦恼","value":4}]},
  ],

  scoring: {
    "method": "sum",
    "minScore": 0,
    "maxScore": 28,
    "primaryMetricLabel": "ISI 失眠严重程度总分",
    "primaryMetricUnit": "分",
    "levels": [
      {
        "label": "无显著失眠",
        "type": "normal",
        "min": 0,
        "max": 7
      },
      {
        "label": "阈下失眠",
        "type": "mild",
        "min": 8,
        "max": 14
      },
      {
        "label": "中度失眠",
        "type": "moderate",
        "min": 15,
        "max": 21
      },
      {
        "label": "重度失眠",
        "type": "severe",
        "min": 22,
        "max": 28
      }
    ]
  },
};

export default ISI;
