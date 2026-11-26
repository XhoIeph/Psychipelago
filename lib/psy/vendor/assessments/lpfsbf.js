// Chinese form and option values from the PSYMETRA integration in PR #33.
const LPFSBF = {
  meta: {
    "id": "lpfsbf",
    "name": "LPFS-BF 2.0",
    "fullName": "人格功能水平量表简版 2.0",
    "englishName": "Level of Personality Functioning Scale - Brief Form 2.0",
    "category": "人格与情绪调节",
    "timeframe": "当前与近期的总体真实状态",
    "instructions": "请评估以下每一项陈述在多大程度上符合您当下的情况（Report for each of the following statements to what extent they apply to you at this moment），选择最贴切的选项。",
    "duration": 3,
    "description": "评估自我与人际两个方面的人格功能。",
    "attribution": {
      "label": "中文题面来源：PSYMETRA",
      "url": "https://psymetra.underlined.ink/"
    }
  },

  defaultOptions: [
    {"label":"非常不符合或经常不符合","value":1},
    {"label":"有时不符合或有点不符合","value":2},
    {"label":"有时符合或有点符合","value":3},
    {"label":"非常符合或经常符合","value":4},
  ],

  questions: [
    {"id":1,"text":"我经常不知道自己究竟是谁","enText":"I often do not know who I really am","subcomponent":"认同 (Identity)","dimension":"自我功能受损"},
    {"id":2,"text":"我常常对自己抱有非常消极负面的看法","enText":"I often think very negatively about myself","subcomponent":"认同 (Identity)","dimension":"自我功能受损"},
    {"id":3,"text":"我的情绪总是变化无常，而我无法掌控它们","enText":"My emotions change without me having a grip on them","subcomponent":"认同 (Identity)","dimension":"自我功能受损"},
    {"id":4,"text":"对于自己的人生想走向何方，我毫无方向感","enText":"I have no sense of where I want to go in my life","subcomponent":"自我定向 (Self-direction)","dimension":"自我功能受损"},
    {"id":5,"text":"我常常无法理解自己的想法和感受","enText":"I often do not understand my own thoughts and feelings","subcomponent":"自我定向 (Self-direction)","dimension":"自我功能受损"},
    {"id":6,"text":"我常常对自己提出不切实际的要求","enText":"I often make unrealistic demands on myself","subcomponent":"自我定向 (Self-direction)","dimension":"自我功能受损"},
    {"id":7,"text":"我常常很难理解他人的想法和感受","enText":"I often have difficulty understanding the thoughts and feelings of others","subcomponent":"共情 (Empathy)","dimension":"人际功能受损"},
    {"id":8,"text":"当别人持有不同观点时，我常常觉得很难忍受","enText":"I often find it hard to stand it when others have a different opinion","subcomponent":"共情 (Empathy)","dimension":"人际功能受损"},
    {"id":9,"text":"我常常不太明白为什么自己的行为会对他人产生某种影响","enText":"I often do not fully understand why my behavior has a certain effect on others","subcomponent":"共情 (Empathy)","dimension":"人际功能受损"},
    {"id":10,"text":"我的人际关系和友谊从不能长久维持","enText":"My relationships and friendships never last long","subcomponent":"亲密 (Intimacy)","dimension":"人际功能受损"},
    {"id":11,"text":"当人际关系变得更为亲近深入时，我常常感到非常脆弱","enText":"I often feel very vulnerable when relations become more personal","subcomponent":"亲密 (Intimacy)","dimension":"人际功能受损"},
    {"id":12,"text":"在与他人合作时，我常常无法做到让双方都满意","enText":"I often do not succeed in cooperating with others in a mutually satisfactory way","subcomponent":"亲密 (Intimacy)","dimension":"人际功能受损"},
  ],

  scoring: {
    "method": "sum",
    "minScore": 12,
    "maxScore": 48,
    "primaryMetricLabel": "LPFS-BF 人格功能受损总分",
    "primaryMetricUnit": "分 (12 - 48)",
    "dimensions": [
      {
        "name": "自我功能受损",
        "items": [
          1,
          2,
          3,
          4,
          5,
          6
        ]
      },
      {
        "name": "人际功能受损",
        "items": [
          7,
          8,
          9,
          10,
          11,
          12
        ]
      }
    ],
    "dimensionMethod": "mean"
  },
};

export default LPFSBF;
