// Vendored from PSYMETRA (js/engine.js, js/assessments/*.js) on 2026-11-12.
// Scoring logic is copied verbatim; only export shims changed. Do not "improve" numbers here.

/**
 * PSYMETRA - RSES Assessment Definition
 * 罗森伯格自尊量表 (Rosenberg Self-Esteem Scale, RSES)
 * 国际心理学与社会科学领域引用最为广泛的经典自尊测量工具 (Rosenberg, 1965)
 */

const RSES = {
  meta: {
    id: 'rses',
    name: 'RSES',
    fullName: '罗森伯格自尊量表',
    englishName: 'Rosenberg Self-Esteem Scale',
    category: '人格评估',
    targetGroups: ['青少年', '大学生', '成年人', '受自卑或自我否定困扰人群', '情绪易感人群'],
    description: '由美国著名社会心理学家 Morris Rosenberg 编制的全球权威自尊评定工具。用于测定个体对自我价值、自我接纳及自我肯定水平的整体积极感受。',
    instructions: '请仔细阅读以下陈述，根据您的真实感受选择最符合您对自己看法的选项。请凭第一直觉作答，答案无所谓对错好坏。',
    duration: 2,
    timeframe: '日常稳定感受',
    references: {
      original: [
        'Rosenberg, M. (1965). Society and the adolescent self-image. Princeton University Press.'
      ],
      chineseValidation: [
        '汪向东, 王希林, 马弘. (1999). 心理卫生评定量表手册 (增订版): 罗森伯格自尊量表. 中国心理卫生杂志社.'
      ]
    }
  },
  defaultOptions: [
    { label: '非常不同意', value: 1, desc: '强烈反对该说法' },
    { label: '不同意', value: 2, desc: '大致不符合自身情况' },
    { label: '同意', value: 3, desc: '大致符合自身情况' },
    { label: '非常同意', value: 4, desc: '完全赞同该说法' }
  ],
  questions: [
    {
      id: 1,
      text: '总的来说，我对自己感到满意。',
      reversed: false,
      dimension: '自我肯定与价值感'
    },
    {
      id: 2,
      text: '我有时觉得我完全不行，觉得自己一无是处。',
      reversed: true,
      dimension: '自我贬损抵抗力'
    },
    {
      id: 3,
      text: '我觉得我有许多长处和优点。',
      reversed: false,
      dimension: '自我肯定与价值感'
    },
    {
      id: 4,
      text: '我能够做到像大多数人那样好。',
      reversed: false,
      dimension: '自我肯定与价值感'
    },
    {
      id: 5,
      text: '我觉得我身上没有什么值得自己自豪的。',
      reversed: true,
      dimension: '自我贬损抵抗力'
    },
    {
      id: 6,
      text: '我有时确实觉得自己毫无用处。',
      reversed: true,
      dimension: '自我贬损抵抗力'
    },
    {
      id: 7,
      text: '我觉得我是一个有价值的人，至少与别人同等。',
      reversed: false,
      dimension: '自我肯定与价值感'
    },
    {
      id: 8,
      text: '我希望我能够更多地尊重我自己。',
      reversed: true,
      dimension: '自我贬损抵抗力'
    },
    {
      id: 9,
      text: '总而言之，我容易觉得自己是一个失败者。',
      reversed: true,
      dimension: '自我贬损抵抗力'
    },
    {
      id: 10,
      text: '我对自己抱有一贯积极的态度。',
      reversed: false,
      dimension: '自我肯定与价值感'
    }
  ],
  scoring: {
    method: 'sum',
    primaryMetricLabel: 'RSES 自尊整体总分',
    primaryMetricUnit: '分',
    minScore: 10,
    maxScore: 40,
    levels: [
      {
        label: '低自尊水平 (自我接纳与价值感偏低)',
        type: 'severe',
        badgeClass: 'badge-warning',
        min: 10,
        max: 20,
        summary: '您的自尊总分偏低（10-20分）。提示您在自我评价中倾向于过分苛责自身、经常体验到深深的自卑与无力感，对他人评价过度敏感脆弱。长期的低自尊常是抑郁、社交焦虑及情绪内耗的重要易感源。',
        advice: [
          '识别脑海中的“内在批判者”声音，尝试以对待挚友的温柔口吻与自己对话',
          '建立《微小成就与优点清单》，每天记录2-3件自己做成或付出了努力的琐事',
          '学会划定人际心理边界，避免通过无底线迎合讨好别人来换取外部认同',
          '若长期的自我否定导致深重抑郁情绪，建议寻求认知行为心理咨询以重构核心自我信念'
        ]
      },
      {
        label: '中等自尊水平 (健康常模平均范围)',
        type: 'mild',
        badgeClass: 'badge-info',
        min: 21,
        max: 29,
        summary: '您的自评得分处于一般人群的常模平均区间（21-29分）。多数情况下您能够客观认可自己的能力与长处，但在面临重大挫折、批评或与他人高强度横向比较时，自我价值感仍可能会出现短暂动摇。',
        advice: [
          '接纳不完美是人类共有的常态，区分“事情没做好”与“我整个人没有价值”',
          '发展多元化的自我价值支撑支柱（工作、爱好、友谊、健康），避免单一维度的挫败导致全面否定',
          '在遭遇挫折时练习“自我同情” (Self-Compassion)，允许自己暂时休整与不适'
        ]
      },
      {
        label: '高自尊水平 (健全自信与良好自我认同)',
        type: 'normal',
        badgeClass: 'badge-success',
        min: 30,
        max: 40,
        summary: '您的自尊总分处于优秀高位（30-40分）。表现出健康坚韧的自我认同与自我肯定，深信自身具备独立且不可剥夺的内在价值。在面对逆境与批评时具备优秀的心理弹性，不易陷入消极自我贬低。',
        advice: [
          '保持现有的从容自信与开放包容心态',
          '警惕健康的真自尊与防御性虚荣自负的区别，在自我肯定的同时真诚倾听建设性反馈',
          '用内在的丰盈力量赋能身边人，营造相互支持接纳的温暖人际环境'
        ]
      }
    ],
    dimensions: [
      {
        name: '自我肯定与价值感',
        desc: '评估对自身优点、整体满意度、平等价值感及一贯积极自我态度的认同程度。',
        items: [1, 3, 4, 7, 10]
      },
      {
        name: '自我贬损抵抗力',
        desc: '评估抵御“一无是处”、“失败者”、“毫无自豪感”等消极自我贬低信念的心智防卫能力。',
        items: [2, 5, 6, 8, 9]
      }
    ]
  }
};

export default RSES;
