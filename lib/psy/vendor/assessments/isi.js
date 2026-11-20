// Vendored from PSYMETRA (js/engine.js, js/assessments/*.js) on 2026-11-12.
// Scoring logic is copied verbatim; only export shims changed. Do not "improve" numbers here.

/**
 * PSYMETRA - ISI Assessment Definition
 * 失眠严重程度指数量表 (Insomnia Severity Index, ISI)
 * 国际睡眠医学与认知行为疗法 (CBT-I) 金标准自评工具 (Morin et al., 1993, 2001)
 */

const ISI = {
  meta: {
    id: 'isi',
    name: 'ISI',
    fullName: '失眠严重程度指数',
    englishName: 'Insomnia Severity Index',
    category: '睡眠质量',
    targetGroups: ['成年人', '受入睡困难困扰人群', '多梦早醒人群', '日间疲乏困顿人群'],
    description: '由国际知名睡眠心理学学者 Charles Morin 教授编制的权威失眠自评量表。评估过去两周内入睡困难、维持睡眠困难、早醒、睡眠满意度及日间功能损害程度。',
    instructions: '请评估在【过去的两周内】您的睡眠问题严重程度。请根据您的实际感受选择最贴切的选项。',
    duration: 2,
    timeframe: '过去两周',
    references: {
      original: [
        'Morin, C. M., Belleville, G., Bélanger, L., & Ivers, H. (2011). The Insomnia Severity Index: psychometric indicators to detect insomnia cases and evaluate treatment response. Sleep, 34(5), 601-608.'
      ],
      chineseValidation: [
        '潘集阳, 等. (2010). 失眠严重程度指数 (ISI) 中文版的信度与效度评估. 中华行为医学与脑科学杂志.'
      ]
    }
  },
  defaultOptions: [
    { label: '没有', value: 0, desc: '完全无此困扰' },
    { label: '轻度', value: 1, desc: '轻微发生，影响较小' },
    { label: '中度', value: 2, desc: '中等程度，感到一定困难' },
    { label: '重度', value: 3, desc: '相当严重，频繁出现' },
    { label: '极重度', value: 4, desc: '极其严重，几乎每晚发生' }
  ],
  questions: [
    {
      id: 1,
      text: '入睡困难（躺下后难以入睡，辗转反侧）的严重程度：',
      dimension: '夜间睡眠症状'
    },
    {
      id: 2,
      text: '维持睡眠困难（半夜容易醒来，且醒后难以再次入睡）的严重程度：',
      dimension: '夜间睡眠症状'
    },
    {
      id: 3,
      text: '早醒问题（清晨过早醒来，无法再睡着）的严重程度：',
      dimension: '夜间睡眠症状'
    },
    {
      id: 4,
      text: '您对自己目前的睡眠模式有多满意/不满意？',
      dimension: '睡眠满意度与苦恼',
      options: [
        { label: '非常满意', value: 0, desc: '睡眠质量优秀' },
        { label: '比较满意', value: 1, desc: '偶有小波动但总体满意' },
        { label: '中度不满', value: 2, desc: '存在一定不满意感' },
        { label: '很不满意', value: 3, desc: '对当前睡眠模式相当失望' },
        { label: '极度不满', value: 4, desc: '对睡眠彻底绝望与痛苦' }
      ]
    },
    {
      id: 5,
      text: '您认为您的睡眠问题在多大程度上影响了您的日常日间功能（例如日间疲劳、工作效率、注意力、情绪等）？',
      dimension: '日间功能损害',
      options: [
        { label: '完全没有', value: 0, desc: '精力充沛，毫无影响' },
        { label: '轻度影响', value: 1, desc: '偶尔感到些许疲倦' },
        { label: '中度影响', value: 2, desc: '白天注意力与精力明显下降' },
        { label: '严重影响', value: 3, desc: '工作生活效率大幅受损' },
        { label: '极度影响', value: 4, desc: '完全无法维持正常日常功能' }
      ]
    },
    {
      id: 6,
      text: '在生活质量方面，您认为身边的其他人注意到了您的睡眠问题给您带来的不良影响吗？',
      dimension: '日间功能损害',
      options: [
        { label: '完全没有', value: 0, desc: '他人完全看不出任何异样' },
        { label: '稍微察觉', value: 1, desc: '偶尔有人问及气色' },
        { label: '明显察觉', value: 2, desc: '亲友或同事注意到疲态' },
        { label: '相当显著', value: 3, desc: '别人频繁关注并担忧' },
        { label: '极度明显', value: 4, desc: '睡眠障碍已经对人际造成重大冲击' }
      ]
    },
    {
      id: 7,
      text: '您对目前存在的睡眠问题感到多么担心或苦恼？',
      dimension: '睡眠满意度与苦恼',
      options: [
        { label: '完全没有', value: 0, desc: '毫无心理负担' },
        { label: '稍有担心', value: 1, desc: '偶尔产生轻微焦虑' },
        { label: '有些苦恼', value: 2, desc: '开始对晚上入睡感到压力' },
        { label: '相当苦恼', value: 3, desc: '白天反复焦虑晚上的睡眠' },
        { label: '极度苦恼', value: 4, desc: '形成严重的睡眠恐惧与心身耗竭' }
      ]
    }
  ],
  scoring: {
    method: 'sum',
    primaryMetricLabel: 'ISI 失眠严重程度总分',
    primaryMetricUnit: '分',
    minScore: 0,
    maxScore: 28,
    levels: [
      {
        label: '无临床显著失眠 (睡眠良好)',
        type: 'normal',
        badgeClass: 'badge-success',
        min: 0,
        max: 7,
        summary: '您的自评得分处于健康无失眠常模范围（0-7分）。未表现出具有临床意义的入睡或维持睡眠困难，睡眠能够充分提供心身生理修复。',
        advice: [
          '继续保持规律的昼夜就寝节奏',
          '维持良好的睡眠卫生习惯，睡前减少手机屏幕蓝光暴露'
        ]
      },
      {
        label: '轻度失眠 (亚临床/阈下状态)',
        type: 'mild',
        badgeClass: 'badge-info',
        min: 8,
        max: 14,
        summary: '存在轻度或阈下失眠表现（8-14分）。可能在面临生活压力或作息紊乱时体验到入睡延迟或夜醒，但尚未造成严重长期的日间功能瘫痪。',
        advice: [
          '实行刺激控制疗法：若在床上翻来覆去超过20分钟无法入睡，建议起床到昏暗柔和环境下静坐，待有困意再回床',
          '固定早晨起床时间，无论前一晚何时入睡，避免周末剧烈补觉导致生物钟紊乱',
          '下午3点后避免摄入含咖啡因饮料'
        ]
      },
      {
        label: '中度临床失眠 (建议专业干预)',
        type: 'moderate',
        badgeClass: 'badge-warning',
        min: 15,
        max: 21,
        summary: '您的得分达到了中度临床失眠标准（15-21分）。失眠问题可能已频繁出现并伴随显著的日间疲乏、注意力分散及情绪烦躁，符合失眠障碍的临床筛查指征。',
        advice: [
          '建议前往医院睡眠医学中心或心理科门诊就诊',
          '了解并尝试失眠的认知行为治疗 (CBT-I)，这是国际医学界公认的非药物首选一线疗法',
          '记录连续两周的《睡眠日记》，客观记录躺床时间、入睡潜伏期及夜醒次数'
        ]
      },
      {
        label: '重度临床失眠 (需尽快就医)',
        type: 'severe',
        badgeClass: 'badge-danger',
        min: 22,
        max: 28,
        summary: '您的自评总分高度显著（22-28分），提示存在极严重的慢性临床失眠。长期严重的睡眠剥夺会对心血管、代谢及免疫系统构成严峻挑战，强烈建议尽快寻求专业医疗支持。',
        advice: [
          '强烈建议尽快前往正规医院精神心理科或睡眠障碍专科接受系统诊断',
          '切忌自行网购或擅自过量服用镇静催眠类药物，须在执业医师指导下规范用药',
          '评估是否合并存在焦虑症、抑郁症或睡眠呼吸暂停综合征 (OSA)'
        ]
      }
    ],
    dimensions: [
      {
        name: '夜间睡眠症状',
        desc: '评估入睡困难、维持睡眠困难（半夜易醒）及早醒等核心夜间睡眠生理表现。',
        items: [1, 2, 3]
      },
      {
        name: '睡眠满意与苦恼',
        desc: '评估主观睡眠质量满意度以及对睡眠问题的担忧、焦虑和心理压力水平。',
        items: [4, 7]
      },
      {
        name: '日间功能损害',
        desc: '评估睡眠不足对白天精力、工作学习效率、情绪控制及日常人际生活质量的妨碍。',
        items: [5, 6]
      }
    ]
  }
};

export default ISI;
