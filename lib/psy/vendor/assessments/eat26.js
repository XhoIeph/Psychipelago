// Vendored from PSYMETRA (js/engine.js, js/assessments/*.js) on 2026-11-12.
// Scoring logic is copied verbatim; only export shims changed. Do not "improve" numbers here.

/**
 * PSYMETRA - EAT-26 Assessment Definition
 * 进食态度量表 (Eating Attitudes Test - 26 Items, EAT-26)
 * 国际临床心理学与精神医学筛查进食障碍 (厌食/贪食) 金标准工具 (Garner et al., 1982)
 */

const EAT26 = {
  meta: {
    id: 'eat26',
    name: 'EAT-26',
    fullName: '进食态度量表',
    englishName: 'Eating Attitudes Test - 26 Items',
    category: '进食障碍',
    targetGroups: ['成年人', '受进食与体重困扰人群', '暴食/催吐行为人群', '极端节食减重者', '神经性厌食/贪食症疑诊人群'],
    description: '由 Garner 等于 1982 年编制，是国际公认筛查神经性厌食症 (Anorexia Nervosa)、神经性贪食症 (Bulimia Nervosa) 及非典型进食障碍高危人群的标准化自评工具。评估节食与体型关注、暴食与食物关注、以及口腔控制行为。',
    instructions: '请评估下列关于饮食习惯、体型观念和体重控制的陈述与您的实际情况相符合的程度。请根据您的真实感受作答。',
    duration: 4,
    timeframe: '近期日常生活'
  },
  defaultOptions: [
    { label: '总是', value: 3, desc: '几乎每时每刻都如此' },
    { label: '非常经常', value: 2, desc: '绝大部分时间或大部分场合如此' },
    { label: '经常', value: 1, desc: '相当频繁，出现频率较高' },
    { label: '有时', value: 0, desc: '偶尔出现，但不是主导习惯' },
    { label: '很少', value: 0, desc: '极少发生，偶尔为之' },
    { label: '从不', value: 0, desc: '完全没有，从不如此' }
  ],
  questions: [
    {
      id: 1,
      text: '我极度害怕自己体重增加或变胖',
      dimension: '节食与体型关注'
    },
    {
      id: 2,
      text: '当我感到饥饿的时候，我仍刻意回避进食',
      dimension: '节食与体型关注'
    },
    {
      id: 3,
      text: '我脑海中总是不由自主地被食物与进食相关的念头占据',
      dimension: '暴食与食物关注'
    },
    {
      id: 4,
      text: '我曾有过疯狂暴食的大吃发作，感觉自己完全无法控制或停下来',
      dimension: '暴食与食物关注'
    },
    {
      id: 5,
      text: '我会把食物切成非常细小的碎块再吃',
      dimension: '口腔控制与克制'
    },
    {
      id: 6,
      text: '我在进食前会极其精确地计算食物所含的热量/卡路里',
      dimension: '节食与体型关注'
    },
    {
      id: 7,
      text: '我会特别抗拒并刻意避开高碳水化合物食物（如米饭、面条、面包、糕点等）',
      dimension: '节食与体型关注'
    },
    {
      id: 8,
      text: '我觉得身边其他人更希望我能多吃一点东西',
      dimension: '口腔控制与克制'
    },
    {
      id: 9,
      text: '我在吃完东西后会感到恶心，或产生想要催吐的冲动',
      dimension: '暴食与食物关注'
    },
    {
      id: 10,
      text: '我在吃完饭后会感到极度强烈的罪恶感与自责',
      dimension: '节食与体型关注'
    },
    {
      id: 11,
      text: '我时刻渴望能拥有更瘦、更骨感的身材',
      dimension: '节食与体型关注'
    },
    {
      id: 12,
      text: '我在运动锻炼时，脑海中想的几乎全是要消耗掉多少卡路里热量',
      dimension: '节食与体型关注'
    },
    {
      id: 13,
      text: '别人会评价说我太瘦了，但我自己并不这么觉得',
      dimension: '节食与体型关注'
    },
    {
      id: 14,
      text: '我被自己身上有多余脂肪的念头深深困扰着',
      dimension: '节食与体型关注'
    },
    {
      id: 15,
      text: '我进食一餐花费的时间明显比其他人更长',
      dimension: '口腔控制与克制'
    },
    {
      id: 16,
      text: '我坚决回避含有任何糖分的食物和甜食',
      dimension: '节食与体型关注'
    },
    {
      id: 17,
      text: '我偏好食用低热量、无糖或代餐类的节食控卡食品',
      dimension: '节食与体型关注'
    },
    {
      id: 18,
      text: '我感到食物在我生命中占据了过多的主导和控制权',
      dimension: '暴食与食物关注'
    },
    {
      id: 19,
      text: '我在面对食物时能够展现出极其严苛、极端的自我克制力',
      dimension: '口腔控制与克制'
    },
    {
      id: 20,
      text: '我感到身边他人经常在强迫或劝说我多吃东西',
      dimension: '口腔控制与克制'
    },
    {
      id: 21,
      text: '我花费大量时间和精力在思考、准备或规划食物上',
      dimension: '暴食与食物关注'
    },
    {
      id: 22,
      text: '当我吃了含糖或高脂肪食物时，我会感到极为不安和难受',
      dimension: '节食与体型关注'
    },
    {
      id: 23,
      text: '我会严格执行自己制定的节食瘦身计划',
      dimension: '节食与体型关注'
    },
    {
      id: 24,
      text: '我喜欢并享受自己的胃部处于彻底空空的状态',
      dimension: '节食与体型关注'
    },
    {
      id: 25,
      text: '我曾有过在进食后尝试通过呕吐来吐出食物的冲动或实际行为',
      dimension: '暴食与食物关注'
    },
    {
      id: 26,
      text: '我乐于尝试各种新鲜美味丰富的食物',
      dimension: '口腔控制与克制',
      options: [
        { label: '总是', value: 0, desc: '非常热爱尝试美食，饮食心态开放' },
        { label: '非常经常', value: 0, desc: '大部分时候乐于尝试新食物' },
        { label: '经常', value: 0, desc: '经常愿意品尝丰富美食' },
        { label: '有时', value: 1, desc: '偶尔愿意尝试，较为保守' },
        { label: '很少', value: 2, desc: '极少尝试新食物，对食物充满戒备' },
        { label: '从不', value: 3, desc: '坚决拒绝尝试任何新食物，严重挑食避食' }
      ]
    }
  ],
  scoring: {
    method: 'sum',
    primaryMetricLabel: 'EAT-26 进食态度总分',
    primaryMetricUnit: '分',
    minScore: 0,
    maxScore: 78,
    levels: [
      {
        label: '进食态度正常健康 (无显著障碍倾向)',
        type: 'normal',
        badgeClass: 'badge-success',
        min: 0,
        max: 9,
        summary: '您的自评得分处于健康常模区间（0-9分）。对食物摄入、体型及体重保持着相对平衡客观的心态，未见具有临床意义的极端病理性避食或暴食行为。',
        advice: [
          '保持均衡多样的营养膳食搭配',
          '维持健康自信的身体形象自我认知，不必为外界审美标准过度焦虑'
        ]
      },
      {
        label: '轻度进食关切 (体型或热量敏感)',
        type: 'mild',
        badgeClass: 'badge-info',
        min: 10,
        max: 19,
        summary: '处于轻度进食关切水平（10-19分）。可能对日常卡路里摄入、体型变化或体重控制存在一定的焦虑感与节食倾向，但尚未达到确诊进食障碍的临床阳性截断界限（≥ 20分）。',
        advice: [
          '避免盲目跟风极端的低碳生酮或超低热量节食方案',
          '将注意力由“外表体型胖瘦”转移到“身体综合活力与健康”',
          '如果开始出现情绪性暴食或饭后内疚自责，建议及时调整饮食心态'
        ]
      },
      {
        label: '进食障碍高危阳性 (达到临床筛查阳性界限)',
        type: 'moderate',
        badgeClass: 'badge-warning',
        min: 20,
        max: 39,
        summary: '您的自评得分达到了国际公认的进食障碍阳性筛查界限（20-39分，≥ 20分为阳性截断值）。提示在极度体型焦虑、严格病理性避食、失控暴食或补偿行为（如催吐/过度剧烈运动）方面表现突出，高度提示存在神经性厌食症或贪食症的临床风险。',
        advice: [
          '建议前往综合医院精神心理科或临床营养科门诊接受专业评估（如进食障碍诊断检查 EDE）',
          '寻求专注于进食障碍的认知行为治疗 (CBT-E) 或家庭疗法支持',
          '与信任的医师或营养师合作，逐步重建安全、非恐惧的食物关系'
        ]
      },
      {
        label: '重度病理性进食障碍 (高度高危，需紧急就医)',
        type: 'severe',
        badgeClass: 'badge-danger',
        min: 40,
        max: 78,
        summary: '您的自评得分显著偏高（40-78分），提示存在极严重的病理性进食障碍与严重扭曲的身体意象。长期的病理性拒食、频繁催吐或失控暴食会对心血管、电解质平衡、胃肠道及内分泌系统造成致命性损害。',
        advice: [
          '强烈建议立即前往具备进食障碍专科救治能力的三甲医院精神心理科就诊',
          '完善电解质、心电图、骨密度及血常规等全身生理健康检查，排除潜在电解质紊乱（如低钾血症）危险',
          '若体重严重低于标准 BMI（< 15）或伴有频繁晕厥、脱水，需考虑紧急住院综合医疗支持'
        ]
      }
    ],
    dimensions: [
      {
        name: '节食与体型关注',
        desc: '评估极度肥胖恐惧、病理性避食高碳高热量食物、强迫性卡路里计算及对骨感身材的病态追求（14题）。',
        items: [1, 2, 6, 7, 10, 11, 12, 13, 14, 16, 17, 22, 23, 24]
      },
      {
        name: '暴食与食物关注',
        desc: '评估对食物的持续性侵入性思维、不可遏制的失控大吃发作以及饭后诱发呕吐等病理冲动（6题）。',
        items: [3, 4, 9, 18, 21, 25]
      },
      {
        name: '口腔控制与克制',
        desc: '评估切碎细嚼等仪式化进食行为、抵御外人劝食以及极度病理性的食物摄入克制（6题）。',
        items: [5, 8, 15, 19, 20, 26]
      }
    ]
  }
};

export default EAT26;
