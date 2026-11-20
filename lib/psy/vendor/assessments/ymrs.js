// Vendored from PSYMETRA (js/engine.js, js/assessments/*.js) on 2026-11-12.
// Scoring logic is copied verbatim; only export shims changed. Do not "improve" numbers here.

/**
 * PSYMETRA - YMRS Assessment Definition
 * 杨氏躁狂评定量表 (Young Mania Rating Scale)
 * Young et al. (1978) 经典躁狂临床评定金标准量表
 */

const YMRS = {
  meta: {
    id: 'ymrs',
    name: 'YMRS',
    fullName: '杨氏躁狂评定量表',
    englishName: 'Young Mania Rating Scale',
    category: '双相/躁狂',
    targetGroups: ['精神科医师/临床心理师', '成人双相情感障碍患者', '躁狂/轻躁狂期患者', '临床试验与科研评估对象'],
    description: '由 Young 等学者于 1978 年编制，是国际精神医学领域评估躁狂症状严重程度的金标准临床评定量表。广泛用于双相障碍急性期病情分级、住院监测及心境稳定剂疗效评估。',
    instructions: '根据受试者在过去 48 小时内的临床交谈表现、行为观察及主观体验进行评定。请仔细阅读每一项各等级的具体行为锚定描述，选择最符合受试者症状严重程度的一个选项。注意：第 5、6、8、9 项采用双倍权重计分（0, 2, 4, 6, 8 分）。',
    duration: 8,
    pageSize: 6,
    timeframe: '过去 48 小时（或最近一周）',
    references: {
      original: [
        'Young, R. C., Biggs, J. T., Ziegler, V. E., & Meyer, D. A. (1978). A rating scale for mania: reliability, validity and sensitivity. The British Journal of Psychiatry, 133(5), 429-435.'
      ],
      chineseValidation: [
        '郑延平, 等. (1984). 杨氏躁狂评定量表的信度和效度. 中华神经精神科杂志, 17(3), 150-153.'
      ]
    }
  },
  questions: [
    {
      id: 1,
      text: '1. 情绪高涨 (Elevated Mood)：',
      dimension: '核心心境与活力',
      options: [
        { label: '0分：无高涨', value: 0, desc: '情绪正常，心境基线平稳。' },
        { label: '1分：轻度可能高涨', value: 1, desc: '轻度或仅在被提问探讨时可觉察到的情绪偏高、幽默感增多。' },
        { label: '2分：明确的主观高涨', value: 2, desc: '明显主观情绪高涨；异常乐观自信，言语幽默欢快，与处境轻度不协调。' },
        { label: '3分：显著高涨不协调', value: 3, desc: '情绪显著高昂；与现实处境明显不符；经常开玩笑、讲笑话、大声欢笑。' },
        { label: '4分：极度狂喜狂欢', value: 4, desc: '极度狂喜；歌唱、欢呼、手舞足蹈，难以制止的狂欢情绪爆发。' }
      ]
    },
    {
      id: 2,
      text: '2. 精神运动性兴奋/活力增加 (Increased Motor Activity-Energy)：',
      dimension: '核心心境与活力',
      options: [
        { label: '0分：无增加', value: 0, desc: '动作、活动量及体力处于平时正常水平。' },
        { label: '1分：主观活力充沛', value: 1, desc: '主观感觉精力旺盛、活力充沛，可能稍有活动量增加。' },
        { label: '2分：精力过盛活跃', value: 2, desc: '明显精力过盛，肢体动作频繁，手势夸张，动作敏捷迅速。' },
        { label: '3分：过度活跃坐立不安', value: 3, desc: '过度活跃，走动频繁，难以静坐，坐立不安，不断变换姿势。' },
        { label: '4分：极度兴奋躁动', value: 4, desc: '极度兴奋躁动；马不停蹄，动作狂乱，甚至需要躯体约束或紧急镇静。' }
      ]
    },
    {
      id: 3,
      text: '3. 性欲与性趣 (Sexual Interest)：',
      dimension: '核心心境与活力',
      options: [
        { label: '0分：无增加', value: 0, desc: '性兴趣与性需求处于平时正常水平。' },
        { label: '1分：轻微增强', value: 1, desc: '主观感觉性欲或性吸引力较平时稍有增强。' },
        { label: '2分：明显活跃', value: 2, desc: '谈话中自发提及性话题或带有性意味的玩笑，性兴趣显著活跃。' },
        { label: '3分：毫无顾忌谈性/调情', value: 3, desc: '毫无顾忌地自发谈论性话题，向他人公开调情或有轻度性轻浮举动。' },
        { label: '4分：公开不当性言行/性暴露', value: 4, desc: '公开且极度不当的性挑逗言行、性暴露或过度放纵的性行为。' }
      ]
    },
    {
      id: 4,
      text: '4. 睡眠需求 (Sleep)：',
      dimension: '核心心境与活力',
      options: [
        { label: '0分：无减少', value: 0, desc: '睡眠需求无减少，睡眠时间处于平时正常水平。' },
        { label: '1分：少睡不超过1小时', value: 1, desc: '睡眠时间比平时少睡 1 小时以内，但白天仍精力充沛。' },
        { label: '2分：少睡1至2小时', value: 2, desc: '睡眠时间比平时少睡 1 至 2 小时，白天毫无困倦感。' },
        { label: '3分：少睡2小时以上', value: 3, desc: '睡眠时间比平时减少 2 小时以上（如每晚仅睡 2-4 小时）。' },
        { label: '4分：完全不需要睡眠', value: 4, desc: '几乎完全不需要睡眠，整夜不睡但白天依然精力极度充沛。' }
      ]
    },
    {
      id: 5,
      text: '5. 易激惹 (Irritability) 【双倍计分】：',
      dimension: '攻击性与易激惹',
      options: [
        { label: '0分：无易激惹', value: 0, desc: '态度平和有礼，情绪反应温和协调。' },
        { label: '2分：轻度不耐烦', value: 2, desc: '主观感到有些急躁或轻度不耐烦，但交谈时基本能克制。' },
        { label: '4分：明显敌意或易怒', value: 4, desc: '面部表情或言辞偶有明显敌意或急躁易怒；但仍可被安慰劝导平息。' },
        { label: '6分：频繁激惹/态度粗暴', value: 6, desc: '频繁表现出明显激惹与愤怒；态度生硬粗暴，对提问不耐烦；不易安抚。' },
        { label: '8分：极度愤怒/不可遏制', value: 8, desc: '极度愤怒与狂暴易激惹；完全无法合作，咆哮大骂，甚至发生威胁与推搡。' }
      ]
    },
    {
      id: 6,
      text: '6. 言语速度与数量 (Speech - Rate and Amount) 【双倍计分】：',
      dimension: '言语与思维过程',
      options: [
        { label: '0分：言语正常', value: 0, desc: '言语速度与数量处于正常水平。' },
        { label: '2分：说话稍多偏快', value: 2, desc: '感觉说话略多，语速稍快，显得很有倾诉欲。' },
        { label: '4分：明显话多且快', value: 4, desc: '明显言语增多，滔滔不绝；语速快，别人有时插话困难。' },
        { label: '6分：言语迫促难以打断', value: 6, desc: '持续言语迫促 (Push of speech)；语速极快，声音洪亮，极难打断。' },
        { label: '8分：滔滔不绝完全无法打断', value: 8, desc: '滔滔不绝完全无法打断；语速飞快甚至喊叫咆哮，他人根本无法插言。' }
      ]
    },
    {
      id: 7,
      text: '7. 语言思维障碍/思维奔逸 (Language-Thought Disorder)：',
      dimension: '言语与思维过程',
      options: [
        { label: '0分：思维条理连贯', value: 0, desc: '思维逻辑连贯，条理清晰，目标明确。' },
        { label: '1分：思维敏捷轻度离题', value: 1, desc: '思维敏捷，联想丰富，偶尔出现轻度的离题或跳跃。' },
        { label: '2分：思维奔逸随境转移', value: 2, desc: '明显的联想加速或思维奔逸；注意力极易随外界声光刺激转移。' },
        { label: '3分：意念飘忽连贯性受损', value: 3, desc: '显著的意念飘忽 (Flight of ideas)；话题跳跃频繁，逻辑连贯性明显受损。' },
        { label: '4分：思维破裂语无伦次', value: 4, desc: '思维完全破裂，语无伦次，出现字词拼凑或无法理解的音韵/字面联想。' }
      ]
    },
    {
      id: 8,
      text: '8. 思维内容/夸大观念与妄想 (Thought Content) 【双倍计分】：',
      dimension: '现实检验力与自知力',
      options: [
        { label: '0分：无夸大观念', value: 0, desc: '无夸大观念，现实检验力良好，对自身定位客观。' },
        { label: '2分：盲目自信乐观', value: 2, desc: '略显盲目自负，计划过多，过于雄心勃勃或乐观。' },
        { label: '4分：明显夸大自命不凡', value: 4, desc: '明显的夸大观念或自命不凡；计划极不现实；自认拥有非凡才华或特殊地位。' },
        { label: '6分：明确夸大妄想', value: 6, desc: '明确的夸大妄想（如自称身家巨富、有神明启示或特殊神通），具有不可动摇的坚信感。' },
        { label: '8分：离奇妄想伴随幻觉', value: 8, desc: '离奇荒谬的夸大妄想，常伴随听幻觉等精神病性体验；妄想完全主导其生活行为。' }
      ]
    },
    {
      id: 9,
      text: '9. 破坏/攻击行为 (Disruptive-Aggressive Behavior) 【双倍计分】：',
      dimension: '攻击性与易激惹',
      options: [
        { label: '0分：合作无攻击', value: 0, desc: '举止得体，完全合作，无破坏或攻击性言行。' },
        { label: '2分：态度讽刺生硬', value: 2, desc: '态度冷嘲热讽，偶尔大声抗议或语气尖锐，但无实际破坏。' },
        { label: '4分：喧闹争吵干扰环境', value: 4, desc: '敲桌子、用力摔门、大声喧闹争吵；对周围环境造成明显干扰。' },
        { label: '6分：砸碎毁物言语威胁', value: 6, desc: '明显的破坏毁物行为（如砸碎物品、撕毁文档）或严重言语躯体威胁。' },
        { label: '8分：严重躯体攻击伤害', value: 8, desc: '严重的躯体攻击伤害他人或极度破坏财物；需要紧急身体约束与隔离。' }
      ]
    },
    {
      id: 10,
      text: '10. 外表与装束 (Appearance)：',
      dimension: '现实检验力与自知力',
      options: [
        { label: '0分：衣着整洁得体', value: 0, desc: '衣着打扮整洁得体，符合常态与社交场合。' },
        { label: '1分：略显花哨随意', value: 1, desc: '装扮略显花哨、随意、不拘小节或稍显不修边幅。' },
        { label: '2分：明显不得体/浓艳', value: 2, desc: '衣着明显不得体；颜色过于艳丽夸张，妆容浓艳或风格极不协调。' },
        { label: '3分：怪异饰品/衣衫不整', value: 3, desc: '蓬头垢面、衣衫不整，或饰品怪异、过度佩戴多件夸张奇异饰物。' },
        { label: '4分：衣不蔽体/奇装异服', value: 4, desc: '衣不遮体、奇装异服，完全不顾社会习俗与羞耻规范。' }
      ]
    },
    {
      id: 11,
      text: '11. 自知力 (Insight)：',
      dimension: '现实检验力与自知力',
      options: [
        { label: '0分：自知力完整', value: 0, desc: '自知力完整；充分认识到自己处于疾病发作状态且需要接受医学治疗。' },
        { label: '1分：承认过度但否认病态', value: 1, desc: '承认自己目前情绪过度亢奋或睡眠不好，但并不认为属于疾病状态。' },
        { label: '2分：归咎外界他人', value: 2, desc: '承认自己行为有些异常，但将原因完全归咎于环境不良、他人挑衅或压力所致。' },
        { label: '3分：勉强承认但拒治', value: 3, desc: '仅在反复提示和说服下才勉强承认可能存在问题，但内心拒绝接受治疗。' },
        { label: '4分：完全无自知力', value: 4, desc: '完全无自知力；彻底否认任何病态或异常，强烈拒绝任何医学干预与协助。' }
      ]
    }
  ],
  scoring: {
    method: 'sum',
    primaryMetricLabel: 'YMRS 躁狂总分',
    primaryMetricUnit: '分',
    minScore: 0,
    maxScore: 60,
    levels: [
      {
        label: '正常或临床缓解 (常模基线)',
        type: 'normal',
        badgeClass: 'badge-success',
        min: 0,
        max: 12,
        summary: '总分 0-12 分，处于临床缓解期（Remission）或常模无躁狂范围。受试者心境与行为处于可控基线，未见具有临床病理意义的躁狂发作征象。',
        advice: [
          '心境与精力处于稳定控制范围，符合临床缓解标准',
          '对于双相障碍患者，继续维持心境稳定剂治疗方案，避免自行减药',
          '保持规律作息与昼夜节律，防范熬夜或过度劳累诱发复发'
        ]
      },
      {
        label: '轻度躁狂状态 / 轻躁狂可能',
        type: 'mild',
        badgeClass: 'badge-warning',
        min: 13,
        max: 19,
        summary: '总分处于 13-19 分轻躁狂临床临界范围。提示存在轻度情绪亢进、言语增多、活力过盛或睡眠需求减少，已达轻躁狂发作水平。',
        advice: [
          '达到轻躁狂发作临床阈值，建议由精神心理科医师进行全面评估',
          '严格监测作息与行为变化，防范向重度躁狂进一步演变',
          '避免摄入咖啡因、酒精等中枢兴奋物质，保证充足卧床休息'
        ]
      },
      {
        label: '中度躁狂发作 (Moderate Mania)',
        type: 'moderate',
        badgeClass: 'badge-warning',
        min: 20,
        max: 25,
        summary: '总分 20-25 分，属于中度躁狂发作状态。伴有显著的易激惹、睡眠剥夺、言语滔滔不绝、夸大自负及自制力减退，日常生活与社交功能显著受损。',
        advice: [
          '明确处于中度躁狂发作期，建议精神科医生尽快优化药物治疗（如增加心境稳定剂或加用非典型抗精神病药）',
          '家属应加强监护协助，妥善保管财务银行卡与机动车辆',
          '若门诊干预无法有效控制冲动风险，应评估短期保护性住院'
        ]
      },
      {
        label: '显著/重度躁狂发作 (Severe Mania)',
        type: 'severe',
        badgeClass: 'badge-danger',
        min: 26,
        max: 37,
        summary: '总分 26-37 分，提示严重的急性躁狂发作。受试者通常表现出冲动破坏、思维奔逸、言语迫促、严重易激惹甚至妄想倾向，自知力严重受损。',
        advice: [
          '处于重度急性发作高危期，极易引发严重冲动冲突或意外伤害',
          '强烈建议由家属陪同立即前往精神专科医院住院治疗',
          '实施严密的医疗保护与防冲动防毁物监护，及时进行急性期控制'
        ]
      },
      {
        label: '极重度躁狂状态 (Extremely Severe)',
        type: 'severe',
        badgeClass: 'badge-danger',
        min: 38,
        max: 60,
        summary: '总分 38-60 分，提示极重度狂躁发作或谵妄性躁狂。可能伴有明显的精神病性症状（荒谬夸大妄想、幻觉）、严重毁物攻击及衰竭风险，现实检验力彻底丧失。',
        advice: [
          '属于精神科危急重症，必须立即启动急诊医疗绿色通道送医住院',
          '密切监测体温、水电解质及生命体征，防范过度消耗导致躯体衰竭',
          '实施必要的保护性医疗干预与强化精神专科监护'
        ]
      }
    ],
    dimensions: [
      {
        name: '核心心境与活力',
        desc: '评估主观情绪高涨、精力过度充沛、性欲增强及睡眠需求缩短',
        items: [1, 2, 3, 4]
      },
      {
        name: '言语与思维过程',
        desc: '评估言语迫促滔滔不绝、语速加快以及思维奔逸联想过速',
        items: [6, 7]
      },
      {
        name: '攻击性与易激惹',
        desc: '评估情绪暴躁易激惹、敌意态度以及破坏性毁物或躯体攻击倾向',
        items: [5, 9]
      },
      {
        name: '现实检验力与自知力',
        desc: '评估夸大观念妄想、异常怪诞装束及对疾病与治疗的病识感缺失',
        items: [8, 10, 11]
      }
    ]
  }
};

export default YMRS;
