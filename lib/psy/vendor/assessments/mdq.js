// Vendored from PSYMETRA (js/engine.js, js/assessments/*.js) on 2026-11-12.
// Scoring logic is copied verbatim; only export shims changed. Do not "improve" numbers here.

/**
 * PSYMETRA - MDQ Assessment Definition
 * 心境障碍问卷 (The Mood Disorder Questionnaire, MDQ)
 * 国际公认的双相情感障碍金标准筛查量表 (Hirschfeld et al., 2000)
 */

const MDQ = {
  meta: {
    id: 'mdq',
    name: 'MDQ',
    fullName: '心境障碍问卷',
    englishName: 'The Mood Disorder Questionnaire',
    category: '双相/躁狂',
    targetGroups: ['成年人', '情绪波动显著人群', '反复抑郁发作人群', '疑有轻躁狂/躁狂体验人群'],
    description: '由美国精神病学会知名学者 Hirschfeld 编制的双相情感障碍金标准筛查量表，用于识别可能被单相抑郁掩盖的轻躁狂与躁狂发作特征。',
    instructions: '本问卷用于了解您在一生中是否曾经历过一段与平时明显不同的情绪兴奋、高涨或精力过分充沛的时期。请凭第一直觉如实回答。',
    duration: 3,
    timeframe: '一生中经历',
    references: {
      original: [
        'Hirschfeld, R. M., Williams, J. B., Spitzer, R. L., et al. (2000). Development and validation of a screening instrument for bipolar spectrum disorder: the Mood Disorder Questionnaire. American Journal of Psychiatry, 157(11), 1873-1875.'
      ],
      chineseValidation: [
        '张海音, 费立鹏, 等. (2007). 心境障碍问卷 (MDQ) 中文版的信度与效度. 中国心理卫生杂志.'
      ]
    }
  },
  defaultOptions: [
    { label: '否', value: 0, desc: '未经历过此类表现' },
    { label: '是', value: 1, desc: '曾出现过此类表现' }
  ],
  questions: [
    // Part 1: Q1 - Q13 (13 核心躁狂/轻躁狂症状)
    { id: 1, text: '您是否曾有一段时间，感到自己非同寻常地情绪高涨、兴奋，或者感觉太棒了、精力充沛，以至于招致麻烦？', dimension: '精力充沛与过度活跃' },
    { id: 2, text: '您是否曾有一段时间，极其容易被激怒、暴躁，以至于向别人大喊大叫、摔东西或引发争吵？', dimension: '易怒与冲动控制' },
    { id: 3, text: '您是否曾有一段时间，感到空前自信，觉得自己拥有特殊才能或比平时任何时候都更有能力？', dimension: '精力充沛与过度活跃' },
    { id: 4, text: '您是否曾有一段时间，睡眠需求明显减少，即使只睡很少几个小时，醒来依然感觉精力极其充沛？', dimension: '精力充沛与过度活跃' },
    { id: 5, text: '您是否曾有一段时间，比平时话多得多，或者语速飞快，别人根本插不上话？', dimension: '易怒与冲动控制' },
    { id: 6, text: '您是否曾有一段时间，思想在头脑中飞快闪过，思维极度奔跃，无法让脑子静下来？', dimension: '易怒与冲动控制' },
    { id: 7, text: '您是否曾有一段时间，非常容易分心，身旁任何极小的无关动静或杂音都会打断您的思绪？', dimension: '易怒与冲动控制' },
    { id: 8, text: '您是否曾有一段时间，精力异常充沛，不知疲倦，同时展开或试图完成很多项事务？', dimension: '精力充沛与过度活跃' },
    { id: 9, text: '您是否曾有一段时间，比平时活跃得多，频繁社交、给很多人打电话或整夜不睡觉做事情？', dimension: '精力充沛与过度活跃' },
    { id: 10, text: '您是否曾有一段时间，对性的兴趣或冲动比平时明显增加？', dimension: '精力充沛与过度活跃' },
    { id: 11, text: '您是否曾有一段时间，做了很多平时绝不会做的轻率、冒险、追求刺激或冲动的行为？', dimension: '易怒与冲动控制' },
    { id: 12, text: '您是否曾有一段时间，在花钱上大手大脚、挥霍无度，以至于给自己或家庭带来经济困难？', dimension: '易怒与冲动控制' },
    { id: 13, text: '您是否曾有一段时间，您的言谈举止引起了家人、朋友的担忧，或引来了同事、医生、警察的关注？', dimension: '易怒与冲动控制' },

    // Part 2: Q14 (症状共现性)
    {
      id: 14,
      text: '如果上述表现中有两项或两项以上发生在您身上，这些情况是否曾经在【同一时期】内集中出现？',
      dimension: '发作共现性',
      options: [
        { label: '否', value: 0, desc: '未曾集中在同一时期发生' },
        { label: '是', value: 1, desc: '曾在同一时期内集中发生' }
      ]
    },

    // Part 3: Q15 (社会功能受损程度)
    {
      id: 15,
      text: '上述这些状态或行为在多大程度上给您造成了困扰或麻烦（例如导致无法工作、产生家庭矛盾、惹上法律或金钱纠纷）？',
      dimension: '社会功能损害',
      options: [
        { label: '没有问题', value: 0, desc: '未造成明显困扰或不良后果' },
        { label: '轻微问题', value: 1, desc: '产生轻度波折但能自行应对' },
        { label: '中度问题', value: 2, desc: '造成明显的人际/工作/财务麻烦' },
        { label: '严重问题', value: 3, desc: '导致严重生活失序或重大冲突危机' }
      ]
    }
  ],
  scoring: {
    method: 'sum',
    primaryMetricLabel: 'MDQ 核心症状阳性数',
    primaryMetricUnit: '项',
    minScore: 0,
    maxScore: 13,
    levels: [
      {
        label: '非显著双相倾向 (筛查阴性)',
        type: 'normal',
        badgeClass: 'badge-success',
        min: 0,
        max: 4,
        summary: '您的核心轻躁狂/躁狂症状报告处于低位，未呈现双相情感障碍的典型发作特征。若当前存在情绪低落困扰，更偏向单相抑郁或情境性应激。',
        advice: [
          '保持稳定的作息节奏与压力宣泄方式',
          '若偶有情绪起伏，可通过日常情绪日记记录诱发因素'
        ]
      },
      {
        label: '可疑/亚临床双相倾向',
        type: 'mild',
        badgeClass: 'badge-warning',
        min: 5,
        max: 6,
        summary: '您报告了若干项精力高涨、兴奋或冲动行为，但未完全达到临床金标准三联阳性界限（7项阳性+同期发作+中度以上受损）。提示可能存在心境不稳定特质或软双相谱系表现。',
        advice: [
          '关注是否存在“抑郁期”与“兴奋期”交替出现的情绪周期',
          '规律作息，避免熬夜、过量摄入咖啡因等可能诱发节律紊乱的因素',
          '若情绪交替波动影响工作生活，建议向专业心理或精神科医师咨询'
        ]
      },
      {
        label: '双相谱系筛查阳性 (高度提示)',
        type: 'severe',
        badgeClass: 'badge-danger',
        min: 7,
        max: 13,
        summary: '您的自评结果符合国际广泛采用的双相情感障碍筛查阳性标准。您在精力充沛、睡眠需求减少、言语思维加速及冲动行为等方面表现显著，强烈提示存在轻躁狂或躁狂发作史。',
        advice: [
          '强烈建议前往精神专科医院或综合医院心理科进行系统临床访谈与确诊',
          '注意：若当前伴有抑郁表现，务必告知医生曾有上述“精力旺盛/极度兴奋”时期，避免单纯使用抗抑郁药诱发转躁',
          '维持极度规律的昼夜睡眠节律，这是稳定双相心境的关键基石'
        ]
      }
    ],
    dimensions: [
      {
        name: '精力充沛与过度活跃',
        desc: '评估情绪过度高涨、空前自信、少眠而精力充沛、不知疲倦地开展活动及性冲动增加等亢奋特征。',
        items: [1, 3, 4, 8, 9, 10]
      },
      {
        name: '易怒与冲动控制',
        desc: '评估极度暴躁易怒、言语飞快、思维奔逸、极易分心、冒险轻率行为、冲动挥霍及引发社会纠纷。',
        items: [2, 5, 6, 7, 11, 12, 13]
      }
    ]
  }
};

export default MDQ;
