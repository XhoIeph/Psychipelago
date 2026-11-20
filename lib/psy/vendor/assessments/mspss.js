// Vendored from PSYMETRA (js/engine.js, js/assessments/*.js) on 2026-11-12.
// Scoring logic is copied verbatim; only export shims changed. Do not "improve" numbers here.

/**
 * PSYMETRA - MSPSS Assessment Definition
 * 领悟社会支持量表 (Multidimensional Scale of Perceived Social Support, MSPSS)
 * 国际心理学与心身医学评估人际社会支持资源的金标准工具 (Zimet et al., 1988; 姜乾金修订)
 */

const MSPSS = {
  meta: {
    id: 'mspss',
    name: 'MSPSS',
    fullName: '领悟社会支持量表',
    englishName: 'Multidimensional Scale of Perceived Social Support',
    category: '社会支持',
    targetGroups: ['成年人', '受孤独感/人际孤立困扰人群', '面临重大压力适应期人群', '心理亚健康自查者', '心理韧性探索者'],
    description: '由 Zimet 教授等于 1988 年编制，是国际临床心理学评估个体对外界支持感知程度的公认标准工具。全面评估来自家庭、朋友以及生命中其他重要他人（伴侣、师长等）三大维度的主观理解与情感物质支持。',
    instructions: '请根据您【当下的真实人际体验与内心感受】，评估以下陈述与您的符合程度。请根据您的第一直觉作答。',
    duration: 3,
    timeframe: '当前及近期的日常生活与人际体验'
  },
  defaultOptions: [
    { label: '极不同意', value: 1, desc: '完全不符合我的感受' },
    { label: '很不同意', value: 2, desc: '很不赞同' },
    { label: '稍不同意', value: 3, desc: '稍微有一点不赞同' },
    { label: '中立', value: 4, desc: '既不赞同也不反对' },
    { label: '稍同意', value: 5, desc: '稍微有点赞同' },
    { label: '很同意', value: 6, desc: '非常赞同' },
    { label: '极同意', value: 7, desc: '完全符合，极其赞同' }
  ],
  questions: [
    {
      id: 1,
      text: '在我需要时，总有一个特别重要的人（如伴侣、良师、挚友或敬重者）陪伴在我身旁',
      dimension: '重要他人支持'
    },
    {
      id: 2,
      text: '在我的生活中，有一个特别重要的人真诚愿意与我分享我的快乐与悲伤',
      dimension: '重要他人支持'
    },
    {
      id: 3,
      text: '我的家庭能够切实给我提供实际而具体的关照、帮助与支持',
      dimension: '家庭支持'
    },
    {
      id: 4,
      text: '当我遇到困难与挫折时，我能从我的家庭获得温暖而坚定的情感慰藉',
      dimension: '家庭支持'
    },
    {
      id: 5,
      text: '在我的生命中，有一个特别重要的人是我真正的安心慰藉来源',
      dimension: '重要他人支持'
    },
    {
      id: 6,
      text: '我的朋友们真诚地愿意在需要时向我伸出援手、提供帮助',
      dimension: '朋友支持'
    },
    {
      id: 7,
      text: '当事情进展不顺利时，我可以毫无顾忌地依靠和信任我的朋友们',
      dimension: '朋友支持'
    },
    {
      id: 8,
      text: '我可以与我的家人开诚布公、毫无芥蒂地谈论我遇到的真实问题',
      dimension: '家庭支持'
    },
    {
      id: 9,
      text: '在生活中，我有可以彼此毫无保留分享生活喜怒哀乐的知心朋友',
      dimension: '朋友支持'
    },
    {
      id: 10,
      text: '在我的生活中，有一个特别重要的人非常在乎我的感受与内心情绪',
      dimension: '重要他人支持'
    },
    {
      id: 11,
      text: '我的家庭真诚地愿意帮助我做出生活中的各项重大决策',
      dimension: '家庭支持'
    },
    {
      id: 12,
      text: '我可以向我的朋友们畅所欲言地倾诉我内心的烦恼与脆弱',
      dimension: '朋友支持'
    }
  ],
  scoring: {
    method: 'sum',
    primaryMetricLabel: 'MSPSS 领悟社会支持总分',
    primaryMetricUnit: '分 (12 - 84)',
    minScore: 12,
    maxScore: 84,
    levels: [
      {
        label: '低社会支持水平 (感到孤立无援)',
        type: 'severe',
        badgeClass: 'badge-danger',
        min: 12,
        max: 36,
        summary: '您的自评得分处于较低区间（12-36分，条目均分 < 3.0）。提示在主观感知上感到缺乏可依赖的社会人际资源，面临困境时往往感到孤立无援、缺乏深层倾听与接纳，对心身压力耐受构成了较大挑战。',
        advice: [
          '请记住：人际支持不仅包括现成的家庭与老友，还可以主动向外拓展安全的社交圈',
          '尝试寻找具备相同兴趣爱好或生活境遇的支持性团体（如读书会、户外运动群、同行互助组）',
          '在感到极度孤独无助时，可以寻求专业心理咨询师建立起安全稳定的专业咨访同盟'
        ]
      },
      {
        label: '中等社会支持水平 (具备基础支持网络)',
        type: 'mild',
        badgeClass: 'badge-info',
        min: 37,
        max: 60,
        summary: '得分处于中等常模区间（37-60分，条目均分 3.0-5.0）。表明您在生活中拥有一定的人际资源与倾诉渠道，在遇到重大危机时能够寻求到局部帮助，但可能在某些特定维度（如家庭理解或知己深度）上仍抱有期望。',
        advice: [
          '识别您人际支持中最稳固的“锚点”（如某位好友或某位家庭成员），用心维护高质量的深度联结',
          '练习主动表达脆弱：很多时候身边人并非不愿支持，而是不知道您当前正需要帮助',
          '在索取支持的同时，也主动向他人提供及时的关怀与温暖'
        ]
      },
      {
        label: '高社会支持水平 (坚实的心理保护屏障)',
        type: 'normal',
        badgeClass: 'badge-success',
        min: 61,
        max: 84,
        summary: '您的自评得分处于高水平区间（61-84分，条目均分 ≥ 5.1）。提示您拥有极其充实、稳固且多元的社会人际支持网络。来自家庭、挚友或重要伴侣的真诚关照构成了强大的心理韧性保护因子，能有效缓冲抑郁与焦虑压力。',
        advice: [
          '珍视并感恩身边的优质人际网络，继续维持双向奔赴的健康人际互动',
          '将内心的丰沛滋养转化为助人行动，在社群中传递温暖力量'
        ]
      }
    ],
    dimensions: [
      {
        name: '家庭支持',
        desc: '感知来自家庭的实际关照、情感慰藉、坦诚倾听与决策帮助（4题，4-28分）。',
        items: [3, 4, 8, 11]
      },
      {
        name: '朋友支持',
        desc: '感知来自朋友群体的关键援手、患难依靠、知己分享与烦恼倾听（4题，4-28分）。',
        items: [6, 7, 9, 12]
      },
      {
        name: '重要他人支持',
        desc: '感知来自伴侣、导师、挚友或特别长辈的亲密陪伴、专属关切与深度慰藉（4题，4-28分）。',
        items: [1, 2, 5, 10]
      }
    ]
  }
};

export default MSPSS;
