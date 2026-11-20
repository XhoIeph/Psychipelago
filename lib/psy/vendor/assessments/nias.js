// Vendored from PSYMETRA (js/engine.js, js/assessments/*.js) on 2026-11-12.
// Scoring logic is copied verbatim; only export shims changed. Do not "improve" numbers here.

/**
 * PSYMETRA - NIAS Assessment Definition
 * 九项回避性/限制性摄食障碍筛查量表 (Nine Item ARFID Screen, NIAS)
 * 国际临床评估非体型驱动型摄食障碍 (ARFID) 的金标准自评筛查工具 (Zickgraf & Ellis, 2018)
 */

const NIAS = {
  meta: {
    id: 'nias',
    name: 'NIAS',
    fullName: '九项回避限制性摄食筛查量表',
    englishName: 'Nine Item Avoidant/Restrictive Food Intake Disorder Screen',
    category: '进食障碍',
    targetGroups: ['成年人', '青少年', '严重挑食/严重偏食人群', '进食无食欲易遗忘者', '恐惧哽噎呕吐人群', '低体重但无体型焦虑者'],
    description: '由 Zickgraf 等于 2018 年编制，是 DSM-5 回避性/限制性摄食障碍 (ARFID) 的权威自评工具。与厌食/贪食症不同，ARFID 并非出于追求身材苗条，而是由“感官挑食敏感”、“食欲缺乏无兴趣”及“恐惧哽噎呕吐”三大核心生理心理表型所驱动。',
    instructions: '请根据您【多年以来的长期进食习惯与身体感受】，评估以下陈述与您的符合程度。请根据您的第一直觉作答。',
    duration: 2,
    timeframe: '长期一贯的饮食习惯与感受'
  },
  defaultOptions: [
    { label: '强烈反对', value: 0, desc: '完全不符合我' },
    { label: '反对', value: 1, desc: '大多时候不符合' },
    { label: '略微反对', value: 2, desc: '稍微有一点点符合，但整体不是这样' },
    { label: '略微赞同', value: 3, desc: '在某些时候比较符合' },
    { label: '赞同', value: 4, desc: '经常符合我的情况' },
    { label: '强烈赞同', value: 5, desc: '完全符合，几乎百分之百如此' }
  ],
  questions: [
    {
      id: 1,
      text: '我是一个在饮食上极度挑食偏食的人，日常能够接受并食用的食物种类非常有限',
      dimension: '挑食与感官敏感'
    },
    {
      id: 2,
      text: '很多常见食物的气味、外观、质地、软硬度或口感，会直接引发我强烈的恶心或生理反胃',
      dimension: '挑食与感官敏感'
    },
    {
      id: 3,
      text: '即使我身体感到很饿，我也坚决拒绝尝试任何未曾吃过的新食物或不符合我严苛习惯的食物',
      dimension: '挑食与感官敏感'
    },
    {
      id: 4,
      text: '我对“吃东西”这件事几乎没有任何兴趣与热情，常常觉得进食纯粹是一项繁琐乏味的生理苦差事',
      dimension: '食欲缺乏与兴趣低下'
    },
    {
      id: 5,
      text: '我经常忙碌起来就彻底忘记需要吃饭这回事，往往只有在他人反复催促提醒时才会去吃',
      dimension: '食欲缺乏与兴趣低下'
    },
    {
      id: 6,
      text: '我吃下极少量的食物就会立刻觉得肚子饱了，在日常生活中很难吃完一份正常标准分量的正餐',
      dimension: '食欲缺乏与兴趣低下'
    },
    {
      id: 7,
      text: '我非常害怕吃东西可能会导致自己被食物噎住、卡喉窒息或呛咳，因而对坚硬或大块食物极度戒备',
      dimension: '恐惧进食不良后果'
    },
    {
      id: 8,
      text: '我极度害怕进食会引发恶心、呕吐、反酸或严重的胃肠剧烈不适，因而刻意严格限制食物的种类与分量',
      dimension: '恐惧进食不良后果'
    },
    {
      id: 9,
      text: '过去曾经有过的某次令我不适的痛苦经历（如严重食物卡喉、剧烈呕吐或胃痛），至今让我对吃特定食物充满恐惧',
      dimension: '恐惧进食不良后果'
    }
  ],
  scoring: {
    method: 'sum',
    primaryMetricLabel: 'NIAS 摄食回避总分',
    primaryMetricUnit: '分 (0 - 45)',
    minScore: 0,
    maxScore: 45,
    levels: [
      {
        label: '进食模式健康平衡 (无 ARFID 限制倾向)',
        type: 'normal',
        badgeClass: 'badge-success',
        min: 0,
        max: 14,
        summary: '您的自评得分处于健康常模低区间（0-14分）。未见具有临床意义的严重感官回避、食欲抑制或进食恐惧，能够相对包容地摄入多样化饮食并满足机体营养代谢。',
        advice: [
          '继续保持多样化的健康饮食习惯',
          '在尝试新鲜风味与不同质地的美食时保持轻松开放心态'
        ]
      },
      {
        label: '轻中度饮食偏好 (局部挑食或低食欲倾向)',
        type: 'mild',
        badgeClass: 'badge-info',
        min: 15,
        max: 24,
        summary: '处于轻中度饮食习惯受限区间（15-24分）。可能在某些特定感官质地（如蔬菜粗纤维、黏稠质地）上略显挑剔，或者在疲惫时食欲偏低，但未造成严重的营养不良或体重骤降。',
        advice: [
          '注意监测日常宏量与微量营养素（如铁、维生素B群、锌）的摄入充足性',
          '尝试通过温和的烹饪改变（如打成浓汤、烘烤改变脆度）拓展食物接受范围',
          '规律就餐时间，建立稳定的生理时钟'
        ]
      },
      {
        label: 'ARFID 疑似阳性 (达到临床筛查界限)',
        type: 'moderate',
        badgeClass: 'badge-warning',
        min: 25,
        max: 45,
        summary: '您的得分达到了回避性/限制性摄食障碍 (ARFID) 的显著筛查标准（总分 ≥ 25分，或任一子维度 ≥ 10分）。提示存在严重固化的食物回避、极度食欲抑制或窒息呕吐恐惧，极易导致慢性营养不良、低体重或严重的社交聚餐障碍，需接受专科诊断。',
        advice: [
          '建议前往综合医院进食障碍专病门诊、临床营养科或精神心理科就医评估',
          '了解针对 ARFID 的感官系统脱敏疗法与认知行为治疗 (CBT-AR)',
          '定期监测血常规、微量元素及骨密度指标，防止隐匿性严重营养缺乏'
        ]
      }
    ],
    dimensions: [
      {
        name: '挑食与感官敏感',
        desc: '对食物质地、气味、颜色、口感的极度生理厌恶与拒绝尝试新食物（3题，0-15分，≥10分为显著）。',
        items: [1, 2, 3]
      },
      {
        name: '食欲缺乏与兴趣低下',
        desc: '进食动机极度淡漠、易遗忘就餐、极低饱腹阈值与食量过小（3题，0-15分，≥10分为显著）。',
        items: [4, 5, 6]
      },
      {
        name: '恐惧进食不良后果',
        desc: '极度害怕食物窒息哽噎、呕吐、反酸或胃肠剧痛，多与既往不良创伤经历相关（3题，0-15分，≥10分为显著）。',
        items: [7, 8, 9]
      }
    ]
  }
};

export default NIAS;
