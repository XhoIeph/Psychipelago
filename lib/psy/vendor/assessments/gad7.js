// Pfizer-funded assessment. The Chinese form and reuse terms are linked in the introduction.
export default {
  "meta": {
    "id": "gad7",
    "name": "GAD-7",
    "fullName": "广泛性焦虑自评量表",
    "englishName": "Generalized Anxiety Disorder-7",
    "category": "焦虑筛查",
    "targetGroups": [
      "成人",
      "青少年",
      "职场人群",
      "门诊患者"
    ],
    "description": "评估过去两周的焦虑症状及其程度。",
    "instructions": "在过去两周，您经常受到以下问题的困扰吗？",
    "duration": 2,
    "timeframe": "最近两周",
    "references": {
      "original": [
        "Spitzer, R.L., Kroenke, K., Williams, J.B.W., & Löwe, B. (2006). A brief measure for assessing generalized anxiety disorder. Archives of Internal Medicine, 166, 1092-1097."
      ]
    },
    "attribution": {
      "label": "Spitzer、Williams、Kroenke 等编制，中文版来源",
      "url": "https://projectteachny.org/app/uploads/2022/07/GAD7_Simplified-Chinese-for-Mainland-China.pdf"
    }
  },
  "defaultOptions": [
    {
      "label": "从来没有",
      "value": 0
    },
    {
      "label": "有几天",
      "value": 1
    },
    {
      "label": "刚超过一半天数",
      "value": 2
    },
    {
      "label": "接近每天",
      "value": 3
    }
  ],
  "questions": [
    {
      "id": 1,
      "text": "感觉心神不安、焦虑或高度紧张"
    },
    {
      "id": 2,
      "text": "不能停止或控制担心"
    },
    {
      "id": 3,
      "text": "为各种各样的事情过度担心"
    },
    {
      "id": 4,
      "text": "难以放松"
    },
    {
      "id": 5,
      "text": "非常不安静以至于难以坐定"
    },
    {
      "id": 6,
      "text": "变得易恼火或易急躁"
    },
    {
      "id": 7,
      "text": "害怕发生可怕的事情"
    }
  ],
  "scoring": {
    "method": "sum",
    "primaryMetricLabel": "GAD-7 焦虑总分",
    "primaryMetricUnit": "分",
    "minScore": 0,
    "maxScore": 21,
    "levels": [
      {
        "min": 0,
        "max": 4,
        "type": "normal",
        "label": "无或很轻焦虑症状"
      },
      {
        "min": 5,
        "max": 9,
        "type": "mild",
        "label": "轻度焦虑症状"
      },
      {
        "min": 10,
        "max": 14,
        "type": "moderate",
        "label": "中度焦虑症状"
      },
      {
        "min": 15,
        "max": 21,
        "type": "severe",
        "label": "重度焦虑症状"
      }
    ]
  }
};
