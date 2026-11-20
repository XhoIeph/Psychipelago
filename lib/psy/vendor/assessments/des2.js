// Vendored from PSYMETRA (js/engine.js, js/assessments/*.js) on 2026-11-12.
// Scoring logic is copied verbatim; only export shims changed. Do not "improve" numbers here.

/**
 * PSYMETRA - DES-II Assessment Definition
 * 解离体验量表第二版 (Dissociative Experiences Scale-II, DES-II)
 * 国际创伤与解离研究学会 (ISSTD) 权威解离测评工具 (Carlson & Putnam, 1993)
 */

const DES2 = {
  meta: {
    id: 'des2',
    name: 'DES-II',
    fullName: '解离体验量表第二版',
    englishName: 'Dissociative Experiences Scale-II',
    category: '创伤解离',
    targetGroups: ['成年人', '创伤经历者', 'PTSD/复杂创伤困扰者', '失神/失真/空虚困扰人群'],
    description: '由美国国家精神卫生研究所学者 Carlson 与 Putnam 编制的国际金标准解离评估工具。全面测查分离性遗忘、人格解体、现实解体及过度吸收沉浸等解离现象的发生频率。',
    instructions: '量表列出了人们在日常生活中可能体验到的感受。请根据您在【未饮酒或未服药的清醒状态下】，这些情况在您日常生活中发生的频度比例（0% 至 100%）。',
    duration: 6,
    timeframe: '日常生活近期感受',
    references: {
      original: [
        'Carlson, E. B., & Putnam, F. W. (1993). An update on the Dissociative Experiences Scale. Dissociation: Progress in the Dissociative Disorders, 6(1), 16-27.'
      ],
      chineseValidation: [
        '姜荣环, 陶玉兰, 汤宜朗, 等. (2007). 解离体验量表中文版在创伤人群中的信效度检验. 中国心理卫生杂志.'
      ]
    }
  },
  defaultOptions: [
    { label: '0%', value: 0, desc: '从不发生' },
    { label: '20%', value: 20, desc: '极少发生 (约20%时间)' },
    { label: '40%', value: 40, desc: '有时发生 (约40%时间)' },
    { label: '60%', value: 60, desc: '经常发生 (约60%时间)' },
    { label: '80%', value: 80, desc: '频繁发生 (约80%时间)' },
    { label: '100%', value: 100, desc: '几乎总是 (约100%时间)' }
  ],
  questions: [
    { id: 1, text: '有时开车或坐车，突然意识到自己完全记不得刚刚这段路是怎么走过来的。', dimension: '吸收沉浸与想象涉入' },
    { id: 2, text: '有时听别人说话，突然发现自己完全没听进去刚刚对方说的部分或全部内容。', dimension: '吸收沉浸与想象涉入' },
    { id: 3, text: '有时发现自己身处某个地方，却完全想不起来自己究竟是怎么来到这里的。', dimension: '分离性遗忘' },
    { id: 4, text: '有时发现自己身上穿着某套衣服，却完全不记得自己是什么时候穿上它的。', dimension: '分离性遗忘' },
    { id: 5, text: '有时在自己的私人物品里发现从未见过的新东西，完全不记得是谁买的或怎么得到的。', dimension: '分离性遗忘' },
    { id: 6, text: '有时遇到自称认识自己的人，对方叫得出自己的名字，自己却对其毫无印象。', dimension: '分离性遗忘' },
    { id: 7, text: '有时觉得自己好像站在自己身体外面，或者像在旁观电影里的角色一样看着自己做事。', dimension: '人格解体与现实解体' },
    { id: 8, text: '有人告诉自己，自己有时会有一些奇怪的言行，但自己却完全不记得发生过这回事。', dimension: '分离性遗忘' },
    { id: 9, text: '有时完全记不得自己生命中某些极其重要的事件（例如毕业、结婚、工作变故等）。', dimension: '分离性遗忘' },
    { id: 10, text: '有时被别人指责自己在撒谎，而自己当时确信自己并没有撒谎。', dimension: '分离性遗忘' },
    { id: 11, text: '有时看着镜子里的自己，却感到非常陌生，甚至感觉那根本不是自己。', dimension: '人格解体与现实解体' },
    { id: 12, text: '有时感觉周围的人、物品或整个世界都不是真实的，像在梦境或演戏一样虚幻。', dimension: '人格解体与现实解体' },
    { id: 13, text: '有时感到自己的身体好像不属于自己，或者对身体的触觉或疼痛麻木没有知觉。', dimension: '人格解体与现实解体' },
    { id: 14, text: '有时重温过去的记忆是如此生动逼真，以至于感觉自己正在重新经历它（闪回）。', dimension: '吸收沉浸与想象涉入' },
    { id: 15, text: '有时无法确定某件事究竟是自己真实经历过的，还是仅仅自己做过的一个梦。', dimension: '吸收沉浸与想象涉入' },
    { id: 16, text: '有时身处一个熟悉的地方，却感到完全陌生，甚至一度认不出熟悉的路。', dimension: '人格解体与现实解体' },
    { id: 17, text: '当极度投入看电视、看电影或看书时，完全意识不到周围发生了什么。', dimension: '吸收沉浸与想象涉入' },
    { id: 18, text: '有时极度沉浸在自己的幻想或白日梦中，感觉那些幻想就如同真实发生一样。', dimension: '吸收沉浸与想象涉入' },
    { id: 19, text: '有时发现自己能够完全忽略生理上的痛苦或不适（例如感觉不到寒冷或擦伤疼痛）。', dimension: '人格解体与现实解体' },
    { id: 20, text: '有时独处时静坐发呆很长时间，时间在不知不觉中流逝而自己毫无察觉。', dimension: '吸收沉浸与想象涉入' },
    { id: 21, text: '有时发现自己在不同场合下，表现得完全像另外一个性格迥异的人。', dimension: '人格解体与现实解体' },
    { id: 22, text: '有时在做某件平时很熟练的事情时，突然感觉极度困难，好像人生第一次做一样。', dimension: '分离性遗忘' },
    { id: 23, text: '有时发现自己做成了一件大事、写了文章或画了画，却完全不记得自己是怎么完成的。', dimension: '分离性遗忘' },
    { id: 24, text: '有时在脑海里清晰地听到别人的说话声，命令自己做事或评论自己的行为。', dimension: '人格解体与现实解体' },
    { id: 25, text: '有时感觉自己好像透过一层厚厚的玻璃、迷雾或遥远的隧道在看这个世界。', dimension: '人格解体与现实解体' },
    { id: 26, text: '有时看到某些物品或周围景物，感觉它们比平时看起来变大或变小了许多。', dimension: '人格解体与现实解体' },
    { id: 27, text: '有时在毫无睡意的情况下，发现自己做了一些自己之后才意识到甚至没有意识到的事情。', dimension: '分离性遗忘' },
    { id: 28, text: '有时感到体内好像存在两个或多个不同的意识、自我在相互冲突拉扯。', dimension: '人格解体与现实解体' }
  ],
  scoring: {
    method: 'mean_subscale',
    primaryMetricLabel: 'DES-II 解离体验总均分',
    primaryMetricUnit: '分 (%)',
    minScore: 0,
    maxScore: 100,
    levels: [
      {
        label: '常模正常水平 (低解离体验)',
        type: 'normal',
        badgeClass: 'badge-success',
        min: 0,
        max: 14.9,
        summary: '您的解离总分处于一般人群的健康常模低位（平均 4-8 分）。日常偶尔出现的走神、发呆或专注沉浸属于正常的保护性心理调节，未见病理性解离征象。',
        advice: [
          '保持现有的良好身心连结与规律作息',
          '在感到疲劳时适度闭目养神，尊重生理精力节律'
        ]
      },
      {
        label: '轻中度解离体验 (亚临床关注)',
        type: 'mild',
        badgeClass: 'badge-info',
        min: 15.0,
        max: 29.9,
        summary: '存在一定程度的解离体验，常见于高强度生活压力、焦虑、睡眠剥夺或过往轻度应激创伤背景。常表现为偶尔的虚幻感、思维放空或记忆断片，但尚未达到重度解离障碍的临床界限。',
        advice: [
          '练习“5-4-3-2-1”身心着陆技术 (Grounding Techniques)，在出现出离感时通过感官触碰回归现实',
          '规律睡眠，减少长期慢性疲劳与心理过载',
          '若伴有反复心慌或情绪压抑，可尝试正念呼吸或寻求心理咨询支持'
        ]
      },
      {
        label: '重度解离倾向 (达到临床筛查界限)',
        type: 'moderate',
        badgeClass: 'badge-warning',
        min: 30.0,
        max: 44.9,
        summary: '您的得分达到了公认的解离临床筛查界限（≥ 30 分）。提示存在较为显著的人格解体、现实解体或记忆遗忘体验，常见于创伤后应激障碍 (PTSD)、复杂性创伤 (CPTSD) 或边缘人格障碍相关的应激反应。',
        advice: [
          '建议寻求接受过创伤与解离专业培训的心理咨询师或精神科医生评估',
          '避免强行对抗解离感，解离往往是大脑在创伤压力下的过度防御机制',
          '日常建立外部安全感清单，使用触觉刺激物（如冰水、重力毯、香氛）帮助身心稳定'
        ]
      },
      {
        label: '极重度解离 (高度提示解离谱系障碍)',
        type: 'severe',
        badgeClass: 'badge-danger',
        min: 45.0,
        max: 100.0,
        summary: '您的自评得分高度显著，频繁体验到严重的人格解体、现实失真、无法解释的失忆断片或多重自我意识冲突。强烈提示可能符合解离症（如分离性身份障碍 DID、解离性遗忘症等）的临床诊断特征。',
        advice: [
          '强烈建议尽快前往精神专科医院进行系统深入的临床访谈与鉴别诊断',
          '寻求具备 ISSTD 资质或创伤解离治疗背景的资深专业团队长期系统干预',
          '保持自我接纳，理解症状是身心为了在重大逆境中生存而形成的保护机制'
        ]
      }
    ],
    dimensions: [
      {
        name: '分离性遗忘',
        desc: '评估对日常事件、个人经历、私人物品来源或时间段的不可解释记忆断片与遗忘。',
        items: [3, 4, 5, 6, 8, 9, 10, 22, 23, 27]
      },
      {
        name: '人格解体与现实解体',
        desc: '评估感到身体不属于自己、像旁观他人、现实环境如梦境般虚幻及自我意识冲突等体验。',
        items: [7, 11, 12, 13, 16, 19, 21, 24, 25, 26, 28]
      },
      {
        name: '吸收沉浸与想象涉入',
        desc: '评估在艺术、阅读、白日梦或影视中极度专注投入以至于完全隔绝外界现实环境的倾向。',
        items: [1, 2, 14, 15, 17, 18, 20]
      }
    ]
  }
};

export default DES2;
