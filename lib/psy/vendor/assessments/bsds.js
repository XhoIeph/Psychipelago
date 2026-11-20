// Vendored from PSYMETRA (js/engine.js, js/assessments/*.js) on 2026-11-12.
// Scoring logic is copied verbatim; only export shims changed. Do not "improve" numbers here.

/**
 * PSYMETRA - BSDS Assessment Definition
 * 双相谱系诊断量表 (Bipolar Spectrum Diagnostic Scale)
 * Ronald Pies & S. Nassir Ghaemi (2005) 经典双相谱系筛查量表
 */

const BSDS = {
  meta: {
    id: 'bsds',
    name: 'BSDS',
    fullName: '双相谱系诊断量表',
    englishName: 'Bipolar Spectrum Diagnostic Scale',
    category: '双相/躁狂',
    targetGroups: ['成人', '青少年', '抑郁症患者', '双相情感障碍疑似者', '心境波动困扰者'],
    description: '由著名双相障碍专家 Ronald Pies 与 S. Nassir Ghaemi 等研制，专为捕捉极易被误诊为单相抑郁的双相谱系障碍（如双相二型、环性心境、亚临床轻躁狂）而设计。',
    instructions: '请仔细阅读以下关于心境和精力起伏的 19 条生活体验陈述，逐条选择最符合您的真实情况（“符合”或“不符合”）。在回答完前 19 题后，请完成第 20 题，评估这篇故事与您过往整体经历的吻合程度。',
    duration: 5,
    pageSize: 10,
    timeframe: '终生及过往各发作期',
    references: {
      original: [
        'Ghaemi, S. N., Miller, C. J., Berv, D. A., et al. (2005). Sensitivity and specificity of a new bipolar spectrum diagnostic scale. Journal of Affective Disorders, 84(2-3), 273-277.',
        'Pies, R. (2005). The Bipolar Spectrum Diagnostic Scale (BSDS). Journal of Clinical Psychiatry.'
      ],
      chineseValidation: [
        '王英成, 司天梅, 等. (2011). 双相谱系诊断量表中文版的信度和效度. 中国心理卫生杂志, 25(8), 585-589.'
      ]
    }
  },
  defaultOptions: [
    { label: '不符合', value: 0, desc: '我不符合或从未体验过' },
    { label: '符合', value: 1, desc: '符合我的经历或体验' }
  ],
  questions: [
    {
      id: 1,
      text: '我注意到自己的心境和/或精力水平时常、明显地发生转换。',
      dimension: '心境与精力转换特征'
    },
    {
      id: 2,
      text: '我注意到有时自己的心境和/或精力水平非常低，而另一些时候又非常高。',
      dimension: '心境与精力转换特征'
    },
    {
      id: 3,
      text: '在“低落期”，我感到缺乏精力、疲倦、想要一直躺在床上，或者严重缺乏做事的动力。',
      dimension: '低落期抑郁特征'
    },
    {
      id: 4,
      text: '在低落期，我往往体重增加，或者食欲显著大增。',
      dimension: '低落期抑郁特征'
    },
    {
      id: 5,
      text: '在低落期，我可能感到深切的悲伤、缺乏自我价值感、或者感到前途彻底无望。',
      dimension: '低落期抑郁特征'
    },
    {
      id: 6,
      text: '在情绪低谷期，我甚至曾经认真考虑过自杀。',
      dimension: '低落期抑郁特征'
    },
    {
      id: 7,
      text: '这种低谷状态通常持续几天、几周，有时甚至几个月。',
      dimension: '低落期抑郁特征'
    },
    {
      id: 8,
      text: '通常在这些低落与高涨发作之间，会有一段心境和精力水平相对正常的平稳期。',
      dimension: '心境与精力转换特征'
    },
    {
      id: 9,
      text: '但随后又会出现“高涨期”（或精力极其充沛旺盛的时期）。',
      dimension: '高涨期轻躁狂/亢奋特征'
    },
    {
      id: 10,
      text: '在高涨期，我注意到自己的精力水平比平常明显高得多。',
      dimension: '高涨期轻躁狂/亢奋特征'
    },
    {
      id: 11,
      text: '在高涨期，我睡眠需求明显减少，仅仅睡上几个小时就感到精力完全恢复。',
      dimension: '高涨期轻躁狂/亢奋特征'
    },
    {
      id: 12,
      text: '在高涨期，我比平时话多得多，或者语速变得非常快，停不下来。',
      dimension: '高涨期轻躁狂/亢奋特征'
    },
    {
      id: 13,
      text: '在高涨期，我感到极度自信，脑子里的想法像飞一样迅速流转。',
      dimension: '高涨期轻躁狂/亢奋特征'
    },
    {
      id: 14,
      text: '在高涨期，我可能会同时开始很多新的项目、宏大计划或社交活动。',
      dimension: '高涨期轻躁狂/亢奋特征'
    },
    {
      id: 15,
      text: '在高涨期，我可能会变得非常易激惹、容易发火或脾气暴躁。',
      dimension: '高涨期轻躁狂/亢奋特征'
    },
    {
      id: 16,
      text: '在高涨期，我可能会过度挥霍金钱、冲动购物或做出不明智的财务决定。',
      dimension: '高涨期轻躁狂/亢奋特征'
    },
    {
      id: 17,
      text: '在高涨期，我可能会做出一些与平时性格极不相符的冲动冒险行为。',
      dimension: '高涨期轻躁狂/亢奋特征'
    },
    {
      id: 18,
      text: '这些高涨期通常持续几天，但有时也会持续更长时间。',
      dimension: '心境与精力转换特征'
    },
    {
      id: 19,
      text: '这种在高涨与低落之间的显著转换，对我的人际关系、家庭生活、工作或学业造成了明显的困扰或损害。',
      dimension: '心境与精力转换特征'
    },
    {
      id: 20,
      text: '总体而言，上述关于心境与精力在高低之间转换的故事，对您的生活经历描述得有多吻合？',
      dimension: '总体故事吻合度',
      options: [
        { label: '完全不符合 (0分)', value: 0, desc: '这篇故事根本没有描述我的人生体验' },
        { label: '部分符合 (2分)', value: 2, desc: '这篇故事只是在某些局部方面描述了我' },
        { label: '较为符合 (4分)', value: 4, desc: '这篇故事在很多重要方面较好地描述了我' },
        { label: '高度吻合 (6分)', value: 6, desc: '这篇故事非常准确全面地契合我的经历' }
      ]
    }
  ],
  scoring: {
    method: 'sum',
    primaryMetricLabel: 'BSDS 双相谱系总分',
    primaryMetricUnit: '分',
    minScore: 0,
    maxScore: 25,
    levels: [
      {
        label: '双相谱系可能性极低',
        type: 'normal',
        badgeClass: 'badge-success',
        min: 0,
        max: 6,
        summary: '测验总分处于低位区间（0~6分），提示您的心境与精力状态相对平稳，未见双相情感障碍或谱系障碍（如轻躁狂、环性心境）的典型模式。',
        advice: [
          '保持健康规律的日常生活与睡眠作息',
          '在面对生活压力时采取适应性的应对方式',
          '若未来遇到持续低落情绪，按常规抑郁干预路线就医'
        ]
      },
      {
        label: '低至中度可能性 / 边缘可疑',
        type: 'mild',
        badgeClass: 'badge-info',
        min: 7,
        max: 12,
        summary: '测验得分提示存在部分情绪或精力波动的片段体验，但尚未构成完整的双相谱系发作模式。可能与应激性压力、季节性波动或人格情绪脆弱性相关。',
        advice: [
          '建议使用心境日记（Mood Diary）连续记录每日情绪与睡眠时长',
          '特别留意低落发作后是否伴有异常亢奋、睡眠减少或冲动挥霍',
          '在就医抑郁症状时向医生如实提及过往的高精力片段'
        ]
      },
      {
        label: '中度可能性 (达到双相谱系筛查界限)',
        type: 'moderate',
        badgeClass: 'badge-warning',
        min: 13,
        max: 19,
        summary: '测验得分达到国际公认的双相谱系筛查界限（≥13分，敏感度 76%，特异度 85%）。提示您的人生经历与双相二型（抑郁与轻躁狂交替）或环性心境障碍高度吻合，日常心境与精力波动已造成实际困扰。',
        advice: [
          '强烈建议预约综合医院临床心理科或精神科专科门诊进行全面鉴别诊断',
          '务必告知医生曾有过的“精力旺盛、自信心爆棚、少睡不困”阶段，防范单用抗抑郁药诱发转相',
          '规律作息，避免熬夜、跨时区颠倒或剧烈生活事件扰乱昼夜节律',
          '告知亲近家人关于情绪起伏的特征，共同构建支持系统'
        ]
      },
      {
        label: '双相谱系可能性极高',
        type: 'severe',
        badgeClass: 'badge-danger',
        min: 20,
        max: 25,
        summary: '测验处于极高分区间（20~25分）。高度提示双相情感障碍（双相一型、双相二型或快速循环型）。多项核心轻躁狂/躁狂症状与重度抑郁交替出现，且故事整体吻合度极高，具有显著的临床病理意义。',
        advice: [
          '尽快前往三甲精神卫生中心接受精神医学专业医师的系统评估与科学诊疗',
          '双相障碍需要以心境稳定剂（如锂盐、丙戊酸盐、拉莫三嗪等）为基石的规范化医疗方案',
          '严格避免在没有心境稳定剂保护的情况下擅自使用单相抗抑郁药物',
          '建立危机安全应对卡，防范极端抑郁期的自伤风险与高涨期的冲动损失'
        ]
      }
    ],
    dimensions: [
      {
        name: '心境与精力转换特征',
        desc: '评估在极高与极低之间的转换周期、正常间隔期及社会功能受损',
        items: [1, 2, 8, 18, 19]
      },
      {
        name: '低落期抑郁特征',
        desc: '评估低谷期的精力匮乏、嗜睡食欲大增、无价值感及绝望自杀意念',
        items: [3, 4, 5, 6, 7]
      },
      {
        name: '高涨期轻躁狂/亢奋特征',
        desc: '评估精力过盛、少睡不累、言语迫促、自信膨胀、易激惹及冲动挥霍',
        items: [9, 10, 11, 12, 13, 14, 15, 16, 17]
      },
      {
        name: '总体故事吻合度',
        desc: '对双相高低波动人生故事的整体自我契合度综合判定',
        items: [20]
      }
    ]
  }
};

export default BSDS;
