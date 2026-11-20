// Vendored from PSYMETRA (js/engine.js, js/assessments/*.js) on 2026-11-12.
// Scoring logic is copied verbatim; only export shims changed. Do not "improve" numbers here.

/**
 * PSYMETRA - HCL-32 Assessment Definition
 * 32项轻躁狂自评量表 (Hypomania Checklist-32)
 */

const HCL32 = {
  meta: {
    id: 'hcl32',
    name: 'HCL-32',
    fullName: '32项轻躁狂自评量表',
    englishName: 'Hypomania Checklist-32',
    category: '双相/躁狂',
    targetGroups: ['抑郁症患者', '双相情感障碍筛查人群', '情绪波动人群', '成人'],
    description: '由Jules Angst教授编制的国际经典双相情感障碍/轻躁狂筛查工具，主要用于评估抑郁发作人群既往是否存在轻度情绪高涨、精力旺盛或冲动发作的特征。',
    instructions: '在人的一生中，情绪状态常常会有所起伏。以下列出了处于“情绪高涨、状态极佳、精力旺盛”状态时可能出现的体验。请回忆您在最亢奋或精力最旺盛的时期的实际情况，选择“是”或“否”。',
    duration: 5,
    timeframe: '情绪高涨/亢奋发作期',
    references: {
      original: [
        'Angst, J., Adolfsson, R., Benazzi, F., Gamma, A., Bowden, C. L., et al. (2005). The HCL-32: towards a self-assessment tool for hypomanic symptoms in outpatient conditions. Journal of Affective Disorders, 88(2), 217-233.'
      ],
      chineseValidation: [
        '杨海晨, 陆汝斌, 贾福军, 等. (2011). 32项轻躁狂自评量表中文版在双相障碍中的信度和效度. 中华精神科杂志, 44(4), 214-218.'
      ]
    }
  },
  defaultOptions: [
    { label: '否', value: 0, desc: '不符合或没有该表现' },
    { label: '是', value: 1, desc: '符合并在该状态下出现' }
  ],
  questions: [
    { id: 1, text: '我需要的睡眠比平时少', dimension: '活跃-精力旺盛' },
    { id: 2, text: '我感觉精力更充沛、更有活力', dimension: '活跃-精力旺盛' },
    { id: 3, text: '我变得更有自信', dimension: '活跃-精力旺盛' },
    { id: 4, text: '我更能享受我的工作与生活', dimension: '活跃-精力旺盛' },
    { id: 5, text: '我更喜欢社交（打更多电话、更常出门）', dimension: '活跃-精力旺盛' },
    { id: 6, text: '我更想去旅行，并且/或者旅行得更多', dimension: '活跃-精力旺盛' },
    { id: 7, text: '我开车时倾向开得更快，或冒更大的风险', dimension: '冒险-易激惹' },
    { id: 8, text: '我花更多的钱，或者花钱大手大脚', dimension: '冒险-易激惹' },
    { id: 9, text: '我在日常生活中（工作或其他活动中）冒更多风险', dimension: '冒险-易激惹' },
    { id: 10, text: '我的身体活动量更大（如运动等）', dimension: '活跃-精力旺盛' },
    { id: 11, text: '我会计划更多的活动或项目', dimension: '活跃-精力旺盛' },
    { id: 12, text: '我有更多的点子、更有创造力', dimension: '活跃-精力旺盛' },
    { id: 13, text: '我变得没那么害羞或拘谨', dimension: '活跃-精力旺盛' },
    { id: 14, text: '我穿得更鲜艳、打扮更引人注目或化更浓的妆', dimension: '活跃-精力旺盛' },
    { id: 15, text: '我想结识更多人，或实际上结识了更多人', dimension: '活跃-精力旺盛' },
    { id: 16, text: '我对性更感兴趣，和/或性欲增强', dimension: '活跃-精力旺盛' },
    { id: 17, text: '我更喜欢调情，和/或在性方面更活跃', dimension: '活跃-精力旺盛' },
    { id: 18, text: '我说话更多、语速更快', dimension: '活跃-精力旺盛' },
    { id: 19, text: '我思考得更快、思维更敏捷', dimension: '活跃-精力旺盛' },
    { id: 20, text: '我在说话时会开更多玩笑或说俏皮话', dimension: '活跃-精力旺盛' },
    { id: 21, text: '我更容易分心、注意力不集中', dimension: '冒险-易激惹' },
    { id: 22, text: '我会同时开展很多新的事情', dimension: '冒险-易激惹' },
    { id: 23, text: '我的想法会从一个话题跳到另一个话题（思维跳跃）', dimension: '冒险-易激惹' },
    { id: 24, text: '我做事情变得更迅速和/或更容易', dimension: '活跃-精力旺盛' },
    { id: 25, text: '我变得更没有耐心和/或更容易急躁、发脾气', dimension: '冒险-易激惹' },
    { id: 26, text: '我可能会让其他人感到筋疲力尽或恼火', dimension: '冒险-易激惹' },
    { id: 27, text: '我更容易与别人发生争吵', dimension: '冒险-易激惹' },
    { id: 28, text: '我的心境更高昂、更乐观', dimension: '活跃-精力旺盛' },
    { id: 29, text: '我喝更多的咖啡或浓茶', dimension: '冒险-易激惹' },
    { id: 30, text: '我抽更多的烟（平时不吸烟亦选否）', dimension: '冒险-易激惹' },
    { id: 31, text: '我喝更多的酒（平时不饮酒亦选否）', dimension: '冒险-易激惹' },
    { id: 32, text: '我使用更多药物（镇静药、抗焦虑药、兴奋剂等）', dimension: '冒险-易激惹' }
  ],
  scoring: {
    method: 'sum',
    primaryMetricLabel: 'HCL-32 阳性症状得分',
    primaryMetricUnit: '分',
    minScore: 0,
    maxScore: 32,
    dimensions: [
      {
        id: 'active_elated',
        name: '活跃-精力旺盛 (Active / Elated)',
        desc: '情绪高涨、思维敏捷、活动与社交增加、睡眠需求减少等积极亢奋特质',
        items: [1, 2, 3, 4, 5, 6, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 24, 28]
      },
      {
        id: 'risk_irritable',
        name: '冒险-易激惹 (Risk-taking / Irritable)',
        desc: '注意力易分散、冲动消费、冒险涉险、急躁易怒或物质摄入增多等',
        items: [7, 8, 9, 21, 22, 23, 25, 26, 27, 29, 30, 31, 32]
      }
    ],
    levels: [
      {
        label: '筛查阴性',
        type: 'normal',
        badgeClass: 'badge-success',
        min: 0,
        max: 13,
        summary: '您的得分低于临床划界分（14分），提示您在情绪高涨期未表现出显著的轻躁狂特征，总体情绪状态较为平稳或符合普通情绪起伏。',
        advice: [
          '保持规律的作息节律与生活习惯',
          '关注日常情绪波动规律',
          '如有抑郁情绪困扰，建议按常规心身情绪筛查就诊'
        ]
      },
      {
        label: '轻躁狂阳性筛查',
        type: 'moderate',
        badgeClass: 'badge-warning',
        min: 14,
        max: 20,
        summary: '您的得分达到临床推荐阈值（≥14分），提示既往或当前可能存在轻躁狂发作特征。特别对于曾有抑郁病史的人群，该结果提示双相情感障碍（如双相II型）的可能性，需引起临床重视。',
        advice: [
          '建议前往三甲医院精神科进行双相障碍排查鉴别',
          '若正在服用抗抑郁药，需警惕单一用药诱发转躁的风险',
          '记录每日睡眠时长与情绪起伏日记'
        ]
      },
      {
        label: '显著轻躁狂特征',
        type: 'severe',
        badgeClass: 'badge-danger',
        min: 21,
        max: 32,
        summary: '您的得分显著偏高（≥21分），表明存在高度集中的轻躁狂或冲动发作特征（如睡眠需求骤降、精力亢奋、言语思维急促、冲动消费或冒险等）。强烈建议由精神科医生进行深入评估。',
        advice: [
          '尽早前往精神科门诊进行系统排查与专业面谈',
          '请身边信任的亲友协助关注日常冲动与安全风险',
          '保持情绪安全支持网络，避免情绪过度激活'
        ]
      }
    ]
  }
};

export default HCL32;
