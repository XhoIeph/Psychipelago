// Vendored from PSYMETRA (js/engine.js, js/assessments/*.js) on 2026-11-12.
// Scoring logic is copied verbatim; only export shims changed. Do not "improve" numbers here.

/**
 * PSYMETRA - ITQ Assessment Definition
 * 国际创伤问卷 (International Trauma Questionnaire, ICD-11 PTSD & CPTSD)
 */

const ITQ = {
  meta: {
    id: 'itq',
    name: 'ITQ',
    fullName: '国际创伤问卷',
    englishName: 'International Trauma Questionnaire',
    category: '创伤应激',
    targetGroups: ['经历过创伤事件人群', '重大事故/灾难幸存者', '长期童年逆境人群', '成人'],
    description: '由国际创伤研究学者基于WHO ICD-11标准联合研发的权威问卷，用于系统筛查创伤后应激障碍 (PTSD) 及复杂性创伤后应激障碍 (CPTSD)。',
    instructions: '请回想您一生中经历过的最令您痛苦、恐惧或绝望的重大负性事件（如严重事故、人身暴力、自然灾害、严重虐待、丧亲等）。请根据在过去的一个月里，以下感受对您的困扰程度如实作答。',
    duration: 5,
    timeframe: '过去一个月',
    references: {
      original: [
        'Cloitre, M., Shevlin, M., Brewin, C.R., et al. (2018). The International Trauma Questionnaire: development of a self-report measure of ICD-11 PTSD and complex PTSD. Acta Psychiatrica Scandinavica, 138(6), 536-546.'
      ],
      chineseValidation: [
        'Ho, G.W.K., et al. (2019). Psychometric properties of the Chinese version of the International Trauma Questionnaire (ITQ). European Journal of Psychotraumatology.'
      ]
    }
  },
  defaultOptions: [
    { label: '完全没有', value: 0, desc: '没有感到困扰' },
    { label: '极少', value: 1, desc: '轻度困扰' },
    { label: '有时', value: 2, desc: '中等程度困扰 (达到症状界线)' },
    { label: '经常', value: 3, desc: '较严重困扰' },
    { label: '极频繁', value: 4, desc: '极其严重困扰' }
  ],
  questions: [
    { id: 1, text: '对创伤事件发生极其生动、令人痛苦的噩梦', dimension: '侵入再体验' },
    { id: 2, text: '即使在清醒时，突然感觉创伤事件好像正在当下再次发生（闪回、身临其境感）', dimension: '侵入再体验' },
    { id: 3, text: '尽一切努力避免去想、去谈论或感受与创伤有关的内心记忆', dimension: '回避行为' },
    { id: 4, text: '尽一切努力避开可能使您联想起创伤的外在提醒物（如人、地点、对话、声音等）', dimension: '回避行为' },
    { id: 5, text: '持续保持过度警觉、高度戒备周围可能发生的危险', dimension: '威胁警觉' },
    { id: 6, text: '极易受惊跳起，或容易感到惊恐慌乱（惊跳反应增强）', dimension: '威胁警觉' },
    { id: 7, text: '上述创伤应激反应影响了您的社交与人际交往', dimension: '功能受损' },
    { id: 8, text: '上述创伤应激反应影响了您的工作、学业或日常工作职责', dimension: '功能受损' },
    { id: 9, text: '上述创伤应激反应影响了您生活的其他重要日常领域', dimension: '功能受损' },
    { id: 10, text: '当感到烦躁、不安或愤怒时，需要很长时间才能平复平静下来', dimension: '情感失调' },
    { id: 11, text: '感到在情感上完全麻木、封闭，或对周围亲近的人失去爱的感觉', dimension: '情感失调' },
    { id: 12, text: '觉得自己一无是处、毫无价值，是个彻底的失败者', dimension: '消极自我' },
    { id: 13, text: '对创伤经历深感羞愧、内疚或持续自责', dimension: '消极自我' },
    { id: 14, text: '感到与其他人疏离、脱节，无法真正融入任何群体', dimension: '人际障碍' },
    { id: 15, text: '难以与他人建立或维持亲密信任的关系', dimension: '人际障碍' },
    { id: 16, text: '上述情绪与自我感受影响了您的社交与人际交往', dimension: '功能受损' },
    { id: 17, text: '上述情绪与自我感受影响了您的工作、学业或日常工作职责', dimension: '功能受损' },
    { id: 18, text: '上述情绪与自我感受影响了您生活的其他重要日常领域', dimension: '功能受损' }
  ],
  scoring: {
    method: 'sum',
    primaryMetricLabel: 'ITQ 创伤综合总分',
    primaryMetricUnit: '分',
    minScore: 0,
    maxScore: 72,
    levels: [
      {
        label: '低创伤应激水平',
        type: 'normal',
        badgeClass: 'badge-success',
        min: 0,
        max: 11,
        summary: '您的创伤应激总分处于健康低位，未表现出明显的PTSD侵入、回避或自我组织障碍症状。身心具备较好的弹性应对能力。',
        advice: [
          '保持健康的自我关照与日常规律',
          '建立并维系良好的支持性人际关系',
          '如有偶发应激反应，可通过正念呼吸加以平复'
        ]
      },
      {
        label: '轻度创伤应激反应',
        type: 'mild',
        badgeClass: 'badge-info',
        min: 12,
        max: 23,
        summary: '存在轻度创伤后心理应激反应，可能偶尔受到创伤回忆或警觉反应的打扰，但尚未全面破坏个人功能与自我认知。',
        advice: [
          '允许自己接纳情绪的起伏，避免强行压抑创伤体验',
          '练习安全岛正念冥想与着陆技术 (Grounding techniques)',
          '向信任的朋友或专业心理咨询师倾诉'
        ]
      },
      {
        label: '中度创伤应激 (提示PTSD可能)',
        type: 'moderate',
        badgeClass: 'badge-warning',
        min: 24,
        max: 39,
        summary: '测试得分达到中度创伤水平，提示存在明显的PTSD（创伤后应激障碍）核心症状（持续闪回噩梦、高度回避及过度惊跳警觉），已对日常生活或职业功能造成实质损害。',
        advice: [
          '建议尽早联系创伤治疗专业医师或咨询师进行评估',
          '考虑接受创伤聚焦认知行为治疗 (TF-CBT) 或眼动脱敏再加工 (EMDR)',
          '建立稳定的安全环境，避免二次创伤刺激'
        ]
      },
      {
        label: '重度复杂创伤 (提示CPTSD可能)',
        type: 'severe',
        badgeClass: 'badge-danger',
        min: 40,
        max: 72,
        summary: '测试得分处于重度高位，除了强烈的PTSD症状外，还伴随着严重的情感调节障碍、极度消极的自我评价以及深刻的人际隔绝信任困难，符合复杂性创伤后应激障碍 (CPTSD) 的典型特征。',
        advice: [
          '强烈建议前往三甲医院精神科或专业创伤门诊就医',
          '在专业指导下进行阶段化创伤心理治疗（稳定化阶段优先）',
          '请不要孤军奋战，寻求专业医疗系统与社会支持'
        ]
      }
    ],
    dimensions: [
      {
        name: '侵入再体验',
        desc: '对创伤记忆的生动闪回、侵入性画面及逼真的恶性噩梦。',
        items: [1, 2]
      },
      {
        name: '回避行为',
        desc: '刻意回避与创伤相关的内在情绪记忆与外在环境触发物。',
        items: [3, 4]
      },
      {
        name: '威胁警觉',
        desc: '持续的过度警觉戒备状态及高度敏感的惊跳生理反应。',
        items: [5, 6]
      },
      {
        name: '情感失调',
        desc: '情绪平复困难、难以自控的剧烈情绪或持久的情感麻木感。',
        items: [10, 11]
      },
      {
        name: '消极自我',
        desc: '极端的自我贬低无价值感、深刻的失败感与创伤内疚羞耻感。',
        items: [12, 13]
      },
      {
        name: '人际障碍',
        desc: '与他人疏离孤立感强烈，难以建立亲密感与持久的信任。',
        items: [14, 15]
      },
      {
        name: '功能损害',
        desc: '创伤症状对社交关系、工作学业及日常关键生活功能的实质破坏。',
        items: [7, 8, 9, 16, 17, 18]
      }
    ]
  }
};

export default ITQ;
