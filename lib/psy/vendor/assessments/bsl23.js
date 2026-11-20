// Vendored from PSYMETRA (js/engine.js, js/assessments/*.js) on 2026-11-12.
// Scoring logic is copied verbatim; only export shims changed. Do not "improve" numbers here.

/**
 * PSYMETRA - BSL-23 Assessment Definition
 * 边缘人格障碍表现量表 (Borderline Symptom List-23, BSL-23)
 */

const BSL23 = {
  meta: {
    id: 'bsl23',
    name: 'BSL-23',
    fullName: '边缘人格障碍表现量表',
    englishName: 'Borderline Symptom List-23',
    category: '人格评估',
    targetGroups: ['情绪剧烈波动人群', '人际关系极度敏感者', '空虚自伤倾向者', '成人'],
    description: '由德国海德堡大学 Martin Bohus 教授团队编制的国际金标准自评量表，专门用于评估边缘型人格障碍 (BPD) 核心特质严重度及过去一周内的内在心理痛苦与危机状态。',
    instructions: '以下列出了在情绪与自我体验中常见的一系列困难。请仔细回想在过去的一个星期里（包括今天），您受到这些问题的困扰程度有多深，并选出最符合的一项。',
    duration: 5,
    timeframe: '过去一星期',
    references: {
      original: [
        'Bohus, M., Kleindienst, N., Limberger, M.F., et al. (2009). The short version of the Borderline Symptom List (BSL-23). The Journal of Nervous and Mental Disease, 197(8), 604-608.'
      ],
      chineseValidation: [
        'Kleindienst, N., et al. (2020). State and trait components of borderline personality disorder symptoms: Validation of the BSL-23.'
      ]
    }
  },
  defaultOptions: [
    { label: '完全没有', value: 0, desc: '过去一周完全没有困扰' },
    { label: '轻度困扰', value: 1, desc: '稍有一点困扰' },
    { label: '中等困扰', value: 2, desc: '有相当明显的困扰' },
    { label: '严重困扰', value: 3, desc: '困扰非常严重' },
    { label: '极重困扰', value: 4, desc: '极其严重，几乎无法承受' }
  ],
  questions: [
    { id: 1, text: '我很难专心集中注意力', dimension: '自我认同与空虚' },
    { id: 2, text: '我觉得自己极其无助', dimension: '情感失调与内在痛苦' },
    { id: 3, text: '我会心不在焉，记不得自己刚刚实际在做什么', dimension: '自我认同与空虚' },
    { id: 4, text: '我感到强烈的恶心与厌恶感', dimension: '情感失调与内在痛苦' },
    { id: 5, text: '我脑海中冒出想伤害自己身体的念头', dimension: '自伤意念与绝望感' },
    { id: 6, text: '我根本无法信任其他人', dimension: '人际隔绝与脆弱' },
    { id: 7, text: '我不认为自己有在这个世界上活下去的权利', dimension: '自伤意念与绝望感' },
    { id: 8, text: '我感到刻骨铭心的孤独', dimension: '人际隔绝与脆弱' },
    { id: 9, text: '我体验到令人倍感痛苦的内在极度紧绷感', dimension: '情感失调与内在痛苦' },
    { id: 10, text: '我的脑海中浮现出让我非常恐惧害怕的画面', dimension: '人际隔绝与脆弱' },
    { id: 11, text: '我恨我自己', dimension: '自我认同与空虚' },
    { id: 12, text: '我有想要惩罚我自己的强烈冲动', dimension: '自伤意念与绝望感' },
    { id: 13, text: '我饱受深深的羞耻感折磨', dimension: '自我认同与空虚' },
    { id: 14, text: '我的心情在焦虑、愤怒和沮丧之间极速转换起伏', dimension: '情感失调与内在痛苦' },
    { id: 15, text: '我受到来自脑子里面或外面的声音与噪音困扰', dimension: '人际隔绝与脆弱' },
    { id: 16, text: '别人的哪怕一点点批评，都会对我造成巨大的毁灭性打击', dimension: '人际隔绝与脆弱' },
    { id: 17, text: '我觉得自己极度脆弱不堪一击', dimension: '情感失调与内在痛苦' },
    { id: 18, text: '对我来说，想死的念头具有某种莫名的吸引力', dimension: '自伤意念与绝望感' },
    { id: 19, text: '周围的一切对我来说似乎都毫无意义', dimension: '自我认同与空虚' },
    { id: 20, text: '我非常害怕自己会彻底失去理智或控制', dimension: '情感失调与内在痛苦' },
    { id: 21, text: '我对自己感到极度厌恶', dimension: '自我认同与空虚' },
    { id: 22, text: '我觉得自己彷彿与自己相距很远，像个旁观者（解离感）', dimension: '自我认同与空虚' },
    { id: 23, text: '我觉得自己一无是处、毫无价值', dimension: '自我认同与空虚' }
  ],
  scoring: {
    method: 'mean_subscale',
    primaryMetricLabel: 'BSL-23 严重度均分',
    primaryMetricUnit: '分',
    minScore: 0.0,
    maxScore: 4.0,
    levels: [
      {
        label: '无 / 极低边缘症状',
        type: 'normal',
        badgeClass: 'badge-success',
        min: 0.0,
        max: 0.29,
        summary: '您的均分处于极低基准（<0.3分），未表现出明显的边缘性情绪失调、自我认同紊乱或冲动自伤倾向，自我整合感与心身韧性良好。',
        advice: [
          '保持现有的情绪觉察与规律的生活节奏',
          '维系健康互信的人际关系支持系统'
        ]
      },
      {
        label: '轻度边缘特征困扰',
        type: 'mild',
        badgeClass: 'badge-info',
        min: 0.3,
        max: 0.69,
        summary: '您近期存在轻度情绪敏感、自卑或空虚感，多与近期的生活压力或人际摩擦相关，尚未全面瓦解日常社会生活功能。',
        advice: [
          '练习正念呼吸与身体着陆技术缓解偶发的紧绷感',
          '学会识别“全或无（非黑即白）”的极端思维模式',
          '与信任的朋友适度倾诉'
        ]
      },
      {
        label: '中度边缘人格特征',
        type: 'moderate',
        badgeClass: 'badge-warning',
        min: 0.7,
        max: 1.49,
        summary: '均分呈现中等水平（0.7-1.5分），表明您近期承受着较为显著的内在痛苦、情绪剧烈过山车、深刻孤独感或自我否定，人际关系可能处于敏感动荡状态。',
        advice: [
          '建议寻求接受过辩证行为疗法 (DBT) 训练的专业心理咨询师',
          '建立日常情绪耐受与痛苦耐受技能 (TIPP技巧)',
          '制定危机预警与安全契约，防范情绪冲动发作'
        ]
      },
      {
        label: '重度边缘特质 (临床显著界线)',
        type: 'severe',
        badgeClass: 'badge-danger',
        min: 1.5,
        max: 2.49,
        summary: '得分达到或超过临床高度敏感界限（≥1.5分），表明处于极度痛苦的心身危机中，伴随强烈的内耗羞耻感、解离体验、剧烈易怒或自伤自杀冲动，强烈建议前往精神专科门诊就医。',
        advice: [
          '尽早前往精神科门诊进行系统评估与专业医疗干预',
          '若存在自伤冲动或自杀意念，请务必立即联系亲友陪护或拨打危机援助热线',
          '寻求 DBT 辩证行为疗法或心智化治疗 (MBT) 等专业系统性长程支持'
        ]
      },
      {
        label: '极重度危机状态',
        type: 'severe',
        badgeClass: 'badge-danger',
        min: 2.5,
        max: 4.0,
        summary: '您的症状得分处于极高危机区间（≥2.5分），反映当前正经历难以遏制的毁灭性痛苦、绝望感及严重的自我破坏冲动。请务必停止孤军奋战，立即寻求紧急医疗与社会支持。',
        advice: [
          '立即前往就近三甲医院精神心理急诊或求助信任亲属',
          '切勿独处，请身边人提供 24 小时安全陪护',
          '拨打全国心理危机热线（400-161-9995）获取即刻干预'
        ]
      }
    ],
    dimensions: [
      {
        name: '情感失调与内在痛苦',
        desc: '反映剧烈情绪波动、难以平复的无助感、极度紧绷、厌恶感及失控恐惧。',
        items: [2, 4, 9, 14, 17, 20]
      },
      {
        name: '自我认同与空虚',
        desc: '反映自我憎恨、深度羞耻感、无价值感、注意力涣散、解离以及一切皆无意义感。',
        items: [1, 3, 11, 13, 19, 21, 22, 23]
      },
      {
        name: '自伤意念与绝望感',
        desc: '反映想要伤害惩罚自己身体的冲动、向往死亡的念头以及无生存权利感。',
        items: [5, 7, 12, 18]
      },
      {
        name: '人际隔绝与脆弱',
        desc: '反映对他人极度不信任、刻骨孤独、遭受批评后的毁灭感以及恐惧画面。',
        items: [6, 8, 10, 15, 16]
      }
    ]
  }
};

export default BSL23;
