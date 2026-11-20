// Vendored from PSYMETRA (js/engine.js, js/assessments/*.js) on 2026-11-12.
// Scoring logic is copied verbatim; only export shims changed. Do not "improve" numbers here.

/**
 * PSYMETRA - AUDIT Assessment Definition
 * 酒精使用障碍筛查量表 (Alcohol Use Disorders Identification Test, AUDIT)
 * 世界卫生组织 (WHO) 权威发布的酒精依赖与有害饮酒金标准筛查工具 (Babor et al., 2001)
 */

const AUDIT = {
  meta: {
    id: 'audit',
    name: 'AUDIT',
    fullName: '酒精使用障碍筛查量表',
    englishName: 'Alcohol Use Disorders Identification Test',
    category: '成瘾行为',
    targetGroups: ['成年人', '经常饮酒/应酬人群', '酒后容易断片失控者', '疑似酒精依赖患者', '全科医疗健康自查者'],
    description: '由世界卫生组织 (WHO) 历时多年在多国临床研究中编制，是全球医学界筛查危险饮酒、有害性饮酒及酒精依赖综合征 (Alcohol Dependence) 的权威基准工具。涵盖酒精摄入量、依赖失控指征及饮酒导致的心身躯体危害。',
    instructions: '【标准饮酒单位说明】：1个标准杯（约10-12克纯酒精）约相当于：1听普通啤酒（330ml）、1小杯葡萄酒（约120ml）或1两低度白酒（约50ml）。请根据您【过去一年内】的真实饮酒情况作答。',
    duration: 3,
    timeframe: '过去一年'
  },
  defaultOptions: [
    { label: '从不', value: 0, desc: '过去一年从未发生' },
    { label: '少于每月一次', value: 1, desc: '发生频率很低' },
    { label: '每月 1 次左右', value: 2, desc: '平均每月出现一两次' },
    { label: '每周 1 次左右', value: 3, desc: '平均每周均有发生' },
    { label: '每天或几乎每天', value: 4, desc: '几乎无一例外频繁发生' }
  ],
  questions: [
    {
      id: 1,
      text: '您喝含有酒精饮料的频率如何？',
      dimension: '危险性酒精摄入',
      options: [
        { label: '从不喝任何含酒精饮料', value: 0, desc: '滴酒不沾' },
        { label: '每月 1 次或更少', value: 1, desc: '极少饮酒' },
        { label: '每月 2 至 4 次', value: 2, desc: '偶尔社交饮酒' },
        { label: '每周 2 至 3 次', value: 3, desc: '饮酒较为频繁' },
        { label: '每周 4 次或更多（甚至每日饮酒）', value: 4, desc: '高度频繁饮酒' }
      ]
    },
    {
      id: 2,
      text: '在通常喝酒的日子里，您一般能喝几杯（标准饮酒单位）？',
      dimension: '危险性酒精摄入',
      options: [
        { label: '1 - 2 杯（约1瓶啤酒或1两白酒）', value: 0, desc: '微量小酌' },
        { label: '3 - 4 杯', value: 1, desc: '适量饮酒' },
        { label: '5 - 6 杯', value: 2, desc: '较多饮酒' },
        { label: '7 - 9 杯', value: 3, desc: '大量酗酒' },
        { label: '10 杯或更多（极大量）', value: 4, desc: '严重超量暴饮' }
      ]
    },
    {
      id: 3,
      text: '您单次饮酒达到或超过 6 杯（约两瓶半啤酒或半斤以上白酒）的频率如何？',
      dimension: '危险性酒精摄入',
      options: [
        { label: '从不', value: 0, desc: '从未单次喝这么多' },
        { label: '少于每月 1 次', value: 1, desc: '偶有一两次' },
        { label: '大约每月 1 次', value: 2, desc: '每月约发生一次' },
        { label: '大约每周 1 次', value: 3, desc: '几乎每周都有一次大醉' },
        { label: '每天或几乎每天', value: 4, desc: '持续频繁狂饮暴饮' }
      ]
    },
    {
      id: 4,
      text: '在过去的一年里，您一旦端起酒杯开始喝酒，就发现自己完全无法停下来的频率如何？',
      dimension: '酒精依赖症状',
      options: [
        { label: '从不', value: 0, desc: '始终能自主控制何时停止' },
        { label: '少于每月 1 次', value: 1, desc: '极少发生失控' },
        { label: '大约每月 1 次', value: 2, desc: '偶有刹不住车的体验' },
        { label: '大约每周 1 次', value: 3, desc: '经常失控无法自拔' },
        { label: '每天或几乎每天', value: 4, desc: '彻底丧失停酒自控力' }
      ]
    },
    {
      id: 5,
      text: '在过去的一年里，因为饮酒或宿醉而导致未能完成您原本应该履行的职责、工作或学习的频率如何？',
      dimension: '酒精依赖症状',
      options: [
        { label: '从不', value: 0, desc: '从未因饮酒耽误正事' },
        { label: '少于每月 1 次', value: 1, desc: '偶有轻微耽搁' },
        { label: '大约每月 1 次', value: 2, desc: '每月约有一次误事' },
        { label: '大约每周 1 次', value: 3, desc: '每周都有怠工迟到或缺勤' },
        { label: '每天或几乎每天', value: 4, desc: '严重瘫痪日常职业功能' }
      ]
    },
    {
      id: 6,
      text: '在过去的一年里，经历了一场重饮之后，您需要在第二天早晨醒来空腹喝一杯酒以解宿醉、提神醒脑的频率如何？',
      dimension: '酒精依赖症状',
      options: [
        { label: '从不', value: 0, desc: '从未晨饮解酒' },
        { label: '少于每月 1 次', value: 1, desc: '极罕见尝试' },
        { label: '大约每月 1 次', value: 2, desc: '偶尔需要晨饮平复' },
        { label: '大约每周 1 次', value: 3, desc: '每周都出现晨饮需求' },
        { label: '每天或几乎每天', value: 4, desc: '典型生理戒断晨饮成瘾' }
      ]
    },
    {
      id: 7,
      text: '在过去的一年里，您在饮酒之后产生强烈的内疚、后悔、内疚自责情绪的频率如何？',
      dimension: '酒精相关有害后果',
      options: [
        { label: '从不', value: 0, desc: '饮酒后无悔恨内疚' },
        { label: '少于每月 1 次', value: 1, desc: '偶尔感到懊悔' },
        { label: '大约每月 1 次', value: 2, desc: '经常为酒后失态自责' },
        { label: '大约每周 1 次', value: 3, desc: '每周都处于酒后内疚中' },
        { label: '每天或几乎每天', value: 4, desc: '持续处于深重罪恶自责中' }
      ]
    },
    {
      id: 8,
      text: '在过去的一年里，您因为喝醉而导致事后完全记不得前一晚发生的事情（断片/酒后失忆）的频率如何？',
      dimension: '酒精相关有害后果',
      options: [
        { label: '从不', value: 0, desc: '从未酒后断片' },
        { label: '少于每月 1 次', value: 1, desc: '偶有一两次断片' },
        { label: '大约每月 1 次', value: 2, desc: '大约每月断片一次' },
        { label: '大约每周 1 次', value: 3, desc: '几乎每周都有记忆断层' },
        { label: '每天或几乎每天', value: 4, desc: '极其严重的大脑神经功能受损' }
      ]
    },
    {
      id: 9,
      text: '您是否曾经因为自己的饮酒行为，而导致您自己或他人遭受了身体受伤或意外？',
      dimension: '酒精相关有害后果',
      options: [
        { label: '从来没有发生过', value: 0, desc: '从未发生酒后意外致伤' },
        { label: '发生过，但不在过去一年内', value: 2, desc: '多年前曾有酒后外伤事故' },
        { label: '是的，在过去一年内发生过', value: 4, desc: '近一年内发生过酒后致伤事故' }
      ]
    },
    {
      id: 10,
      text: '是否有亲戚、朋友、同事或医生对您的饮酒习惯表示过深切担忧，或曾严肃建议您戒酒或减少饮酒？',
      dimension: '酒精相关有害后果',
      options: [
        { label: '从来没有', value: 0, desc: '无人提出过担忧' },
        { label: '提出过，但不在过去一年内', value: 2, desc: '以往曾有人提醒规劝' },
        { label: '是的，在过去一年内被明确劝告过', value: 4, desc: '近一年内频繁被他人要求戒酒' }
      ]
    }
  ],
  scoring: {
    method: 'sum',
    primaryMetricLabel: 'AUDIT 酒精使用障碍总分',
    primaryMetricUnit: '分 (0 - 40)',
    minScore: 0,
    maxScore: 40,
    levels: [
      {
        label: '低风险安全饮酒 (健康常模范围)',
        type: 'normal',
        badgeClass: 'badge-success',
        min: 0,
        max: 7,
        summary: '您的自评得分处于健康低风险区间（0-7分）。表明您当前的饮酒模式处于安全自律水平，未见具有临床意义的酒精滥用、失控或依赖征象。',
        advice: [
          '继续保持适度节制的健康生活习惯',
          '在驾车、服药或备孕期间严格做到滴酒不沾'
        ]
      },
      {
        label: '危险性饮酒 (达到临床筛查阳性界限)',
        type: 'mild',
        badgeClass: 'badge-info',
        min: 8,
        max: 15,
        summary: '您的自评得分达到了 WHO 危险性饮酒标准（8-15分，≥ 8分为阳性筛查截断值）。提示近一年内饮酒频次或单次酒量明显偏高，可能已偶发断片、晨饮或酒后内疚，若不加以控制极易滑向不可逆的器质性器官损害与心理依赖。',
        advice: [
          '建议接受医务人员的“简短饮酒干预 (Brief Intervention)”，设立减酒目标日记',
          '学会拒绝劝酒，在社交场合选择无酒精替代饮品',
          '切忌借助酒精来缓解焦虑或对抗失眠，酒精会严重破坏深度睡眠结构'
        ]
      },
      {
        label: '有害性饮酒 (显著心身器官损害)',
        type: 'moderate',
        badgeClass: 'badge-warning',
        min: 16,
        max: 19,
        summary: '得分处于有害性饮酒区间（16-19分）。表明酒精摄入已经对您的身体器官（如肝脏、胃肠、心血管）或人际家庭、工作职责造成了明确而实质性的破坏，具备显著的临床干预指征。',
        advice: [
          '建议尽快前往综合医院肝病科/消化科与心理科门诊就诊接受系统健康体检',
          '排查酒精性脂肪肝、转氨酶升高及胃黏膜病变，在医生指导下制定戒酒计划',
          '积极向家人坦诚饮酒困扰，建立家庭监督支持同盟'
        ]
      },
      {
        label: '可能存在严重酒精依赖 (高度成瘾风险，需专科治疗)',
        type: 'severe',
        badgeClass: 'badge-danger',
        min: 20,
        max: 40,
        summary: '您的得分高度显著（20-40分），强烈提示存在中重度酒精依赖综合征 (Alcohol Dependence Syndrome)。饮酒已经发展为神经精神层面的强迫性成瘾行为，常伴有明显的耐受性增加、生理戒断震颤、失去自我节制以及严重的人际职业功能破裂。',
        advice: [
          '强烈建议立即前往具备物质依赖脱瘾资质的精神卫生专科医院成瘾医学门诊就诊',
          '严格禁止擅自突然断酒（可能引发致命的震颤谵妄戒断综合征），须在医生严密监控下进行规范药物替代脱瘾',
          '参与匿名戒酒互助会 (AA) 或专业认知行为戒瘾治疗，重建无酒精健康人生'
        ]
      }
    ],
    dimensions: [
      {
        name: '危险性酒精摄入',
        desc: '评估饮酒频次、典型饮酒量及高频单次暴饮（3题，0-12分）。',
        items: [1, 2, 3]
      },
      {
        name: '酒精依赖症状',
        desc: '评估停酒自控力丧失、因饮酒废事以及晨起空腹饮酒解宿醉等生理心理依赖特征（3题，0-12分）。',
        items: [4, 5, 6]
      },
      {
        name: '酒精相关有害后果',
        desc: '评估饮酒后自责内疚、断片失忆、因酒致伤自己或他人及受到外界医护劝诫（4题，0-16分）。',
        items: [7, 8, 9, 10]
      }
    ]
  }
};

export default AUDIT;
