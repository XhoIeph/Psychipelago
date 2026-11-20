// Vendored from PSYMETRA (js/engine.js, js/assessments/*.js) on 2026-11-12.
// Scoring logic is copied verbatim; only export shims changed. Do not "improve" numbers here.

/**
 * PSYMETRA - C-SSRS Assessment Definition
 * 哥伦比亚自杀严重程度评估量表 (Columbia-Suicide Severity Rating Scale)
 * 临床筛查与自评协议版本 (Columbia Protocol Screener)
 */

const CSSRS = {
  meta: {
    id: 'cssrs',
    name: 'C-SSRS',
    fullName: '哥伦比亚自杀严重程度评估量表',
    englishName: 'Columbia-Suicide Severity Rating Scale',
    category: '危机/自伤',
    targetGroups: ['成人', '青少年', '临床精神心理科患者', '初级卫生保健就诊者', '危机干预对象'],
    description: '由美国哥伦比亚大学 Posner 等人研发，被 FDA、CDC、WHO 及国际临床医学界推荐为自杀风险评估金标准。本量表采用哥伦比亚临床筛查协议 (Columbia Protocol Screener)，标准化量化自杀意念的层级深度（死亡愿望、非特异意念、方法考量、行动意愿、明确计划）及既往自杀行为史。',
    instructions: '本问卷用于评估近期的自杀意念与一生的自杀行为史。请根据您最近一个月内的真实感受以及过往经历，对以下问题如实回答“是”或“否”。若您当前感到情绪极度痛苦或有自我伤害的想法，请务必向信任的人或专业危机干预机构寻求帮助。',
    duration: 3,
    timeframe: '最近一个月及终生经历',
    references: {
      original: [
        'Posner, K., Brown, G. K., Stanley, B., et al. (2011). The Columbia–Suicide Severity Rating Scale: initial validity and internal consistency findings from three multisite studies with adolescents and adults. American Journal of Psychiatry, 168(12), 1266-1277.'
      ],
      chineseValidation: [
        '李献云, 等. (2014). 哥伦比亚自杀严重程度评定量表中文版在精神科门诊的信效度评估. 中国神经精神疾病杂志, 40(8), 478-482.'
      ]
    }
  },
  defaultOptions: [
    { label: '否', value: 0, desc: '没有此类经历或念头' },
    { label: '是', value: 1, desc: '有此类经历或念头' }
  ],
  questions: [
    {
      id: 1,
      text: '在过去一个月内，您是否曾希望自己死去，或者希望自己能睡过去并且不再醒来？（死亡愿望 Wish to be dead）',
      dimension: '死亡愿望与被动意念'
    },
    {
      id: 2,
      text: '在过去一个月内，您是否曾产生过任何自杀或结束自己生命的念头？（主动自杀意念 Suicidal thoughts）',
      dimension: '主动自杀意念与方法'
    },
    {
      id: 3,
      text: '在过去一个月内，您是否曾想过自己可能会通过什么方式或方法来自杀，但当时并没有实际付诸行动的意图？（具有方法的自杀意念 Suicidal thoughts with method）',
      dimension: '主动自杀意念与方法'
    },
    {
      id: 4,
      text: '在过去一个月内，您是否曾产生过自杀念头，并且有某种付诸行动的意愿或倾向，即使您并没有详细具体的计划？（具有意图但无具体计划 Suicidal intent without plan）',
      dimension: '自杀意图与具体计划'
    },
    {
      id: 5,
      text: '在过去一个月内，您是否曾制定了具体的自杀计划，并有付诸行动的意图或打算？（具有具体计划与明确意图 Suicidal intent with specific plan）',
      dimension: '自杀意图与具体计划'
    },
    {
      id: 6,
      text: '在您的一生中（包括最近3个月内），您是否曾做过自杀尝试、开始准备自杀工具/行动、或在自杀过程中被他人打断或自己中断？（自杀行为史 Suicidal behavior）',
      dimension: '既往自杀行为史'
    }
  ],
  scoring: {
    method: 'sum',
    primaryMetricLabel: 'C-SSRS 风险评分',
    primaryMetricUnit: '分',
    minScore: 0,
    maxScore: 6,
    levels: [
      {
        label: '极低风险 / 无自杀指征',
        type: 'normal',
        badgeClass: 'badge-success',
        min: 0,
        max: 0,
        summary: '在过去一个月内未报告主动或被动自杀意念，一生中无自杀尝试或致命性准备行为史。当前心身安全基线稳定。',
        advice: [
          '保持良好的生活节律与压力调节习惯',
          '建立积极亲近的社会支持与倾诉网络',
          '若未来遇到重大危机或剧烈情绪波动，及时寻求专业心理支持'
        ]
      },
      {
        label: '低度风险 / 被动死亡愿望',
        type: 'mild',
        badgeClass: 'badge-info',
        min: 1,
        max: 2,
        summary: '测试提示存在被动死亡愿望或非特异性自杀意念（第1或第2题阳性），但未出现具体自杀方法、执行意向或自杀计划，亦无既往自杀行为。通常反映近期承受较大精神痛苦或无助感。',
        advice: [
          '寻求信任的家人、好友或心理咨询师倾诉当下心理痛苦',
          '识别导致痛苦的现实压力源，尝试降低生活负荷',
          '关注情绪波动轨迹，若求死念头加重请及时联系专科医生'
        ]
      },
      {
        label: '中度风险 / 具备方法设想',
        type: 'moderate',
        badgeClass: 'badge-warning',
        min: 3,
        max: 3,
        summary: '测试提示存在考虑具体自杀方式的意念（第3题阳性）或既往有自杀行为史（第6题阳性），但近期尚未形成明确的执行意图或完整计划。存在转化为高危行动的潜在风险。',
        advice: [
          '建议尽早预约综合医院临床心理科或精神科门诊进行全面面谈评估',
          '主动远离或清理可能接触到的危险工具与药物',
          '制定危机安全应对备忘录，明确危机发作时的紧急联络人',
          '避免独处，保持与家人或朋友的紧密日常联络'
        ]
      },
      {
        label: '高度风险 / 具备意图与计划',
        type: 'moderate-severe',
        badgeClass: 'badge-orange',
        min: 4,
        max: 5,
        summary: '测试提示存在明确的自杀意愿或已制定具体的自杀计划（第4或第5题阳性）！此时个体已从单纯的消极观念发展至行动准备阶段，自杀风险处于临床高度危险区间！',
        advice: [
          '请立即前往医院精神心理科就诊，接受专业医生的危机干预与医疗保护',
          '务必由信任的家人或朋友全程陪同，避免任何独处时间',
          '立即移走身边所有可能致命的物品、药物与利器',
          '牢记危机干预专线（如中国希望24小时热线：400-161-9995），危机时刻随时拨打'
        ]
      },
      {
        label: '极危急风险 / 计划与行为合并',
        type: 'severe',
        badgeClass: 'badge-danger',
        min: 6,
        max: 6,
        summary: '紧急警报！测试提示存在极为明确的自杀计划与坚定意图，且合并既往自杀尝试或近期准备行动。属于哥伦比亚协议最高危急状态，具有极高的即刻致命性风险！',
        advice: [
          '必须立即启动紧急危机干预，切勿让受试者独处！',
          '即刻由家属护送至最近的医院急诊科或精神专科接受封闭监护与医疗救治',
          '若情况紧急难以控制，请立即拨打 120 急救或 110 求助',
          '全面实施环境安全管控，严格清除一切可能造成伤害的隐患'
        ]
      }
    ],
    dimensions: [
      {
        name: '死亡愿望与被动意念',
        desc: '评估个体是否存在渴望脱离痛苦、顺其自然死亡或不再醒来的被动求死欲望',
        items: [1]
      },
      {
        name: '主动自杀意念与方法',
        desc: '评估个体是否产生结束生命的主动构想及具体手段的设想',
        items: [2, 3]
      },
      {
        name: '自杀意图与具体计划',
        desc: '评估自杀念头是否已发展出实际行动意向或完整的实施方案',
        items: [4, 5]
      },
      {
        name: '既往自杀行为史',
        desc: '评估终生自杀尝试、中断的自杀行为或致命性准备行为史',
        items: [6]
      }
    ]
  }
};

export default CSSRS;
