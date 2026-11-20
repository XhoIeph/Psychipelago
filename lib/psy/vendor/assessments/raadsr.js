// Vendored from PSYMETRA (js/engine.js, js/assessments/*.js) on 2026-11-12.
// Scoring logic is copied verbatim; only export shims changed. Do not "improve" numbers here.

/**
 * PSYMETRA - Assessment Definition: RAADS-R
 * Ritvo Autism Asperger Diagnostic Scale-Revised (R. A. Ritvo et al., 2011)
 * 成人自闭与阿斯伯格综合征诊断量表修订版 (80 题标准权威原版)
 */

const RAADSR = {
  meta: {
    id: 'raadsr',
    name: 'RAADS-R',
    fullName: '成人自闭与阿斯伯格诊断量表修订版',
    englishName: 'Ritvo Autism Asperger Diagnostic Scale-Revised',
    category: '神经发育/ASD',
    timeframe: '终生体验（从童年至今）',
    duration: 20,
    instructions: '本量表旨在评估成年期可能存在的自闭症谱系（ASD）或阿斯伯格特质。请回顾您从童年早期（16岁前）至今的整体人生经验，对以下描述选择最符合您实际情况的一项。',
    description: '国际成人自闭谱系与阿斯伯格特质临床诊断金标准自评量表，由耶鲁大学医学院 Riva Ariella Ritvo 博士团队联合 UCLA 等多中心研发，深入考察社交关联性、感官运动特质、专注狭隘兴趣及语言语用沟通 4 大核心维度，能够敏锐识别成年高功能自闭与“伪装掩饰”人群。',
    references: {
      original: [
        'Ritvo, R. A., Ritvo, E. R., Guthrie, D., Ritvo, M. J., Hufnagel, D. H., McMahon, W., Tonge, C., Mataix-Cols, D., Ronald, A., Ozonoff, P., et al. (2011). The Ritvo Autism Asperger Diagnostic Scale-Revised (RAADS-R): A scale to diagnose adult high functioning autism spectrum disorders. Journal of Autism and Developmental Disorders, 41(8), 1076–1089.'
      ]
    }
  },

  defaultOptions: [
    { label: '从来都不是', desc: '童年与成年均不符合此情况', value: 0 },
    { label: '仅童年时期是', desc: '16岁以前符合，成年后已不再明显', value: 1 },
    { label: '仅成年/现在是', desc: '16岁后或近来成年期才符合', value: 2 },
    { label: '现在是，以前也是', desc: '从童年到成年持续如此，为长期特质', value: 3 }
  ],

  scoring: {
    method: 'sum',
    minScore: 0,
    maxScore: 240,
    primaryMetricLabel: 'RAADS-R 自闭谱系总分',
    primaryMetricUnit: '分',
    dimensions: [
      {
        id: 'social_relatedness',
        name: '社交关联性',
        desc: '对非言语社交线索的理解、眼神接触、社交直觉、友谊维持及同理心连接',
        items: [1, 3, 5, 6, 8, 11, 12, 14, 17, 18, 20, 21, 22, 23, 25, 26, 28, 31, 37, 38, 39, 43, 44, 45, 47, 48, 53, 54, 55, 60, 61, 64, 68, 69, 72, 76, 77, 79, 80]
      },
      {
        id: 'sensory_motor',
        name: '感觉与运动敏感',
        desc: '对声音、触觉材质、光线与气味的高度敏感或迟钝，动作协调及自我刺激（Stimming）',
        items: [4, 10, 16, 19, 29, 33, 34, 36, 42, 46, 49, 51, 57, 59, 62, 65, 67, 71, 73, 74]
      },
      {
        id: 'circumscribed_interests',
        name: '专注兴趣与刻板性',
        desc: '对特定狭隘专业主题的高度深潜与持久热情，对例行公事（Routine）的依赖与抗拒改变',
        items: [9, 13, 24, 30, 32, 40, 41, 50, 52, 56, 63, 70, 75, 78]
      },
      {
        id: 'language',
        name: '语言与语用沟通',
        desc: '字面理解倾向、对隐喻/讽刺/成语的理解困难，不寻常的语调、语音及独特语用逻辑',
        items: [2, 7, 15, 27, 35, 58, 66]
      }
    ],
    levels: [
      {
        min: 0,
        max: 64,
        label: '神经典型表现 (低于临床筛查阈值)',
        type: 'normal',
        badgeClass: 'badge-success',
        summary: '您的 RAADS-R 总分低于 65 分的临床切点。测评显示您的社交认知模式、感知觉整合与行为模式符合主流神经典型（Neurotypical）常模基线，未表现出显著的自闭谱系特征。',
        advice: '心智与人际交互模式良好，如在特定工作生活环境遇到交流瓶颈，提升人际沟通技巧即可。'
      },
      {
        min: 65,
        max: 105,
        label: '轻度自闭特质 (跨越临床门槛，广泛自闭表型 BAP)',
        type: 'mild',
        badgeClass: 'badge-info',
        summary: '您的得分已跨越 65 分的经典筛查线。测评提示您展现出较明确的“广泛自闭表型”（Broad Autism Phenotype, BAP），具有较为突出的逻辑理性、特异感官偏好或非典型社交模式，可能属于高功能阿斯伯格轻度特质。',
        advice: '了解并接纳自身神经多样性特征；在感官过载时允许自己独处充电；如有必要，可寻求熟悉成人神经多样性的临床心理师进一步探索。'
      },
      {
        min: 106,
        max: 150,
        label: '显著自闭谱系特质 (高度符合典型阿斯伯格表现)',
        type: 'moderate',
        badgeClass: 'badge-warning',
        summary: '您的得分处于明确的临床阳性区间。无论在童年还是成年期，您都在社交互惠性、感官超载防护、特异深度兴趣以及语言语用方面表现出典型且强烈的自闭谱系特征，日常社交与环境适应常伴有较高耗能。',
        advice: '强烈建议前往设有成人神经发育多样性门诊或自闭谱系专病门诊的三甲精神专科医院进行系统诊断评估，建立适合自己的低耗能工作生活支持方案。'
      },
      {
        min: 151,
        max: 240,
        label: '高度典型自闭谱系特征 (强神经多样性，强烈建议就医)',
        type: 'severe',
        badgeClass: 'badge-danger',
        summary: '您的得分处于高分自闭谱系区间。长期且深度的感官超载、非凡而独特的认知方式、社交语用障碍在您的生命史中占据核心地位，具有极显著的神经多样性印记，社会环境中的适应常伴随高强度精神倦怠。',
        advice: '建议寻求专业自闭症医学专科的全面认证与支持，获取专业无障碍环境适应支持、防倦怠心理咨询及神经多样性社群认同支持。'
      }
    ]
  },

  questions: [
    { id: 1, text: '我是一个富有同情心的人。', dimension: '社交关联性', reversed: true },
    { id: 2, text: '我经常在日常交谈中引用电影或电视里的台词短语。', dimension: '语言与语用沟通' },
    { id: 3, text: '当别人说我不礼貌时，我常常感到很惊讶（我并没意识到自己哪里冒犯了别人）。', dimension: '社交关联性' },
    { id: 4, text: '有时我说话声音太大或太小，而我自己完全意识不到。', dimension: '感觉与运动敏感' },
    { id: 5, text: '在社交场合中，我常常不知道该如何举止行动。', dimension: '社交关联性' },
    { id: 6, text: '我能够“设身处地”换位思考，体谅他人的感受。', dimension: '社交关联性', reversed: true },
    { id: 7, text: '我很难理解某些熟语或隐喻的意思（例如“掌上明珠”、“指鹿为马”等习语的深层引申义）。', dimension: '语言与语用沟通' },
    { id: 8, text: '我只喜欢和与我拥有相同专属兴趣爱好的人聊天。', dimension: '社交关联性' },
    { id: 9, text: '我往往更关注微小的细节，而不是整体概貌。', dimension: '专注兴趣与刻板性' },
    { id: 10, text: '我总是非常在意食物在口中的触感/口感，这对我而言甚至比味道更重要。', dimension: '感觉与运动敏感' },
    { id: 11, text: '当和最好的朋友或家人长时间分开时，我会想念他们。', dimension: '社交关联性', reversed: true },
    { id: 12, text: '有时我会因为直接说出内心所想而冒犯别人，即便我并没有恶意。', dimension: '社交关联性' },
    { id: 13, text: '我只喜欢思考和谈论少数几件真正让我着迷的事物。', dimension: '专注兴趣与刻板性' },
    { id: 14, text: '与其和熟人一起去餐馆，我更宁愿自己一个人去餐馆吃饭。', dimension: '社交关联性' },
    { id: 15, text: '我很难想象成为另一个人会是什么感受。', dimension: '语言与语用沟通' },
    { id: 16, text: '别人曾说我动作笨拙、身体协调性差。', dimension: '感觉与运动敏感' },
    { id: 17, text: '别人认为我古怪或者与众不同。', dimension: '社交关联性' },
    { id: 18, text: '当朋友难过时，我能够理解对方何时需要被安慰。', dimension: '社交关联性', reversed: true },
    { id: 19, text: '我对衣服材质接触身体的触感非常敏感，触感对我来说比款式好不好看重要得多。', dimension: '感觉与运动敏感' },
    { id: 20, text: '我喜欢模仿某些人的说话和行为举止，这能让我看起来更像个“正常人”。', dimension: '社交关联性' },
    { id: 21, text: '同时面对不止一个人说话，会让我感到压力巨大甚至心生畏惧。', dimension: '社交关联性' },
    { id: 22, text: '我必须强迫自己“表现得很正常”，才能取悦别人并让他们喜欢我。', dimension: '社交关联性' },
    { id: 23, text: '结识新朋友对我来说通常是轻松容易的。', dimension: '社交关联性', reversed: true },
    { id: 24, text: '当我正在谈论自己极感兴趣的话题被他人打断时，我会感到极度困惑和不安。', dimension: '专注兴趣与刻板性' },
    { id: 25, text: '在交谈时，我很难觉察并理解对方当下的情绪感受。', dimension: '社交关联性' },
    { id: 26, text: '我喜欢和几个人一起聊天交谈（例如围坐在餐桌旁、在学校或工作中）。', dimension: '社交关联性', reversed: true },
    { id: 27, text: '我总是字面理解别人的话，以至于常常错过对方想表达的真实含义。', dimension: '语言与语用沟通' },
    { id: 28, text: '当某人感到尴尬或嫉妒时，我很难理解他们的心理。', dimension: '社交关联性' },
    { id: 29, text: '某些在别人看来很普通的材质接触到我的皮肤时，会让我感到极其难以忍受。', dimension: '感觉与运动敏感' },
    { id: 30, text: '当我习惯的做事方式突然被改变时，我会感到极其烦躁和心烦意乱。', dimension: '专注兴趣与刻板性' },
    { id: 31, text: '我从来不渴望、也不需要拥有别人所说的那种“亲密关系”。', dimension: '社交关联性' },
    { id: 32, text: '对我来说开始和结束一段对话都很困难，我必须一直说直到我说完为止。', dimension: '专注兴趣与刻板性' },
    { id: 33, text: '我说话的声音节奏很正常。', dimension: '感觉与运动敏感', reversed: true },
    { id: 34, text: '同样的声音、颜色或触感，可能会突然在非常敏感和非常迟钝之间转变。', dimension: '感觉与运动敏感' },
    { id: 35, text: '像“如芒在背”这类比喻性的成语或俗语会让我感到困惑或很不舒服。', dimension: '语言与语用沟通' },
    { id: 36, text: '有时某个词语发出的声音或尖锐高频噪音会让我的耳朵产生刺痛感。', dimension: '感觉与运动敏感' },
    { id: 37, text: '我是一个善解人意、通情达理的人。', dimension: '社交关联性', reversed: true },
    { id: 38, text: '我无法对电影中的角色产生共鸣，也无法感同身受他们的喜怒哀乐。', dimension: '社交关联性' },
    { id: 39, text: '当有人在向我示好或调情时，我完全分辨不出来。', dimension: '社交关联性' },
    { id: 40, text: '我能在脑海中以精准详尽的细节画面重现我感兴趣的事物。', dimension: '专注兴趣与刻板性' },
    { id: 41, text: '我会整理并记录自己感兴趣事物的清单，即使它们并没有什么实际用处（例如比赛数据、列车时刻表、日历、历史年份等）。', dimension: '专注兴趣与刻板性' },
    { id: 42, text: '当感官受到过度刺激时，我必须把自己封闭独处起来，切断这些感官输入。', dimension: '感觉与运动敏感' },
    { id: 43, text: '我喜欢和朋友们一起倾诉交谈、商量事情。', dimension: '社交关联性', reversed: true },
    { id: 44, text: '我分辨不出别人对我正在说的话究竟是感兴趣还是觉得无聊。', dimension: '社交关联性' },
    { id: 45, text: '在别人说话时，我很难读懂他们的面部表情、手势和肢体动作。', dimension: '社交关联性' },
    { id: 46, text: '同一样东西（比如衣物或温度）在不同时间会给我带来截然不同的感觉。', dimension: '感觉与运动敏感' },
    { id: 47, text: '在约会或与他人处于社交聚会场合时，我感到很自在放松。', dimension: '社交关联性', reversed: true },
    { id: 48, text: '当别人向我倾诉他们个人的烦恼与问题时，我会尽我所能提供帮助。', dimension: '社交关联性', reversed: true },
    { id: 49, text: '别人曾告诉我，我的声音听起来很特别（例如语调平淡、单调、像小孩子或尖细尖锐）。', dimension: '感觉与运动敏感' },
    { id: 50, text: '有时某个想法或话题会牢牢卡在我的脑海中，即使周围没人感兴趣，我也忍不住非要讲出来。', dimension: '专注兴趣与刻板性' },
    { id: 51, text: '我会重复用手做某些特定动作（比如甩手、转笔或细绳、在眼前晃动小物件等）。', dimension: '感觉与运动敏感' },
    { id: 52, text: '我认识的大多数人所感兴趣的事情，我从来都不感兴趣。', dimension: '专注兴趣与刻板性' },
    { id: 53, text: '我被大家认为是一个富有同情心与慈悲心的人。', dimension: '社交关联性', reversed: true },
    { id: 54, text: '我通过严格遵循一套特定的社交规则来与人相处，这能帮我看起来像个“正常人”。', dimension: '社交关联性' },
    { id: 55, text: '在团队或群体中协作与发挥作用对我来说非常困难。', dimension: '社交关联性' },
    { id: 56, text: '当我和别人交谈时，中途转换话题会很困难；如果对方突然换话题，我会感到非常心烦意乱和困惑。', dimension: '专注兴趣与刻板性' },
    { id: 57, text: '有时我不得不捂住耳朵来隔绝那些让我感到刺痛的噪音（比如吸尘器声、或周围人过多过响的说话声）。', dimension: '感觉与运动敏感' },
    { id: 58, text: '我能够自然地与人寒暄和进行闲聊（Small talk）。', dimension: '语言与语用沟通', reversed: true },
    { id: 59, text: '有时某些原本应该感到疼痛的刺激对我却并不疼（例如擦伤磕碰、或者在炉子上烫到手时）。', dimension: '感觉与运动敏感' },
    { id: 60, text: '和别人聊天时，我很难判断什么时候该轮到我说话，什么时候该轮到我倾听。', dimension: '社交关联性' },
    { id: 61, text: '最了解我的人都认为我是一个喜欢独来独往的独行侠。', dimension: '社交关联性' },
    { id: 62, text: '我平时的说话语调通常都很自然正常。', dimension: '感觉与运动敏感', reversed: true },
    { id: 63, text: '我喜欢日复一日完全相同的事物，日常惯例发生微小变化都会让我心烦。', dimension: '专注兴趣与刻板性' },
    { id: 64, text: '如何交朋友以及如何进行社交，对我来说一直是个解不开的谜。', dimension: '社交关联性' },
    { id: 65, text: '当我感到压力很大时，原地转圈或坐在椅子上前后摇晃能让我平静下来。', dimension: '感觉与运动敏感' },
    { id: 66, text: '像“把情绪写在脸上”（直抒胸臆）这类引申短语，在字面理解上对我来说完全说不通。', dimension: '语言与语用沟通' },
    { id: 67, text: '如果身处一个充斥着强烈气味、复杂触感材质、嘈杂声音或刺眼强光的地方，我会感到极度焦虑或恐惧。', dimension: '感觉与运动敏感' },
    { id: 68, text: '当别人说一套做一套、或者言不由衷时，我能够敏锐觉察出来。', dimension: '社交关联性', reversed: true },
    { id: 69, text: '我喜欢尽可能长时间地独自一人独处。', dimension: '社交关联性' },
    { id: 70, text: '我把自己的想法按部就班地存放在记忆中，就像卡片抽屉一样，需要时像检索卡片一样调取（或以某种独特的记忆组织方式）。', dimension: '专注兴趣与刻板性' },
    { id: 71, text: '同一种声音有时听起来极响，有时又极轻，尽管我知道声音本身的音量并没有改变。', dimension: '感觉与运动敏感' },
    { id: 72, text: '我很享受与家人和朋友一起共进美食、畅谈交流的时光。', dimension: '社交关联性', reversed: true },
    { id: 73, text: '我无法忍受我讨厌的感官刺激（比如特定的气味、触感、声音或颜色）。', dimension: '感觉与运动敏感' },
    { id: 74, text: '我不喜欢被别人拥抱、搂抱或身体搂搭。', dimension: '感觉与运动敏感' },
    { id: 75, text: '当去某个地方时，我必须走固定的路线，否则会感到非常困惑和焦虑。', dimension: '专注兴趣与刻板性' },
    { id: 76, text: '要弄清楚别人对我有什么期望或期待是一件很困难的事。', dimension: '社交关联性' },
    { id: 77, text: '我喜欢拥有亲密的挚友。', dimension: '社交关联性', reversed: true },
    { id: 78, text: '别人常说我说话讲述时给出的细节太多、太啰嗦。', dimension: '专注兴趣与刻板性' },
    { id: 79, text: '别人经常说我总提出一些令人尴尬的问题。', dimension: '社交关联性' },
    { id: 80, text: '我倾向于指出并纠正别人的错误。', dimension: '社交关联性' }
  ]
};

export default RAADSR;
