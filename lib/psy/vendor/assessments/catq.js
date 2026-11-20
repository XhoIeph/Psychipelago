// Vendored from PSYMETRA (js/engine.js, js/assessments/*.js) on 2026-11-12.
// Scoring logic is copied verbatim; only export shims changed. Do not "improve" numbers here.

/**
 * PSYMETRA - Assessment Definition: CAT-Q
 * Camouflaging Autistic Traits Questionnaire (Laura Hull et al., 2019)
 * 自闭特质伪装与掩饰问卷 (25 题，涵盖补偿、掩饰与同化融入 3 大维度，7 点计分)
 */

const CATQ = {
  meta: {
    id: 'catq',
    name: 'CAT-Q',
    fullName: '自闭特质伪装与掩饰问卷',
    englishName: 'Camouflaging Autistic Traits Questionnaire',
    category: '神经发育/ASD',
    timeframe: '日常社交情境',
    duration: 8,
    instructions: '请仔细阅读下列每一项陈述，并选择最符合您在日常社交互动中真实体验与做法的选项（1分代表非常不同意，7分代表非常同意）。',
    description: '伦敦大学学院（UCL）研发的自闭谱系“社交拟态与伪装”国际金标准量表，深入测评补偿（主动学习技巧）、掩饰（压抑自闭特质）与同化（被迫表演融入）三大维度，揭示高功能自闭者背后的深层精神耗竭与职业倦怠风险。'
  },

  defaultOptions: [
    { label: '非常不同意', desc: '完全不符合我的日常行为与感受', value: 1 },
    { label: '不同意', desc: '大部分情况下不符合', value: 2 },
    { label: '有点不同意', desc: '略微偏向不符合', value: 3 },
    { label: '既不同意也不反对', desc: '处于中间状态，无明显偏向', value: 4 },
    { label: '有点同意', desc: '略微偏向符合我的一些做法', value: 5 },
    { label: '同意', desc: '多数情况下确实会这样做', value: 6 },
    { label: '非常同意', desc: '完全贴合我极度真实的社交表演状态', value: 7 }
  ],

  scoring: {
    method: 'sum',
    minScore: 25,
    maxScore: 175,
    primaryMetricLabel: 'CAT-Q 伪装总分',
    primaryMetricUnit: '分',
    dimensions: [
      {
        id: 'compensation',
        name: '补偿策略 (Compensation)',
        desc: '主动通过理智排练、观察模仿影剧书籍或预备对话脚本，来弥补社交直觉的不足',
        items: [1, 4, 5, 8, 11, 14, 17, 20, 23]
      },
      {
        id: 'masking',
        name: '掩饰控制 (Masking)',
        desc: '刻意压抑自身的自我刺激（Stimming）、强迫眼神对视、维持讨喜的面部表情与肢体姿势',
        items: [2, 6, 9, 12, 15, 18, 21, 24]
      },
      {
        id: 'assimilation',
        name: '同化融入 (Assimilation)',
        desc: '在社交情境中感到宛若“在台上演戏”，承受巨大的被迫融入压力并处于持续耗能状态',
        items: [3, 7, 10, 13, 16, 19, 22, 25]
      }
    ],
    levels: [
      {
        min: 25,
        max: 75,
        label: '低度伪装 (社交自然真实)',
        type: 'normal',
        badgeClass: 'badge-success',
        summary: '您的 CAT-Q 伪装总分处于较低区间。在与人交往时，您很少需要强迫自己压抑本能或预先背诵对话脚本，能够以自然、真实且轻松的面貌参与社交，未产生高强度的“社交拟态内耗”。',
        advice: '保持健康的真实表达，尊重并保护自己舒适的人际社交边界。'
      },
      {
        min: 76,
        max: 100,
        label: '中等程度伪装 (典型常规社交适应)',
        type: 'mild',
        badgeClass: 'badge-info',
        summary: '您的得分处于神经典型成年人的人群常模平均水平。您在部分职场或陌生正式场合会适当注意礼节、修饰表情或准备谈资，但日常社交后一般能较快恢复，心理损耗处于合理可控范围。',
        advice: '定期留出不被打扰的独处时光释放压力；在信任的好友面前卸下社交礼仪防卫，享受真实连接。'
      },
      {
        min: 101,
        max: 125,
        label: '高水平特质伪装 (显著自闭拟态耗竭)',
        type: 'moderate',
        badgeClass: 'badge-warning',
        summary: '您的得分已达到显著的高伪装水平。为了在神经典型社会中显得“正常”并不被孤立，您常年消耗极其庞大的心智认知资源来精心排练对话、强迫眼神接触并压抑本能动作，这常常导致深层的社交耗竭感与身份认同困惑。',
        advice: '警惕长期高强度伪装诱发的“自闭症职业倦怠（Autistic Burnout）”与抑郁焦虑；建议逐步寻找安全的“脱具”环境，探索真实的自我认同与神经多样性社群支持。'
      },
      {
        min: 126,
        max: 175,
        label: '极高强度伪装与拟态 (深度透支超载，高度倦怠预警)',
        type: 'severe',
        badgeClass: 'badge-danger',
        summary: '您的得分处于极高强度的伪装超载区间。您的整个人格在社交中几乎完全处于高度紧绷的“舞台表演模式”，严重压抑本性与感官需求，神经系统长期超负荷运转，极易诱发严重的精神崩溃（Meltdown/Shutdown）或慢性创伤。',
        advice: '强烈建议您寻求理解成年自闭特质（尤其是女性及高掩饰表型）的心理专业人士支持，学习设立明确的社交保护边界，系统性制定“心理去负荷与防倦怠计划”。'
      }
    ]
  },

  questions: [
    {
      id: 1,
      text: '当我与人互动时，我会刻意模仿对方的肢体语言或面部表情。',
      dimension: '补偿策略 (Compensation)'
    },
    {
      id: 2,
      text: '我会留意自己的肢体语言或面部表情，使自己看起来放松。',
      dimension: '掩饰控制 (Masking)'
    },
    {
      id: 3,
      text: '我很少觉得有需要为了应付社交场合而演戏。',
      reversed: true,
      dimension: '同化融入 (Assimilation)'
    },
    {
      id: 4,
      text: '我已经制定了一套在社交场合遵循的脚本（例如，一份问题或谈话话题的清单）。',
      dimension: '补偿策略 (Compensation)'
    },
    {
      id: 5,
      text: '我会以最初听到的完全相同方式，重复我听过别人说的句子。',
      dimension: '补偿策略 (Compensation)'
    },
    {
      id: 6,
      text: '我会调整自己的肢体语言或面部表情，使与我互动的人觉得我对他们感兴趣。',
      dimension: '掩饰控制 (Masking)'
    },
    {
      id: 7,
      text: '在社交场合中，我觉得自己是在“表演”，而不是做自己。',
      dimension: '同化融入 (Assimilation)'
    },
    {
      id: 8,
      text: '在自己的社交互动中，我会使用从观察别人互动时学到的行为。',
      dimension: '补偿策略 (Compensation)'
    },
    {
      id: 9,
      text: '我总是会思考自己给别人留下什么印象。',
      dimension: '掩饰控制 (Masking)'
    },
    {
      id: 10,
      text: '我需要他人的支持才能进行社交。',
      dimension: '同化融入 (Assimilation)'
    },
    {
      id: 11,
      text: '我会练习自己的面部表情和肢体语言，以确保它们看起来自然。',
      dimension: '补偿策略 (Compensation)'
    },
    {
      id: 12,
      text: '如果我不想，我不觉得有需要与他人作眼神接触。',
      reversed: true,
      dimension: '掩饰控制 (Masking)'
    },
    {
      id: 13,
      text: '当我身处社交场合时，我必须强迫自己与人互动。',
      dimension: '同化融入 (Assimilation)'
    },
    {
      id: 14,
      text: '我曾尝试通过观察他人来改善自己对社交技巧的理解。',
      dimension: '补偿策略 (Compensation)'
    },
    {
      id: 15,
      text: '我会留意自己的肢体语言或面部表情，使与我互动的人觉得我对他们感兴趣。',
      dimension: '掩饰控制 (Masking)'
    },
    {
      id: 16,
      text: '身处社交场合时，我会尝试寻找避免与他人互动的方法。',
      dimension: '同化融入 (Assimilation)'
    },
    {
      id: 17,
      text: '我曾研究社交互动的规则（例如，研读心理学或阅读有关人类行为的书籍），以改善自己的社交技巧。',
      dimension: '补偿策略 (Compensation)'
    },
    {
      id: 18,
      text: '我总是意识到自己给别人留下什么印象。',
      dimension: '掩饰控制 (Masking)'
    },
    {
      id: 19,
      text: '当我与他人在一起时，我感到可以自在地做自己。',
      reversed: true,
      dimension: '同化融入 (Assimilation)'
    },
    {
      id: 20,
      text: '我通过观看电视或电影，或阅读小说，学习人们如何运用身体和面部来互动。',
      dimension: '补偿策略 (Compensation)'
    },
    {
      id: 21,
      text: '我会调整自己的肢体语言或面部表情，使自己看起来放松。',
      dimension: '掩饰控制 (Masking)'
    },
    {
      id: 22,
      text: '当与他人交谈时，我觉得对话自然流畅。',
      reversed: true,
      dimension: '同化融入 (Assimilation)'
    },
    {
      id: 23,
      text: '我曾花时间从电视节目和电影中学习社交技巧，并尝试在互动中运用这些技巧。',
      dimension: '补偿策略 (Compensation)'
    },
    {
      id: 24,
      text: '在社交互动中，我不会留意自己的脸部或身体在做什么。',
      reversed: true,
      dimension: '掩饰控制 (Masking)'
    },
    {
      id: 25,
      text: '在社交场合中，我觉得自己在假装“正常”。',
      dimension: '同化融入 (Assimilation)'
    }
  ]
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CATQ;
}

export default CATQ;
