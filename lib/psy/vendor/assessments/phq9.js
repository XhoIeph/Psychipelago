// Pfizer-funded assessment. The Chinese form and reuse terms are linked in the introduction.
export default {
  "meta": {
    "id": "phq9",
    "name": "PHQ-9",
    "fullName": "患者健康问卷抑郁量表",
    "englishName": "Patient Health Questionnaire-9",
    "category": "抑郁筛查",
    "targetGroups": [
      "成人",
      "青少年",
      "社区人群",
      "初级卫生保健患者"
    ],
    "description": "评估过去两周的抑郁症状及其程度。",
    "instructions": "在过去兩个星期，你有多经常受以下问题困扰？",
    "duration": 3,
    "timeframe": "最近两周",
    "references": {
      "original": [
        "Kroenke, K., Spitzer, R.L., & Williams, J.B.W. (2001). The PHQ-9: Validity of a brief depression severity measure. Journal of General Internal Medicine, 16(9), 606-613."
      ]
    },
    "attribution": {
      "label": "Spitzer、Williams、Kroenke 等编制，中文版来源",
      "url": "https://www.dhc.gov.hk/sc/depression_questionnaire.html"
    }
  },
  "defaultOptions": [
    {
      "label": "完全不会",
      "value": 0
    },
    {
      "label": "几天",
      "value": 1
    },
    {
      "label": "一半以上的天数",
      "value": 2
    },
    {
      "label": "近乎每天",
      "value": 3
    }
  ],
  "questions": [
    {
      "id": 1,
      "text": "做任何事都觉得沉闷或者根本不想做任何事"
    },
    {
      "id": 2,
      "text": "情绪低落、抑郁或绝望"
    },
    {
      "id": 3,
      "text": "难于入睡；半夜会醒或相反地睡觉时间过多"
    },
    {
      "id": 4,
      "text": "觉得疲倦或活力不足"
    },
    {
      "id": 5,
      "text": "胃口极差或进食过量"
    },
    {
      "id": 6,
      "text": "不喜欢自己 — 觉得自己做得不好、对自己失望或有负家人期望"
    },
    {
      "id": 7,
      "text": "难于集中精神做事，例如看报纸或看电视"
    },
    {
      "id": 8,
      "text": "其他人反映你行动或说话迟缓；或者相反地，你比平常活动更多 — 坐立不安、停不下来"
    },
    {
      "id": 9,
      "text": "想到自己最好去死或者自残"
    }
  ],
  "scoring": {
    "method": "sum",
    "primaryMetricLabel": "PHQ-9 抑郁总分",
    "primaryMetricUnit": "分",
    "minScore": 0,
    "maxScore": 27,
    "levels": [
      {
        "min": 0,
        "max": 4,
        "type": "normal",
        "label": "无或很轻抑郁症状"
      },
      {
        "min": 5,
        "max": 9,
        "type": "mild",
        "label": "轻度抑郁症状"
      },
      {
        "min": 10,
        "max": 14,
        "type": "moderate",
        "label": "中度抑郁症状"
      },
      {
        "min": 15,
        "max": 19,
        "type": "moderate-severe",
        "label": "中重度抑郁症状"
      },
      {
        "min": 20,
        "max": 27,
        "type": "severe",
        "label": "重度抑郁症状"
      }
    ]
  }
};
