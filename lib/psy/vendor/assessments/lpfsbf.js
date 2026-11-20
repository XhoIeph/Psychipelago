// Vendored from PSYMETRA (js/engine.js, js/assessments/*.js) on 2026-11-12.
// Scoring logic is copied verbatim; only export shims changed. Do not "improve" numbers here.

/**
 * PSYMETRA - LPFS-BF 2.0 Assessment Definition
 * 人格功能水平量表简版 2.0 (Level of Personality Functioning Scale - Brief Form 2.0, LPFS-BF 2.0)
 * DSM-5 人格障碍替代模型 (AMPD) 评估人格功能受损程度 (Criterion A) 的金标准自评工具
 * 编制者: Weekers, Hutsebaut, & Kamphuis (2019) / 常模依据: Weekers, Sellbom, Hutsebaut, Simonsen, & Bach (2021)
 */

const LPFSBF = {
  meta: {
    id: 'lpfsbf',
    name: 'LPFS-BF 2.0',
    fullName: '人格功能水平量表简版 2.0',
    englishName: 'Level of Personality Functioning Scale - Brief Form 2.0',
    category: '人格评估',
    targetGroups: ['成年人', '受长期自我认同困惑人群', '亲密关系反复受挫者', '人格障碍临床初筛受试者', '深度自我探索者'],
    description: '由 Weekers 等人基于 DSM-5 人格障碍替代模型（AMPD）诊断标准 A（Criterion A）编制的 12 项权威自评工具。系统评估“自我功能”（认同与自我定向）和“人际功能”（共情与亲密）两大核心维度，是国际公认的人格功能受损严重程度筛查金标准。',
    instructions: '请评估以下每一项陈述在多大程度上符合您当下的情况（Report for each of the following statements to what extent they apply to you at this moment），选择最贴切的选项。',
    duration: 3,
    timeframe: '当前与近期的总体真实状态'
  },
  defaultOptions: [
    { label: '非常不符合或经常不符合', value: 1, desc: 'Very false or Often False' },
    { label: '有时不符合或有点不符合', value: 2, desc: 'Sometimes or Somewhat False' },
    { label: '有时符合或有点符合', value: 3, desc: 'Sometimes or Somewhat True' },
    { label: '非常符合或经常符合', value: 4, desc: 'Very true or often True' }
  ],
  questions: [
    {
      id: 1,
      text: '我经常不知道自己究竟是谁',
      enText: 'I often do not know who I really am',
      subcomponent: '认同 (Identity)',
      dimension: '自我功能受损'
    },
    {
      id: 2,
      text: '我常常对自己抱有非常消极负面的看法',
      enText: 'I often think very negatively about myself',
      subcomponent: '认同 (Identity)',
      dimension: '自我功能受损'
    },
    {
      id: 3,
      text: '我的情绪总是变化无常，而我无法掌控它们',
      enText: 'My emotions change without me having a grip on them',
      subcomponent: '认同 (Identity)',
      dimension: '自我功能受损'
    },
    {
      id: 4,
      text: '对于自己的人生想走向何方，我毫无方向感',
      enText: 'I have no sense of where I want to go in my life',
      subcomponent: '自我定向 (Self-direction)',
      dimension: '自我功能受损'
    },
    {
      id: 5,
      text: '我常常无法理解自己的想法和感受',
      enText: 'I often do not understand my own thoughts and feelings',
      subcomponent: '自我定向 (Self-direction)',
      dimension: '自我功能受损'
    },
    {
      id: 6,
      text: '我常常对自己提出不切实际的要求',
      enText: 'I often make unrealistic demands on myself',
      subcomponent: '自我定向 (Self-direction)',
      dimension: '自我功能受损'
    },
    {
      id: 7,
      text: '我常常很难理解他人的想法和感受',
      enText: 'I often have difficulty understanding the thoughts and feelings of others',
      subcomponent: '共情 (Empathy)',
      dimension: '人际功能受损'
    },
    {
      id: 8,
      text: '当别人持有不同观点时，我常常觉得很难忍受',
      enText: 'I often find it hard to stand it when others have a different opinion',
      subcomponent: '共情 (Empathy)',
      dimension: '人际功能受损'
    },
    {
      id: 9,
      text: '我常常不太明白为什么自己的行为会对他人产生某种影响',
      enText: 'I often do not fully understand why my behavior has a certain effect on others',
      subcomponent: '共情 (Empathy)',
      dimension: '人际功能受损'
    },
    {
      id: 10,
      text: '我的人际关系和友谊从不能长久维持',
      enText: 'My relationships and friendships never last long',
      subcomponent: '亲密 (Intimacy)',
      dimension: '人际功能受损'
    },
    {
      id: 11,
      text: '当人际关系变得更为亲近深入时，我常常感到非常脆弱',
      enText: 'I often feel very vulnerable when relations become more personal',
      subcomponent: '亲密 (Intimacy)',
      dimension: '人际功能受损'
    },
    {
      id: 12,
      text: '在与他人合作时，我常常无法做到让双方都满意',
      enText: 'I often do not succeed in cooperating with others in a mutually satisfactory way',
      subcomponent: '亲密 (Intimacy)',
      dimension: '人际功能受损'
    }
  ],
  scoring: {
    method: 'sum',
    primaryMetricLabel: 'LPFS-BF 人格功能受损总分',
    primaryMetricUnit: '分 (12 - 48)',
    minScore: 12,
    maxScore: 48,
    levels: [
      {
        label: '健康正常 (Healthy)',
        type: 'normal',
        badgeClass: 'badge-success',
        min: 12,
        max: 25,
        summary: '您的自评总分处于健康常模基线区间（12-25分，均值1个标准差以内，< 1.0 SD）。具备稳定健全的自我认同，能够理解自身情绪与人生方向；同时具备良好的共情能力，能够与他人建立长久、互信与建设性的亲密及合作关系。',
        advice: [
          '保持现有的心理自省力与健康的人际沟通方式',
          '在面对生活压力时，继续依托稳定的内在自我价值感与社会支持网络'
        ]
      },
      {
        label: '亚临床 / 轻度受损 (Subclinical / Mild)',
        type: 'mild',
        badgeClass: 'badge-info',
        min: 26,
        max: 30,
        summary: '您的自评总分处于亚临床/轻度受损区间（26-30分，常模均值 1.0 - 1.5 SD）。提示在自我整合（如偶尔情绪失控、目标迷茫、自我苛责）或人际联结（如难以包容异见、对关系亲密感感到脆弱）方面存在一定的适应困难与张力，但尚未达到完全的临床功能障碍水平。',
        advice: [
          '提升自我觉察：关注自身情绪起伏规律与内在自我评价模式，减少不切实际的自我苛责',
          '在人际交流中练习接纳差异与坦诚沟通，尝试在安全范围内逐步建立更深层的人际信任'
        ]
      },
      {
        label: '中度临床功能失调 (Moderate Clinical Dysfunctioning)',
        type: 'moderate',
        badgeClass: 'badge-warning',
        min: 31,
        max: 35,
        summary: '您的自评总分达到了临床功能失调界限（31-35分，常模均值 1.5 - 2.0 SD）。达到 DSM-5 AMPD 标准 A 人格功能中度受损水平，提示在自我功能（认同混乱/自我定向困难）与人际功能（共情受限/关系无法持久）两方面均存在实质性困难，符合人格障碍筛查的阳性警戒指标。',
        advice: [
          '建议寻求精神专科医师或临床心理学专家的系统评估，进一步厘清人格特征与情绪困扰的根源',
          '考虑了解心智化心理治疗（MBT）或图式疗法（Schema Therapy），提升对自我与他人心理状态的理解力',
          '与信任的专业咨询师建立长期稳定的咨询同盟，在安全环境中探索人格模式重塑'
        ]
      },
      {
        label: '重度临床功能失调 (Severe Clinical Dysfunctioning)',
        type: 'severe',
        badgeClass: 'badge-danger',
        min: 36,
        max: 40,
        summary: '您的自评总分处于临床显著重度受损区间（36-40分，常模均值 2.0 - 2.5 SD）。表明人格功能受到严重破坏，在自我认知、情绪掌控、人生追求以及维持稳定人际关系方面均面临重大障碍，严重影响日常生活、学业/职业与社会交往。',
        advice: [
          '强烈建议前往三甲医院精神心理科门诊就诊，接受完整系统的专业评估与临床干预',
          '系统参与辩证行为疗法（DBT）或人际效能训练，优先提升情绪调节技巧并建立安全的人际边界',
          '设立个人心理支持与危机预警机制，在遭遇重大挫折时及时寻求专业支持'
        ]
      },
      {
        label: '极重度受损 (Extreme / Possible Overreporting)',
        type: 'severe',
        badgeClass: 'badge-danger',
        min: 41,
        max: 48,
        summary: '您的自评总分处于极重度受损区间（41-48分，常模均值 > 2.5 SD）。提示人格功能极度崩溃，或者对自身困难存在极高的痛苦感知与可能的主观过度报告（Overreporting）。自我结构与现实人际功能已受到极度严重的冲击。',
        advice: [
          '务必尽快联系专业精神心理医疗团队进行线下多维度全面临床面谈（如结合结构化访谈 STiP-5.1）',
          '优先进行危机干预与情绪安全防护，防止因自尊解体或极度挫败诱发破坏性冲动',
          '在医疗专业人士指导下制定综合性治疗与康复计划'
        ]
      }
    ],
    dimensions: [
      {
        name: '自我功能受损',
        desc: '包含认同（Identity，第1-3题）与自我定向（Self-direction，第4-6题）：评估自我认同感、自我价值评价、情绪把控能力，以及人生目标设定与对自我的要求。',
        items: [1, 2, 3, 4, 5, 6]
      },
      {
        name: '人际功能受损',
        desc: '包含共情（Empathy，第7-9题）与亲密（Intimacy，第10-12题）：评估理解他人体验与立场的能力、包容不同观点的耐受度，以及建立维护深度持久关系、互利合作的能力。',
        items: [7, 8, 9, 10, 11, 12]
      }
    ]
  }
};

export default LPFSBF;
