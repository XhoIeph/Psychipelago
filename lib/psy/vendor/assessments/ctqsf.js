// Vendored from PSYMETRA (js/engine.js, js/assessments/*.js) on 2026-11-12.
// Scoring logic is copied verbatim; only export shims changed. Do not "improve" numbers here.

/**
 * PSYMETRA - CTQ-SF Assessment Definition
 * 童年期创伤问卷简版 (Childhood Trauma Questionnaire - Short Form, CTQ-SF)
 * 国际临床心理学回顾性评估童年期逆境与虐待/忽视的金标准工具 (Bernstein et al., 1998, 2003)
 */

const CTQSF = {
  meta: {
    id: 'ctqsf',
    name: 'CTQ-SF',
    fullName: '童年期创伤问卷简版',
    englishName: 'Childhood Trauma Questionnaire - Short Form',
    category: '创伤经历',
    targetGroups: ['成年人', '受童年原生家庭阴影困扰人群', '慢性抑郁焦虑患者', '创伤后应激障碍 (PTSD/CPTSD) 筛查者', '人格特质探索者'],
    description: '由美国精神病学家 Bernstein 教授编制的国际权威回顾性自评工具。系统评估 18 岁以前成长经历中的情感虐待、躯体虐待、性虐待、情感忽视及躯体忽视五大核心童年逆境维度。',
    instructions: '请回忆您在【童年及青少年时期（18岁之前）】在家庭和成长过程中的真实经历。请依据当时的实际情况，选择最符合的选项。',
    duration: 5,
    timeframe: '18岁以前童年与青少年期'
  },
  defaultOptions: [
    { label: '从不如此', value: 1, desc: '在我的童年成长中从未发生过' },
    { label: '偶尔如此', value: 2, desc: '极少发生，仅有极少数一两次' },
    { label: '有时如此', value: 3, desc: '偶有发生，经历过几次' },
    { label: '经常如此', value: 4, desc: '相当频繁，在童年是常态现象' },
    { label: '总是如此', value: 5, desc: '几乎每天或每时每刻都处于这种环境中' }
  ],
  questions: [
    {
      id: 1,
      text: '在我童年成长过程中，我没有足够的食物吃饱肚子',
      dimension: '躯体忽视',
      reversed: false
    },
    {
      id: 2,
      text: '在我小时候，我身上穿的衣服总是脏兮兮的、破烂的或不合身',
      dimension: '躯体忽视',
      reversed: false
    },
    {
      id: 3,
      text: '我的家人会用非常刻薄难听的话辱骂我、贬低我或嘲笑我',
      dimension: '情感虐待'
    },
    {
      id: 4,
      text: '由于父母或照顾者饮酒过度、成瘾或情绪失控，我常常得不到应有的照顾与看管',
      dimension: '躯体忽视'
    },
    {
      id: 5,
      text: '在成长过程中，有家人让我深深感到自己是被他们真诚深爱着的',
      dimension: '情感忽视',
      reversed: true
    },
    {
      id: 6,
      text: '在我生病或身体受伤时，有家人会及时带我去医院就诊或细心照料我',
      dimension: '躯体忽视',
      reversed: true
    },
    {
      id: 7,
      text: '在成长时期，我觉得我的家人彼此之间非常亲密、互相关怀',
      dimension: '情感忽视',
      reversed: true
    },
    {
      id: 8,
      text: '我的家人曾当着我的面说，如果我从来没有出生在这个世界上就好了',
      dimension: '情感虐待'
    },
    {
      id: 9,
      text: '有家人曾对我进行过极其严重的殴打，以致于我不得不去医院看医生或住院治疗',
      dimension: '躯体虐待'
    },
    {
      id: 10,
      text: '我的家人在对我管教时，会用皮带、木棍、衣架或坚硬物体狠狠抽打我',
      dimension: '躯体虐待'
    },
    {
      id: 11,
      text: '有家人打我打得很重，导致我身上常常留下严重的瘀青、伤痕或红肿印记',
      dimension: '躯体虐待'
    },
    {
      id: 12,
      text: '家人经常因为我身体被暴打造成的伤痕而向外人或学校编造借口掩盖',
      dimension: '躯体虐待'
    },
    {
      id: 13,
      text: '在成长过程中，我感到家人对我内心真正的感受和精神需求非常在乎',
      dimension: '情感忽视',
      reversed: true
    },
    {
      id: 14,
      text: '家人曾对我大吼大叫，称呼我是个“笨蛋”、“废物”、“倒霉鬼”或类似恶劣字眼',
      dimension: '情感虐待'
    },
    {
      id: 15,
      text: '家人打我打得非常狠，以至于我甚至害怕自己可能会被他们活活打死',
      dimension: '躯体虐待'
    },
    {
      id: 16,
      text: '在家里，我常常觉得自己的存在完全是多余的，任何人都不会在乎我',
      dimension: '情感忽视'
    },
    {
      id: 17,
      text: '家人曾掐我、狠狠拽我头发或故意用烫的东西灼伤我',
      dimension: '躯体虐待'
    },
    {
      id: 18,
      text: '家人常常威胁要把我丢弃、赶出家门或让我自生自灭',
      dimension: '情感虐待'
    },
    {
      id: 19,
      text: '在我的童年家庭中，如果我遇到了伤心或委屈的事情，有家人会给予我温暖的心理支持',
      dimension: '情感忽视',
      reversed: true
    },
    {
      id: 20,
      text: '在18岁之前，曾有年龄比我大很多的人对我进行具有性意味的不当身体触碰或抚摸',
      dimension: '性虐待'
    },
    {
      id: 21,
      text: '曾有人利用威胁、强迫或恐吓手段，迫使我参与触碰或观看与性有关的行为',
      dimension: '性虐待'
    },
    {
      id: 22,
      text: '在成长中，我曾被迫保守关于某些令我极度不适的“身体秘密”',
      dimension: '性虐待'
    },
    {
      id: 23,
      text: '曾有人企图强迫或违背我的意愿与我发生性接触或性行为',
      dimension: '性虐待'
    },
    {
      id: 24,
      text: '曾有人向我展示色情内容或裸露私密部位，让我感到极度害怕、恶心或不知所措',
      dimension: '性虐待'
    },
    {
      id: 25,
      text: '我觉得家人是打心底里讨厌我、憎恨我或嫉恨我',
      dimension: '情感虐待'
    },
    {
      id: 26,
      text: '童年时期，家里有人会替我准备好干净温暖的换洗衣物与被褥',
      dimension: '躯体忽视',
      reversed: true
    },
    {
      id: 27,
      text: '在18岁之前，曾有他人对我实施过违背意愿的实质性身体侵犯或性侵害',
      dimension: '性虐待'
    },
    {
      id: 28,
      text: '在童年时代，我深信无论发生什么，我的家庭永远是我安全可靠的避风港',
      dimension: '情感忽视',
      reversed: true
    }
  ],
  scoring: {
    method: 'sum',
    primaryMetricLabel: 'CTQ-SF 童年创伤总粗分',
    primaryMetricUnit: '分',
    minScore: 28,
    maxScore: 140,
    levels: [
      {
        label: '无 / 极轻度童年创伤暴露 (安全常模)',
        type: 'normal',
        badgeClass: 'badge-success',
        min: 28,
        max: 42,
        summary: '您的自评得分处于健康安全成长常模区间（28-42分）。童年成长环境总体具备安全感与充分的情感滋养，未见具有临床意义的严重虐待或忽视痕迹。',
        advice: [
          '保持内在稳定的安全依恋模式与对自我价值的温和信赖',
          '珍视健全的原生家庭支持系统，将健康的爱与支持向外传递'
        ]
      },
      {
        label: '轻度童年逆境经历 (局部创伤暴露)',
        type: 'mild',
        badgeClass: 'badge-info',
        min: 43,
        max: 58,
        summary: '处于轻度童年创伤暴露水平（43-58分）。可能在童年期经历过家庭偶发的情感疏离、过度严厉惩戒或阶段性忽视，偶尔在人际安全感与自我怀疑中产生余波。',
        advice: [
          '识别当下的成人情绪触发点与童年不愉快经历之间的潜意识关联',
          '学习“重新抚育自我”：像一个理想而慈爱的父母一样对待自己脆弱时的内在小孩',
          '与信赖的朋友或伴侣建立稳定、可预期的健康边界与良性沟通'
        ]
      },
      {
        label: '中度童年创伤暴露 (达到临床关注水平)',
        type: 'moderate',
        badgeClass: 'badge-warning',
        min: 59,
        max: 75,
        summary: '您的得分达到了中度童年创伤标准（59-75分）。在成长过程中承受过较为明确且长期的言语虐待、严苛体罚、情感冷漠或界限侵犯，常在成年后表现为高敏感、过度警觉、讨好型人格或低价值感。',
        advice: [
          '建议寻求创伤知情取向 (Trauma-Informed) 或眼动脱敏再加工 (EMDR) 心理咨询师的系统帮助',
          '理解自己当下的“防御机制”（如情绪隔离、战斗逃跑、讨好）曾是童年保护自己活下来的智慧，但现在您可以学会更安全的成年人应对方式',
          '对原生家庭设立坚定的心理物理边界，拒绝继续接受有毒言语侵蚀'
        ]
      },
      {
        label: '重度/极重度复合创伤 (强烈建议专业创伤疗愈)',
        type: 'severe',
        badgeClass: 'badge-danger',
        min: 76,
        max: 140,
        summary: '您的自评得分显著偏高（76-140分），达到重度至极重度童年期复合创伤水平。提示成长环境中存在持续严重的身心虐待、深层情感剥夺或恶劣安全侵害，极易在成人期诱发复杂性创伤后应激障碍 (CPTSD)、边缘性情感波动、躯体化慢性疼痛及解离症状。',
        advice: [
          '强烈建议寻求专业精神科与创伤心理治疗专家的系统联合干预（如体感创伤治疗、EMDR、图式疗法）',
          '童年所发生的一切绝不是您的过错，您无需为照顾者和加害者的失职与暴力承担羞耻感',
          '建立日常情绪着陆技术（Grounding）：感到解离或创伤闪回时，用脚踩实地面、触摸冰水，提醒自己“我现在已经长大，此时此刻我处于安全之中”'
        ]
      }
    ],
    dimensions: [
      {
        name: '情感虐待',
        desc: '评估童年遭受来自家人的言语羞辱、贬低嘲弄、恐吓威胁及恶毒诅咒（5题）。',
        items: [3, 8, 14, 18, 25]
      },
      {
        name: '躯体虐待',
        desc: '评估遭受肢体暴力殴打、器械抽打、留下伤痕瘀青或危及人身安全的暴力惩戒（6题）。',
        items: [9, 10, 11, 12, 15, 17]
      },
      {
        name: '性虐待',
        desc: '评估在18岁之前遭受不当性触碰、强迫性接触、越界隐私暴露或实质性侵害（6题）。',
        items: [20, 21, 22, 23, 24, 27]
      },
      {
        name: '情感忽视',
        desc: '评估成长中缺乏来自家庭的被爱感、情感共情倾听、受挫支持与安全依恋纽带（6题）。',
        items: [5, 7, 13, 16, 19, 28]
      },
      {
        name: '躯体忽视',
        desc: '评估饥饿缺乏食物、衣物破旧脏污、生病缺乏医疗看护或因照顾者失责导致的生理安全匮乏（5题）。',
        items: [1, 2, 4, 6, 26]
      }
    ]
  }
};

export default CTQSF;
