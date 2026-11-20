// Vendored from PSYMETRA (js/engine.js, js/assessments/*.js) on 2026-11-12.
// Scoring logic is copied verbatim; only export shims changed. Do not "improve" numbers here.

/**
 * PSYMETRA - SDS Assessment Definition
 * 抑郁自评量表 (Self-Rating Depression Scale)
 */

const SDS = {
  meta: {
    id: 'sds',
    name: 'SDS',
    fullName: '抑郁自评量表',
    englishName: 'Self-Rating Depression Scale',
    category: '抑郁评估',
    targetGroups: ['成人', '老年人', '临床患者', '心理健康体检人群'],
    description: '由William W.K. Zung编制的经典心理测量量表，包含正反向评分题，全面评估精神性情感、躯体障碍及精神运动障碍。',
    instructions: '请仔细阅读每一条，并根据您最近一周以来的实际感觉，选择最符合您情况的一项。所有题目无对错之分。',
    duration: 5,
    timeframe: '最近一周',
    references: {
      original: [
        'Zung, W.W.K. (1965). A self-rating depression scale. Archives of General Psychiatry, 12(1), 63-70.'
      ],
      chineseValidation: [
        '张明园. (1990). 精神科评定量表手册. 长沙: 湖南科技出版社.'
      ]
    }
  },
  defaultOptions: [
    { label: '很少或没有', value: 1, desc: '没有或很少时间有此感觉' },
    { label: '有时', value: 2, desc: '小部分时间有此感觉' },
    { label: '大部分时间', value: 3, desc: '相当多时间有此感觉' },
    { label: '绝大部分时间', value: 4, desc: '绝大部分或全部时间' }
  ],
  questions: [
  {
    "id": 1,
    "text": "我感到情绪沮丧、郁闷",
    "reversed": false
  },
  {
    "id": 2,
    "text": "我早晨心情最好",
    "reversed": true
  },
  {
    "id": 3,
    "text": "我要哭或想哭",
    "reversed": false
  },
  {
    "id": 4,
    "text": "我夜间睡眠不好",
    "reversed": false
  },
  {
    "id": 5,
    "text": "我吃饭像平时一样多",
    "reversed": true
  },
  {
    "id": 6,
    "text": "我的性功能正常",
    "reversed": true
  },
  {
    "id": 7,
    "text": "我感到体重减轻",
    "reversed": false
  },
  {
    "id": 8,
    "text": "我为便秘烦恼",
    "reversed": false
  },
  {
    "id": 9,
    "text": "我的心跳比平时快",
    "reversed": false
  },
  {
    "id": 10,
    "text": "我无故感到疲劳",
    "reversed": false
  },
  {
    "id": 11,
    "text": "我的头脑跟平时一样清楚",
    "reversed": true
  },
  {
    "id": 12,
    "text": "我做我习惯做的事情没有困难",
    "reversed": true
  },
  {
    "id": 13,
    "text": "我坐卧不安，难以保持平静",
    "reversed": false
  },
  {
    "id": 14,
    "text": "我对未来感到有希望",
    "reversed": true
  },
  {
    "id": 15,
    "text": "我比平时更容易激怒",
    "reversed": false
  },
  {
    "id": 16,
    "text": "我觉得做决定是容易的",
    "reversed": true
  },
  {
    "id": 17,
    "text": "我感到自己是有用和不可缺少的人",
    "reversed": true
  },
  {
    "id": 18,
    "text": "我的生活很有意义",
    "reversed": true
  },
  {
    "id": 19,
    "text": "假若我死了别人会过得更好",
    "reversed": false
  },
  {
    "id": 20,
    "text": "我仍旧喜爱自己平时喜爱的东西",
    "reversed": true
  }
],
  scoring: {
    method: 'weighted_standard',
    standardScoreFormula: { multiply: 1.25, round: true },
    primaryMetricLabel: 'SDS 标准分',
    primaryMetricUnit: '分',
    minScore: 25,
    maxScore: 100,
    levels: [
      {
        label: '正常',
        type: 'normal',
        badgeClass: 'badge-success',
        min: 0,
        max: 52,
        summary: '您的抑郁标准分处于正常健康基线范围，心态较为积极开朗，具备良好的心理韧性。',
        advice: [
          '保持良好的生活节律与睡眠卫生',
          '坚持规律的有氧运动',
          '培养积极的兴趣爱好'
        ]
      },
      {
        label: '轻度抑郁',
        type: 'mild',
        badgeClass: 'badge-info',
        min: 53,
        max: 62,
        summary: '标准分处于轻度抑郁区间（53-62分），反映近期可能承受情绪压抑或生活事件压力。建议及时排解压力，建立生活节奏，增加愉悦性活动。',
        advice: [
          '适度安排休息放松，减轻负担',
          '增加户外散步与阳光接触',
          '与亲朋好友坦诚沟通近期困扰'
        ]
      },
      {
        label: '中度抑郁',
        type: 'moderate',
        badgeClass: 'badge-warning',
        min: 63,
        max: 72,
        summary: '标准分处于中度抑郁范围（63-72分），表明心境抑郁对日常社会生活已造成明显负担，建议前往心理咨询中心或专科门诊进行心理疏导或综合治疗。',
        advice: [
          '考虑专业心理咨询支持',
          '科学调节日常工作节律',
          '关注睡眠节律与躯体反应'
        ]
      },
      {
        label: '重度抑郁',
        type: 'severe',
        badgeClass: 'badge-danger',
        min: 73,
        max: 100,
        summary: '标准分高于72分，提示存在重度抑郁状态。患者往往伴随严重的无助感、睡眠紊乱及精力衰竭，请尽速寻求正规医疗机构精神心理科医生的专业诊疗。',
        advice: [
          '及时寻求专业精神科就医与干预',
          '建立社会安全支持系统',
          '切勿独自承受痛苦，必要时寻求紧急支持'
        ]
      }
    ]
  }
};

export default SDS;
