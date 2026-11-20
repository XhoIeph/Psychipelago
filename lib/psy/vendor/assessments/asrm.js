// Vendored from PSYMETRA (js/engine.js, js/assessments/*.js) on 2026-11-12.
// Scoring logic is copied verbatim; only export shims changed. Do not "improve" numbers here.

/**
 * PSYMETRA - ASRM Assessment Definition
 * 奥特曼自评躁狂量表 (Altman Self-Rating Mania Scale)
 * Altman et al. (1997) 经典躁狂/轻躁狂临床自评量表
 */

const ASRM = {
  meta: {
    id: 'asrm',
    name: 'ASRM',
    fullName: '奥特曼自评躁狂量表',
    englishName: 'Altman Self-Rating Mania Scale',
    category: '双相/躁狂',
    targetGroups: ['成人', '青少年', '双相情感障碍患者', '抑郁症患者', '心境波动困扰者'],
    description: '由 Altman 等学者于 1997 年研制，是国际精神医学界最简洁、权威且被广泛验证的双相障碍自评工具之一。全量表仅包含 5 个核心症状条目（情绪高涨、自信膨胀、睡眠减少、言语增多、活动躁动），用于评估个体在过去一周内是否存在躁狂或轻躁狂发作倾向。',
    instructions: '以下 5 组陈述评估您在【过去一周内（包括今天）】的感觉与行为表现。每道题包含 5 级描述（0 至 4 分），请仔细阅读每一组选项，并选出最符合您过去一周真实状态的一项。',
    duration: 2,
    pageSize: 5,
    timeframe: '过去一周（包括今天）',
    references: {
      original: [
        'Altman, E. G., Hedeker, D., Peterson, J. L., & Davis, J. M. (1997). The Altman Self-Rating Mania Scale. Biological Psychiatry, 42(10), 948-955.'
      ],
      chineseValidation: [
        '王雪, 司天梅, 等. (2014). 奥特曼自评躁狂量表在双相障碍门诊患者中的效度检验. 中国神经精神疾病杂志.'
      ]
    }
  },
  questions: [
    {
      id: 1,
      text: '关于情绪愉悦与开朗程度（过去一周）：',
      dimension: '情绪与自我认知',
      options: [
        { label: '0分：无高涨', value: 0, desc: '我没有感到比平时更开朗、快乐或兴奋。' },
        { label: '1分：偶尔轻度愉悦', value: 1, desc: '我偶尔感到比平时更开朗或愉快。' },
        { label: '2分：经常明显高涨', value: 2, desc: '我经常感到比平时更开朗、快乐，或者整天情绪非常高涨。' },
        { label: '3分：大部分时间极度亢奋', value: 3, desc: '我大多数时候感到极度愉快或精神异常亢奋。' },
        { label: '4分：持续狂喜极度亢奋', value: 4, desc: '我始终感到狂喜、精力无限，或者情绪极其亢奋。' }
      ]
    },
    {
      id: 2,
      text: '关于自信心与自我感觉（过去一周）：',
      dimension: '情绪与自我认知',
      options: [
        { label: '0分：正常自信', value: 0, desc: '我没有感到比平时更自信或更有优越感。' },
        { label: '1分：偶尔稍有自信', value: 1, desc: '我偶尔感到比平时稍微自信一些。' },
        { label: '2分：经常感觉能力出众', value: 2, desc: '我经常感到比平时更自信，觉得自己能力出众。' },
        { label: '3分：无所不能与自负', value: 3, desc: '我大多数时候感到无所不能，或者觉得自己比别人优秀得多。' },
        { label: '4分：极端夸大与特殊使命', value: 4, desc: '我感到自己拥有特殊的天赋或使命，自视极高，不可一世。' }
      ]
    },
    {
      id: 3,
      text: '关于睡眠需求与精力（过去一周）：',
      dimension: '生理驱动与睡眠',
      options: [
        { label: '0分：睡眠需求正常', value: 0, desc: '我需要的睡眠时间和往常一样（不需要减少也能保持精力）。' },
        { label: '1分：少睡一点仍有精力', value: 1, desc: '我感觉比平时少睡一点点，但依然精力充沛。' },
        { label: '2分：少睡数小时不觉疲倦', value: 2, desc: '我比平时少睡 2-3 个小时，但完全不觉得疲倦或想睡。' },
        { label: '3分：仅睡2-4小时依然精神极佳', value: 3, desc: '我每晚只需睡 2-4 小时，白天依然感觉精神极好、不知疲倦。' },
        { label: '4分：彻夜不眠精神极度亢奋', value: 4, desc: '我整夜完全不需要睡眠，但第二天精神依然极度亢奋。' }
      ]
    },
    {
      id: 4,
      text: '关于言语速度与说话欲望（过去一周）：',
      dimension: '言语与思维速度',
      options: [
        { label: '0分：说话正常', value: 0, desc: '我说话没有比平时更多，语速也没有变快。' },
        { label: '1分：偶尔稍多稍快', value: 1, desc: '我偶尔会比平时说得稍多或稍快一些。' },
        { label: '2分：经常语速快停不下来', value: 2, desc: '我经常说话很多且语速很快，有时停不下来。' },
        { label: '3分：话多语促难以打断', value: 3, desc: '我大部分时间说话停不下来，语速极快，别人很难插话或打断我。' },
        { label: '4分：滔滔不绝完全无法制止', value: 4, desc: '我滔滔不绝、语速飞快，语不成声，完全无法停下来让别人说话。' }
      ]
    },
    {
      id: 5,
      text: '关于活动量与身体躁动活跃度（过去一周）：',
      dimension: '生理驱动与睡眠',
      options: [
        { label: '0分：活动水平正常', value: 0, desc: '我的日常活动量或身体活跃度与往常一样。' },
        { label: '1分：偶尔更想做事', value: 1, desc: '我偶尔比平时更活跃，想做更多事情。' },
        { label: '2分：经常多线并行极活跃', value: 2, desc: '我经常比平时更活跃，同时开始做很多计划或项目。' },
        { label: '3分：极度忙碌坐立难安', value: 3, desc: '我大部分时间极度忙碌活跃，到处走动，难以静坐下来。' },
        { label: '4分：狂热活动一刻不停', value: 4, desc: '我时刻处于极度躁动或狂热活动中，马不停蹄，一刻也不能停歇。' }
      ]
    }
  ],
  scoring: {
    method: 'sum',
    primaryMetricLabel: 'ASRM 躁狂总分',
    primaryMetricUnit: '分',
    minScore: 0,
    maxScore: 20,
    levels: [
      {
        label: '无躁狂倾向 (常模平稳/临床缓解)',
        type: 'normal',
        badgeClass: 'badge-success',
        min: 0,
        max: 5,
        summary: '总分 0-5 分，低于临床筛查临界阈值（6分），提示在过去一周内未见明显躁狂或轻躁狂发作倾向，心境与精力处于正常基线或缓解状态。',
        advice: [
          '目前心境与精力处于健康稳定状态',
          '建议维持有规律的生活节奏、作息节律及充足夜间睡眠',
          '对于双相障碍病史个体，继续规律服药维持并进行周期性情绪日志记录'
        ]
      },
      {
        label: '轻度躁狂倾向 (临床筛查阳性 - 临界水平)',
        type: 'mild',
        badgeClass: 'badge-warning',
        min: 6,
        max: 9,
        summary: '总分达到或跨越临床阳性界值（6-9分），提示可能存在轻躁狂发作或特征性情绪亢奋。Altman 原作者研究显示，ASRM≥6 分对轻躁狂/躁狂的诊断敏感性为 85.5%，特异性为 87.3%。',
        advice: [
          '已跨越临床初筛临界线（≥6分），建议预约精神心理科医师进行全面鉴别诊断',
          '留意近期睡眠时间是否无故缩短、是否出现不合理的消费冲动或过大计划',
          '若正在接受抑郁症治疗，需向主管医师汇报，防范抗抑郁药物诱发的转躁反应'
        ]
      },
      {
        label: '中度躁狂状态 (显著发作风险)',
        type: 'moderate',
        badgeClass: 'badge-warning',
        min: 10,
        max: 15,
        summary: '总分处于 10-15 分中度区间，提示存在显著的躁狂或轻躁狂综合征，可能伴随持续精力过剩、思维奔逸、过度活跃、滔滔不绝及冲动消费等行为。',
        advice: [
          '高度提示处于临床躁狂/轻躁狂活跃发作期，建议尽早前往精神科门诊就诊',
          '需评估是否需要启动或调整心境稳定剂（如锂盐、丙戊酸钠或非典型抗精神病药）',
          '暂缓重大财务投资、商业决定及重要人际承诺，避免冲动决策造成的现实损失'
        ]
      },
      {
        label: '重度躁狂风险 (急性发作高度预警)',
        type: 'severe',
        badgeClass: 'badge-danger',
        min: 16,
        max: 20,
        summary: '总分处于 16-20 分高危区间，提示极高强度的急性躁狂发作，通常伴有极度亢奋、严重剥夺睡眠依然亢进、夸大观念显著甚至自知力受损风险。',
        advice: [
          '处于重度急性发作高危期，家属或亲友应密切陪护与监护',
          '立即前往精神心理专科医院急诊或专家门诊就诊，必要时考虑住院进行保护性医疗稳定',
          '严格控制受试者的行车、高风险行为及大额资金支配，确保人身与财产安全'
        ]
      }
    ],
    dimensions: [
      {
        name: '情绪与自我认知',
        desc: '评估主观情绪高涨、愉悦感膨胀以及过分自信、夸大自尊表现',
        items: [1, 2]
      },
      {
        name: '生理驱动与睡眠',
        desc: '评估睡眠需求显著缩短、精力过盛以及躯体多动/坐立不安',
        items: [3, 5]
      },
      {
        name: '言语与思维速度',
        desc: '评估说话欲望增加、语速迫促以及思维快速运转',
        items: [4]
      }
    ]
  }
};

export default ASRM;
