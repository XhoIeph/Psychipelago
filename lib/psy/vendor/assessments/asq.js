// Vendored from PSYMETRA (js/engine.js, js/assessments/*.js) on 2026-11-12.
// Scoring logic is copied verbatim; only export shims changed. Do not "improve" numbers here.

/**
 * PSYMETRA - ASQ Assessment Definition
 * 自杀筛查问卷 (Ask Suicide-Screening Questions)
 * 美国国家精神卫生研究院 (NIMH) 极简自杀筛查工具
 */

const ASQ = {
  meta: {
    id: 'asq',
    name: 'ASQ',
    fullName: '自杀筛查问卷',
    englishName: 'Ask Suicide-Screening Questions',
    category: '危机/自伤',
    targetGroups: ['儿童青少年 (10-18岁)', '青年', '成年人', '急诊与综合科就诊者', '社区筛查'],
    description: '由美国国家精神卫生研究院 (NIMH) 专为急诊与综合医疗场景研发的敏捷自杀风险筛查工具，具有高达 98% 的敏感度与 92% 的特异度。量表由4道核心筛查题与1道急性即刻意念鉴别题构成，能极速鉴别潜在危险与急性发作风险。',
    instructions: '请仔细阅读以下简短问题，并根据您的实际感受与经历选择“是”或“否”。请真实作答，哪怕您近期只是感到轻微的心情沉重或生活压力大。',
    duration: 2,
    timeframe: '最近几周、过去一周及当前即刻',
    references: {
      original: [
        'Horowitz, L. M., Bridge, J. A., Teach, S. J., et al. (2012). Ask Suicide-Screening Questions (ASQ): a brief instrument for the pediatric emergency department. Archives of Pediatrics & Adolescent Medicine, 166(12), 1170-1176.'
      ],
      chineseValidation: [
        'National Institute of Mental Health (NIMH). (2020). Ask Suicide-Screening Questions (ASQ) Toolkit - Simplified Chinese Translation. NIMH Office of Clinical Research.'
      ]
    }
  },
  defaultOptions: [
    { label: '否', value: 0, desc: '没有此类情况' },
    { label: '是', value: 1, desc: '有此类情况' }
  ],
  questions: [
    {
      id: 1,
      text: '在过去的几周里，你是否曾希望自己死掉？（被动求死愿望）',
      dimension: '负性认知与被动死愿'
    },
    {
      id: 2,
      text: '在过去的几周里，你是否觉得如果自己死掉，对家人或朋友来说会更好？（累赘感与自我贬低）',
      dimension: '负性认知与被动死愿'
    },
    {
      id: 3,
      text: '在过去的这一周里，你是否产生过自杀的念头？（近期主动自杀观念）',
      dimension: '近期意念与尝试史'
    },
    {
      id: 4,
      text: '你以前曾经尝试过自杀吗？（既往自杀尝试史）',
      dimension: '近期意念与尝试史'
    },
    {
      id: 5,
      text: '你现在 / 今天正在产生自杀的想法吗？（即刻急性危机意念）',
      dimension: '即刻急性危机意念'
    }
  ],
  scoring: {
    method: 'sum',
    primaryMetricLabel: 'ASQ 阳性指标得分',
    primaryMetricUnit: '分',
    minScore: 0,
    maxScore: 5,
    levels: [
      {
        label: '阴性筛查 (Negative Screen)',
        type: 'normal',
        badgeClass: 'badge-success',
        min: 0,
        max: 0,
        summary: '所有筛查项目均为否定，未检测到当前自杀风险指征。身心安全状态良好，无需启动危机干预程序。',
        advice: [
          '保持健康规律的作息与身心调节方式',
          '在面临学业、职场或生活压力时积极寻求亲友支持',
          '持续关注自身情绪变化，必要时再次评估'
        ]
      },
      {
        label: '轻度潜在风险 (Mild Potential Risk)',
        type: 'mild',
        badgeClass: 'badge-info',
        min: 1,
        max: 1,
        summary: '筛查提示存在单一潜在自杀风险迹象（如被动死愿或感到自己是家人累赘），但无近期主动自杀念头，且当前无即刻危险。提示近期承受较大心理压力或抑郁情绪。',
        advice: [
          '主动向信任的亲友、心理教师或咨询师倾诉内心负荷',
          '识别近期产生无价值感或疲惫感的生活事件与压力源',
          '若消极情绪或死愿持续超过两周，建议咨询专业心理医生'
        ]
      },
      {
        label: '非急性阳性筛查 (Non-Acute Positive)',
        type: 'moderate',
        badgeClass: 'badge-warning',
        min: 2,
        max: 3,
        summary: '筛查呈阳性（非急性），提示近期存在明显的自杀念头或曾有尝试史，但此时此刻（第5题）无即刻自杀冲动。需要由专业医疗人员进行简短自杀安全评估 (BSSA) 并建立安全计划。',
        advice: [
          '建议尽快前往综合医院临床心理科或精神专科接受进一步全面评估',
          '与家人或支持者共同建立危机安全应对卡，明确紧急联络机制',
          '清理居住环境中的潜在危险物品与过量药物储备',
          '避免独自承受心理重压，确保身边有可随时求助的支持人员'
        ]
      },
      {
        label: '显著阳性风险 (Significant Positive)',
        type: 'moderate-severe',
        badgeClass: 'badge-orange',
        min: 4,
        max: 4,
        summary: '筛查呈现高度阳性特征，近期存在持续自杀观念合并严重累赘感或既往自杀史，心理危机脆弱性极高。需密切关注防范，避免应激事件诱发急性冲动。',
        advice: [
          '由家属或监护人陪同，尽快至精神专科医院接受系统评估与干预',
          '安排专人照护，保持生活环境安全无危险物品',
          '暂停高压工作或学业，给予充分的心理修复时间',
          '随时备好心理危机救援热线（如 400-161-9995）'
        ]
      },
      {
        label: '急性高危阳性 (Acute Positive Screen)',
        type: 'severe',
        badgeClass: 'badge-danger',
        min: 5,
        max: 5,
        summary: '紧急警报！第5题回答为“是”，提示受试者当前正在产生强烈的即刻自杀念头，属于急性临床危机状态！必须立即启动紧急干预，确保专人全程看护，切勿独处！',
        advice: [
          '立即启动现场安全防护，严禁让受试者独处！',
          '即刻陪同送医至综合医院急诊科或精神专科医院寻求紧急医疗救助',
          '若受试者情绪失控或有立即行动迹象，请立刻拨打 120 急救或 110 求助',
          '妥善收纳或隔离周边所有可能导致人身伤害的危险工具与药物'
        ]
      }
    ],
    dimensions: [
      {
        name: '负性认知与被动死愿',
        desc: '评估感到自身是累赘及渴望死亡等消极认知',
        items: [1, 2]
      },
      {
        name: '近期意念与尝试史',
        desc: '评估过去一周的自杀观念及既往自杀行为史',
        items: [3, 4]
      },
      {
        name: '即刻急性危机意念',
        desc: '评估此时此刻是否存在正在发生的急性自杀冲动',
        items: [5]
      }
    ]
  }
};

export default ASQ;
