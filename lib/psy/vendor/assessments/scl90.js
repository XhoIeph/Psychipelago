// Vendored from PSYMETRA (js/engine.js, js/assessments/*.js) on 2026-11-12.
// Scoring logic is copied verbatim; only export shims changed. Do not "improve" numbers here.

/**
 * PSYMETRA - SCL-90 Assessment Definition
 * 症状自评量表 (Symptom Checklist 90)
 */

const SCL90 = {
  meta: {
    id: 'scl90',
    name: 'SCL-90',
    fullName: '症状自评量表',
    englishName: 'Symptom Checklist 90',
    category: '综合症状',
    targetGroups: ['成人', '大学生', '临床患者'],
    description: '国内外最著名的心理健康综合筛查量表，涵盖躯体化、强迫、抑郁、焦虑等10个维度的心理症状评估。',
    instructions: '以下列出了有些人可能有的问题，请仔细阅读每一条，然后根据最近一周（包括今天）的实际感受，选择最适合您情况的答案。请不要漏题，按第一直觉作答。',
    duration: 15,
    timeframe: '最近一周',
    references: {
      original: [
        'Derogatis, L.R., Lipman, R.S., & Covi, L. (1973). SCL-90: An outpatient psychiatric rating scale. Psychopharmacology Bulletin, 9(1), 13-28.'
      ],
      chineseValidation: [
        '王征宇, 迟玉芬. (1984). 症状自评量表（SCL-90）. 上海精神医学, 新2(2), 68-70.',
        '金华, 吴文源, 张明园. (1986). 中国正常人SCL-90评定结果的初步分析. 中国神经精神疾病杂志, 12(5), 260-263.'
      ]
    }
  },
  defaultOptions: [
    { label: '没有', value: 1, desc: '自觉无该项症状' },
    { label: '很轻', value: 2, desc: '自觉有该项症状，但对生活无实际影响' },
    { label: '中等', value: 3, desc: '自觉有该项症状，对生活有一定影响' },
    { label: '偏重', value: 4, desc: '自觉有该项症状，对生活有相当程度影响' },
    { label: '严重', value: 5, desc: '自觉该症状频度或程度很严重' }
  ],
  questions: [
  {
    "id": 1,
    "text": "头痛",
    "dimension": "躯体化"
  },
  {
    "id": 2,
    "text": "神经过敏，心中不踏实",
    "dimension": "焦虑"
  },
  {
    "id": 3,
    "text": "头脑中有不必要的想法或字句盘旋",
    "dimension": "强迫症状"
  },
  {
    "id": 4,
    "text": "头晕或昏倒",
    "dimension": "躯体化"
  },
  {
    "id": 5,
    "text": "对异性的兴趣减退",
    "dimension": "抑郁"
  },
  {
    "id": 6,
    "text": "对旁人求全责备",
    "dimension": "人际关系敏感"
  },
  {
    "id": 7,
    "text": "感到别人能控制你的思想",
    "dimension": "精神病性"
  },
  {
    "id": 8,
    "text": "责怪别人制造麻烦",
    "dimension": "偏执"
  },
  {
    "id": 9,
    "text": "忘记性大",
    "dimension": "强迫症状"
  },
  {
    "id": 10,
    "text": "担心自己的衣饰整齐及仪态的端正",
    "dimension": "强迫症状"
  },
  {
    "id": 11,
    "text": "容易烦恼和激动",
    "dimension": "敌对"
  },
  {
    "id": 12,
    "text": "胸痛",
    "dimension": "躯体化"
  },
  {
    "id": 13,
    "text": "害怕空旷的场所或街道",
    "dimension": "恐怖"
  },
  {
    "id": 14,
    "text": "感到自己的精力下降，活动减慢",
    "dimension": "抑郁"
  },
  {
    "id": 15,
    "text": "想结束自己的生命",
    "dimension": "抑郁"
  },
  {
    "id": 16,
    "text": "听到旁人听不到的声音",
    "dimension": "精神病性"
  },
  {
    "id": 17,
    "text": "发抖",
    "dimension": "焦虑"
  },
  {
    "id": 18,
    "text": "感到大多数人都不可信任",
    "dimension": "偏执"
  },
  {
    "id": 19,
    "text": "胃口不好",
    "dimension": "其他（睡眠与饮食）"
  },
  {
    "id": 20,
    "text": "容易哭泣",
    "dimension": "抑郁"
  },
  {
    "id": 21,
    "text": "同异性相处时感到害羞不自在",
    "dimension": "人际关系敏感"
  },
  {
    "id": 22,
    "text": "感到受骗、中了圈套或有人想抓住你",
    "dimension": "抑郁"
  },
  {
    "id": 23,
    "text": "无缘无故地突然感到害怕",
    "dimension": "焦虑"
  },
  {
    "id": 24,
    "text": "自己不能控制地大发脾气",
    "dimension": "敌对"
  },
  {
    "id": 25,
    "text": "怕单独出门",
    "dimension": "恐怖"
  },
  {
    "id": 26,
    "text": "经常责怪自己",
    "dimension": "抑郁"
  },
  {
    "id": 27,
    "text": "腰痛",
    "dimension": "躯体化"
  },
  {
    "id": 28,
    "text": "感到难以完成任务",
    "dimension": "强迫症状"
  },
  {
    "id": 29,
    "text": "感到孤独",
    "dimension": "抑郁"
  },
  {
    "id": 30,
    "text": "感到苦闷",
    "dimension": "抑郁"
  },
  {
    "id": 31,
    "text": "过分担忧",
    "dimension": "抑郁"
  },
  {
    "id": 32,
    "text": "对事物不感兴趣",
    "dimension": "抑郁"
  },
  {
    "id": 33,
    "text": "感到害怕",
    "dimension": "焦虑"
  },
  {
    "id": 34,
    "text": "你的感情容易受到伤害",
    "dimension": "人际关系敏感"
  },
  {
    "id": 35,
    "text": "旁人能知道你的私下想法",
    "dimension": "精神病性"
  },
  {
    "id": 36,
    "text": "感到别人不理解你、不同情你",
    "dimension": "人际关系敏感"
  },
  {
    "id": 37,
    "text": "感到人们对你不友好、不喜欢你",
    "dimension": "人际关系敏感"
  },
  {
    "id": 38,
    "text": "做事必须做得很慢以保证做得正确",
    "dimension": "强迫症状"
  },
  {
    "id": 39,
    "text": "心跳得很厉害",
    "dimension": "焦虑"
  },
  {
    "id": 40,
    "text": "恶心或胃部不舒服",
    "dimension": "躯体化"
  },
  {
    "id": 41,
    "text": "感到比不上他人",
    "dimension": "人际关系敏感"
  },
  {
    "id": 42,
    "text": "肌肉酸痛",
    "dimension": "躯体化"
  },
  {
    "id": 43,
    "text": "感到有人在监视你、谈论你",
    "dimension": "偏执"
  },
  {
    "id": 44,
    "text": "难以入睡",
    "dimension": "其他（睡眠与饮食）"
  },
  {
    "id": 45,
    "text": "做事必须反复检查",
    "dimension": "强迫症状"
  },
  {
    "id": 46,
    "text": "难以作出决定",
    "dimension": "强迫症状"
  },
  {
    "id": 47,
    "text": "怕乘电车、公共汽车、地铁或火车",
    "dimension": "恐怖"
  },
  {
    "id": 48,
    "text": "呼吸有困难",
    "dimension": "躯体化"
  },
  {
    "id": 49,
    "text": "一阵阵发冷或发热",
    "dimension": "躯体化"
  },
  {
    "id": 50,
    "text": "因为感到害怕而避开某些东西、场合或活动",
    "dimension": "恐怖"
  },
  {
    "id": 51,
    "text": "脑子变空了",
    "dimension": "强迫症状"
  },
  {
    "id": 52,
    "text": "身体发麻或刺痛",
    "dimension": "躯体化"
  },
  {
    "id": 53,
    "text": "喉咙有梗塞感",
    "dimension": "躯体化"
  },
  {
    "id": 54,
    "text": "感到前途没有希望",
    "dimension": "抑郁"
  },
  {
    "id": 55,
    "text": "不能集中注意力",
    "dimension": "强迫症状"
  },
  {
    "id": 56,
    "text": "感到身体的某一部分软弱无力",
    "dimension": "躯体化"
  },
  {
    "id": 57,
    "text": "感到紧张或容易紧张",
    "dimension": "焦虑"
  },
  {
    "id": 58,
    "text": "感到手或脚发重",
    "dimension": "躯体化"
  },
  {
    "id": 59,
    "text": "想到死亡的事",
    "dimension": "其他（睡眠与饮食）"
  },
  {
    "id": 60,
    "text": "吃得太多",
    "dimension": "其他（睡眠与饮食）"
  },
  {
    "id": 61,
    "text": "当别人看着你或谈论你时感到不自在",
    "dimension": "人际关系敏感"
  },
  {
    "id": 62,
    "text": "有一些不属于你自己的想法",
    "dimension": "精神病性"
  },
  {
    "id": 63,
    "text": "有想打人或伤害他人的冲动",
    "dimension": "敌对"
  },
  {
    "id": 64,
    "text": "醒得太早",
    "dimension": "其他（睡眠与饮食）"
  },
  {
    "id": 65,
    "text": "必须反复洗手、点数或触摸某些东西",
    "dimension": "强迫症状"
  },
  {
    "id": 66,
    "text": "睡得不稳不深",
    "dimension": "其他（睡眠与饮食）"
  },
  {
    "id": 67,
    "text": "有想摔坏或破坏东西的冲动",
    "dimension": "敌对"
  },
  {
    "id": 68,
    "text": "有一些别人没有的想法或念头",
    "dimension": "偏执"
  },
  {
    "id": 69,
    "text": "感到对别人神经过敏",
    "dimension": "人际关系敏感"
  },
  {
    "id": 70,
    "text": "在商店或电影院等人多的地方感到不自在",
    "dimension": "恐怖"
  },
  {
    "id": 71,
    "text": "感到任何事情都很困难",
    "dimension": "抑郁"
  },
  {
    "id": 72,
    "text": "一阵阵恐惧或惊恐",
    "dimension": "焦虑"
  },
  {
    "id": 73,
    "text": "感到在公共场合吃东西很不舒服",
    "dimension": "人际关系敏感"
  },
  {
    "id": 74,
    "text": "经常与人争论",
    "dimension": "敌对"
  },
  {
    "id": 75,
    "text": "单独一人时神经很紧张",
    "dimension": "恐怖"
  },
  {
    "id": 76,
    "text": "别人对你的成绩没有做出恰当的评价",
    "dimension": "偏执"
  },
  {
    "id": 77,
    "text": "即使和别人在一起也感到孤单",
    "dimension": "精神病性"
  },
  {
    "id": 78,
    "text": "感到坐立不安心神不定",
    "dimension": "焦虑"
  },
  {
    "id": 79,
    "text": "感到自己没有什么价值",
    "dimension": "抑郁"
  },
  {
    "id": 80,
    "text": "感到熟悉的东西变成陌生或不像是真的",
    "dimension": "焦虑"
  },
  {
    "id": 81,
    "text": "大叫或摔东西",
    "dimension": "敌对"
  },
  {
    "id": 82,
    "text": "害怕会在公共场所昏倒",
    "dimension": "恐怖"
  },
  {
    "id": 83,
    "text": "感到别人想占你的便宜",
    "dimension": "偏执"
  },
  {
    "id": 84,
    "text": "为一些有关性的想法而很苦恼",
    "dimension": "精神病性"
  },
  {
    "id": 85,
    "text": "你认为应该因为自己的过错而受到惩罚",
    "dimension": "精神病性"
  },
  {
    "id": 86,
    "text": "感到要很快把事情做完",
    "dimension": "焦虑"
  },
  {
    "id": 87,
    "text": "感到自己的身体有严重问题",
    "dimension": "精神病性"
  },
  {
    "id": 88,
    "text": "从未感到和其他人很亲近",
    "dimension": "精神病性"
  },
  {
    "id": 89,
    "text": "感到自己有罪",
    "dimension": "其他（睡眠与饮食）"
  },
  {
    "id": 90,
    "text": "感到自己的脑子有毛病",
    "dimension": "精神病性"
  }
],
  scoring: {
    method: 'mean_subscale',
    primaryMetricLabel: '总症状指数 (GSI)',
    primaryMetricUnit: '分',
    minScore: 1.0,
    maxScore: 5.0,
    levels: [
      {
        label: '正常范围',
        type: 'normal',
        badgeClass: 'badge-success',
        min: 0,
        max: 1.49,
        summary: '您的整体心理健康状况良好，各维度指标均处于健康基线范围。保持规律的作息与积极的心态即可。',
        advice: [
          '保持良好的生活节律与睡眠卫生',
          '坚持规律的有氧运动',
          '正念练习与腹式深呼吸'
        ]
      },
      {
        label: '轻度症状',
        type: 'mild',
        badgeClass: 'badge-info',
        min: 1.5,
        max: 1.99,
        summary: '总症状指数呈现轻度波动，表明近期可能存在一定的心身压力或情绪起伏，建议适当安排休息放松，关注自身情绪变化。',
        advice: [
          '适当安排休息放松',
          '关注自身情绪变化',
          '与信任的人倾诉'
        ]
      },
      {
        label: '中度症状',
        type: 'moderate',
        badgeClass: 'badge-warning',
        min: 2.0,
        max: 2.49,
        summary: '总症状指数处于中等水平，某些心理维度可能对日常生活造成了一定困扰，建议重视自我调节并考虑专业心理咨询。',
        advice: [
          '考虑专业心理咨询支持',
          '科学调节日常工作节律',
          '正念练习与腹式深呼吸'
        ]
      },
      {
        label: '重度症状',
        type: 'severe',
        badgeClass: 'badge-danger',
        min: 2.5,
        max: 5.0,
        summary: '总症状指数偏高，多个维度存在较显著的困扰或精神负担。强烈建议您向专业精神科医师或资深心理咨询师寻求一对一的面谈评估。',
        advice: [
          '及时寻求专业就医与干预',
          '建立社会安全支持系统',
          '不要独自隐忍痛苦'
        ]
      }
    ],
    dimensions: [
      { name: '躯体化', desc: '反映主观身体不适感，包括心血管、胃肠道、呼吸等系统的主诉及头痛、肌肉酸痛等。', items: [1, 4, 12, 27, 40, 42, 48, 49, 52, 53, 56, 58] },
      { name: '强迫症状', desc: '反映难以摆脱的无意义想法、冲动、不必要的行为及注意力难以集中等。', items: [3, 9, 10, 28, 38, 45, 46, 51, 55, 65] },
      { name: '人际关系敏感', desc: '反映在人际交往中的不自在、自卑感、消极期待和被害感受等。', items: [6, 21, 34, 36, 37, 41, 61, 69, 73] },
      { name: '抑郁', desc: '反映苦闷、悲观、动力缺乏、绝望感及对生活兴趣减退等情绪状态。', items: [5, 14, 15, 20, 22, 26, 29, 30, 31, 32, 54, 56, 71, 79] },
      { name: '焦虑', desc: '反映精神紧张、神经过敏、坐立不安及伴随的植物神经兴奋体验。', items: [2, 17, 23, 33, 39, 57, 72, 78, 80, 86] },
      { name: '敌对', desc: '反映愤怒情绪、攻击冲动、摔打行为及不可遏制的争论。', items: [11, 24, 63, 67, 74, 81] },
      { name: '恐怖', desc: '反映对空旷、公共场所、交通工具或社交拥挤的病理性害怕与回避。', items: [13, 25, 47, 50, 70, 75, 82] },
      { name: '偏执', desc: '反映多疑、被害妄想、责怪他人、敌对猜疑等思维特质。', items: [8, 18, 43, 68, 76, 83] },
      { name: '精神病性', desc: '反映思维被控、幻听幻觉、孤立隔绝以及怪异思维等体验。', items: [7, 16, 35, 62, 77, 84, 85, 87, 88, 90] },
      { name: '其他（睡眠与饮食）', desc: '反映睡眠障碍（入睡难、易醒、早醒）及饮食异常等基本生理机能状态。', items: [19, 44, 59, 60, 64, 66, 89] }
    ]
  }
};

export default SCL90;
