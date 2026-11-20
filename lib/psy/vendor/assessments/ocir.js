// Vendored from PSYMETRA (js/engine.js, js/assessments/*.js) on 2026-11-12.
// Scoring logic is copied verbatim; only export shims changed. Do not "improve" numbers here.

/**
 * PSYMETRA - OCI-R Assessment Definition
 * 强迫症状自评量表修订版 (Obsessive-Compulsive Inventory - Revised, OCI-R)
 * 国际公认的强迫症权威筛查与多亚型评估工具 (Foa et al., 2002)
 */

const OCIR = {
  meta: {
    id: 'ocir',
    name: 'OCI-R',
    fullName: '强迫症状自评量表修订版',
    englishName: 'Obsessive-Compulsive Inventory - Revised',
    category: '强迫评估',
    targetGroups: ['成年人', '青少年', '反复检查/清洗困扰人群', '受不可控侵入性思维困扰人群'],
    description: '由宾夕法尼亚大学焦虑障碍研究中心 Foa 教授编制的强迫症国际金标准筛查工具。全面评估清洗、检查、强迫思维、整理对称、计数抵消及囤积等 6 大核心强迫临床亚型。',
    instructions: '以下列出人们在日常生活中可能体验到的感受与行为。请仔细阅读每一项，并根据【在过去的一个月中】该体验给您带来困扰或烦恼的程度作出选择。',
    duration: 4,
    timeframe: '过去一个月',
    references: {
      original: [
        'Foa, E. B., Huppert, J. D., Leiberg, S., et al. (2002). The Obsessive-Compulsive Inventory: development and validation of a short version. Psychological Assessment, 14(4), 485-496.'
      ],
      chineseValidation: [
        '许晶, 严和骎, 等. (2006). 强迫症状自评量表修订版 (OCI-R) 中文版的信效度研究. 中华精神科杂志.'
      ]
    }
  },
  defaultOptions: [
    { label: '完全没有', value: 0, desc: '未造成困扰或发生' },
    { label: '轻度困扰', value: 1, desc: '轻微发生，影响很小' },
    { label: '中度困扰', value: 2, desc: '明显发生，感到一定痛苦' },
    { label: '重度困扰', value: 3, desc: '频繁发生，造成沉重烦恼' },
    { label: '极重度困扰', value: 4, desc: '极度严重，占据大量时间精力' }
  ],
  questions: [
    { id: 1, text: '我因为物品没有摆放整齐或对称而感到非常烦恼。', dimension: '整理与对称' },
    { id: 2, text: '我会反复检查门、窗户或抽屉是否已经锁好。', dimension: '检查' },
    { id: 3, text: '我会收集并保存许多即使没有用处的东西。', dimension: '囤积' },
    { id: 4, text: '我感到自己不得不反复数数，或者脑海中重复某些特定的数字。', dimension: '抵消与计数' },
    { id: 5, text: '我会因为触碰了可能被污染、不干净的东西而感到极度痛苦或难以忍受。', dimension: '清洗' },
    { id: 6, text: '我无法控制自己不去想某些令我非常不快、难堪或可怕的想法或画面。', dimension: '强迫思维' },
    { id: 7, text: '如果事情没有按照特定的顺序或规则进行，我就会感到极度不安。', dimension: '整理与对称' },
    { id: 8, text: '我会反复多次检查煤气阀门、水龙头或电灯开关。', dimension: '检查' },
    { id: 9, text: '我发现自己很难扔掉旧东西，即使它们已经破烂无用。', dimension: '囤积' },
    { id: 10, text: '我觉得有必要按照特定的次数或仪式去重复某些行为，以防止坏事发生。', dimension: '抵消与计数' },
    { id: 11, text: '我有时会花过多的时间洗手或清洁身体，甚至洗到皮肤脱皮。', dimension: '清洗' },
    { id: 12, text: '我脑海中经常频繁闯入一些违背我道德观念、令我害怕的邪恶念头。', dimension: '强迫思维' },
    { id: 13, text: '我会花大量的时间必须把东西摆得井井有条、绝对笔直对称。', dimension: '整理与对称' },
    { id: 14, text: '我会反复检查自己填写的表格、邮件或写过的文字，生怕犯下不可挽回的错误。', dimension: '检查' },
    { id: 15, text: '我家里堆满了各种杂物，以至于占据了正常的起居生活空间。', dimension: '囤积' },
    { id: 16, text: '我经常觉得脑子里必须默念特定的话语、祈祷词或好的词汇来中和坏念头。', dimension: '抵消与计数' },
    { id: 17, text: '我极度害怕自己或衣服接触到细菌、病毒或化学污物。', dimension: '清洗' },
    { id: 18, text: '某些令我恶心或反感的念头总是不由自主地涌入我的脑海，我无法停止它们。', dimension: '强迫思维' }
  ],
  scoring: {
    method: 'sum',
    primaryMetricLabel: 'OCI-R 强迫症状总分',
    primaryMetricUnit: '分',
    minScore: 0,
    maxScore: 72,
    levels: [
      {
        label: '健康常模水平 (无明显强迫困扰)',
        type: 'normal',
        badgeClass: 'badge-success',
        min: 0,
        max: 11,
        summary: '您的得分处于一般健康人群常模范围（通常低于 12 分）。未见具有临床意义的强迫思维或强迫仪式动作，身心控制感处于良好平衡状态。',
        advice: [
          '保持现有的张弛有度的工作与生活节奏',
          '对生活中的偶尔不确定性保持从容接纳的态度'
        ]
      },
      {
        label: '轻度强迫特征 (亚临床倾向)',
        type: 'mild',
        badgeClass: 'badge-info',
        min: 12,
        max: 20,
        summary: '存在轻度的强迫特征（如偶尔反复确认门锁、对清洁或对称秩序有较高偏好），但尚未跨越强迫症临床筛查阈值（21 分），通常未对社会功能造成全面瘫痪性损伤。',
        advice: [
          '识别日常中的“安全行为”诱因，尝试逐步减少不必要的重复核查次数',
          '允许生活存在适度的“不完美”与模糊性，适度接纳无害的偶发杂念',
          '在感到焦虑时尝试深呼吸放松，而非通过仪式性动作缓解紧绷感'
        ]
      },
      {
        label: '中度强迫症状 (达到临床筛查界限)',
        type: 'moderate',
        badgeClass: 'badge-warning',
        min: 21,
        max: 34,
        summary: '您的总分达到或超过了国际广泛认可的 OCD 临床阳性筛查分界线（≥ 21 分，敏感度 84%，特异度 83%）。提示您在特定强迫亚型（如清洗、检查或侵入性思维）上正承受着明显痛苦与时间耗损。',
        advice: [
          '建议前往综合医院精神卫生科或专业心理科进行强迫症临床访谈确诊',
          '了解针对强迫症的循证心理治疗（如暴露与反应阻止法 ERP，认知行为疗法 CBT）',
          '避免向亲友反复寻求“安全保证”，寻求保证往往会强化强迫怀疑的恶性循环'
        ]
      },
      {
        label: '重度/极重度强迫障碍倾向',
        type: 'severe',
        badgeClass: 'badge-danger',
        min: 35,
        max: 72,
        summary: '您的自评得分高度显著，频繁遭受强迫思维与强迫行为的强烈困扰，可能每天消耗数小时进行反复检查、清洗、数数或抵抗侵入性念头，社会功能与生活质量受到重大冲击。',
        advice: [
          '强烈建议尽快前往精神专科医院寻求专业医师的系统评估与综合干预',
          '现代精神医学对于重度强迫障碍具备成熟的整合治疗方案（药物支持配合专业 ERP 心理治疗）',
          '建立外部支持系统，让家人理解强迫症状是大脑神经回路的生化与认知失衡，并非“意志薄弱”'
        ]
      }
    ],
    dimensions: [
      {
        name: '清洗',
        desc: '评估触碰污物恐惧、过度洗涤、洗手至脱皮及对病菌病毒感染的极度恐惧。',
        items: [5, 11, 17]
      },
      {
        name: '检查',
        desc: '评估反复多次检查门窗、煤气开关、水龙头以及反复核查文字邮件的强迫行为。',
        items: [2, 8, 14]
      },
      {
        name: '强迫思维',
        desc: '评估无法自控的、频繁闯入脑海的令自身不快、可怕、违背道德或恶心的侵入性画面与念头。',
        items: [6, 12, 18]
      },
      {
        name: '整理与对称',
        desc: '评估物品必须绝对整齐对齐摆放、必须遵循特定次序规则的强迫秩序感。',
        items: [1, 7, 13]
      },
      {
        name: '抵消与计数',
        desc: '评估不得不反复数数、默念特定词汇或重复仪式性动作以中和不良预感的心理仪式。',
        items: [4, 10, 16]
      },
      {
        name: '囤积',
        desc: '评估难以舍弃破烂无用旧物、家里堆满杂物以致占据正常起居空间的过度积攒倾向。',
        items: [3, 9, 15]
      }
    ]
  }
};

export default OCIR;
