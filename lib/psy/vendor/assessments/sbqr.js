// Vendored from PSYMETRA (js/engine.js, js/assessments/*.js) on 2026-11-12.
// Scoring logic is copied verbatim; only export shims changed. Do not "improve" numbers here.

/**
 * PSYMETRA - SBQ-R Assessment Definition
 * 自杀行为问卷修订版 (Suicide Behaviors Questionnaire-Revised)
 * Osman et al. (2001) 经典自杀多维风险评估量表
 */

const SBQR = {
  meta: {
    id: 'sbqr',
    name: 'SBQ-R',
    fullName: '自杀行为问卷修订版',
    englishName: 'Suicide Behaviors Questionnaire-Revised',
    category: '危机/自伤',
    targetGroups: ['大学生', '成人', '临床精神心理科患者', '青少年'],
    description: '由 Osman 等人于 2001 年修订编制，广泛应用于临床精神病学与心理学流行病学研究。问卷通过评估终生自杀意念与尝试、过去一年念头频率、自杀意图的言语威胁/沟通以及未来自杀行为自评可能性等4个核心维度，多层次量化自杀危险性。',
    instructions: '本问卷包含4个关于自杀意念与行为的问题，每个问题评估不同的风险侧面。请仔细阅读每个题目及其对应的选项，选择最符合您真实体验的一项。',
    duration: 2,
    timeframe: '终生、过去一年及未来可能性',
    references: {
      original: [
        'Osman, A., Bagge, C. L., Gutierrez, P. M., et al. (2001). The Suicidal Behaviors Questionnaire-Revised (SBQ-R): validation with clinical and nonclinical samples. Assessment, 8(4), 443-454.'
      ],
      chineseValidation: [
        '梁海燕, 郑泳萍, 等. (2017). 自杀行为问卷修订版(SBQ-R)在中国青少年群体中的信效度检验. 中国临床心理学杂志, 25(4), 676-679.'
      ]
    }
  },
  questions: [
    {
      id: 1,
      text: '您是否曾经想过或尝试过自杀？（终生自杀意念与尝试）',
      dimension: '终生自杀意念与行为',
      options: [
        { label: '我从未想过自杀，也从未尝试过自杀', value: 1, desc: '无任何终生自杀念头或经历' },
        { label: '只是产生过一种短暂一闪而过的念头', value: 2, desc: '仅短暂念头，无具体打算' },
        { label: '我曾经有过自杀计划至少一次，但并未实际付诸行动', value: 3, desc: '有自杀构想或具体方案，未尝试' },
        { label: '我曾经真正尝试过自杀', value: 4, desc: '有一生中的自杀尝试行动史' }
      ]
    },
    {
      id: 2,
      text: '在过去的一年中，您产生自杀念头的频率是怎样的？（近一年念头频率）',
      dimension: '近一年念头频度',
      options: [
        { label: '从未出现过 (Never)', value: 1, desc: '近一年无自杀念头' },
        { label: '极少出现 (Rarely, 仅1次)', value: 2, desc: '偶发一次一过性念头' },
        { label: '有时出现 (Sometimes, 2次左右)', value: 3, desc: '有时产生自杀想法' },
        { label: '经常出现 (Often, 3-4次)', value: 4, desc: '较为频繁浮现自杀念头' },
        { label: '非常频繁 (Very often, 5次或以上)', value: 5, desc: '反复持续受到自杀念头困扰' }
      ]
    },
    {
      id: 3,
      text: '您是否曾经告诉过别人您要自杀，或者威胁说如果您做不到某事就要去死？（自杀言语沟通与威胁）',
      dimension: '自杀沟通与言语威胁',
      options: [
        { label: '从来没有 (No)', value: 1, desc: '从未向任何人表达过自杀意图' },
        { label: '是的，曾经向某人表达过一次 (Yes, once)', value: 2, desc: '曾向单个人透露过一次' },
        { label: '是的，曾经向多人或多次表达过 (Yes, more than once)', value: 3, desc: '多次或向不同人群表达/威胁过' }
      ]
    },
    {
      id: 4,
      text: '您认为在未来的有生之年里，您有多大的可能性会再次或真正尝试自杀？（未来自杀可能性自评）',
      dimension: '未来尝试预期可能性',
      options: [
        { label: '绝不可能 (Never)', value: 0, desc: '坚定生存，决无可能尝试' },
        { label: '完全没有可能 (No chance at all)', value: 1, desc: '主观认为概率几乎为零' },
        { label: '可能性极小 (Rather unlikely)', value: 2, desc: '极不太可能付诸行动' },
        { label: '不太可能 (Unlikely)', value: 3, desc: '大概率不会尝试' },
        { label: '有一定可能 (Likely)', value: 4, desc: '若遇重大挫折可能尝试' },
        { label: '很有可能 (Rather likely)', value: 5, desc: '主观预计较可能实施' },
        { label: '极有可能 (Very likely)', value: 6, desc: '深感极大概率会尝试自杀' }
      ]
    }
  ],
  scoring: {
    method: 'sum',
    primaryMetricLabel: 'SBQ-R 自杀行为总分',
    primaryMetricUnit: '分',
    minScore: 3,
    maxScore: 18,
    levels: [
      {
        label: '低风险 (Low Risk)',
        type: 'normal',
        badgeClass: 'badge-success',
        min: 3,
        max: 6,
        summary: '总分低于普通人群自杀风险临界值（7分），提示目前自杀风险较低，无显著的近期自杀观念、言语威胁或对未来的不良预期。',
        advice: [
          '保持积极向上的心身健康调节方式',
          '在面对困难或生活压力时善于运用支持资源',
          '继续维护稳定温暖的人际亲友关系'
        ]
      },
      {
        label: '临界/中度风险 (Borderline / Moderate Risk)',
        type: 'mild',
        badgeClass: 'badge-warning',
        min: 7,
        max: 8,
        summary: '得分达到非临床人群自杀风险临界值（≥7分）或接近精神科临床高危阈值（≥8分）。提示存在自杀经历或近期念头复发倾向，需引起警惕并给予关注支持。',
        advice: [
          '主动向信任的亲友或心理咨询师倾诉当下遭遇的心理困境',
          '识别导致痛苦的核心压力事件，适当调整生活步调',
          '建议进行临床心理评估，防范风险进一步升级',
          '记录求助热线（如 400-161-9995）以备紧急时刻联络'
        ]
      },
      {
        label: '高度风险 (High Risk)',
        type: 'moderate-severe',
        badgeClass: 'badge-orange',
        min: 9,
        max: 13,
        summary: '得分显著超过临床自杀高危界限（≥8分），提示近期频繁产生自杀念头、向他人表达过威胁或自评未来有较高尝试可能性。建议尽快接受临床精神心理专科评估与干预。',
        advice: [
          '由家属或亲友陪同，尽快至医院精神心理科门诊就诊',
          '制定安全应对计划，排除身边潜在的危险物品与过量药物',
          '建立严密的日常监护机制，避免独处与夜间落单',
          '心理痛苦加剧时及时寻求心理危机干预服务'
        ]
      },
      {
        label: '极危急风险 (Critical Risk)',
        type: 'severe',
        badgeClass: 'badge-danger',
        min: 14,
        max: 18,
        summary: '得分处于极高危区间，提示既往有明确自杀尝试史、高频自杀意念且自评未来极有可能再次实施，风险极高！必须立即启动危机干预，确保专人监护，紧急送医！',
        advice: [
          '必须立即启动紧急危机干预，严禁让受试者独处！',
          '立即陪同送往综合医院急诊科或精神专科接受全面监护与救治',
          '若出现即刻自杀冲动或失控行为，立即拨打 120 急救或 110 求助',
          '对居住与活动环境进行彻底的安全排查与危险物隔离'
        ]
      }
    ],
    dimensions: [
      {
        name: '终生自杀意念与行为',
        desc: '评估从偶发念头、具体计划到实际尝试的终生经历',
        items: [1]
      },
      {
        name: '近一年念头频度',
        desc: '评估过去12个月内自杀意念复发的密集程度',
        items: [2]
      },
      {
        name: '自杀沟通与言语威胁',
        desc: '评估向外界透露、宣告或利用自杀进行威胁的沟通行为',
        items: [3]
      },
      {
        name: '未来尝试预期可能性',
        desc: '个体对未来再次或实际实施自杀可能性的主观自评',
        items: [4]
      }
    ]
  }
};

export default SBQR;
