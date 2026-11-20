// Vendored from PSYMETRA (js/engine.js, js/assessments/*.js) on 2026-11-12.
// Scoring logic is copied verbatim; only export shims changed. Do not "improve" numbers here.

/**
 * PSYMETRA - DASS-21 Assessment Definition
 * 抑郁-焦虑-压力量表简版 (Depression Anxiety Stress Scales - 21 Items, DASS-21)
 * 国际临床心理学广泛采用的情绪状态三维评估标准工具 (Lovibond & Lovibond, 1995)
 */

const DASS21 = {
  meta: {
    id: 'dass21',
    name: 'DASS-21',
    fullName: '抑郁-焦虑-压力量表简版',
    englishName: 'Depression Anxiety Stress Scales - 21 Items',
    category: '综合症状',
    targetGroups: ['成年人', '受情绪低落困扰人群', '焦虑紧张人群', '长期承受高压力人群'],
    description: '由 Lovibond 等编制的国际经典情绪三联征评估量表。同时量化抑郁、焦虑和压力三种核心负性情绪维度，清晰区分三者在生理唤起、心境低落与神经紧绷方面的不同表现。',
    instructions: '请评估在【过去的一周内】以下陈述适用于您的程度。请根据您的第一直觉选择最贴切的选项。',
    duration: 4,
    timeframe: '过去一周'
  },
  defaultOptions: [
    { label: '不符合', value: 0, desc: '完全不适用于我，从来没有' },
    { label: '有时符合', value: 1, desc: '部分时间符合，偶尔出现' },
    { label: '经常符合', value: 2, desc: '相当多时间符合，频繁出现' },
    { label: '总是符合', value: 3, desc: '绝大部分时间符合，总是如此' }
  ],
  questions: [
    {
      id: 1,
      text: '我发现自己很难平静下来（心绪难平，难以恢复安静放松状态）',
      dimension: '压力维度'
    },
    {
      id: 2,
      text: '我感到口干舌燥（并非由于饮食或服药引起）',
      dimension: '焦虑维度'
    },
    {
      id: 3,
      text: '我好像一点都无法感受到积极、快乐或愉悦的体验',
      dimension: '抑郁维度'
    },
    {
      id: 4,
      text: '我感到呼吸困难（例如气喘吁吁，甚至在毫无体力消耗时也感到喘不过气）',
      dimension: '焦虑维度'
    },
    {
      id: 5,
      text: '我感到很难主动开始做事情（缺乏动力与意志力启动任何日常任务）',
      dimension: '抑郁维度'
    },
    {
      id: 6,
      text: '我倾向于对事情反应过度或过激（小事容易引发强烈的情绪反弹）',
      dimension: '压力维度'
    },
    {
      id: 7,
      text: '我感到身体有颤抖的感觉（例如双手发抖或肢体颤抖）',
      dimension: '焦虑维度'
    },
    {
      id: 8,
      text: '我感到自己在消耗很多紧张的神经精力（精神长期高度紧绷、处于透支中）',
      dimension: '压力维度'
    },
    {
      id: 9,
      text: '我担心自己可能会陷入恐慌，并在人前出洋相或失控',
      dimension: '焦虑维度'
    },
    {
      id: 10,
      text: '我感到自己对未来没有任何期盼、憧憬或希望',
      dimension: '抑郁维度'
    },
    {
      id: 11,
      text: '我发现自己容易心烦意乱、坐立不安',
      dimension: '压力维度'
    },
    {
      id: 12,
      text: '我感到很难让自己彻底放松下来',
      dimension: '压力维度'
    },
    {
      id: 13,
      text: '我感到心情低落、沮丧和郁闷',
      dimension: '抑郁维度'
    },
    {
      id: 14,
      text: '我无法容忍任何妨碍我继续做事的事情（极易感到不耐烦、暴躁）',
      dimension: '压力维度'
    },
    {
      id: 15,
      text: '我感到自己快要惊恐发作了（突如其来的强烈惊慌与失控感）',
      dimension: '焦虑维度'
    },
    {
      id: 16,
      text: '我对任何事物都提不起热情或兴趣',
      dimension: '抑郁维度'
    },
    {
      id: 17,
      text: '我感到自己作为一个活着的人毫无价值',
      dimension: '抑郁维度'
    },
    {
      id: 18,
      text: '我感到自己容易被触怒或神经过敏',
      dimension: '压力维度'
    },
    {
      id: 19,
      text: '即使在没有剧烈运动的情况下，我也能明显感知到自己的心跳（心率剧增、心慌心悸）',
      dimension: '焦虑维度'
    },
    {
      id: 20,
      text: '我感到毫无由来的害怕、恐惧或恐慌',
      dimension: '焦虑维度'
    },
    {
      id: 21,
      text: '我感到生活毫无意义，毫无生存目标',
      dimension: '抑郁维度'
    }
  ],
  scoring: {
    method: 'sum',
    primaryMetricLabel: 'DASS-21 情绪综合总分',
    primaryMetricUnit: '分',
    minScore: 0,
    maxScore: 63,
    levels: [
      {
        label: '情绪健康 (平稳适应)',
        type: 'normal',
        badgeClass: 'badge-success',
        min: 0,
        max: 14,
        summary: '您的自评综合得分处于良好平稳常模区间（0-14分）。未体现出具有临床关注意义的抑郁、焦虑或过度压力反应，情绪调节系统功能运转正常。',
        advice: [
          '保持目前健康的生活节奏与睡眠作息',
          '在日常工作中维持适当的心理弹性与边界感'
        ]
      },
      {
        label: '轻度负荷 (亚临床波动)',
        type: 'mild',
        badgeClass: 'badge-info',
        min: 15,
        max: 25,
        summary: '处于轻度负性情绪负荷范围（15-25分）。可能受近期阶段性工作学业压力或人际琐事影响，体验到偶发的焦虑、烦躁或情绪低落，但整体仍具备自主适应能力。',
        advice: [
          '安排适度的有氧运动（如快走、慢跑或瑜伽）以释放躯体紧张能量',
          '练习腹式深呼吸或正念冥想，提升副交感神经唤醒度',
          '梳理近期压力源，学会合理分流或对非必要事务设立拒绝边界'
        ]
      },
      {
        label: '中度困扰 (建议积极调适)',
        type: 'moderate',
        badgeClass: 'badge-warning',
        min: 26,
        max: 38,
        summary: '您的得分达到了中度情绪困扰范围（26-38分）。提示在抑郁低落、躯体自主神经焦虑或慢性精神紧绷方面存在较为明显的困扰，已经对日常生活效率和主观幸福感造成妨碍。',
        advice: [
          '建议咨询专业心理咨询师进行系统的情绪疏导与认知重塑',
          '避免将负面情绪过度内化，尝试与信赖的亲友或伴侣倾诉内心压力',
          '建立规律作息，切忌依靠熬夜、暴食或过量咖啡因来对抗疲态'
        ]
      },
      {
        label: '重度/极重度困扰 (强烈建议就医)',
        type: 'severe',
        badgeClass: 'badge-danger',
        min: 39,
        max: 63,
        summary: '您的自评总分显著偏高（39-63分），达到重度至极重度负性情绪困扰范围。提示您当前可能正承受沉重的心身痛苦，抑郁、焦虑或慢性压力可能已严重损害心身机能，强烈建议尽快寻求专业医疗精神卫生机构的支持。',
        advice: [
          '强烈建议尽快前往综合医院精神心理科门诊就诊，完成系统评估',
          '如果在日常中出现严重绝望感或消极自伤念头，请立即向家人求助或拨打全国心理危机热线（400-161-9995）',
          '给自己的生活按下减速键，暂时卸载超负荷的任务与高压承诺'
        ]
      }
    ],
    dimensions: [
      {
        name: '抑郁维度',
        desc: '评估动力缺失、无价值感、快感缺失、对未来绝望及心境低落程度。',
        items: [3, 5, 10, 13, 16, 17, 21]
      },
      {
        name: '焦虑维度',
        desc: '评估自主神经唤起、躯体骨骼肌效应（颤抖、口干、心悸）及情境性恐慌。',
        items: [2, 4, 7, 9, 15, 19, 20]
      },
      {
        name: '压力维度',
        desc: '评估非特异性神经紧绷、难以放松、容易受激惹以及对阻碍的过度反应。',
        items: [1, 6, 8, 11, 12, 14, 18]
      }
    ]
  }
};

export default DASS21;
