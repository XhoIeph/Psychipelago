// Vendored from PSYMETRA (js/engine.js, js/assessments/*.js) on 2026-11-12.
// Scoring logic is copied verbatim; only export shims changed. Do not "improve" numbers here.

/**
 * PSYMETRA - ASRS Assessment Definition
 * 成人 ADHD 自填量表 (Adult ADHD Self-Report Scale, ASRS v1.1)
 */

const ASRS = {
  meta: {
    id: 'asrs',
    name: 'ASRS',
    fullName: '成人 ADHD 自填量表',
    englishName: 'Adult ADHD Self-Report Scale',
    category: '神经发育/ADHD',
    targetGroups: ['成年人', '大学生', '职场人群', '注意力分散与拖延困扰人群'],
    description: '由世界卫生组织 (WHO) 联合哈佛医学院等学者基于 DSM 标准共同制订的权威成人注意缺陷与多动障碍 (ADHD) 筛查工具，全面评估注意力不集中、冲动与多动表现。',
    instructions: '请根据您在过去 6 个月中的实际感受与工作、生活行为表现回答以下问题。请凭直觉选择最符合您日常实际情况的频度选项。',
    duration: 4,
    timeframe: '过去 6 个月',
    references: {
      original: [
        'Kessler, R.C., Adler, L., Ames, M., et al. (2005). The World Health Organization Adult ADHD Self-Report Scale (ASRS): a short screening scale for use in the general population. Psychological Medicine, 35(2), 245-256.'
      ],
      chineseValidation: [
        '卞清涛, 等. (2012). 成人注意缺陷多动障碍自评量表中文版的信效度检验. 中华精神科杂志.'
      ]
    }
  },
  defaultOptions: [
    { label: '从不', value: 0, desc: '从不或极少发生' },
    { label: '很少', value: 1, desc: '少数时间发生' },
    { label: '有时', value: 2, desc: '偶尔发生' },
    { label: '常常', value: 3, desc: '相当频繁发生' },
    { label: '非常频繁', value: 4, desc: '几乎总是发生' }
  ],
  questions: [
    // Part A: 注意力缺陷维度 (Inattention, Q1-Q9)
    { id: 1, text: '当必须进行一件枯燥或困难的项目/计划时，您多常粗心犯错？', dimension: '注意力缺陷' },
    { id: 2, text: '当正在做枯燥或重复性的工作时，您多常有持续专注的困难？', dimension: '注意力缺陷' },
    { id: 3, text: '即使有人直接对您说话，您多常感到很难专心倾听别人跟您讲的内容？', dimension: '注意力缺陷' },
    { id: 4, text: '一旦完成任何任务中最具挑战性的部分后，您多常在完成最后的收尾细节上有困难？', dimension: '注意力缺陷' },
    { id: 5, text: '当必须从事情绪规划或有组织性的任务时，您多常感到很难井然有序地去完成？', dimension: '注意力缺陷' },
    { id: 6, text: '当有一件需要多费心深入思考的工作时，您多常逃避或拖延开始去做？', dimension: '注意力缺陷' },
    { id: 7, text: '在家里或工作中，您多常没有把东西放对地方或找不到钥匙、钱包、手机等物品？', dimension: '注意力缺陷' },
    { id: 8, text: '您多常因为身旁无关的活动、琐事或周围的声音而分心？', dimension: '注意力缺陷' },
    { id: 9, text: '您多常忘记赴约、遗忘截止日期或是必须处理的日常事项？', dimension: '注意力缺陷' },

    // Part B: 多动与冲动维度 (Hyperactivity & Impulsivity, Q10-Q18)
    { id: 10, text: '当您必须长时间坐着时，您多常坐立不安、扭动身体或摇晃手脚？', dimension: '多动与冲动' },
    { id: 11, text: '在开会或在其他被期望坐好的场合中，您多常不由自主地离开座位？', dimension: '多动与冲动' },
    { id: 12, text: '您多常觉得内心静不下来，感到烦躁不安或身体总想动来动去？', dimension: '多动与冲动' },
    { id: 13, text: '当有自己独处的休闲时间时，您多常感到很难使自己平静下来放松？', dimension: '多动与冲动' },
    { id: 14, text: '您多常觉得自己像“被马达驱动”一样过度活跃，不得不忙着做事情？', dimension: '多动与冲动' },
    { id: 15, text: '在社交谈话场合中，您多常发现自己话说得太多？', dimension: '多动与冲动' },
    { id: 16, text: '当与他人交谈时，您多常在别人还没讲完话前就抢先插嘴或替对方把话讲完？', dimension: '多动与冲动' },
    { id: 17, text: '在需要排队轮流等待的场合中，您多常感到很难忍耐与轮流等待？', dimension: '多动与冲动' },
    { id: 18, text: '您多常在别人忙碌或正在交谈时突然打断别人？', dimension: '多动与冲动' }
  ],
  scoring: {
    method: 'sum',
    primaryMetricLabel: 'ASRS ADHD 症状总分',
    primaryMetricUnit: '分',
    minScore: 0,
    maxScore: 72,
    levels: [
      {
        label: '非显著 ADHD 倾向',
        type: 'normal',
        badgeClass: 'badge-success',
        min: 0,
        max: 23,
        summary: '您的症状总分处于健康常模低位，未表现出明显的注意缺陷或冲动多动表现。日常的工作记忆与专注执行功能处于良好平衡状态。',
        advice: [
          '保持现有的高效日程规划与专注节奏',
          '规律作息，避免长期疲劳导致的生理性偶发注意力涣散'
        ]
      },
      {
        label: '轻度注意缺陷/多动倾向',
        type: 'mild',
        badgeClass: 'badge-info',
        min: 24,
        max: 35,
        summary: '存在轻度的注意力分散、拖延或轻度躁动倾向，可能在应对繁杂枯燥任务时受到一定挑战，但尚未构成全面严重的执行功能损伤。',
        advice: [
          '使用番茄钟工作法（25分钟专注+5分钟休息）分解繁琐任务',
          '工作桌面保持极简，减少视听环境干扰源',
          '建立备忘录与任务优先级看板'
        ]
      },
      {
        label: '中度 ADHD 特征 (建议关注)',
        type: 'moderate',
        badgeClass: 'badge-warning',
        min: 36,
        max: 47,
        summary: '您的得分提示存在较为明显的中度注意力缺陷与多动/冲动表征。可能频繁在日常生活中体验到难以专注细节、严重拖延、静坐不安或容易插话等困扰。',
        advice: [
          '建议前往综合医院精神科/心理科门诊进行成人 ADHD 临床访谈',
          '尝试认知行为策略与执行功能训练 (Executive Function Coaching)',
          '向身边亲友坦诚说明注意特质，争取外部结构化环境支持'
        ]
      },
      {
        label: '高度提示成人 ADHD 可能',
        type: 'severe',
        badgeClass: 'badge-danger',
        min: 48,
        max: 72,
        summary: '您的得分高度显著，在注意力维持、组织规划及冲动控制维度均承受着沉重负担，强烈提示符合成人注意缺陷多动障碍 (ADHD) 的临床特征，建议尽快接受正规医疗评估。',
        advice: [
          '强烈建议尽快就医接受精神专科医生的系统确诊与鉴别',
          '了解包括药物支持与非药物心理干预在内的整合诊疗方案',
          '接纳神经多样性特质，避免陷入“意志薄弱”的消极内耗自责'
        ]
      }
    ],
    dimensions: [
      {
        name: '注意力缺陷',
        desc: '评估在粗心犯错、持续维持专注、倾听、组织规划、丢三落四及记忆约会等方面的困难程度。',
        items: [1, 2, 3, 4, 5, 6, 7, 8, 9]
      },
      {
        name: '多动与冲动',
        desc: '评估手脚扭动、坐立不安、静不下心、过度活跃、言语过多、插话及排队等待困难等冲动多动表现。',
        items: [10, 11, 12, 13, 14, 15, 16, 17, 18]
      }
    ]
  }
};

export default ASRS;
