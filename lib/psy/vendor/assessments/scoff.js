// Vendored from PSYMETRA (js/engine.js, js/assessments/*.js) on 2026-11-12.
// Scoring logic is copied verbatim; only export shims changed. Do not "improve" numbers here.

/**
 * PSYMETRA - SCOFF Assessment Definition
 * SCOFF 进食障碍快速筛查量表 (SCOFF Questionnaire for Eating Disorders)
 * 国际临床医学界应用最广泛的进食障碍快速初筛金标准工具 (Morgan et al., 1999)
 */

const SCOFF = {
  meta: {
    id: 'scoff',
    name: 'SCOFF',
    fullName: 'SCOFF 进食障碍筛查量表',
    englishName: 'SCOFF Questionnaire for Eating Disorders',
    category: '进食障碍',
    targetGroups: ['成年人', '青少年', '受体重大幅波动困扰人群', '暴食催吐行为疑虑者', '全科医疗初筛受试者'],
    description: '由英国伦敦大学圣乔治医院 Morgan 教授等编制，是全球医学界与大学心理健康中心使用最广泛的进食障碍快速初筛工具。涵盖病理性呕吐 (Sick)、控制丧失 (Control)、体重骤降 (One stone)、体象歪曲 (Fat) 及食物主宰 (Food) 五大核心指征。',
    instructions: '请根据您【近期的日常生活与进食观念】，对以下 5 个问题客观选择“是”或“否”。请按您的第一直觉作答。',
    duration: 1,
    timeframe: '近期日常生活与身体体验'
  },
  defaultOptions: [
    { label: '否', value: 0, desc: '不符合我的实际情况' },
    { label: '是', value: 1, desc: '符合我的实际情况' }
  ],
  questions: [
    {
      id: 1,
      text: '您是否曾因为觉得自己吃得太饱、太撑感到不适，而故意通过抠喉等方式诱发自己呕吐（催吐）？',
      dimension: '失控与代偿行为'
    },
    {
      id: 2,
      text: '您是否曾强烈担忧自己已经完全失去了对“自己能够吃多少食物”的自我控制能力？',
      dimension: '失控与代偿行为'
    },
    {
      id: 3,
      text: '在最近的 3 个月之内，您的体重是否曾经在短时间内自发或刻意减轻超过了 6 公斤（约12-14斤以上）？',
      dimension: '体重与体象扭曲'
    },
    {
      id: 4,
      text: '当身边的其他人都明确评价您已经很瘦、太苗条时，您自己是否仍然坚信自己“太胖了”？',
      dimension: '体重与体象扭曲'
    },
    {
      id: 5,
      text: '您是否常常觉得“食物、热量与吃东西的事情”在很大程度上主宰、操纵了您的整个人生与日常思绪？',
      dimension: '食物认知主导'
    }
  ],
  scoring: {
    method: 'sum',
    primaryMetricLabel: 'SCOFF 阳性指征总分',
    primaryMetricUnit: '项 (0 - 5)',
    minScore: 0,
    maxScore: 5,
    levels: [
      {
        label: '进食态度健康 (阴性正常范围)',
        type: 'normal',
        badgeClass: 'badge-success',
        min: 0,
        max: 1,
        summary: '您的自评得分为 0-1 项（阴性）。未达到进食障碍阳性筛查阈值，对食物摄入与体型体重保持着相对均衡的自然态度，无具有临床意义的极端病理性避食或暴食行为。',
        advice: [
          '保持均衡多样的膳食营养摄入，尊重身体自然的饥饿与饱腹信号',
          '维持健康的身体自我意象，不盲目追求病态极瘦的身材标准'
        ]
      },
      {
        label: '进食障碍高危阳性 (达到临床筛查界限)',
        type: 'moderate',
        badgeClass: 'badge-warning',
        min: 2,
        max: 3,
        summary: '您的 SCOFF 得分达到了国际公认的阳性筛查界限（2-3项，≥ 2项为阳性截断值，敏感度近100%）。提示在失控进食、催吐代偿、体象扭曲或体重骤降等方面存在显著指征，高度提示神经性厌食症 (AN) 或神经性贪食症 (BN) 的高危风险。',
        advice: [
          '建议前往综合医院精神心理科或临床营养科门诊接受进一步专科评估（如 EDE-Q 问卷或临床访谈）',
          '与信任的专业心理咨询师探讨身体焦虑背后的深层情绪压力源',
          '警惕盲目跟风超低热量节食，避免陷入代偿性暴食恶性循环'
        ]
      },
      {
        label: '高度病理性进食障碍 (高危警报，强烈建议就医)',
        type: 'severe',
        badgeClass: 'badge-danger',
        min: 4,
        max: 5,
        summary: '您的得分高达 4-5 项。几乎完全符合所有核心进食障碍指征，食物焦虑与身材恐惧已对心身系统形成毁灭性主宰，常伴有严重的电解质紊乱、内分泌停经、胃肠损伤及重度营养不良等重大躯体健康危机。',
        advice: [
          '强烈建议立即前往具备进食障碍救治资质的三甲精神专科医院就诊',
          '完善血常规、电解质（排查低血钾风险）、心电图等生理健康检查',
          '在家人或医护陪同下建立营养康复支持计划，必要时接受住院医疗保护'
        ]
      }
    ],
    dimensions: [
      {
        name: '失控与代偿行为',
        desc: '评估吃饱后病理性诱导催吐 (Sick) 以及对食量失去控制的强烈恐慌 (Control)（2项）。',
        items: [1, 2]
      },
      {
        name: '体重与体象扭曲',
        desc: '评估短期内体重断崖式剧降 (One stone) 以及他人视作消瘦但自认肥胖的体象扭曲 (Fat)（2项）。',
        items: [3, 4]
      },
      {
        name: '食物认知主导',
        desc: '评估食物念头、卡路里计算与进食焦虑对整个人生与日常思绪的过度支配 (Food)（1项）。',
        items: [5]
      }
    ]
  }
};

export default SCOFF;
