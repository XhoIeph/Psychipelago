// Vendored from PSYMETRA (js/engine.js, js/assessments/*.js) on 2026-11-12.
// Scoring logic is copied verbatim; only export shims changed. Do not "improve" numbers here.

/**
 * PSYMETRA - SAS Assessment Definition
 * 焦虑自评量表 (Self-Rating Anxiety Scale)
 */

const SAS = {
  meta: {
    id: 'sas',
    name: 'SAS',
    fullName: '焦虑自评量表',
    englishName: 'Self-Rating Anxiety Scale',
    category: '焦虑评估',
    targetGroups: ['成人', '青少年', '职场人群', '焦虑倾向筛查人群'],
    description: '由William W.K. Zung编制的用于评定焦虑主观感受的心理量表，具有较高的信度和效度，广泛用于临床及心理科研。',
    instructions: '请根据您最近一周的实际感受，仔细阅读每一题并作出客观评价，不要受到他人看法的影响。',
    duration: 5,
    timeframe: '最近一周',
    references: {
      original: [
        'Zung, W.W.K. (1971). A rating instrument for anxiety disorders. Psychosomatics, 12(6), 371-379.'
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
    "text": "我感到比往常更加神经过敏和焦虑",
    "reversed": false
  },
  {
    "id": 2,
    "text": "我无缘无故地感到害怕",
    "reversed": false
  },
  {
    "id": 3,
    "text": "我容易心烦意乱或感到惊恐",
    "reversed": false
  },
  {
    "id": 4,
    "text": "我感到我的身体好像被分成几块，支离破碎",
    "reversed": false
  },
  {
    "id": 5,
    "text": "我感到事事都很顺利，不会有倒霉的事情发生",
    "reversed": true
  },
  {
    "id": 6,
    "text": "我的四肢抖动和震颤",
    "reversed": false
  },
  {
    "id": 7,
    "text": "我因头痛、颈痛和背痛而烦恼",
    "reversed": false
  },
  {
    "id": 8,
    "text": "我感到无力且容易疲劳",
    "reversed": false
  },
  {
    "id": 9,
    "text": "我感到很平静，能安静坐下来",
    "reversed": true
  },
  {
    "id": 10,
    "text": "我感到我的心跳很快",
    "reversed": false
  },
  {
    "id": 11,
    "text": "我因阵阵眩晕而不舒服",
    "reversed": false
  },
  {
    "id": 12,
    "text": "我有阵阵要晕倒的感觉",
    "reversed": false
  },
  {
    "id": 13,
    "text": "我呼气吸气都感到很容易",
    "reversed": true
  },
  {
    "id": 14,
    "text": "我的手指和脚趾感到麻木和刺痛",
    "reversed": false
  },
  {
    "id": 15,
    "text": "我因胃痛和消化不良而苦恼",
    "reversed": false
  },
  {
    "id": 16,
    "text": "我必须时常排尿",
    "reversed": false
  },
  {
    "id": 17,
    "text": "我的手总是温暖而干燥",
    "reversed": true
  },
  {
    "id": 18,
    "text": "我觉得脸发烧发红",
    "reversed": false
  },
  {
    "id": 19,
    "text": "我容易入睡，晚上休息很好",
    "reversed": true
  },
  {
    "id": 20,
    "text": "我做噩梦",
    "reversed": false
  }
],
  scoring: {
    method: 'weighted_standard',
    standardScoreFormula: { multiply: 1.25, round: true },
    primaryMetricLabel: 'SAS 标准分',
    primaryMetricUnit: '分',
    minScore: 25,
    maxScore: 100,
    levels: [
      {
        label: '正常',
        type: 'normal',
        badgeClass: 'badge-success',
        min: 0,
        max: 49,
        summary: '您的焦虑标准分处于健康常模范围内，身心处于平衡状态，自主神经调节功能良好。',
        advice: [
          '保持良好的作息与运动习惯',
          '保持规律的生活节律',
          '维护平衡的心理状态'
        ]
      },
      {
        label: '轻度焦虑',
        type: 'mild',
        badgeClass: 'badge-info',
        min: 50,
        max: 59,
        summary: '标准分处于轻度焦虑水平（50-59分），可能受到近期现实压力事件影响，建议多进行有氧锻炼，调整工作生活平衡。',
        advice: [
          '合理安排作息，避免连续高压作业',
          '每天进行适度有氧锻炼或散步',
          '练习深呼吸或正念冥想以平缓神经系统'
        ]
      },
      {
        label: '中度焦虑',
        type: 'moderate',
        badgeClass: 'badge-warning',
        min: 60,
        max: 69,
        summary: '标准分处于中度焦虑水平（60-69分），反映您近期存在较明显的紧张、神经紧绷或身体不适，建议采取放松训练、规律作息，并可咨询心理医师。',
        advice: [
          '考虑寻求专业心理咨询支持',
          '开展渐进式肌肉放松训练',
          '减少咖啡因、浓茶等交感神经兴奋物摄入'
        ]
      },
      {
        label: '重度焦虑',
        type: 'severe',
        badgeClass: 'badge-danger',
        min: 70,
        max: 100,
        summary: '标准分达重度焦虑水平（≥70分），提示强烈的躯体性紧张或心理恐慌反应，对工作生活影响显著。建议立即前往专业心理机构进行临床干预与诊治。',
        advice: [
          '立即就医或前往专科医院心理门诊评估',
          '让信任的家人或朋友陪同就医',
          '避免独自承受躯体化惊恐体验'
        ]
      }
    ]
  }
};

export default SAS;
