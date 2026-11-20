// Vendored from PSYMETRA (js/engine.js, js/assessments/*.js) on 2026-11-12.
// Scoring logic is copied verbatim; only export shims changed. Do not "improve" numbers here.

/**
 * PSYMETRA - GAD-7 Assessment Definition
 * 广泛性焦虑自评量表 (Generalized Anxiety Disorder-7)
 */

const GAD7 = {
  meta: {
    id: 'gad7',
    name: 'GAD-7',
    fullName: '广泛性焦虑自评量表',
    englishName: 'Generalized Anxiety Disorder-7',
    category: '焦虑筛查',
    targetGroups: ['成人', '青少年', '职场人群', '门诊患者'],
    description: '权威且高效的广泛性焦虑障碍筛查量表，用于评估过去两周内的焦虑情绪与紧张状态的频度与程度。',
    instructions: '在过去的两周里，您有多大程度受到以下任何问题的困扰？请根据您的实际体会选择最贴切的选项。',
    duration: 2,
    timeframe: '最近两周',
    references: {
      original: [
        'Spitzer, R.L., Kroenke, K., Williams, J.B.W., & Löwe, B. (2006). A brief measure for assessing generalized anxiety disorder. Archives of Internal Medicine, 166, 1092-1097.'
      ],
      chineseValidation: [
        'He, X.Y., et al. (2010). A fast, simple screening tool to identify young students who are at risk for generalized anxiety disorder: A validation study. PLOS ONE.'
      ]
    }
  },
  defaultOptions: [
    { label: '完全不会', value: 0, desc: '没有或几乎没有' },
    { label: '好几天', value: 1, desc: '有几天出现过' },
    { label: '超过一周', value: 2, desc: '一半以上的天数' },
    { label: '几乎每天', value: 3, desc: '几乎天天受到困扰' }
  ],
  questions: [
  {
    "id": 1,
    "text": "感到不安、担心及烦躁"
  },
  {
    "id": 2,
    "text": "不能停止或控制担心"
  },
  {
    "id": 3,
    "text": "对各种各样的事情担心过多"
  },
  {
    "id": 4,
    "text": "很紧张，很难放松下来"
  },
  {
    "id": 5,
    "text": "非常焦躁，以致难以静下来"
  },
  {
    "id": 6,
    "text": "变得容易烦恼或易怒"
  },
  {
    "id": 7,
    "text": "感到好像有什么可怕的事会发生"
  }
],
  scoring: {
    method: 'sum',
    primaryMetricLabel: 'GAD-7 焦虑总分',
    primaryMetricUnit: '分',
    minScore: 0,
    maxScore: 21,
    levels: [
      {
        label: '无焦虑',
        type: 'normal',
        badgeClass: 'badge-success',
        min: 0,
        max: 4,
        summary: '您的焦虑水平处于正常范围，情绪较为安宁稳定，能够有效应对近期的日常生活挑战。',
        advice: [
          '保持规律的作息节奏',
          '坚持适度有氧运动',
          '维持良好的身心放松习惯'
        ]
      },
      {
        label: '轻度焦虑',
        type: 'mild',
        badgeClass: 'badge-info',
        min: 5,
        max: 9,
        summary: '存在轻度焦虑情绪，常见于工作忙碌或应激期。建议合理规划日常节奏，减少咖啡因摄入，多参与适度的有氧运动。',
        advice: [
          '合理安排工作与休息时间',
          '减少咖啡因与刺激物摄入',
          '每天练习10-15分钟深呼吸放松'
        ]
      },
      {
        label: '中度焦虑',
        type: 'moderate',
        badgeClass: 'badge-warning',
        min: 10,
        max: 14,
        summary: '测试显示存在中度焦虑水平，过多的担忧和身体紧绷感可能正在消耗您的精力。建议练习深呼吸、渐进式肌肉放松，并考虑咨询心理咨询师。',
        advice: [
          '尝试渐进式肌肉放松与腹式呼吸',
          '考虑寻求专业心理咨询支持',
          '建立担忧时间窗口，避免全天反刍'
        ]
      },
      {
        label: '重度焦虑',
        type: 'severe',
        badgeClass: 'badge-danger',
        min: 15,
        max: 21,
        summary: '测试得分表明您正经历明显的重度焦虑体验，可能伴随心悸、肌肉紧绷或不可控的担忧，显著影响生活质量。强烈建议前往心理或精神专科寻求系统性评估与治疗支持。',
        advice: [
          '尽快前往精神心理科就医评估',
          '在信任亲友陪伴下寻求支持',
          '避免独自承担过重的生活或工作负担'
        ]
      }
    ]
  }
};

export default GAD7;
