// Vendored from PSYMETRA (js/engine.js, js/assessments/*.js) on 2026-11-12.
// Scoring logic is copied verbatim; only export shims changed. Do not "improve" numbers here.

/**
 * PSYMETRA - AQA (AQ-50) Assessment Definition
 * 成人自闭症谱系商数问卷 (Autism-Spectrum Quotient - Adult, AQ-Adult / AQA)
 */

const optAgreeKeyed = [
  { label: '完全赞同', value: 1, desc: '非常符合我的特点' },
  { label: '部分赞同', value: 1, desc: '稍微符合我的特点' },
  { label: '部分反对', value: 0, desc: '稍微不符合我的特点' },
  { label: '完全反对', value: 0, desc: '非常不符合我的特点' }
];

const optDisagreeKeyed = [
  { label: '完全赞同', value: 0, desc: '非常符合我的特点' },
  { label: '部分赞同', value: 0, desc: '稍微符合我的特点' },
  { label: '部分反对', value: 1, desc: '稍微不符合我的特点' },
  { label: '完全反对', value: 1, desc: '非常不符合我的特点' }
];

const AQA = {
  meta: {
    id: 'aqa',
    name: 'AQA',
    fullName: '成人自闭症谱系筛查量表',
    englishName: 'Autism-Spectrum Quotient (Adult)',
    category: '神经发育/ASD',
    targetGroups: ['成年人', '阿斯伯格自测人群', '社交沟通困难者', '神经多样性探索者'],
    description: '由剑桥大学自闭症研究中心 Simon Baron-Cohen 教授团队研发的国际金标准自评量表，全面测量成人是否具备高功能自闭症或阿斯伯格综合征 (Asperger) 相关的神经发育谱系特质。',
    instructions: '以下每一条陈述都描述了日常生活中关于社交、思考与行为习惯的感受。请根据您真实的习惯与直觉作出选择，没有对错之分。',
    duration: 10,
    timeframe: '长期一贯表现',
    references: {
      original: [
        'Baron-Cohen, S., Wheelwright, S., Skinner, R., Martin, J., & Clubley, E. (2001). The Autism-Spectrum Quotient (AQ): evidence from Asperger syndrome/high-functioning autism, males and females, scientists and mathematicians. Journal of Autism and Developmental Disorders, 31(1), 5-17.'
      ],
      chineseValidation: [
        'Zhao, Q., & Zheng, T. (Institute of Psychology, Chinese Academy of Sciences). Adult Autism Spectrum Quotient (AQ) – Chinese (Simplified). Autism Research Centre, University of Cambridge.',
        'Lau, W. Y., Gau, S. S., Chiu, Y. N., et al. (2013). Psychometric properties of the Chinese version of the Autism-Spectrum Quotient. Research in Developmental Disabilities, 34(1), 294-305.'
      ]
    }
  },
  defaultOptions: optAgreeKeyed,
  questions: [
    { id: 1, text: '与其独立完成事情，我比较喜欢跟别人一起合作', dimension: '社交技能', options: optDisagreeKeyed },
    { id: 2, text: '我比较喜欢一直沿用相同的方法来做事情', dimension: '注意力转换', options: optAgreeKeyed },
    { id: 3, text: '当我试着想象某事时，我脑海中很容易就出现清晰画面', dimension: '想象力', options: optDisagreeKeyed },
    { id: 4, text: '我经常太强烈地投入于一件事，而完全忽略了周围的其他事情', dimension: '注意力转换', options: optAgreeKeyed },
    { id: 5, text: '我经常注意到别人没有察觉到的细微声音', dimension: '细节关注', options: optAgreeKeyed },
    { id: 6, text: '我经常会注意车牌号码或诸如此类的一连串规律信息', dimension: '细节关注', options: optAgreeKeyed },
    { id: 7, text: '虽然我自认为很有礼貌，但人们经常指出我说了一些不合时宜或不礼貌的话', dimension: '沟通交流', options: optAgreeKeyed },
    { id: 8, text: '当我阅读故事时，我可以轻而易举地想象故事人物的样子', dimension: '想象力', options: optDisagreeKeyed },
    { id: 9, text: '我对日期、历史时刻或时间线类的信息深深着迷', dimension: '细节关注', options: optAgreeKeyed },
    { id: 10, text: '在社交聚会中，我能够轻松同时跟进不同人群交谈的内容', dimension: '注意力转换', options: optDisagreeKeyed },
    { id: 11, text: '参与社交场合或融入聚会对我而言是件容易的事', dimension: '社交技能', options: optDisagreeKeyed },
    { id: 12, text: '我往往会敏锐注意到别人忽视的各种微小细节', dimension: '细节关注', options: optAgreeKeyed },
    { id: 13, text: '比起去热闹喧嚣的派对，我更宁愿去安静的图书馆', dimension: '社交技能', options: optAgreeKeyed },
    { id: 14, text: '我觉得凭空虚构编造一个故事很容易', dimension: '想象力', options: optDisagreeKeyed },
    { id: 15, text: '相较于无生命的物体、机械或系统，我对人本身有更大的兴趣', dimension: '社交技能', options: optDisagreeKeyed },
    { id: 16, text: '我有极其强烈的专属兴趣，如果不能继续钻研，我会感到非常沮丧烦躁', dimension: '注意力转换', options: optAgreeKeyed },
    { id: 17, text: '我很享受日常中的社交闲聊 (Small talk)', dimension: '沟通交流', options: optDisagreeKeyed },
    { id: 18, text: '当我开始说话时，别人常常觉得很难插进话来', dimension: '沟通交流', options: optAgreeKeyed },
    { id: 19, text: '我对数字、统计数据或编号模式深深着迷', dimension: '细节关注', options: optAgreeKeyed },
    { id: 20, text: '当我阅读小说或看影视剧时，我很难搞清人物背后的隐藏动机与意图', dimension: '想象力', options: optAgreeKeyed },
    { id: 21, text: '我不太喜欢阅读虚构类的小说', dimension: '想象力', options: optAgreeKeyed },
    { id: 22, text: '我发现结交新朋友是一件相当困难的事情', dimension: '社交技能', options: optAgreeKeyed },
    { id: 23, text: '我总是能在各种事物中敏锐地捕捉到特定的规律或模式 (Patterns)', dimension: '细节关注', options: optAgreeKeyed },
    { id: 24, text: '与其去博物馆或艺术展，我宁愿去电影院或剧院看戏', dimension: '想象力', options: optDisagreeKeyed },
    { id: 25, text: '如果我固定的日常生活作息被意外打乱，我完全不会感到不安', dimension: '注意力转换', options: optDisagreeKeyed },
    { id: 26, text: '在社交谈话中，我经常发现自己不知道该如何把对话自然延续下去', dimension: '沟通交流', options: optAgreeKeyed },
    { id: 27, text: '当别人跟我说话时，我很容易就能听懂对方的“弦外之音”（字里行间的潜台词）', dimension: '沟通交流', options: optDisagreeKeyed },
    { id: 28, text: '我通常比较关注事情的宏观大局，而不太纠结于具体细节', dimension: '细节关注', options: optDisagreeKeyed },
    { id: 29, text: '我很不擅长记忆电话号码或长串数字', dimension: '细节关注', options: optDisagreeKeyed },
    { id: 30, text: '我通常不会注意到某个人外貌或环境细节上发生的微小变化', dimension: '细节关注', options: optDisagreeKeyed },
    { id: 31, text: '如果听我说话的人开始感到无聊，我通常能够立即察觉出来', dimension: '沟通交流', options: optDisagreeKeyed },
    { id: 32, text: '我觉得在不同任务之间同时进行或多线切换是容易的', dimension: '注意力转换', options: optDisagreeKeyed },
    { id: 33, text: '当在通电话时，我常常搞不清楚什么时候该轮到我开口说话', dimension: '沟通交流', options: optAgreeKeyed },
    { id: 34, text: '我做事喜欢随性而为，凭一时的冲动行事', dimension: '注意力转换', options: optDisagreeKeyed },
    { id: 35, text: '在一群人中听笑话时，我经常是最后一个才听懂笑点的人', dimension: '沟通交流', options: optAgreeKeyed },
    { id: 36, text: '我觉得识别他人的脸部表情、眼神或肢体语言含义是轻松的', dimension: '社交技能', options: optDisagreeKeyed },
    { id: 37, text: '如果手头的事情被打断，我能很快切换回之前做的事', dimension: '注意力转换', options: optDisagreeKeyed },
    { id: 38, text: '我很擅长与别人进行社交互动与自如交谈', dimension: '沟通交流', options: optDisagreeKeyed },
    { id: 39, text: '别人经常对我说，我总是一再重复谈论同一件事情', dimension: '沟通交流', options: optAgreeKeyed },
    { id: 40, text: '我小时候很喜欢玩“扮家家酒”或角色扮演等想象游戏', dimension: '想象力', options: optDisagreeKeyed },
    { id: 41, text: '我喜欢收集特定类别事物的信息（例如汽车型号、鸟类、火车或植物分类等）', dimension: '想象力', options: optAgreeKeyed },
    { id: 42, text: '我发现很难设身处地想象成为另一个人会是什么感受', dimension: '想象力', options: optAgreeKeyed },
    { id: 43, text: '我喜欢对自己参与的任何活动都作周密的计划', dimension: '注意力转换', options: optAgreeKeyed },
    { id: 44, text: '我很享受社交场合与聚会活动', dimension: '社交技能', options: optDisagreeKeyed },
    { id: 45, text: '我发现很难弄清楚或揣摩别人的真实意图', dimension: '社交技能', options: optAgreeKeyed },
    { id: 46, text: '新的情境或陌生的环境会让我感到焦虑不安', dimension: '注意力转换', options: optAgreeKeyed },
    { id: 47, text: '我喜欢结识新朋友', dimension: '社交技能', options: optDisagreeKeyed },
    { id: 48, text: '我很擅长协调人际关系与处事外交', dimension: '社交技能', options: optDisagreeKeyed },
    { id: 49, text: '我不太擅长记住别人的出生日期', dimension: '细节关注', options: optDisagreeKeyed },
    { id: 50, text: '我觉得和小朋友一起玩需要假装或角色扮演的游戏非常容易', dimension: '想象力', options: optDisagreeKeyed }
  ],
  scoring: {
    method: 'sum',
    primaryMetricLabel: 'AQ 自闭谱系商数总分',
    primaryMetricUnit: '分',
    minScore: 0,
    maxScore: 50,
    levels: [
      {
        label: '典型神经发育范围',
        type: 'normal',
        badgeClass: 'badge-success',
        min: 0,
        max: 21,
        summary: '您的 AQ 得分处于典型神经发育（Neurotypical）群体常见区间，自闭谱系特质极低。在社交直觉、隐喻沟通及环境灵活性转换方面表现出自然的社会适应力。',
        advice: [
          '保持健康的自我接纳与生活社交平衡',
          '在多元工作与人际交往中充分发挥共情与沟通优势'
        ]
      },
      {
        label: '轻中度自闭谱系特质 (边界范围)',
        type: 'moderate',
        badgeClass: 'badge-warning',
        min: 22,
        max: 31,
        summary: '您的得分呈现出中等程度的自闭或阿斯伯格谱系行为特征。您可能倾向于拥有高度专注的特定兴趣、偏爱规律清晰的生活节奏，在复杂社交潜台词解读中偶尔感到耗能。',
        advice: [
          '接纳自身的特质与思维偏好，不必强迫自己过度迎合不舒适的社交',
          '为自己设置“社交充电缓冲期”，避免持续过度感官刺激',
          '如果人际或职场沟通带来持续压力，可寻求了解神经多样性的心理咨询师协助'
        ]
      },
      {
        label: '显著自闭谱系特质 (高度提示 ASD/阿斯伯格可能)',
        type: 'severe',
        badgeClass: 'badge-danger',
        min: 32,
        max: 50,
        summary: '您的得分达到或显著超过临床诊断敏感划界阈值（≥32分）。在统计学上，超过80%被正式确诊为高功能自闭症或阿斯伯格综合征的成人得分处于该区间。高度提示存在神经多样性自闭谱系特征。',
        advice: [
          '建议前往三甲精神专科医院成人心理发育门诊进行综合性临床访谈评估',
          '了解成人神经多样性 (Neurodiversity) 理念，放下长期的“伪装补偿 (Camouflaging)”内耗',
          '加入支持性社群，探索适合高专注、逻辑严谨特质的生活与职业发展路径'
        ]
      }
    ],
    dimensions: [
      {
        name: '社交技能',
        desc: '评估在群体社交活动、交朋友、与人合作及人际交往规则中的偏好与自在程度。',
        items: [1, 11, 13, 15, 22, 36, 44, 45, 47, 48]
      },
      {
        name: '注意力转换',
        desc: '评估面对日程被打乱、多任务切换及对特定专一兴趣的执着专注程度。',
        items: [2, 4, 10, 16, 25, 32, 34, 37, 43, 46]
      },
      {
        name: '细节关注',
        desc: '评估对环境微弱声光细节、车牌数字规律模式及数据序列的敏锐捕捉能力。',
        items: [5, 6, 9, 12, 19, 23, 28, 29, 30, 49]
      },
      {
        name: '沟通交流',
        desc: '评估日常闲聊、理解话中话弦外之音、抓取谈话轮流节奏及察觉他人表情的能力。',
        items: [7, 17, 18, 26, 27, 31, 33, 35, 38, 39]
      },
      {
        name: '想象力',
        desc: '评估对虚构小说、角色扮演游戏、意象构建及理解他人抽象动机的思维方式。',
        items: [3, 8, 14, 20, 21, 24, 40, 41, 42, 50]
      }
    ]
  }
};

export default AQA;
