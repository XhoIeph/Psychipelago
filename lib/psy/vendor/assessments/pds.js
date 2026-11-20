// Vendored from PSYMETRA (js/engine.js, js/assessments/*.js) on 2026-11-12.
// Scoring logic is copied verbatim; only export shims changed. Do not "improve" numbers here.

/**
 * PSYMETRA - Assessment Definition: PDS
 * Posttraumatic Diagnostic Scale (Edna B. Foa et al.)
 * 创伤后应激诊断量表 (17 核心症状项，对应创伤侵入、回避麻木与警觉过高 3 核心维度)
 */

const PDS = {
  meta: {
    id: 'pds',
    name: 'PDS',
    fullName: '创伤后应激诊断量表',
    englishName: 'Posttraumatic Diagnostic Scale',
    category: '创伤应激',
    timeframe: '过去 1 个月内',
    duration: 5,
    instructions: '请回想您在人生中曾经历或目睹过的最痛苦、最具伤害性的创伤事件（如严重事故、自然灾害、暴力伤害、亲友突然离世或虐待等）。请评估在【过去 1 个月内】，以下症状给您带来的困扰程度与发生频率。',
    description: '国际创伤心理学金标准自评工具之一，严格针对重大创伤后的侵入性再体验、持续性回避麻木及过度警觉 3 大核心病理维度，评估创伤后应激障碍（PTSD）的严重程度与临床界限。'
  },

  defaultOptions: [
    { label: '完全没有 / 极少', desc: '每周不到 1 次或无此感觉', value: 0 },
    { label: '偶发 / 轻度', desc: '每周 1 次或轻微困扰', value: 1 },
    { label: '有时 / 中度', desc: '每周 2 至 4 次，造成明显不适', value: 2 },
    { label: '频繁 / 极重度', desc: '每周 5 次以上或近乎持续存在', value: 3 }
  ],

  scoring: {
    method: 'sum',
    minScore: 0,
    maxScore: 51,
    primaryMetricLabel: 'PDS 创伤应激总分',
    primaryMetricUnit: '分',
    dimensions: [
      {
        id: 'reexperiencing',
        name: '侵入与再体验',
        desc: '不自主闪回、创伤侵入性记忆、痛苦噩梦及触景生情的剧烈生理心理痛苦体验',
        items: [1, 2, 3, 4, 5]
      },
      {
        id: 'avoidance',
        name: '回避与情感麻木',
        desc: '主动回避创伤相关的想法/线索、对生活乐趣丧失、疏离冷漠及情感麻木迟钝',
        items: [6, 7, 8, 9, 10, 11, 12]
      },
      {
        id: 'hyperarousal',
        name: '过度警觉与激惹',
        desc: '高度警觉戒备、惊跳反射过度敏感、失眠、易怒激惹及注意力显著难以集中',
        items: [13, 14, 15, 16, 17]
      }
    ],
    levels: [
      {
        min: 0,
        max: 10,
        label: '无或轻微创伤应激反应 (常模正常范围)',
        type: 'normal',
        badgeClass: 'badge-success',
        summary: '您的 PDS 创伤后应激总分处于常模极低区间。当前您对既往负面或创伤经历具有良好的心理修复力与适应性，未表现出显著的创伤后应激病理症状。',
        advice: '继续保持良好的心理弹性与规律的生活节奏，若遭遇新应激生活事件，可通过倾诉与自我关怀维持心理韧性。'
      },
      {
        min: 11,
        max: 20,
        label: '轻中度创伤后应激困扰 (需关注调节)',
        type: 'mild',
        badgeClass: 'badge-info',
        summary: '测评提示您近期存在一定程度的创伤后应激波动，偶尔受到既往负面事件的闯入性记忆或警觉紧绷困扰，但社会与日常生活功能基本能够维系。',
        advice: '建议练习正念着陆技术（Grounding 5-4-3-2-1 法）与渐进式腹式呼吸，减少过度警觉；若特定创伤情境持续引发强烈应激，可与信任的朋友或心理专业人员沟通。'
      },
      {
        min: 21,
        max: 35,
        label: '中重度创伤后应激症状 (达到临床干预界限)',
        type: 'moderate',
        badgeClass: 'badge-warning',
        summary: '您的得分已达到 PDS 中重度临床关注水平。您可能频繁经历与创伤相关的闪回、噩梦或强烈的身心回避，并伴有显著的过度警戒、失眠与情感疏离，创伤已对您的生活质量构成实质损害。',
        advice: '强烈建议前往综合医院精神科/临床心理科或创伤心理专科进行系统评估，创伤聚焦认知行为疗法（TF-CBT）或眼动脱敏再加工（EMDR）对缓解此类症状具有充分循证医学支持。'
      },
      {
        min: 36,
        max: 51,
        label: '重度创伤后应激障碍 (高危严重警报，强烈建议就医)',
        type: 'severe',
        badgeClass: 'badge-danger',
        summary: '您的得分处于高危严重重度区间。创伤再体验、全面性回避麻木与神经系统的高度亢奋持续折磨您的心身，神经系统长期处于创伤应激战逃反应中，严重威胁情绪稳定与日常社会功能。',
        advice: '请务必尽快寻求三甲医院精神心理专科医师的全面医学诊断与系统性干预，结合药物支持与创伤专科心理治疗重建心身安全感。'
      }
    ]
  },

  questions: [
    {
      id: 1,
      text: '脑海中反复不由自主地浮现关于创伤事件的痛苦回忆、画面或想法。',
      dimension: '侵入与再体验'
    },
    {
      id: 2,
      text: '反复做与该创伤事件有关的噩梦，或在睡梦中惊恐惊醒。',
      dimension: '侵入与再体验'
    },
    {
      id: 3,
      text: '突然感觉或表现得好像创伤事件正在重新发生（即“闪回”体验，如重历其境的幻觉或错觉）。',
      dimension: '侵入与再体验'
    },
    {
      id: 4,
      text: '当遇到某些提醒或令人联想到创伤事件的人、事、物、声音或气味时，感到极度痛苦、恐慌或心烦意乱。',
      dimension: '侵入与再体验'
    },
    {
      id: 5,
      text: '当接触到与创伤有关的提醒物时，身体出现强烈的生理应激反应（如心跳加速、呼吸急促、出冷汗或浑身发抖）。',
      dimension: '侵入与再体验'
    },
    {
      id: 6,
      text: '极力避免去回想、谈论或感受任何与该创伤事件相关的思想、对话或情绪。',
      dimension: '侵入与再体验'
    },
    {
      id: 7,
      text: '竭力避免接触会勾起创伤记忆的地点、活动、人物或特定情境。',
      dimension: '回避与情感麻木'
    },
    {
      id: 8,
      text: '无法回忆起该创伤事件中某些极其重要的关键细节（创伤性记忆断片或失忆）。',
      dimension: '回避与情感麻木'
    },
    {
      id: 9,
      text: '对原本热衷或重要的日常活动、爱好明显丧失了兴趣或参与意愿。',
      dimension: '回避与情感麻木'
    },
    {
      id: 10,
      text: '感到自己与周围他人疏离、隔绝，仿佛自己与他人之间隔着一堵无形的墙。',
      dimension: '回避与情感麻木'
    },
    {
      id: 11,
      text: '情感体验变得非常麻木迟钝，难以感受到爱意、温柔、快乐或温暖。',
      dimension: '回避与情感麻木'
    },
    {
      id: 12,
      text: '感觉自己的未来变得非常有限或没有指望（如觉得自己无法长寿、无法拥有事业或家庭）。',
      dimension: '回避与情感麻木'
    },
    {
      id: 13,
      text: '难以入睡，或者睡眠很浅、半夜容易频繁醒来。',
      dimension: '过度警觉与激惹'
    },
    {
      id: 14,
      text: '经常感到暴躁易怒，容易为琐事发脾气或难以抑制怒火。',
      dimension: '过度警觉与激惹'
    },
    {
      id: 15,
      text: '注意力难以集中，阅读、工作或与人交流时思维容易游离或涣散。',
      dimension: '过度警觉与激惹'
    },
    {
      id: 16,
      text: '时刻保持高度警惕与戒备状态（如进门习惯观察出口、随时担心周围有危险潜伏）。',
      dimension: '过度警觉与激惹'
    },
    {
      id: 17,
      text: '容易受到惊吓，对突发声响或意外动作有过度强烈的吓一跳反应。',
      dimension: '过度警觉与激惹'
    }
  ]
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PDS;
}

export default PDS;
