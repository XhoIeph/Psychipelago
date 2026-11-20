// Vendored from PSYMETRA (js/engine.js, js/assessments/*.js) on 2026-11-12.
// Scoring logic is copied verbatim; only export shims changed. Do not "improve" numbers here.

/**
 * PSYMETRA - BSS Assessment Definition
 * 贝克自杀意念量表 (Beck Scale for Suicide Ideation)
 * Aaron T. Beck 经典自杀意向深度临床评定量表
 */

const BSS = {
  meta: {
    id: 'bss',
    name: 'BSS',
    fullName: '贝克自杀意念量表',
    englishName: 'Beck Scale for Suicide Ideation',
    category: '危机/自伤',
    targetGroups: ['成人 (17岁及以上)', '青少年', '抑郁症患者', '临床精神科住院/门诊患者', '危机干预对象'],
    description: '由世界著名精神病学家 Aaron T. Beck 等人编制，是精神医学领域评估自杀意念强度、被动/主动求死欲望、实施方案具体度及行动准备程度最权威的临床评定量表之一。量表包含 19 项核心计分条目，全面描摹个体由自杀念头向自杀行动转化的完整心理图景。',
    instructions: '本量表共有 19 道题目。请仔细阅读每一道题目的三个选项，并根据您最近一周（包括今天）最真实的想法和感受，选择最符合您实际情况的一项。',
    duration: 6,
    timeframe: '最近一周及当前状态',
    references: {
      original: [
        'Beck, A. T., Kovacs, M., & Weissman, A. (1979). Assessment of suicidal intention: The Scale for Suicide Ideation. Journal of Consulting and Clinical Psychology, 47(2), 343-352.',
        'Beck, A. T., & Steer, R. A. (1991). Manual for the Beck Scale for Suicide Ideation. San Antonio, TX: Psychological Corporation.'
      ],
      chineseValidation: [
        '李献云, 费立鹏, 等. (2011). 贝克自杀意念量表中文版在社区及大学生人群中的信效度研究. 中国心理卫生杂志, 25(11), 862-866.'
      ]
    }
  },
  questions: [
    {
      id: 1,
      text: '您想要活下去的愿望程度如何？',
      dimension: '求死愿望与生存矛盾',
      options: [
        { label: '中等程度至强烈', value: 0, desc: '有明确或较强的生存愿望' },
        { label: '较弱或微弱', value: 1, desc: '求生意愿低落，感到茫然' },
        { label: '完全没有活下去的愿望', value: 2, desc: '彻底放弃生存希望' }
      ]
    },
    {
      id: 2,
      text: '您想要死去的愿望程度如何？',
      dimension: '求死愿望与生存矛盾',
      options: [
        { label: '完全没有', value: 0, desc: '无任何求死想法' },
        { label: '较弱或轻微', value: 1, desc: '偶有死去的闪念' },
        { label: '中等程度至强烈', value: 2, desc: '渴望结束生命' }
      ]
    },
    {
      id: 3,
      text: '您活下去的理由与死去的理由权衡如何？',
      dimension: '求死愿望与生存矛盾',
      options: [
        { label: '活下去的理由明显大于死去的理由', value: 0, desc: '生活中仍有重要牵挂与价值' },
        { label: '两者差不多，感到极度矛盾', value: 1, desc: '生与死的念头在心中胶着' },
        { label: '死去的理由明显大于活下去的理由', value: 2, desc: '觉得生无可恋，死亡是更好解脱' }
      ]
    },
    {
      id: 4,
      text: '您主动尝试自杀的愿望程度如何？',
      dimension: '求死愿望与生存矛盾',
      options: [
        { label: '完全没有', value: 0, desc: '无任何主动自杀意愿' },
        { label: '较弱或轻微', value: 1, desc: '有些许主动尝试的念头' },
        { label: '中等程度至强烈', value: 2, desc: '有主动实施自杀的明确愿望' }
      ]
    },
    {
      id: 5,
      text: '如果面临被动死亡（如遭遇意外或生病），您的态度如何？',
      dimension: '求死愿望与生存矛盾',
      options: [
        { label: '会主动避开危险以保全生命', value: 0, desc: '有正常的自我保护本能' },
        { label: '听之任之，生死无所谓', value: 1, desc: '缺乏求生意志，任由危险发生' },
        { label: '希望遭遇意外或疾病而死，不采取自救措施', value: 2, desc: '渴望外部力量直接结束生命' }
      ]
    },
    {
      id: 6,
      text: '您的自杀想法持续的时间有多长？',
      dimension: '意念频度与控制力',
      options: [
        { label: '短暂或仅偶尔一闪而过', value: 0, desc: '数秒或数分钟内消退' },
        { label: '持续较长时间', value: 1, desc: '数小时反复在脑海盘旋' },
        { label: '几乎持续存在或连续不断', value: 2, desc: '整天被自杀念头牢牢占据' }
      ]
    },
    {
      id: 7,
      text: '您产生自杀想法的频率是怎样的？',
      dimension: '意念频度与控制力',
      options: [
        { label: '极少出现或几乎没有', value: 0, desc: '极偶尔才有微弱闪念' },
        { label: '有时或间歇性出现', value: 1, desc: '每周出现数次' },
        { label: '经常或持续不断出现', value: 2, desc: '每天频繁出现' }
      ]
    },
    {
      id: 8,
      text: '您对自己的自杀念头持什么态度？',
      dimension: '意念频度与控制力',
      options: [
        { label: '排斥或努力抗拒', value: 0, desc: '拒绝自杀念头，努力排除' },
        { label: '矛盾或无所谓', value: 1, desc: '既不排斥也不特别迎合' },
        { label: '接受并赞成这种想法', value: 2, desc: '认同自杀是合理的出路' }
      ]
    },
    {
      id: 9,
      text: '您觉得自己控制自杀想法、不付诸行动的能力如何？',
      dimension: '意念频度与控制力',
      options: [
        { label: '能完全轻松控制', value: 0, desc: '确信自己决不会冲动行事' },
        { label: '控制有一定困难或不确定', value: 1, desc: '担心在极端痛苦时失控' },
        { label: '完全无法控制自己的念头与冲动', value: 2, desc: '失去对自杀冲动的自我约束力' }
      ]
    },
    {
      id: 10,
      text: '阻止您自杀的制约因素（如家庭牵挂、道德宗教、对死亡的恐惧）作用如何？',
      dimension: '意念频度与控制力',
      options: [
        { label: '有很多重要牵挂使我绝不自杀', value: 0, desc: '保护性因素十分强大' },
        { label: '有些许顾虑或犹豫，但制约力减弱', value: 1, desc: '牵挂感在逐步模糊' },
        { label: '没有任何牵挂或顾虑能阻止我', value: 2, desc: '完全丧失任何保护性制约' }
      ]
    },
    {
      id: 11,
      text: '您产生自杀想法的主要动机或理由是什么？',
      dimension: '动机与实施可行性',
      options: [
        { label: '没有产生自杀想法，或纯粹为了引起注意/操纵环境', value: 0, desc: '非真心求死动机' },
        { label: '既想改变困境又想逃避不可忍受的痛苦', value: 1, desc: '混合型动机' },
        { label: '完全是为了彻底结束痛苦，一了百了', value: 2, desc: '坚定的绝对求死动机' }
      ]
    },
    {
      id: 12,
      text: '您自杀的想法具体到什么程度（是否有具体方法）？',
      dimension: '动机与实施可行性',
      options: [
        { label: '完全没有考虑过具体方法', value: 0, desc: '仅为模糊的情绪念头' },
        { label: '考虑过某种方式但细节未定', value: 1, desc: '有粗略设想，未落实细节' },
        { label: '已有非常明确具体的自杀方法与设想', value: 2, desc: '方案明确且细节完整' }
      ]
    },
    {
      id: 13,
      text: '您实施自杀方法的机会或可行性如何？',
      dimension: '动机与实施可行性',
      options: [
        { label: '没有可用的方法或实施机会', value: 0, desc: '手段不可及，缺乏客观条件' },
        { label: '需要花费时间与精力去寻找方法/机会', value: 1, desc: '条件尚不成熟但有寻找意图' },
        { label: '方法和实施机会随时可用，唾手可得', value: 2, desc: '完全具备即刻实施的客观条件' }
      ]
    },
    {
      id: 14,
      text: '您觉得自己有勇气或能力去真正实施自杀吗？',
      dimension: '动机与实施可行性',
      options: [
        { label: '毫无勇气或深感无能为力', value: 0, desc: '对行动感到极度恐惧' },
        { label: '不确定自己是否有勇气实施', value: 1, desc: '内心动摇，勇气不足' },
        { label: '确信自己有足够的勇气和能力去实施', value: 2, desc: '已克服对死亡的恐惧心理' }
      ]
    },
    {
      id: 15,
      text: '您对实际尝试自杀的预期是怎样的？',
      dimension: '准备行动与善后隐瞒',
      options: [
        { label: '完全不预期自己会去尝试', value: 0, desc: '明确认为自己不会自杀' },
        { label: '不确定是否会付诸尝试', value: 1, desc: '有可能在某种刺激下尝试' },
        { label: '明确预期自己一定会去尝试自杀', value: 2, desc: '对自杀行动抱有高度肯定预期' }
      ]
    },
    {
      id: 16,
      text: '您为自杀所做的实际准备工作到了什么程度？',
      dimension: '准备行动与善后隐瞒',
      options: [
        { label: '完全没有做任何实际准备', value: 0, desc: '无任何筹备行为' },
        { label: '开始做部分准备（如留意地点或收集药物但未完成）', value: 1, desc: '已开始初步搜集行动' },
        { label: '已经准备就绪（如存够药量、备好工具、选定时间）', value: 2, desc: '物资与时机均已准备妥当' }
      ]
    },
    {
      id: 17,
      text: '您已着手写自杀遗书（或录制遗言留言）了吗？',
      dimension: '准备行动与善后隐瞒',
      options: [
        { label: '完全没有考虑过写遗书', value: 0, desc: '无遗言准备意图' },
        { label: '仅在脑海中想过写遗书，或动笔但未写完', value: 1, desc: '有遗书构思但未最终完成' },
        { label: '已经写完遗书或准备好最后的交代留言', value: 2, desc: '遗言材料已正式完成' }
      ]
    },
    {
      id: 18,
      text: '您是否为了自杀而做善后事宜的准备（如买保险、交代后事、赠送物品、结清账目）？',
      dimension: '准备行动与善后隐瞒',
      options: [
        { label: '完全没有做任何善后安排', value: 0, desc: '生活事务维持常态' },
        { label: '考虑过善后事宜但未真正落实', value: 1, desc: '有交代后事的念头' },
        { label: '已做出确切的善后安排与事务交代', value: 2, desc: '已处置财产或交代重要托付' }
      ]
    },
    {
      id: 19,
      text: '您向他人隐瞒自杀意图的程度如何？',
      dimension: '准备行动与善后隐瞒',
      options: [
        { label: '毫无隐瞒地向他人表露或主动求助', value: 0, desc: '愿意开放沟通求助' },
        { label: '有所保留，或只对极少数人透露', value: 1, desc: '半封闭半暴露状态' },
        { label: '极力掩饰或欺骗他人以防被阻止', value: 2, desc: '刻意假装正常以规避干预' }
      ]
    }
  ],
  scoring: {
    method: 'sum',
    primaryMetricLabel: 'BSS 自杀意念总分',
    primaryMetricUnit: '分',
    minScore: 0,
    maxScore: 38,
    levels: [
      {
        label: '无自杀意念 (Zero Ideation)',
        type: 'normal',
        badgeClass: 'badge-success',
        min: 0,
        max: 0,
        summary: '当前未检测出主动或被动的自杀意念，生存意向坚定，心身状态处于安全基线。',
        advice: [
          '保持健康的生活规律与运动作息',
          '维系温暖融洽的人际与亲密关系',
          '在面对生活重大挫折时积极发挥心理韧性'
        ]
      },
      {
        label: '轻度 / 被动自杀意念 (Mild / Passive Ideation)',
        type: 'mild',
        badgeClass: 'badge-info',
        min: 1,
        max: 5,
        summary: '存在较微弱的被动死亡愿望或偶发的自杀闪念，但个人自我控制力良好，无实质性实施计划或行动准备。通常反映近期承受较大精神重负或无助感。',
        advice: [
          '主动向信任的亲友、心理咨询师倾诉当下遭遇的心理困境',
          '梳理近期引发抑郁或绝望感的情绪诱因',
          '避免独自陷入反刍思维，多参与户外活动与社交互动'
        ]
      },
      {
        label: '中度自杀意念 (Moderate Ideation)',
        type: 'moderate',
        badgeClass: 'badge-warning',
        min: 6,
        max: 15,
        summary: '存在持续而明确的自杀意念，生存动机受到显著动摇，可能伴随粗略的方法构想或减弱的自我控制感。建议及时预约心理咨询或精神科专科面谈。',
        advice: [
          '尽快前往医院临床心理科或精神科门诊进行深入评估与诊治',
          '排查并清理生活环境中容易接触到的危险物品与药物',
          '与信任的家人建立安全联络通道，避免长时间独处',
          '随身携带心理援助热线（如 400-161-9995）'
        ]
      },
      {
        label: '重度自杀意念 (Severe Ideation)',
        type: 'moderate-severe',
        badgeClass: 'badge-orange',
        min: 16,
        max: 25,
        summary: '存在强烈的自杀意向，伴有明确的手段设想或初步准备，自我控制能力显著减退。需高度警惕，建议由家属陪同至综合医院精神科就诊并制定危机安全计划。',
        advice: [
          '由亲友全程陪同，尽快至精神专科医院就诊并评估住院干预必要性',
          '实施严格的居家环境安全防护，切断所有潜在伤害途径',
          '严密监护，不让当事人离开看护人视线',
          '建立多方支持安全网，共同分担当事人的心理压力'
        ]
      },
      {
        label: '极危重自杀意念 (Critical / Imminent Risk)',
        type: 'severe',
        badgeClass: 'badge-danger',
        min: 26,
        max: 38,
        summary: '极高危紧急状态！自杀意图坚定，伴有高度可行的实施计划、实际准备甚至遗书安排，且可能极力掩饰。必须立即启动全天候监护，切勿独处，即刻急诊就医干预！',
        advice: [
          '必须立即启动紧急危机干预，严禁让受试者独处哪怕一分钟！',
          '即刻由家属护送至综合医院急诊科或精神专科医院接受紧急封闭救治',
          '若出现即刻冲动或抗拒医疗，立即拨打 120 急救或 110 求助',
          '全面实施环境安全管控，彻底消除任何自伤隐患'
        ]
      }
    ],
    dimensions: [
      {
        name: '求死愿望与生存矛盾',
        desc: '测量生存欲望与被动/主动求死欲望的冲突与倾向',
        items: [1, 2, 3, 4, 5]
      },
      {
        name: '意念频度与控制力',
        desc: '评估自杀观念的侵入性、持续时间及个体的自我约束能力',
        items: [6, 7, 8, 9, 10]
      },
      {
        name: '动机与实施可行性',
        desc: '评估逃避痛苦的绝对动机及自杀手段/机会的可及性',
        items: [11, 12, 13, 14]
      },
      {
        name: '准备行动与善后隐瞒',
        desc: '评估实际物资准备、遗书撰写、后事交代及对外界的欺骗隐瞒',
        items: [15, 16, 17, 18, 19]
      }
    ]
  }
};

export default BSS;
