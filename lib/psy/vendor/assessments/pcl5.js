// The Chinese items and response options are from the existing PSYMETRA form.
const PCL5 = {
  meta: {
    id: 'pcl5',
    name: 'PCL-5',
    fullName: '创伤后应激障碍检查量表',
    englishName: 'PTSD Checklist for DSM-5',
    category: '创伤与解离',
    description: '根据 DSM-5 评估过去一个月的创伤后应激症状。',
    instructions: '以下列出人们在经历非常艰难、痛苦或危险的生活事件后可能出现的问题。请回想您在【过去的一个月内】，这些问题给您带来的困扰程度。',
    timeframe: '过去一个月',
    attribution: {
      label: '中文版沿用本站原有 PSYMETRA 题面。美国国家 PTSD 中心公布的原版与评分说明',
      url: 'https://www.ptsd.va.gov/professional/assessment/adult-sr/ptsd-checklist.asp',
    },
  },
  defaultOptions: [
    { label: '完全没有', value: 0, desc: '未造成困扰' },
    { label: '有一点', value: 1, desc: '轻度困扰，偶尔发生' },
    { label: '中等程度', value: 2, desc: '中度困扰，较为明显' },
    { label: '相当厉害', value: 3, desc: '频繁发生，造成沉重负担' },
    { label: '极其严重', value: 4, desc: '极度痛苦，几乎无法自拔' }
  ],
  questions: [
    // Cluster B: 侵入性再体验 (Q1-Q5)
    { id: 1, text: '脑海中不由自主地反复出现关于那次痛苦经历的重复记忆、不可控画面或念头？', dimension: '侵入性再体验' },
    { id: 2, text: '反复做关于那次经历的令人极其不安或恐怖的梦境/噩梦？', dimension: '侵入性再体验' },
    { id: 3, text: '突然感觉或表现得好像那次痛苦经历正在重新发生一样（闪回感）？', dimension: '侵入性再体验' },
    { id: 4, text: '当某些事物提醒您想起那次经历时，感到极度的心烦意乱、惊恐或心理痛苦？', dimension: '侵入性再体验' },
    { id: 5, text: '当某些事物提醒您想起那次经历时，产生强烈的身体生理反应（如心跳加速、出汗、发抖或呼吸困难）？', dimension: '侵入性再体验' },

    // Cluster C: 持续性回避 (Q6-Q7)
    { id: 6, text: '极力回避与那次痛苦经历相关的记忆、想法或感受？', dimension: '持续性回避' },
    { id: 7, text: '极力回避容易让您联想起那次经历的外界线索（如特定的人、地点、对话、物品或活动）？', dimension: '持续性回避' },

    // Cluster D: 认知与心境负向改变 (Q8-Q14)
    { id: 8, text: '无法记起那次经历中某些极其重要的关键细节（创伤性记忆空白）？', dimension: '认知与心境改变' },
    { id: 9, text: '对自己、他人或整个世界持有强烈的负面信念（如“我彻底毁了”、“这个世界处处危险无一可信”）？', dimension: '认知与心境改变' },
    { id: 10, text: '错误地将那次创伤经历或其后果归咎于自己或他人（产生过度的自责、愧疚或怨恨）？', dimension: '认知与心境改变' },
    { id: 11, text: '持续体验强烈的负面情绪（例如恐惧、愤怒、极度内疚或羞耻感）？', dimension: '认知与心境改变' },
    { id: 12, text: '对曾经热爱或积极参与的重要活动失去兴趣，提不起任何劲头？', dimension: '认知与心境改变' },
    { id: 13, text: '感到自己与他人疏离、隔绝，难以重新融入原本的社交与家庭生活？', dimension: '认知与心境改变' },
    { id: 14, text: '感到自己情感麻木，难以体验到积极温暖的情感（如快乐、被爱或对亲人的亲密感）？', dimension: '认知与心境改变' },

    // Cluster E: 唤起与反应性改变 (Q15-Q20)
    { id: 15, text: '变得极其暴躁易怒、容易被激惹，出现冲动攻击或言语失控？', dimension: '过度警觉与唤起' },
    { id: 16, text: '做出过于冒险、鲁莽或对自身安全有害的行为？', dimension: '过度警觉与唤起' },
    { id: 17, text: '处于高度警觉状态，时刻神经紧绷或严密防备周围潜伏危险？', dimension: '过度警觉与唤起' },
    { id: 18, text: '极容易受到惊吓，微小声响都会引起剧烈惊跳反应？', dimension: '过度警觉与唤起' },
    { id: 19, text: '难以集中注意力，工作、学习或阅读时思维涣散？', dimension: '过度警觉与唤起' },
    { id: 20, text: '入睡困难、半夜频繁醒来或睡眠极浅？', dimension: '过度警觉与唤起' }
  ],
  scoring: {
    method: 'sum',
    primaryMetricLabel: 'PCL-5 总分',
    primaryMetricUnit: '分',
    minScore: 0,
    maxScore: 80,
    // Published screening cutoffs vary from 31 to 33. Keep the existing cutoff of 33.
    levels: [
      { label: '低于筛查参考值', type: 'normal', min: 0, max: 32 },
      { label: '达到筛查参考值', type: 'info', min: 33, max: 80 },
    ],
    dimensions: [
      { name: '侵入性再体验', items: [1, 2, 3, 4, 5] },
      { name: '持续性回避', items: [6, 7] },
      { name: '认知与心境改变', items: [8, 9, 10, 11, 12, 13, 14] },
      { name: '过度警觉与唤起', items: [15, 16, 17, 18, 19, 20] },
    ],
  },
};

export default PCL5;
