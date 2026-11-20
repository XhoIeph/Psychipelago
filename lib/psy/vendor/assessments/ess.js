// Vendored from PSYMETRA (js/engine.js, js/assessments/*.js) on 2026-11-12.
// Scoring logic is copied verbatim; only export shims changed. Do not "improve" numbers here.

/**
 * PSYMETRA - ESS Assessment Definition
 * 爱泼沃斯嗜睡量表 (Epworth Sleepiness Scale, ESS)
 * 国际睡眠医学评估日间过度嗜睡 (EDS) 与睡眠呼吸暂停 (OSAHS) 金标准工具 (Johns, 1991)
 */

const ESS = {
  meta: {
    id: 'ess',
    name: 'ESS',
    fullName: '爱泼沃斯嗜睡量表',
    englishName: 'Epworth Sleepiness Scale',
    category: '睡眠质量',
    targetGroups: ['成年人', '日间严重犯困人群', '夜间打鼾/憋气人群', '疑似睡眠呼吸暂停患者', '高风险职业驾驶员'],
    description: '由澳大利亚睡眠医学专家 Murray Johns 博士编制的经典自评量表。专门评估受试者在 8 种不同日常情境下的日间嗜睡倾向，是临床筛查日间过度嗜睡 (EDS) 及睡眠呼吸暂停综合征 (OSAHS) 的核心测量标准。',
    instructions: '请评估您在近期日常生活中，身处下列不同情境时【打瞌睡或睡着】的可能性有多大（不仅仅是感到疲劳）。如果您近期未经历过某种情况，请根据以往经验估算您身处其中时的可能反应。',
    duration: 2,
    timeframe: '近期日常生活'
  },
  defaultOptions: [
    { label: '从不打瞌睡', value: 0, desc: '完全不可能睡着，始终保持清醒' },
    { label: '轻度可能', value: 1, desc: '偶尔可能打瞌睡，发生几率较低' },
    { label: '中度可能', value: 2, desc: '有相当大可能打瞌睡或小睡' },
    { label: '高度可能', value: 3, desc: '几乎必然会打瞌睡或直接睡着' }
  ],
  questions: [
    {
      id: 1,
      text: '坐着阅读书报、手机或平板电脑时',
      dimension: '被动静态情境'
    },
    {
      id: 2,
      text: '坐着看电视或看电影时',
      dimension: '被动静态情境'
    },
    {
      id: 3,
      text: '在公共场所静坐不动时（例如在剧院、报告厅、会议室或听讲座时）',
      dimension: '被动静态情境'
    },
    {
      id: 4,
      text: '作为乘客乘车（如汽车、高铁或大巴），连续乘坐1小时以上且中途不停车时',
      dimension: '被动静态情境'
    },
    {
      id: 5,
      text: '在环境和时间允许的情况下，下午躺下休息时',
      dimension: '放松休整情境'
    },
    {
      id: 6,
      text: '坐着与他人面对面交谈或聊天时',
      dimension: '主动交互警觉情境'
    },
    {
      id: 7,
      text: '午餐后安静地坐着（在没有饮酒的情况下）',
      dimension: '放松休整情境'
    },
    {
      id: 8,
      text: '开车遇到红绿灯或堵车停下等待数分钟时（或坐车遇严重堵车静止时）',
      dimension: '主动交互警觉情境'
    }
  ],
  scoring: {
    method: 'sum',
    primaryMetricLabel: 'ESS 日间嗜睡总分',
    primaryMetricUnit: '分',
    minScore: 0,
    maxScore: 24,
    levels: [
      {
        label: '正常清醒范围 (日间嗜睡正常)',
        type: 'normal',
        badgeClass: 'badge-success',
        min: 0,
        max: 7,
        summary: '您的自评得分处于健康生理常模区间（0-7分）。在各类日常情境下能保持适度的警觉水平，未见具有临床意义的病理性日间过度嗜睡。',
        advice: [
          '继续保持规律充实的夜间睡眠作息',
          '在午后保持适度活动，避免久坐不动'
        ]
      },
      {
        label: '轻度嗜睡倾向 (常模平均边缘)',
        type: 'mild',
        badgeClass: 'badge-info',
        min: 8,
        max: 9,
        summary: '得分处于人群平均边缘水平（8-9分）。存在轻度嗜睡倾向，多与近期夜间睡眠时长不足、作息不规律或白天疲劳积累相关，尚未达到确诊日间过度嗜睡的阳性界限。',
        advice: [
          '保证每晚 7-8 小时的高质量充足睡眠',
          '中午安排 15-20 分钟的短时间高效午休，避免超过 30 分钟导致睡眠惰性',
          '规律运动，提升白天机体代谢活力'
        ]
      },
      {
        label: '日间过度嗜睡 (达到临床筛查阳性界限)',
        type: 'moderate',
        badgeClass: 'badge-warning',
        min: 10,
        max: 15,
        summary: '您的得分达到了日间过度嗜睡 (EDS) 的临床阳性界限（10-15分，≥ 10分为阳性截断值）。提示白天在多种被动或休息场景下存在不可抗拒的犯困现象，常伴有夜间打鼾、憋气、睡眠片段化或慢性睡眠呼吸障碍。',
        advice: [
          '建议前往医院睡眠医学科或呼吸科门诊接受专业评估',
          '排查是否患有阻塞性睡眠呼吸暂停低通气综合征 (OSAHS)，必要时进行多导睡眠监测 (PSG)',
          '特别注意日间驾车安全，在感觉困倦时严禁长途疲劳驾驶'
        ]
      },
      {
        label: '严重过度嗜睡 (需高度警惕并就医)',
        type: 'severe',
        badgeClass: 'badge-danger',
        min: 16,
        max: 24,
        summary: '您的自评得分处于严重异常偏高区间（16-24分）。甚至可能在与人交谈、用餐或交通等待等需要高度警觉的情境下不由自主地睡着，强烈提示存在重度睡眠呼吸暂停、发作性睡病或严重中枢性嗜睡障碍，具有重大日间安全隐患。',
        advice: [
          '强烈建议立即前往正规三甲医院睡眠障碍诊疗中心就医，接受全夜多导睡眠监测 (PSG) 与多次睡眠潜伏期试验 (MSLT)',
          '严格禁止从事高空作业、机床操作以及机动车驾驶等高危行为',
          '避免独处在危险水域或可能发生摔伤的环境'
        ]
      }
    ],
    dimensions: [
      {
        name: '被动静态情境',
        desc: '评估在阅读、看电视、会议静坐及长途乘车等被动低刺激情境下的嗜睡倾向。',
        items: [1, 2, 3, 4]
      },
      {
        name: '放松休整情境',
        desc: '评估在下午卧床休息与午餐后静坐等生理放松状态下的入睡倾向。',
        items: [5, 7]
      },
      {
        name: '主动交互警觉情境',
        desc: '评估在与他人交谈、红绿灯停车等高警觉高唤起情境下的病理性不可控嗜睡（极具预警意义）。',
        items: [6, 8]
      }
    ]
  }
};

export default ESS;
