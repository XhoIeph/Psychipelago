// Simplified Chinese form distributed by MHPSS.net and linked by Gregory Zimet.
export default {
  meta: {
    id: 'mspss',
    name: 'MSPSS',
    fullName: '领悟社会支持量表',
    englishName: 'Multidimensional Scale of Perceived Social Support',
    category: '伴随困扰与支持',
    formVersion: 'mspss-zh-mhpss',
    attribution: {
      label: 'Zimet、Dahlem、Zimet 与 Farley（1988）编制，MHPSS.net 简体中文表单',
      url: 'https://app.mhpss.net/resource/simplified-chinese-version-multidimensional-scale-of-perceived-social-support-mspss',
    },
  },
  defaultOptions: ['非常強烈不同意', '強烈不同意', '有些不同意', '沒意見', '有些同意', '強烈同意', '非常強烈同意']
    .map((label, index) => ({ label, value: index + 1 })),
  questions: [
    '每当我有需要时，我生命中有个特別的人会出现幫我',
    '有个特別的人能让我分享快乐与悲伤',
    '我的家人的确努力要幫我',
    '我能从家人得到所需的情緒上的协助与支持',
    '有位特別的人是我慰藉的主要来源',
    '我的朋友的确努力要幫我',
    '当万事不順遂时，我可以依赖我的朋友',
    '我可以告诉家人我的烦恼',
    '我有朋友可以分享我的快乐与悲伤',
    '我生命中有个特別的人会关心我的感受',
    '我的家人乐意幫我下決定',
    '我可以告訴我的朋友我的烦恼',
  ].map((text, index) => ({ id: index + 1, text })),
  scoring: {
    method: 'mean',
    primaryMetricLabel: 'MSPSS 社会支持平均分',
    primaryMetricUnit: '分',
    minScore: 1,
    maxScore: 7,
    dimensions: [
      { name: '家庭支持', items: [3, 4, 8, 11] },
      { name: '朋友支持', items: [6, 7, 9, 12] },
      { name: '重要他人支持', items: [1, 2, 5, 10] },
    ],
  },
}
