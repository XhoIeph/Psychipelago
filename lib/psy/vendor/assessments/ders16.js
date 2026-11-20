// Vendored from PSYMETRA (js/engine.js, js/assessments/*.js) on 2026-11-12.
// Scoring logic is copied verbatim; only export shims changed. Do not "improve" numbers here.

/**
 * PSYMETRA - DERS-16 Assessment Definition
 * 情绪调节困难量表简版 (Difficulties in Emotion Regulation Scale - 16 Items, DERS-16)
 * 国际临床心理学评估多维情绪失调的金标准测量工具 (Bjureberg et al., 2016)
 */

const DERS16 = {
  meta: {
    id: 'ders16',
    name: 'DERS-16',
    fullName: '情绪调节困难量表简版',
    englishName: 'Difficulties in Emotion Regulation Scale - 16 Items',
    category: '人格评估',
    targetGroups: ['成年人', '受情绪失控困扰人群', '易怒冲动人群', '边缘特质/双相情绪波动者', '内耗与情绪内疚人群'],
    description: '由 Bjureberg 等基于 Gratz 经典模型精炼编制的标准化情绪调节测量工具。全面评估情绪明确性缺失、目标维持困难、冲动失控、对负性情绪的非接纳、以及调节策略匮乏五大核心维度。',
    instructions: '请评估下列句子在多大程度上能够贴切地描述您在近期面对情绪低落、烦躁或困扰时的真实反应。请根据您的第一直觉作答。',
    duration: 3,
    timeframe: '近期日常生活'
  },
  defaultOptions: [
    { label: '几乎从不', value: 1, desc: '0% - 10% 的时间，极少如此' },
    { label: '有时如此', value: 2, desc: '11% - 35% 的时间，偶尔出现' },
    { label: '约半数时间', value: 3, desc: '36% - 65% 的时间，经常发生' },
    { label: '大部分时间', value: 4, desc: '66% - 90% 的时间，绝大多数时候如此' },
    { label: '几乎总是', value: 5, desc: '91% - 100% 的时间，几乎每次必然如此' }
  ],
  questions: [
    {
      id: 1,
      text: '我对自己的感受感到困惑不解，弄不清楚自己心里到底是怎么了',
      dimension: '情绪明确性'
    },
    {
      id: 2,
      text: '我很难理解自己为什么会有这些突如其来的负面情绪',
      dimension: '情绪明确性'
    },
    {
      id: 3,
      text: '当我难过或难受时，我发现自己很难按计划完成必须要做的事情',
      dimension: '目标导向维持'
    },
    {
      id: 4,
      text: '当我心烦意乱时，我感觉自己整个人都彻底失控了',
      dimension: '冲动控制'
    },
    {
      id: 5,
      text: '当我感到难过时，我对自己产生这种软弱感觉感到羞耻或内疚',
      dimension: '非接纳态度'
    },
    {
      id: 6,
      text: '当我情绪低落时，我觉得自己可能永远也无法好起来了',
      dimension: '调节策略匮乏'
    },
    {
      id: 7,
      text: '当我心烦时，我很难集中注意力去进行思考或解决现实任务',
      dimension: '目标导向维持'
    },
    {
      id: 8,
      text: '当我感到烦乱时，我的言行举止往往会脱离自我理智的控制',
      dimension: '冲动控制'
    },
    {
      id: 9,
      text: '当我难过时，我会对自己感到非常恼火、愤怒或厌烦',
      dimension: '非接纳态度'
    },
    {
      id: 10,
      text: '当我心情不好时，我觉得无论自己做什么都不会让我感觉好受一点',
      dimension: '调节策略匮乏'
    },
    {
      id: 11,
      text: '当我心烦时，我很难抑制住自己盲目冲动的破坏性冲动',
      dimension: '冲动控制'
    },
    {
      id: 12,
      text: '当我情绪极度低落时，我觉得自己甚至连最基本的日常琐事都无力应对',
      dimension: '调节策略匮乏'
    },
    {
      id: 13,
      text: '当我难过时，我为自己竟然感到如此脆弱、不堪一击而深感自责',
      dimension: '非接纳态度'
    },
    {
      id: 14,
      text: '当我心情烦闷时，我觉得自己脑中没有任何行之有效的策略来平复它',
      dimension: '调节策略匮乏'
    },
    {
      id: 15,
      text: '当我情绪糟糕时，我很难停下来静下心去思考现实解决途径',
      dimension: '目标导向维持'
    },
    {
      id: 16,
      text: '当我心烦意乱时，我觉得自己最终会彻底情绪崩溃、陷入绝境',
      dimension: '调节策略匮乏'
    }
  ],
  scoring: {
    method: 'sum',
    primaryMetricLabel: 'DERS-16 情绪调节困难总分',
    primaryMetricUnit: '分',
    minScore: 16,
    maxScore: 80,
    levels: [
      {
        label: '情绪调节能力良好 (高情绪韧性)',
        type: 'normal',
        badgeClass: 'badge-success',
        min: 16,
        max: 32,
        summary: '您的自评得分处于健康常模低区间（16-32分）。具备清晰的情绪觉察能力，在遭遇逆境或压力时能够允许情绪流动、维持目标行动力并保有丰富的情绪安抚策略。',
        advice: [
          '继续保持对自身情绪波动的温和接纳态度',
          '在日常高压环境下维持张弛有度的自我关怀习惯'
        ]
      },
      {
        label: '轻度调节波动 (常模平均边缘)',
        type: 'mild',
        badgeClass: 'badge-info',
        min: 33,
        max: 47,
        summary: '处于轻中度情绪调节困难水平（33-47分）。在面临突发危机或慢性压力时，偶感难以专注履职或出现一过性的冲动懊悔，但整体上仍具备基础的自我复原框架。',
        advice: [
          '建立“情绪刹车”习惯：感知到烦躁先兆时进行 90 秒生理叹气深呼吸，阻断自主神经失控链',
          '练习“给情绪贴标签”：将“我完了”转换为“我此刻正感到焦虑”，提升情绪清晰度',
          '梳理自己的正向心理资源清单（如运动、听音乐、散步等）'
        ]
      },
      {
        label: '显著情绪调节困难 (达到临床关注水平)',
        type: 'moderate',
        badgeClass: 'badge-warning',
        min: 48,
        max: 60,
        summary: '您的自评得分达到了显著情绪调节障碍标准（48-60分）。在情绪低落或受挫时，常伴随强烈的自我厌恶批判、行动力瘫痪及冲动失控，往往感觉缺乏可用的自我抚慰手段，严重损耗心身能量与人际关系。',
        advice: [
          '建议寻求辩证行为疗法 (DBT) 或接纳承诺疗法 (ACT) 取向的专业心理咨询支持',
          '学习 DBT 中的痛苦耐受技术（如 TIPP 技巧：冷水洗脸、剧烈运动、渐进放松）',
          '停止对自己的“次级情绪批判”：难过是正常的生理信号，无需为自己产生难过而自责'
        ]
      },
      {
        label: '严重情绪失调 (极高失控风险，建议专业就医)',
        type: 'severe',
        badgeClass: 'badge-danger',
        min: 61,
        max: 80,
        summary: '您的自评得分高度显著（61-80分），提示存在极严重的情绪调节紊乱。强烈的情绪风暴极易诱发彻底的冲动崩溃、毁灭性自责或解离瘫痪，常与边缘人格障碍、重度抑郁或复杂创伤 (CPTSD) 紧密相关。',
        advice: [
          '强烈建议前往精神心理专科门诊接受全面评估，排查心境障碍或人格特质共病',
          '建立个人危机安全防护网：在情绪濒临崩溃时有可靠的求助联系人或热线（400-161-9995）',
          '系统性参与 DBT 情绪调节技能训练团体，逐步重建情绪安全感'
        ]
      }
    ],
    dimensions: [
      {
        name: '情绪明确性',
        desc: '评估能否清晰辨识自身情绪类型、理解情绪产生原因的能力（2题）。',
        items: [1, 2]
      },
      {
        name: '目标导向维持',
        desc: '评估在面对情绪痛苦时能否抵抗拖延瘫痪、继续专注完成既定现实目标（3题）。',
        items: [3, 7, 15]
      },
      {
        name: '冲动控制',
        desc: '评估在情绪波动剧烈时能否维持行为理智、避免冲动失控与破坏性言行（3题）。',
        items: [4, 8, 11]
      },
      {
        name: '非接纳态度',
        desc: '评估对自身负面情绪的羞耻感、内疚自责及自我攻击等次级反应（3题）。',
        items: [5, 9, 13]
      },
      {
        name: '调节策略匮乏',
        desc: '评估在情绪痛苦时是否感到无计可施、深信自己绝不可能恢复平静的绝望感（5题）。',
        items: [6, 10, 12, 14, 16]
      }
    ]
  }
};

export default DERS16;
