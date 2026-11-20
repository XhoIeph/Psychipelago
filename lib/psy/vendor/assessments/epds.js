// Vendored from PSYMETRA (js/engine.js, js/assessments/*.js) on 2026-11-12.
// Scoring logic is copied verbatim; only export shims changed. Do not "improve" numbers here.

/**
 * PSYMETRA - EPDS Assessment Definition
 * 爱丁堡产后抑郁量表 (Edinburgh Postnatal Depression Scale, EPDS)
 * 国际妇产科与精神卫生界筛查围产期及产后抑郁的金标准量表 (Cox et al., 1987)
 */

const EPDS = {
  meta: {
    id: 'epds',
    name: 'EPDS',
    fullName: '爱丁堡产后抑郁量表',
    englishName: 'Edinburgh Postnatal Depression Scale',
    category: '抑郁评估',
    targetGroups: ['产后妈妈 (产后0-12个月)', '孕期准妈妈', '育儿初期焦虑新手父母', '情绪低落疲倦的围产期女性'],
    description: '由英国学者 Cox 等于 1987 年编制，是全球妇幼保健院及精神心理科用于早期筛查产后抑郁症 (PPD) 与围产期情绪障碍的国际公认标准量表。敏锐识别新手母亲在产后因激素骤降与育儿重压下的抑郁、焦虑及功能无措感。',
    instructions: '请根据您在【过去 7 天（过去一周内）】的真实身心感受作答，而不仅仅是今天一天的感受。请选择最贴切反映您近期状态的选项。',
    duration: 3,
    timeframe: '过去7天'
  },
  defaultOptions: [
    { label: '从未如此', value: 0, desc: '过去一周完全没有此体验' },
    { label: '偶尔如此', value: 1, desc: '偶有一两次短暂出现' },
    { label: '有时如此', value: 2, desc: '经常出现，造成一定困扰' },
    { label: '总是如此', value: 3, desc: '大部分时间或总是处于此状态' }
  ],
  questions: [
    {
      id: 1,
      text: '我能够看到事物有趣的一面，并能够开怀大笑',
      dimension: '抑郁心境与快感缺失',
      options: [
        { label: '同过去一样多', value: 0, desc: '仍能自然感受到幽默与快乐' },
        { label: '没有过去那么多了', value: 1, desc: '快乐感有所减少，偶有笑容' },
        { label: '现在肯定少多了', value: 2, desc: '很难笑出来，愉悦感显著丧失' },
        { label: '完全不能', value: 3, desc: '彻底丧失感受快乐的能力' }
      ]
    },
    {
      id: 2,
      text: '我能够怀着愉快的心情去期待一些美好的事情',
      dimension: '抑郁心境与快感缺失',
      options: [
        { label: '像过去一样多', value: 0, desc: '对未来依然保有积极期待' },
        { label: '比过去少一些', value: 1, desc: '期待感稍显平淡' },
        { label: '肯定比过去少得多', value: 2, desc: '对任何未来安排都提不起热情' },
        { label: '几乎完全不能', value: 3, desc: '完全无法体验到任何期待感' }
      ]
    },
    {
      id: 3,
      text: '当事情进展不顺利时，我会无缘无故地严厉责怪自己、深感内疚',
      dimension: '焦虑担忧与惊恐',
      options: [
        { label: '是的，大部分时间', value: 3, desc: '频繁将一切不顺归咎于自己，深陷自责' },
        { label: '有时如此', value: 2, desc: '有较多时间在苛责自己' },
        { label: '很少如此', value: 1, desc: '偶尔产生自责念头' },
        { label: '完全没有', value: 0, desc: '客观对待波折，不会盲目归咎自我' }
      ]
    },
    {
      id: 4,
      text: '我会无缘无故地感到焦虑、担忧或毫无来由地害怕',
      dimension: '焦虑担忧与惊恐',
      options: [
        { label: '完全没有', value: 0, desc: '内心宁静从容，无莫名的恐慌' },
        { label: '极少如此', value: 1, desc: '偶有轻微担忧，很快平复' },
        { label: '有时如此', value: 2, desc: '经常感到莫名其妙的紧张与提心吊胆' },
        { label: '是的，非常经常', value: 3, desc: '整日处于莫名恐惧与神经紧绷之中' }
      ]
    },
    {
      id: 5,
      text: '我会无缘无故地感到害怕或突然惊慌失措（心慌意乱）',
      dimension: '焦虑担忧与惊恐',
      options: [
        { label: '是的，相当经常', value: 3, desc: '频发惊慌心慌，感到极度失控' },
        { label: '有时如此', value: 2, desc: '曾有几次突发性的害怕惊慌' },
        { label: '很少如此', value: 1, desc: '极少发生突发恐慌' },
        { label: '完全没有', value: 0, desc: '情绪稳定，从未突发惊慌' }
      ]
    },
    {
      id: 6,
      text: '摆在面前的大堆事情让我觉得承受不了，感到被彻底压垮',
      dimension: '疲惫无力与应付困难',
      options: [
        { label: '是的，大多数时候我都完全无法应付', value: 3, desc: '彻底被家务育儿或事务瘫痪压垮' },
        { label: '有时我发现自己不像以往那样应付得好', value: 2, desc: '感到吃力与力不从心' },
        { label: '很少如此，我大部分时间都能应付妥当', value: 1, desc: '偶有疲态但整体胜任' },
        { label: '完全没有，我能像以往一样很好地应付各项事务', value: 0, desc: '各项生活事务从容有序' }
      ]
    },
    {
      id: 7,
      text: '我感到很不开心，以至于严重影响了我的睡眠（非因照顾婴儿喂奶而失眠）',
      dimension: '疲惫无力与应付困难',
      options: [
        { label: '是的，大部分时间我都睡不着', value: 3, desc: '即使婴儿熟睡自己也无法入眠，深陷心痛' },
        { label: '有时会因为心情不好而失眠', value: 2, desc: '情绪低落频繁妨碍睡眠' },
        { label: '很少如此', value: 1, desc: '偶有一晚受情绪影响' },
        { label: '完全没有', value: 0, desc: '只要有机会躺下就能安稳入睡' }
      ]
    },
    {
      id: 8,
      text: '我感到心情悲伤或非常难过',
      dimension: '抑郁心境与快感缺失',
      options: [
        { label: '是的，大部分时间都非常难过', value: 3, desc: '持续笼罩在深重的悲伤阴霾中' },
        { label: '相当经常感到难过', value: 2, desc: '有较多时间在心酸伤感' },
        { label: '偶尔如此', value: 1, desc: '偶尔有一过性的低落' },
        { label: '完全没有', value: 0, desc: '心态阳光平和，无悲伤感' }
      ]
    },
    {
      id: 9,
      text: '我感到很不开心，以至于常常忍不住哭泣或流眼泪',
      dimension: '抑郁心境与快感缺失',
      options: [
        { label: '是的，大部分时间都忍不住在哭泣', value: 3, desc: '眼泪难以控制，频繁崩溃痛哭' },
        { label: '相当经常在哭泣', value: 2, desc: '经常感到委屈难过而掉眼泪' },
        { label: '只是偶尔如此', value: 1, desc: '仅在极特殊受委屈时哭过一次' },
        { label: '完全没有，从未哭泣', value: 0, desc: '情绪坚实稳定，未曾暗自落泪' }
      ]
    },
    {
      id: 10,
      text: '我曾有过想要伤害自己或结束生命的想法',
      dimension: '抑郁心境与快感缺失',
      options: [
        { label: '是的，相当经常有这种念头', value: 3, desc: '具有强烈的消极自伤甚至自杀冲动（极高危险）' },
        { label: '有时闪过这种念头', value: 2, desc: '曾明确想过伤害自己' },
        { label: '很少，只是偶有一闪而过', value: 1, desc: '瞬间闪过但立即排斥了该念头' },
        { label: '从来没有', value: 0, desc: '珍爱生命，从未产生过任何自伤想法' }
      ]
    }
  ],
  scoring: {
    method: 'sum',
    primaryMetricLabel: 'EPDS 产后抑郁总分',
    primaryMetricUnit: '分',
    minScore: 0,
    maxScore: 30,
    levels: [
      {
        label: '情绪健康常模 (无产后抑郁)',
        type: 'normal',
        badgeClass: 'badge-success',
        min: 0,
        max: 9,
        summary: '您的自评总分处于正常健康情绪常模区间（0-9分）。未见具有临床意义的产后抑郁或过度焦虑反应，能够较好地适应育儿期角色转换与家庭生活。',
        advice: [
          '继续保持良好的家庭沟通，主动向伴侣表达自己的育儿分担需求',
          '在照顾婴儿的同时，每天为自己保留哪怕 20-30 分钟完全属于自己的休整时光'
        ]
      },
      {
        label: '轻度情绪低落 (疑似产后抑郁/产后情绪波动)',
        type: 'mild',
        badgeClass: 'badge-info',
        min: 10,
        max: 12,
        summary: '处于轻度情绪低落或疑似产后抑郁范围（10-12分，接近或达到亚临床阳性预警线）。提示产后可能因激素水平剧烈波动、长期睡眠剥夺、育儿疲劳或角色适应压力，体验到明显的焦虑、委屈与哭泣倾向。',
        advice: [
          '请记住：出现情绪波动绝不是您作为母亲“不够好”或“不称职”，这主要是产后神经内分泌剧烈波动的生理反应',
          '让伴侣和家人承担夜间喂养、换尿布或家务等重任，优先保障母亲每日连续睡眠',
          '密切关注情绪演变，若两周后低落感未减轻或持续加重，建议寻求专业医疗支持'
        ]
      },
      {
        label: '产后抑郁阳性 (达到临床筛查阳性界限，建议就医)',
        type: 'moderate',
        badgeClass: 'badge-warning',
        min: 13,
        max: 19,
        summary: '您的自评得分达到了国际公认的产后抑郁临床阳性截断界限（13-19分，≥ 13分为明确阳性筛查阈值）。提示存在较为严重的中度产后抑郁与焦虑发作，快感缺失、无力感及自责内疚深重，严重影响母亲身心机能与母婴联结。',
        advice: [
          '强烈建议尽快前往综合医院妇幼保健科、产后心理门诊或精神心理科就医，接受系统诊断',
          '寻求母婴依恋支持与人际心理治疗 (IPT) 或认知行为治疗 (CBT)',
          '家人应给予最大程度的理解、宽容与包容，切忌指责产妇“矫情”或“玻璃心”'
        ]
      },
      {
        label: '重度产后抑郁 (极高危状态，需紧急家庭与医疗保护)',
        type: 'severe',
        badgeClass: 'badge-danger',
        min: 20,
        max: 30,
        summary: '您的自评总分处于严重偏高区间（20-30分），提示极重度的围产期/产后抑郁状态。若同时第 10 题出现自伤念头，提示处于极度危险的情绪绝境，存在严重的自杀或婴儿安全风险，需立即启动危机保护与医疗干预。',
        advice: [
          '强烈建议家属立即陪同前往专科医院精神心理科急诊或门诊就诊，进行紧急医疗干预',
          '在家属陪同下确保产妇与婴儿的人身安全，家属应 24 小时贴心陪护，切忌让产妇独自承受重压',
          '若产生难以抑制的自伤念头，请立即拨打全国心理危机干预热线（400-161-9995）'
        ]
      }
    ],
    dimensions: [
      {
        name: '抑郁心境与快感缺失',
        desc: '评估开怀欢笑能力缺失、丧失未来期待感、深重悲伤心境、频繁委屈哭泣及自伤念头（5题）。',
        items: [1, 2, 8, 9, 10]
      },
      {
        name: '焦虑担忧与惊恐',
        desc: '评估无端自责内疚、无故莫名的焦虑提心吊胆以及突发心慌惊慌失措反应（3题）。',
        items: [3, 4, 5]
      },
      {
        name: '疲惫无力与应付困难',
        desc: '评估因事务堆积产生的彻底被压垮瘫痪感、以及因心境不良导致的严重失眠妨碍（2题）。',
        items: [6, 7]
      }
    ]
  }
};

export default EPDS;
