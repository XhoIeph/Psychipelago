// Chinese form and option values from the PSYMETRA integration in PR #33.
const DERS16 = {
  meta: {
    "id": "ders16",
    "name": "DERS-16",
    "fullName": "情绪调节困难量表简版",
    "englishName": "Difficulties in Emotion Regulation Scale - 16 Items",
    "category": "人格与情绪调节",
    "timeframe": "近期日常生活",
    "instructions": "请评估下列句子在多大程度上能够贴切地描述您在近期面对情绪低落、烦躁或困扰时的真实反应。请根据您的第一直觉作答。",
    "duration": 3,
    "description": "评估理解、接纳和调节情绪时遇到的困难。",
    "attribution": {
      "label": "中文题面来源：PSYMETRA",
      "url": "https://psymetra.underlined.ink/"
    }
  },

  defaultOptions: [
    {"label":"几乎从不（0%–10%）","value":1},
    {"label":"有时如此（11%–35%）","value":2},
    {"label":"约半数时间（36%–65%）","value":3},
    {"label":"大部分时间（66%–90%）","value":4},
    {"label":"几乎总是（91%–100%）","value":5},
  ],

  questions: [
    {"id":1,"text":"我对自己的感受感到困惑不解，弄不清楚自己心里到底是怎么了","dimension":"情绪明确性"},
    {"id":2,"text":"我很难理解自己为什么会有这些突如其来的负面情绪","dimension":"情绪明确性"},
    {"id":3,"text":"当我难过或难受时，我发现自己很难按计划完成必须要做的事情","dimension":"目标导向维持"},
    {"id":4,"text":"当我心烦意乱时，我感觉自己整个人都彻底失控了","dimension":"冲动控制"},
    {"id":5,"text":"当我感到难过时，我对自己产生这种软弱感觉感到羞耻或内疚","dimension":"非接纳态度"},
    {"id":6,"text":"当我情绪低落时，我觉得自己可能永远也无法好起来了","dimension":"调节策略匮乏"},
    {"id":7,"text":"当我心烦时，我很难集中注意力去进行思考或解决现实任务","dimension":"目标导向维持"},
    {"id":8,"text":"当我感到烦乱时，我的言行举止往往会脱离自我理智的控制","dimension":"冲动控制"},
    {"id":9,"text":"当我难过时，我会对自己感到非常恼火、愤怒或厌烦","dimension":"非接纳态度"},
    {"id":10,"text":"当我心情不好时，我觉得无论自己做什么都不会让我感觉好受一点","dimension":"调节策略匮乏"},
    {"id":11,"text":"当我心烦时，我很难抑制住自己盲目冲动的破坏性冲动","dimension":"冲动控制"},
    {"id":12,"text":"当我情绪极度低落时，我觉得自己甚至连最基本的日常琐事都无力应对","dimension":"调节策略匮乏"},
    {"id":13,"text":"当我难过时，我为自己竟然感到如此脆弱、不堪一击而深感自责","dimension":"非接纳态度"},
    {"id":14,"text":"当我心情烦闷时，我觉得自己脑中没有任何行之有效的策略来平复它","dimension":"调节策略匮乏"},
    {"id":15,"text":"当我情绪糟糕时，我很难停下来静下心去思考现实解决途径","dimension":"目标导向维持"},
    {"id":16,"text":"当我心烦意乱时，我觉得自己最终会彻底情绪崩溃、陷入绝境","dimension":"调节策略匮乏"},
  ],

  scoring: {
    "method": "sum",
    "minScore": 16,
    "maxScore": 80,
    "primaryMetricLabel": "DERS-16 情绪调节困难总分",
    "primaryMetricUnit": "分",
    "dimensions": [
      {
        "name": "情绪明确性",
        "items": [
          1,
          2
        ]
      },
      {
        "name": "目标导向维持",
        "items": [
          3,
          7,
          15
        ]
      },
      {
        "name": "冲动控制",
        "items": [
          4,
          8,
          11
        ]
      },
      {
        "name": "非接纳态度",
        "items": [
          5,
          9,
          13
        ]
      },
      {
        "name": "调节策略匮乏",
        "items": [
          6,
          10,
          12,
          14,
          16
        ]
      }
    ],
    "dimensionMethod": "mean"
  },
};

export default DERS16;
