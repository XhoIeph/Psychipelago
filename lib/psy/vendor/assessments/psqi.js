// Vendored from PSYMETRA (js/engine.js, js/assessments/*.js) on 2026-11-12.
// Scoring logic is copied verbatim; only export shims changed. Do not "improve" numbers here.

/**
 * PSYMETRA - Assessment Definition: PSQI
 * Pittsburgh Sleep Quality Index (Buysse et al., 1989)
 * 匹兹堡睡眠质量指数 (刘贤臣等, 1996 中华精神科杂志标准中文版)
 */

const PSQI = {
  meta: {
    id: 'psqi',
    name: 'PSQI',
    fullName: '匹兹堡睡眠质量指数',
    englishName: 'Pittsburgh Sleep Quality Index',
    category: '睡眠质量',
    targetGroups: ['成人', '各年龄段存在睡眠困扰人群', '临床就诊患者'],
    description: '由美国匹兹堡大学精神病学家 Buysse 等于 1989 年编制、刘贤臣等于 1996 年进行中国本土信效度检验的国际经典睡眠质量自评工具。全面评估主观睡眠质量、入睡潜伏期、实际睡眠时长、习惯性睡眠效率、睡眠障碍、催眠药物及日间功能障碍 7 大临床成分。',
    instructions: '以下问题是关于您在【过去一个月】里的实际睡眠习惯与心身感受。请根据您最近一个月的真实情况，选择最符合的一项。',
    duration: 5,
    timeframe: '最近一个月',
    references: {
      original: [
        'Buysse, D. J., Reynolds, C. F., Monk, T. H., Berman, S. R., & Kupfer, D. J. (1989). The Pittsburgh Sleep Quality Index: A new instrument for psychiatric practice and research. Psychiatry Research, 28(2), 193-213.'
      ],
      chineseValidation: [
        '刘贤臣, 唐茂芹, 胡蕾, 王爱祯, 吴宏新, 赵贵芳, 高春生, 李万顺. (1996). 匹兹堡睡眠质量指数的信度和效度研究. 中华精神科杂志, 29(2), 103-107.'
      ]
    }
  },
  defaultOptions: [
    { label: '从不 / 无', value: 0, desc: '过去一个月未发生' },
    { label: '每周不足 1 次', value: 1, desc: '偶尔发生，频次较低' },
    { label: '每周 1~2 次', value: 2, desc: '有时发生，较为频繁' },
    { label: '每周 3 次或以上', value: 3, desc: '经常发生，困扰严重' }
  ],
  questions: [
    {
      id: 1,
      text: '近1个月，您每晚通常躺在床上需要多长时间才能入睡？（入睡潜伏期）',
      options: [
        { label: '15 分钟以内', value: 0, desc: '入睡快，无明显拖延' },
        { label: '16 ~ 30 分钟', value: 1, desc: '稍需酝酿，处于正常上限' },
        { label: '31 ~ 60 分钟', value: 2, desc: '入睡偏慢，存在入睡困难' },
        { label: '超过 60 分钟（1小时以上）', value: 3, desc: '严重入睡困难，辗转反侧' }
      ]
    },
    {
      id: 2,
      text: '近1个月，您每夜通常实际睡了多少小时？（注：指真正睡着的时间，不等于躺在床上的时间）',
      options: [
        { label: '7 小时以上', value: 0, desc: '睡眠充裕，满足生理恢复' },
        { label: '6 ~ 7 小时', value: 1, desc: '睡眠时间尚可' },
        { label: '5 ~ 6 小时', value: 2, desc: '睡眠时间偏少' },
        { label: '少于 5 小时', value: 3, desc: '严重睡眠不足' }
      ]
    },
    {
      id: 3,
      text: '近1个月，您每晚实际睡着的时间占躺在床上总时间的比例大约是多少？（习惯性睡眠效率 = 实际睡眠时间 ÷ 卧床时间 × 100%）',
      options: [
        { label: '85% 以上（绝大部分卧床时间都在睡眠中，起夜或清醒很少）', value: 0, desc: '睡眠效率极佳' },
        { label: '75% ~ 84%（偶尔在床上清醒或中途醒来）', value: 1, desc: '睡眠效率尚可' },
        { label: '65% ~ 74%（相当一部分卧床时间辗转难眠或醒着）', value: 2, desc: '睡眠效率较低' },
        { label: '低于 65%（大量卧床时间无法入睡，醒睡严重失衡）', value: 3, desc: '睡眠效率极低' }
      ]
    },
    {
      id: 4,
      text: '近1个月，您因为“入睡困难（上床30分钟内无法入睡）”而苦恼的频率？'
    },
    {
      id: 5,
      text: '近1个月，您因为“夜间易醒或清晨过早醒来”而苦恼的频率？'
    },
    {
      id: 6,
      text: '近1个月，您因为“夜间必须起夜去洗手间”而影响睡眠的频率？'
    },
    {
      id: 7,
      text: '近1个月，您因为“感觉呼吸不顺畅”而影响睡眠的频率？'
    },
    {
      id: 8,
      text: '近1个月，您因为“咳嗽或打鼾声过大”而影响睡眠或被同室人抱怨的频率？'
    },
    {
      id: 9,
      text: '近1个月，您因为“感觉身体太冷”而影响睡眠的频率？'
    },
    {
      id: 10,
      text: '近1个月，您因为“感觉身体太热”而影响睡眠的频率？'
    },
    {
      id: 11,
      text: '近1个月，您因为“做噩梦、受惊扰”而影响睡眠的频率？'
    },
    {
      id: 12,
      text: '近1个月，您因为“身体各部位疼痛或躯体不适”而影响睡眠的频率？'
    },
    {
      id: 13,
      text: '近1个月，您因为“其他原因（如噪音、光线、心事牵挂等）”而影响睡眠的频率？'
    },
    {
      id: 14,
      text: '近1个月，总的来说，您认为自己的整体睡眠质量如何？',
      options: [
        { label: '很好', value: 0, desc: '睡眠深沉舒畅，醒后精神饱满' },
        { label: '较好', value: 1, desc: '整体不错，偶尔有小波动' },
        { label: '较差', value: 2, desc: '经常感到睡眠不足或浅睡' },
        { label: '很差', value: 3, desc: '睡眠极度糟糕，深感折磨' }
      ]
    },
    {
      id: 15,
      text: '近1个月，您需要使用药物（包括医生处方的安眠药、镇静助眠药或非处方助眠保健品）来帮助入睡的频率？'
    },
    {
      id: 16,
      text: '近1个月，您在开车、用餐、工作学习或参加社交活动时，感到困倦、难以保持清醒的频率？'
    },
    {
      id: 17,
      text: '近1个月，您在保持充沛精力与动力去完成该做的事情方面，感到有多大困难？',
      options: [
        { label: '完全没有困难', value: 0, desc: '白天精力充沛，做事干劲十足' },
        { label: '只有一点轻微困难', value: 1, desc: '偶有倦怠，基本不影响做事' },
        { label: '有一定困难', value: 2, desc: '常感精力不济，效率受拖累' },
        { label: '有很大困难', value: 3, desc: '极度缺乏精力，严重影响日常功能' }
      ]
    }
  ],
  scoring: {
    method: 'psqi',
    minScore: 0,
    maxScore: 21,
    primaryMetricLabel: 'PSQI 睡眠质量总分',
    primaryMetricUnit: '分',
    dimensions: [
      { id: 'c1', name: '主观睡眠质量 (C1)', desc: '受测者对过去一个月自身整体睡眠状态的主观满意度评价', items: [14] },
      { id: 'c2', name: '入睡潜伏时间 (C2)', desc: '上床后入眠所需时长及30分钟内无法入眠的发生频度综合评定', items: [1, 4] },
      { id: 'c3', name: '睡眠持续时间 (C3)', desc: '每夜实际真正睡眠的时长，评估是否存在生理性睡眠剥夺', items: [2] },
      { id: 'c4', name: '习惯睡眠效率 (C4)', desc: '实际睡眠时间占卧床总时间的百分比，反映躺床睡着有效率', items: [3] },
      { id: 'c5', name: '睡眠障碍困扰 (C5)', desc: '易醒、起夜、呼吸不畅、打鼾、冷热、噩梦、疼痛等9大躯体夜间干扰', items: [5, 6, 7, 8, 9, 10, 11, 12, 13] },
      { id: 'c6', name: '催眠药物使用 (C6)', desc: '对镇静催眠药物、处方安眠药或助眠保健品的依赖使用频率', items: [15] },
      { id: 'c7', name: '日间功能障碍 (C7)', desc: '白天困倦嗜睡发生度以及保持精力做事所遭遇的心理与生理阻力', items: [16, 17] }
    ],
    levels: [
      {
        min: 0,
        max: 5,
        label: '睡眠质量优良 (健康常模)',
        type: 'normal',
        badgeClass: 'badge-success',
        summary: '您的 PSQI 总分处于健康常模区间（≤5分）。这表明您的睡眠系统运行良好，入睡顺利、睡眠深沉连续、睡眠效率高且日间精力充沛，未检测到显著的病理失眠特征。',
        advice: '继续保持规律作息与良好的睡眠卫生习惯，睡前远离蓝光电子屏幕。'
      },
      {
        min: 6,
        max: 7,
        label: '睡眠质量一般 (临界波动)',
        type: 'mild',
        badgeClass: 'badge-info',
        summary: '您的得分处于临界观察区间（6~7分）。虽未达到中国临床界限（>7分），但提示睡眠系统偶有波动，可能在入睡延迟、夜间轻微觉醒或白天精力上有轻度损耗。',
        advice: '注意睡前4小时避免咖啡因、酒精及高强度剧烈运动；规律起床时刻，睡前可尝试温水足浴或正念呼吸放松。'
      },
      {
        min: 8,
        max: 15,
        label: '轻中度睡眠问题 (达到中国临床界限)',
        type: 'moderate',
        badgeClass: 'badge-warning',
        summary: '您的总分已跨越中国临床筛查划界线（PSQI > 7分），提示存在明确的失眠或睡眠质量问题。可能表现为入睡潜伏期延长、频繁夜醒、睡眠效率偏低或伴随白天明显疲乏。',
        advice: '建议详细检视各成分得分（如睡眠障碍、入睡时间），建立严格的“床只用于睡觉”刺激控制疗法；如持续超过1个月建议就医咨询或进行睡眠认知行为治疗（CBT-I）。'
      },
      {
        min: 16,
        max: 21,
        label: '重度睡眠质量障碍 (显著临床干预预警)',
        type: 'severe',
        badgeClass: 'badge-danger',
        summary: '您的 PSQI 总分显著偏高（≥16分），表明您正在遭受相当严重的睡眠障碍折磨。长期的严重睡眠剥夺会显著损害机体免疫、心脑血管健康及情绪调节中枢，增加焦虑抑郁共病风险。',
        advice: '强烈建议您尽快前往综合医院的睡眠医学科、神经内科或心理科就诊，接受多导睡眠监测（PSG）排查及系统规范的专科综合诊疗，切忌自行盲目增减助眠药物。'
      }
    ]
  }
};

export default PSQI;
