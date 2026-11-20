// Vendored from PSYMETRA (js/engine.js, js/assessments/*.js) on 2026-11-12.
// Scoring logic is copied verbatim; only export shims changed. Do not "improve" numbers here.

/**
 * PSYMETRA - PCL-5 Assessment Definition
 * 创伤后应激障碍检查量表 (PTSD Checklist for DSM-5, PCL-5)
 * 美国国家创伤后应激障碍中心 (National Center for PTSD) 官方金标准评估工具
 */

const PCL5 = {
  meta: {
    id: 'pcl5',
    name: 'PCL-5',
    fullName: '创伤后应激障碍检查量表',
    englishName: 'PTSD Checklist for DSM-5',
    category: '创伤应激',
    targetGroups: ['成年人', '重大事故/灾害经历者', '暴力伤害幸存者', '创伤性丧失困扰人群'],
    description: '由美国国家创伤中心 (NCPTSD) 依据 DSM-5 诊断标准编制的国际金标准 PTSD 评定量表。全面评估侵入性再体验、持续性回避、认知情绪负向改变及过度唤起 4 大症候群。',
    instructions: '以下列出人们在经历非常艰难、痛苦或危险的生活事件后可能出现的问题。请回想您在【过去的一个月内】，这些问题给您带来的困扰程度。',
    duration: 5,
    timeframe: '过去一个月',
    references: {
      original: [
        'Blevins, C. A., Weathers, F. W., Davis, M. T., Witte, T. K., & Domino, J. L. (2015). The Posttraumatic Stress Disorder Checklist for DSM-5 (PCL-5): Development and initial psychometric evaluation. Journal of Traumatic Stress, 28(6), 489-498.'
      ],
      chineseValidation: [
        '汪向东, 李晓驷, 等. (2015). 创伤后应激障碍检查量表 (PCL-5) 中文版的信度与效度评估. 中国心理卫生杂志.'
      ]
    }
  },
  defaultOptions: [
    { label: '完全没有', value: 0, desc: '未造成困扰' },
    { label: '有一点', value: 1, desc: '轻度困扰，偶尔发生' },
    { label: '中等程度', value: 2, desc: '中度困扰，较为明显' },
    { label: '相当厉害', value: 3, desc: '频繁发生，造成沉重负担' },
    { label: '极其严重', value: 4, desc: '极度痛苦，几乎无法自拔' }
  ],
  questions: [
    // Cluster B: 侵入性再体验 (Q1-Q5)
    { id: 1, text: '脑海中不由自主地反复出现关于那次痛苦经历的重复记忆、不可控画面或念头？', dimension: '侵入性再体验' },
    { id: 2, text: '反复做关于那次经历的令人极其不安或恐怖的梦境/噩梦？', dimension: '侵入性再体验' },
    { id: 3, text: '突然感觉或表现得好像那次痛苦经历正在重新发生一样（闪回感）？', dimension: '侵入性再体验' },
    { id: 4, text: '当某些事物提醒您想起那次经历时，感到极度的心烦意乱、惊恐或心理痛苦？', dimension: '侵入性再体验' },
    { id: 5, text: '当某些事物提醒您想起那次经历时，产生强烈的身体生理反应（如心跳加速、出汗、发抖或呼吸困难）？', dimension: '侵入性再体验' },

    // Cluster C: 持续性回避 (Q6-Q7)
    { id: 6, text: '极力回避与那次痛苦经历相关的记忆、想法或感受？', dimension: '持续性回避' },
    { id: 7, text: '极力回避容易让您联想起那次经历的外界线索（如特定的人、地点、对话、物品或活动）？', dimension: '持续性回避' },

    // Cluster D: 认知与心境负向改变 (Q8-Q14)
    { id: 8, text: '无法记起那次经历中某些极其重要的关键细节（创伤性记忆空白）？', dimension: '认知与心境改变' },
    { id: 9, text: '对自己、他人或整个世界持有强烈的负面信念（如“我彻底毁了”、“这个世界处处危险无一可信”）？', dimension: '认知与心境改变' },
    { id: 10, text: '错误地将那次创伤经历或其后果归咎于自己或他人（产生过度的自责、愧疚或怨恨）？', dimension: '认知与心境改变' },
    { id: 11, text: '持续体验强烈的负面情绪（例如恐惧、愤怒、极度内疚或羞耻感）？', dimension: '认知与心境改变' },
    { id: 12, text: '对曾经热爱或积极参与的重要活动失去兴趣，提不起任何劲头？', dimension: '认知与心境改变' },
    { id: 13, text: '感到自己与他人疏离、隔绝，难以重新融入原本的社交与家庭生活？', dimension: '认知与心境改变' },
    { id: 14, text: '感到自己情感麻木，难以体验到积极温暖的情感（如快乐、被爱或对亲人的亲密感）？', dimension: '认知与心境改变' },

    // Cluster E: 唤起与反应性改变 (Q15-Q20)
    { id: 15, text: '变得极其暴躁易怒、容易被激惹，出现冲动攻击或言语失控？', dimension: '过度警觉与唤起' },
    { id: 16, text: '做出过于冒险、鲁莽或对自身安全有害的行为？', dimension: '过度警觉与唤起' },
    { id: 17, text: '处于高度警觉状态，时刻神经紧绷或严密防备周围潜伏危险？', dimension: '过度警觉与唤起' },
    { id: 18, text: '极容易受到惊吓，微小声响都会引起剧烈惊跳反应？', dimension: '过度警觉与唤起' },
    { id: 19, text: '难以集中注意力，工作、学习或阅读时思维涣散？', dimension: '过度警觉与唤起' },
    { id: 20, text: '入睡困难、半夜频繁醒来或睡眠极浅？', dimension: '过度警觉与唤起' }
  ],
  scoring: {
    method: 'sum',
    primaryMetricLabel: 'PCL-5 创伤应激总分',
    primaryMetricUnit: '分',
    minScore: 0,
    maxScore: 80,
    levels: [
      {
        label: '健康常模水平 (无显著应激反应)',
        type: 'normal',
        badgeClass: 'badge-success',
        min: 0,
        max: 15,
        summary: '您的自评得分处于健康常模基线范围（0-15分）。未表现出具有临床意义的创伤后应激再体验、回避或过度警觉反应，心理韧性处于良好稳定状态。',
        advice: [
          '保持健康规律的日常生活秩序',
          '在面对生活重大压力事件时，继续运用现有的良好社会支持系统'
        ]
      },
      {
        label: '轻中度创伤后应激反应 (亚临床状态)',
        type: 'mild',
        badgeClass: 'badge-info',
        min: 16,
        max: 32,
        summary: '存在轻度或中度的创伤后应激体验（16-32分）。可能偶尔受到创伤回忆侵扰或刻意回避部分特定场所，但尚未全面跨越 PTSD 临床筛查切点（33分）。',
        advice: [
          '允许自己适度悲伤与表达感受，避免通过长期强行压抑来逃避情绪',
          '练习腹式呼吸与渐进式肌肉放松训练，降低交感神经系统过度紧绷感',
          '若特定诱发情境持续引起心慌不安，可向专业心理咨询师寻求短期叙事或焦点解决干预'
        ]
      },
      {
        label: '显著创伤后应激反应 (达到临床筛查界限)',
        type: 'moderate',
        badgeClass: 'badge-warning',
        min: 33,
        max: 49,
        summary: '您的自评总分达到或跨越了国际广泛认可的 PTSD 临床阳性筛查分界线（≥ 33 分）。强烈提示您在再体验、回避、负面认知及过度警觉 4 个症候群上存在显著痛苦，符合创伤后应激障碍的临床初筛指征。',
        advice: [
          '强烈建议前往精神科门诊或创伤心理专科接受临床诊断与鉴别',
          '了解创伤领域的国际权威循证干预方法，如眼动脱敏再加工 (EMDR) 或延长暴露疗法 (PE)',
          '切忌自我孤立，在感到安全的环境下向亲近值得信赖的家人倾诉'
        ]
      },
      {
        label: '重度/极重度创伤后应激障碍倾向',
        type: 'severe',
        badgeClass: 'badge-danger',
        min: 50,
        max: 80,
        summary: '您的自评得分高度显著（50-80分），表明严重创伤应激症状正在对您的情绪、人际关系及工作生活造成全面瘫痪性的严重损害，提示高度可能罹患创伤后应激障碍 (PTSD)，亟需专业医疗支持。',
        advice: [
          '强烈建议尽快前往综合医院心理科或精神专科医院接受系统评估与综合治疗',
          '必要时在医生指导下采用药物辅助控制强烈的焦虑惊恐与睡眠障碍',
          '建立身心安全危机应对计划，理解症状是身心遭受严重过载后的应激保护机制，并非个人软弱'
        ]
      }
    ],
    dimensions: [
      {
        name: '侵入性再体验',
        desc: 'Cluster B：评估不由自主的痛苦闯入性回忆、恶梦、闪回及创伤线索诱发的强烈心理生理反应。',
        items: [1, 2, 3, 4, 5]
      },
      {
        name: '持续性回避',
        desc: 'Cluster C：评估极力回避与创伤相关的记忆、想法、情感，以及回避外部人事物线索的倾向。',
        items: [6, 7]
      },
      {
        name: '认知与心境改变',
        desc: 'Cluster D：评估关键创伤记忆遗忘、负面自我世界信念、病理性自责、持续负面情绪及情感麻木。',
        items: [8, 9, 10, 11, 12, 13, 14]
      },
      {
        name: '过度警觉与唤起',
        desc: 'Cluster E：评估易怒暴躁、自我毁灭冒险行为、过度警觉、过敏惊跳、注意力分散及失眠等自主神经亢奋。',
        items: [15, 16, 17, 18, 19, 20]
      }
    ]
  }
};

export default PCL5;
