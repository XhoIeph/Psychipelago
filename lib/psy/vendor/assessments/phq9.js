// Vendored from PSYMETRA (js/engine.js, js/assessments/*.js) on 2026-11-12.
// Scoring logic is copied verbatim; only export shims changed. Do not "improve" numbers here.

/**
 * PSYMETRA - PHQ-9 Assessment Definition
 * 患者健康问卷抑郁量表 (Patient Health Questionnaire-9)
 */

const PHQ9 = {
  meta: {
    id: 'phq9',
    name: 'PHQ-9',
    fullName: '患者健康问卷抑郁量表',
    englishName: 'Patient Health Questionnaire-9',
    category: '抑郁筛查',
    targetGroups: ['成人', '青少年', '社区人群', '初级卫生保健患者'],
    description: '国际通用的抑郁症状快速筛查与严重度评估量表，基于DSM标准设计，被全球医疗与心理机构广泛使用。',
    instructions: '在过去的两周里，您有多大程度受到以下任何问题的困扰？请根据您的实际体验选择最符合的选项。',
    duration: 3,
    timeframe: '最近两周',
    references: {
      original: [
        'Kroenke, K., Spitzer, R.L., & Williams, J.B.W. (2001). The PHQ-9: Validity of a brief depression severity measure. Journal of General Internal Medicine, 16(9), 606-613.'
      ],
      chineseValidation: [
        '陈华敏, 等. (2016). PHQ-9抑郁症状群量表汉化版在中国的信效度研究. 中国心理卫生杂志, 30(5), 358-362.'
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
    "text": "做事时提不起劲或没有兴趣"
  },
  {
    "id": 2,
    "text": "感到心情低落、沮丧或绝望"
  },
  {
    "id": 3,
    "text": "入睡困难、睡不安稳或睡眠过多"
  },
  {
    "id": 4,
    "text": "感觉疲倦或没有活力"
  },
  {
    "id": 5,
    "text": "食欲不振或吃太多"
  },
  {
    "id": 6,
    "text": "觉得自己很糟，或觉得自己很失败，或让自己或家人失望"
  },
  {
    "id": 7,
    "text": "对事物专注有困难，例如阅读报纸或看电视时"
  },
  {
    "id": 8,
    "text": "动作或说话速度缓慢到别人已经察觉，或正好相反，烦躁或坐立不安、动来动去的情况更胜于平常"
  },
  {
    "id": 9,
    "text": "有不如死掉或用某种方式伤害自己的念头"
  }
],
  scoring: {
    method: 'sum',
    primaryMetricLabel: 'PHQ-9 抑郁总分',
    primaryMetricUnit: '分',
    minScore: 0,
    maxScore: 27,
    levels: [
      {
        label: '无抑郁症状',
        type: 'normal',
        badgeClass: 'badge-success',
        min: 0,
        max: 4,
        summary: '您的情绪状态保持在健康基准内，未表现出明显的抑郁倾向。请继续保持良好的生活节律与社交连接。',
        advice: [
          '保持良好的生活节律与睡眠卫生',
          '坚持规律的有氧运动',
          '保持健康的人际交往与沟通'
        ]
      },
      {
        label: '轻度抑郁',
        type: 'mild',
        badgeClass: 'badge-info',
        min: 5,
        max: 9,
        summary: '存在轻度情绪波动或暂时性的动力减低，多与近期压力或环境变化有关。适度休息、充足睡眠以及户外散步通常能带来显著缓解。',
        advice: [
          '适当安排休息放松',
          '增加户外活动与适度运动',
          '与信任的朋友或家人倾诉'
        ]
      },
      {
        label: '中度抑郁',
        type: 'moderate',
        badgeClass: 'badge-warning',
        min: 10,
        max: 14,
        summary: '测试显示存在中度情绪低落迹象。您可能会感到精力减退或动力不足。建议关注生活作息，适量运动，与可信赖的人倾诉，必要时咨询心理专业人员。',
        advice: [
          '考虑寻求专业心理咨询支持',
          '科学调节日常工作节律',
          '练习正念与情绪觉察'
        ]
      },
      {
        label: '中重度抑郁',
        type: 'moderate-severe',
        badgeClass: 'badge-orange',
        min: 15,
        max: 19,
        summary: '测试提示存在较明显的中重度抑郁情绪，可能已影响到日常学习、工作与社交功能。建议积极寻求专业心理医生或心理治疗师的指导协助。',
        advice: [
          '及时寻求专业精神科就医评估',
          '建立社会安全支持系统',
          '调整日常预期，避免过度自责'
        ]
      },
      {
        label: '重度抑郁',
        type: 'severe',
        badgeClass: 'badge-danger',
        min: 20,
        max: 27,
        summary: '测试得分表明您当前承受着较为严重的抑郁困扰，心身能量消耗明显。建议尽快联系医院心理精神科或专业机构进行深入临床诊断与干预。特别提示：若有自伤念头，请立即联系紧急支持或信任的亲友。',
        advice: [
          '立即就医或联系危机支持热线',
          '请家人或好友全程陪护',
          '切勿独自承受痛苦，寻求医疗帮助'
        ]
      }
    ]
  }
};

export default PHQ9;
