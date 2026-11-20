// Vendored from PSYMETRA (js/engine.js, js/assessments/*.js) on 2026-11-12.
// Scoring logic is copied verbatim; only export shims changed. Do not "improve" numbers here.

/**
 * PSYMETRA - Unified Assessment Engine
 * Generic assessment engine that drives testing, pagination, scoring, and state management.
 * Free of scale-specific branching — all behavior is data-driven by Assessment definitions.
 */

class AssessmentEngine {
  /**
   * @param {Object} assessment - Canonical Assessment definition from REGISTRY
   */
  constructor(assessment) {
    if (!assessment) {
      throw new Error('AssessmentEngine requires a valid assessment definition.');
    }
    this.assessment = assessment;
    this.answers = {}; // { [questionId]: numericValue }
    this.startTime = null;
    this.currentPage = 0;

    // Pagination: respect assessment.meta.pageSize if defined, otherwise >20 -> 10, <=20 -> all on one page
    const qCount = assessment.questions.length;
    this.pageSize = (assessment.meta && assessment.meta.pageSize) ? assessment.meta.pageSize : (qCount > 20 ? 10 : qCount);
    this.totalPages = Math.max(1, Math.ceil(qCount / this.pageSize));
    this.gender = (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function' && localStorage.getItem('psy_gender') !== null) ? Number(localStorage.getItem('psy_gender')) : 0;
  }

  /**
   * Record or update an answer for a question.
   * @param {number} questionId 
   * @param {number} value 
   */
  setAnswer(questionId, value) {
    this.answers[questionId] = Number(value);
  }

  /**
   * Check if a specific question has been answered.
   * @param {number} questionId 
   * @returns {boolean}
   */
  hasAnswer(questionId) {
    return this.answers[questionId] !== undefined && this.answers[questionId] !== null;
  }

  /**
   * Get list of questions for the current page.
   * @returns {Array}
   */
  getCurrentPageQuestions() {
    const startIndex = this.currentPage * this.pageSize;
    const endIndex = Math.min(startIndex + this.pageSize, this.assessment.questions.length);
    return this.assessment.questions.slice(startIndex, endIndex);
  }

  /**
   * Find question IDs on current page that remain unanswered.
   * @returns {number[]}
   */
  getUnansweredOnCurrentPage() {
    const pageQuestions = this.getCurrentPageQuestions();
    const unanswered = [];
    pageQuestions.forEach(q => {
      if (!this.hasAnswer(q.id)) {
        unanswered.push(q.id);
      }
    });
    return unanswered;
  }

  /**
   * Overall progress percentage.
   * @returns {{ answered: number, total: number, percent: number }}
   */
  getProgress() {
    const answered = Object.keys(this.answers).length;
    const total = this.assessment.questions.length;
    const percent = total > 0 ? Math.min(100, Math.round((answered / total) * 100)) : 0;
    return { answered, total, percent };
  }

  /**
   * Specialized scoring and profile calculation for MMPI-2
   * @param {Object} scoredValues - Map of question ID to answer value (1 or 0)
   * @returns {Object} Canonical assessment result payload
   */
  computeMMPIResult(scoredValues) {
    const assessment = this.assessment;
    const scoring = assessment.scoring;
    const questions = assessment.questions;
    const answers = this.answers;
    const cfg = assessment.mmpiConfig;
    const gender = (this.gender !== undefined) ? this.gender : ((typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function' && localStorage.getItem('psy_gender') !== null) ? Number(localStorage.getItem('psy_gender')) : 0);

    // 1. Calculate raw score for K scale first
    const kScale = cfg.scales['K'];
    const kTrue = gender === 1 ? kScale.trueItemsFemale : kScale.trueItemsMale;
    const kFalse = gender === 1 ? kScale.falseItemsFemale : kScale.falseItemsMale;
    let rawK = 0;
    kTrue.forEach(id => { if (scoredValues[id] === 1) rawK++; });
    kFalse.forEach(id => { if (scoredValues[id] === 0) rawK++; });

    // 2. Calculate for each target key (13 core validity & clinical scales)
    const targetResults = {};
    cfg.targetKeys.forEach(k => {
      const sc = cfg.scales[k];
      const tItems = gender === 1 ? sc.trueItemsFemale : sc.trueItemsMale;
      const fItems = gender === 1 ? sc.falseItemsFemale : sc.falseItemsMale;
      let raw = 0;
      tItems.forEach(id => { if (scoredValues[id] === 1) raw++; });
      fItems.forEach(id => { if (scoredValues[id] === 0) raw++; });

      const kScore = raw + Math.round((sc.kMultiplier || 0) * rawK);
      const usTable = gender === 1 ? sc.usTableFemale : sc.usTableMale;
      let usT = 50;
      if (kScore + 1 < usTable.length && usTable[kScore + 1] !== null && usTable[kScore + 1] !== undefined) {
        usT = usTable[kScore + 1];
      } else if (kScore + 1 >= usTable.length) {
        usT = usTable[usTable.length - 1] || 120;
      } else {
        usT = usTable.find(v => v !== null && v !== undefined) || 50;
      }

      const norm = gender === 1 ? sc.normFemale : sc.normMale;
      const cnT = Math.min(120, Math.max(30, Math.round(50 + ((usT - norm.mean) / norm.sd) * 10)));

      // Interpretation text resolution from sc.interp
      let interpText = '';
      if (sc.interp) {
        if (cnT >= (sc.interp.highCut || 65)) {
          interpText = sc.interp.highText;
        } else if (cnT <= (sc.interp.lowCut || 45)) {
          interpText = sc.interp.lowText;
        } else {
          interpText = sc.interp.midText;
        }
      }

      let dimLevel = '常模正常';
      let dimLevelType = 'normal';
      let dimBadgeClass = 'badge-success';

      if (cnT >= 70) {
        dimLevel = '显著偏高 (T≥70)';
        dimLevelType = 'severe';
        dimBadgeClass = 'badge-danger';
      } else if (cnT >= 60) {
        dimLevel = '轻中偏高 (60≤T<70)';
        dimLevelType = 'moderate';
        dimBadgeClass = 'badge-warning';
      } else if (cnT <= 40) {
        dimLevel = '偏低 (T≤40)';
        dimLevelType = 'mild';
        dimBadgeClass = 'badge-info';
      }

      targetResults[k] = {
        id: k.toLowerCase(),
        key: k,
        number: sc.number,
        name: sc.name,
        desc: sc.desc,
        itemCount: (tItems.length + fItems.length),
        raw: raw,
        kScore: kScore,
        usT: usT,
        score: cnT,
        cnT: cnT,
        level: dimLevel,
        levelType: dimLevelType,
        badgeClass: dimBadgeClass,
        interp: interpText,
        interpText: interpText
      };
    });

    // 3. Clinical Scales & Primary Score
    const clinicalKeys = ['Hs', 'D', 'Hy', 'Pd', 'Mf', 'Pa', 'Pt', 'Sc', 'Ma', 'Si'];
    const clinicalDims = clinicalKeys.map(k => targetResults[k]);
    const maxClinicalT = Math.max(...clinicalDims.map(d => d.cnT));
    const primaryScore = maxClinicalT;

    let matchedLevel;
    if (primaryScore >= 70) {
      matchedLevel = scoring.levels.find(l => l.type === 'severe') || scoring.levels[2];
    } else if (primaryScore >= 60) {
      matchedLevel = scoring.levels.find(l => l.type === 'moderate') || scoring.levels[1];
    } else {
      matchedLevel = scoring.levels.find(l => l.type === 'normal') || scoring.levels[0];
    }

    const dimensionScores = cfg.targetKeys.map(k => targetResults[k]);

    // 4. Two-point Code (两点编码型)
    const sortedClinical = [...clinicalDims].sort((a, b) => b.cnT - a.cnT);
    const top1 = sortedClinical[0];
    const top2 = sortedClinical[1];

    const twoPointCodes = {
      '1-2': '疑病-抑郁型 (1-2 / 2-1)：显著躯体不适抱怨伴随情绪低落、多疑脆弱与无助感',
      '2-1': '疑病-抑郁型 (1-2 / 2-1)：显著躯体不适抱怨伴随情绪低落、多疑脆弱与无助感',
      '1-3': '神经症转化型 (1-3 / 3-1)：习惯以躯体化症状掩盖心理冲突，防御性高，情绪表达受抑',
      '3-1': '神经症转化型 (1-3 / 3-1)：习惯以躯体化症状掩盖心理冲突，防御性高，情绪表达受抑',
      '1-4': '疑病-反叛型 (1-4 / 4-1)：慢性严重躯体抱怨伴冲动不合群、易受挫与人际矛盾',
      '4-1': '疑病-反叛型 (1-4 / 4-1)：慢性严重躯体抱怨伴冲动不合群、易受挫与人际矛盾',
      '1-8': '躯体-分裂型 (1-8 / 8-1)：怪异躯体感觉、对身体功能的异常偏执与社会退缩疏离',
      '8-1': '躯体-分裂型 (1-8 / 8-1)：怪异躯体感觉、对身体功能的异常偏执与社会退缩疏离',
      '2-3': '抑郁-无助型 (2-3 / 3-2)：动力极低、被动依赖、无助脆弱与习惯性回避现实困难',
      '3-2': '抑郁-无助型 (2-3 / 3-2)：动力极低、被动依赖、无助脆弱与习惯性回避现实困难',
      '2-4': '抑郁-冲动型 (2-4 / 4-2)：内在愤怒抑郁交织、冲动行为后常伴有深刻内疚与后悔',
      '4-2': '抑郁-冲动型 (2-4 / 4-2)：内在愤怒抑郁交织、冲动行为后常伴有深刻内疚与后悔',
      '2-7': '抑郁-强迫焦虑型 (2-7 / 7-2)：经典神经症组合，慢性高度担忧、焦虑紧绷、自责与心境低落',
      '7-2': '抑郁-强迫焦虑型 (2-7 / 7-2)：经典神经症组合，慢性高度担忧、焦虑紧绷、自责与心境低落',
      '2-8': '抑郁-退缩型 (2-8 / 8-2)：严重情绪低落伴显著精神运动性迟滞、退缩冷漠与睡眠饮食紊乱',
      '8-2': '抑郁-退缩型 (2-8 / 8-2)：严重情绪低落伴显著精神运动性迟滞、退缩冷漠与睡眠饮食紊乱',
      '3-4': '情绪压抑反叛型 (3-4 / 4-3)：平时表面顺从被动，压抑深层敌意，间歇性爆发攻击情绪',
      '4-3': '情绪压抑反叛型 (3-4 / 4-3)：平时表面顺从被动，压抑深层敌意，间歇性爆发攻击情绪',
      '4-6': '反社会-偏执型 (4-6 / 6-4)：对他人充满猜疑与防备、易激惹、难以建立长期信任关系',
      '6-4': '反社会-偏执型 (4-6 / 6-4)：对他人充满猜疑与防备、易激惹、难以建立长期信任关系',
      '4-9': '冲动外倾型 (4-9 / 9-4)：精力旺盛但自控力差、追求刺激、漠视规则权威、行动先于思考',
      '9-4': '冲动外倾型 (4-9 / 9-4)：精力旺盛但自控力差、追求刺激、漠视规则权威、行动先于思考',
      '6-8': '偏执-分裂型 (6-8 / 8-6)：明显不安全感、被害倾向、人际过度警惕与现实检验力下降',
      '8-6': '偏执-分裂型 (6-8 / 8-6)：明显不安全感、被害倾向、人际过度警惕与现实检验力下降',
      '7-8': '焦虑-思维紊乱型 (7-8 / 8-7)：高度主观精神痛苦、反刍强迫思维、注意力难以集中与意识漂浮',
      '8-7': '焦虑-思维紊乱型 (7-8 / 8-7)：高度主观精神痛苦、反刍强迫思维、注意力难以集中与意识漂浮',
      '8-9': '思维奔逸亢奋型 (8-9 / 9-8)：过度兴奋活跃、思维奔逸、怪异信念脱离现实与睡眠需求骤减',
      '9-8': '思维奔逸亢奋型 (8-9 / 9-8)：过度兴奋活跃、思维奔逸、怪异信念脱离现实与睡眠需求骤减'
    };

    let codeKey = `${top1.number}-${top2.number}`;
    let codeInterpretation = '';
    if (top1.cnT < 60) {
      codeInterpretation = '无显著临床编码型 (核心量表均处于常模正常范围)';
    } else if (top2.cnT < 60) {
      codeInterpretation = `${top1.number} 单峰突出型 (${top1.name.split('(')[0].trim()} T=${top1.cnT})`;
    } else {
      codeInterpretation = twoPointCodes[codeKey] || `${top1.number}-${top2.number} 混合编码型 (${top1.name.split('(')[0].trim()} T=${top1.cnT} / ${top2.name.split('(')[0].trim()} T=${top2.cnT})`;
    }

    // 5. Validity Analysis
    const valL = targetResults['L'].cnT;
    const valF = targetResults['F'].cnT;
    const valK = targetResults['K'].cnT;
    let validityConclusion = '✓ 效度良好，测验真实有效';
    if (valF >= 80) {
      validityConclusion = '效度存疑：F 分显著偏高 (T≥80)，可能存在夸大症状、伪装求助或非随机作答';
    } else if (valL >= 70) {
      validityConclusion = '效度警示：L 分过高 (T≥70)，存在掩饰弱点的防御倾向';
    } else if (valK >= 70) {
      validityConclusion = '过度防御：K 分偏高 (T≥70)，心理戒备较强，可能低估症状';
    } else if (valK <= 40 && valF >= 70) {
      validityConclusion = '求助呼救模式：呈现明显求助信号 (Cry for help)';
    }

    const elevatedScales = clinicalDims.filter(d => d.cnT >= 60).map(d => `${d.key}(${d.cnT}T)`);
    const elevatedStr = elevatedScales.length > 0 ? elevatedScales.join('、') : '无 (全部处于正常基线)';

    // Secondary Metrics
    const secondaryMetrics = [
      { label: '效度量表组合 (L/F/K)', value: `L=${valL}T / F=${valF}T / K=${valK}T`, unit: '' },
      { label: '两点编码型 (Code Type)', value: codeInterpretation.split('：')[0], unit: '' },
      { label: '中国常模超标量表', value: elevatedStr, unit: '' },
      { label: '测验有效度结论', value: validityConclusion.split('：')[0], unit: '' }
    ];

    const now = new Date();
    const durationSeconds = this.startTime ? Math.max(1, Math.round((Date.now() - this.startTime) / 1000)) : 0;

    return {
      scaleId: assessment.meta.id,
      scaleName: assessment.meta.name,
      scaleFullName: assessment.meta.fullName,
      scaleEnglishName: assessment.meta.englishName,
      scaleCategory: assessment.meta.category,
      scaleDescription: assessment.meta.description,
      scaleTimeframe: assessment.meta.timeframe,
      references: assessment.meta.references,
      primaryScore,
      primaryMetric: {
        label: scoring.primaryMetricLabel,
        value: primaryScore,
        unit: scoring.primaryMetricUnit,
        min: scoring.minScore,
        max: scoring.maxScore
      },
      secondaryMetrics,
      level: matchedLevel.label,
      levelType: matchedLevel.type,
      badgeClass: matchedLevel.badgeClass,
      summary: matchedLevel.summary + (codeInterpretation ? ` 【两点编码分析】：${codeInterpretation}。` : ''),
      advice: matchedLevel.advice,
      dimensionScores,
      subscales: dimensionScores,
      gender: gender,
      genderLabel: gender === 1 ? '女 (Female)' : '男 (Male)',
      validityConclusion,
      codeInterpretation,
      answers: Object.entries(answers).map(([id, val]) => {
        const numId = Number(id);
        const qObj = questions.find(q => q.id === numId);
        return {
          id: numId,
          text: qObj ? qObj.text : '',
          dimension: qObj ? qObj.dimension : undefined,
          value: val,
          scored: scoredValues[numId]
        };
      }),
      timestamp: now.toISOString(),
      completedTimeFormatted: AssessmentEngine.formatDate(now),
      durationSeconds
    };
  }

  /**
   * Computes the complete assessment result based on current answers and scoring schema.
   * @returns {Object} Canonical assessment result payload
   */
  computeResult() {
    const { assessment, answers } = this;
    const questions = assessment.questions;
    const scoring = assessment.scoring;

    // Fast-path for MMPI-2 specialized scoring
    if (assessment.meta.id === 'mmpi' || scoring.method === 'mmpi') {
      const scoredValues = {};
      questions.forEach(q => {
        const raw = answers[q.id];
        scoredValues[q.id] = (raw !== undefined && raw !== null) ? Number(raw) : 0;
      });
      return this.computeMMPIResult(scoredValues);
    }

    // Build raw answer map
    const answerMap = {};
    questions.forEach(q => {
      answerMap[q.id] = answers[q.id] !== undefined ? answers[q.id] : null;
    });

    // Compute scored values considering reverse scoring
    const scoredValues = {};
    questions.forEach(q => {
      const raw = answerMap[q.id];
      if (raw === null || raw === undefined) {
        scoredValues[q.id] = 1; // Fallback baseline if missing
        return;
      }
      const opts = (q.options && q.options.length > 0) ? q.options : assessment.defaultOptions;
      if (q.reversed && opts && opts.length > 0) {
        const maxVal = Math.max(...opts.map(o => o.value));
        const minVal = Math.min(...opts.map(o => o.value));
        scoredValues[q.id] = maxVal + minVal - raw;
      } else {
        scoredValues[q.id] = raw;
      }
    });

    // Compute primary score based on scoring method
    let primaryScore = 0;
    if (assessment.meta.id === 'mdq') {
      // MDQ primary score is the count of 'Yes' in Q1 - Q13 (0 - 13 items)
      primaryScore = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
    } else if (assessment.meta.id === 'psqi' || scoring.method === 'psqi') {
      // PSQI standard clinical component scoring (Buysse et al., 1989; 刘贤臣等, 1996)
      // C1 (主观睡眠质量): Q14 (0~3)
      const c1 = scoredValues[14] || 0;
      // C2 (入睡潜伏期): Q1 + Q4, 0 -> 0, 1-2 -> 1, 3-4 -> 2, 5-6 -> 3
      const latSum = (scoredValues[1] || 0) + (scoredValues[4] || 0);
      const c2 = latSum === 0 ? 0 : (latSum <= 2 ? 1 : (latSum <= 4 ? 2 : 3));
      // C3 (睡眠时间): Q2 (0~3)
      const c3 = scoredValues[2] || 0;
      // C4 (习惯睡眠效率): Q3 (0~3)
      const c4 = scoredValues[3] || 0;
      // C5 (睡眠障碍困扰): Q5..Q13 sum (0~27), 0 -> 0, 1-9 -> 1, 10-18 -> 2, 19-27 -> 3
      const distSum = [5, 6, 7, 8, 9, 10, 11, 12, 13].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      const c5 = distSum === 0 ? 0 : (distSum <= 9 ? 1 : (distSum <= 18 ? 2 : 3));
      // C6 (催眠药物使用): Q15 (0~3)
      const c6 = scoredValues[15] || 0;
      // C7 (日间功能障碍): Q16 + Q17, 0 -> 0, 1-2 -> 1, 3-4 -> 2, 5-6 -> 3
      const daySum = (scoredValues[16] || 0) + (scoredValues[17] || 0);
      const c7 = daySum === 0 ? 0 : (daySum <= 2 ? 1 : (daySum <= 4 ? 2 : 3));
      primaryScore = c1 + c2 + c3 + c4 + c5 + c6 + c7;
    } else if (scoring.method === 'sum') {
      primaryScore = Object.values(scoredValues).reduce((a, b) => a + b, 0);
    } else if (scoring.method === 'mean_subscale') {
      // GSI / Mean percentage
      const total = Object.values(scoredValues).reduce((a, b) => a + b, 0);
      if (assessment.meta.id === 'mid') {
        // MID items are rated 0 to 10; mean score is represented as 0 to 100 percentage (Dell, 2006)
        primaryScore = parseFloat(((total / questions.length) * 10).toFixed(1));
      } else {
        primaryScore = parseFloat((total / questions.length).toFixed(assessment.meta.id === 'des2' ? 1 : 2));
      }
    } else if (scoring.method === 'weighted_standard') {
      const rawSum = Object.values(scoredValues).reduce((a, b) => a + b, 0);
      const formula = scoring.standardScoreFormula || { multiply: 1, round: false };
      primaryScore = formula.round ? Math.round(rawSum * formula.multiply) : rawSum * formula.multiply;
    }

    // Determine severity level bracket
    let matchedLevel;
    if (assessment.meta.id === 'mdq') {
      const isCoOccur = (scoredValues[14] || 0) === 1;
      const impairmentLevel = scoredValues[15] || 0; // 0, 1, 2, 3
      if (primaryScore >= 7 && isCoOccur && impairmentLevel >= 2) {
        matchedLevel = scoring.levels.find(l => l.type === 'severe') || scoring.levels[2];
      } else if (primaryScore >= 5) {
        matchedLevel = scoring.levels.find(l => l.type === 'mild') || scoring.levels[1];
      } else {
        matchedLevel = scoring.levels.find(l => l.type === 'normal') || scoring.levels[0];
      }
    } else if (assessment.meta.id === 'cssrs') {
      const q1 = scoredValues[1] || 0;
      const q2 = scoredValues[2] || 0;
      const q3 = scoredValues[3] || 0;
      const q4 = scoredValues[4] || 0;
      const q5 = scoredValues[5] || 0;
      const q6 = scoredValues[6] || 0;
      if ((q4 === 1 || q5 === 1) && q6 === 1) {
        matchedLevel = scoring.levels[4]; // 极危急风险
      } else if (q4 === 1 || q5 === 1) {
        matchedLevel = scoring.levels[3]; // 高度风险
      } else if (q3 === 1 || q6 === 1) {
        matchedLevel = scoring.levels[2]; // 中度风险
      } else if (q1 === 1 || q2 === 1) {
        matchedLevel = scoring.levels[1]; // 低度风险
      } else {
        matchedLevel = scoring.levels[0]; // 极低风险
      }
    } else if (assessment.meta.id === 'asq') {
      const q1 = scoredValues[1] || 0;
      const q2 = scoredValues[2] || 0;
      const q3 = scoredValues[3] || 0;
      const q4 = scoredValues[4] || 0;
      const q5 = scoredValues[5] || 0;
      if (q5 === 1) {
        matchedLevel = scoring.levels[4]; // 急性高危阳性
      } else if (q3 === 1 && q4 === 1) {
        matchedLevel = scoring.levels[3]; // 显著阳性风险
      } else if (q1 === 1 || q2 === 1 || q3 === 1 || q4 === 1) {
        const sumCore = q1 + q2 + q3 + q4;
        matchedLevel = sumCore >= 2 ? scoring.levels[2] : scoring.levels[1]; // 非急性阳性 or 轻度潜在风险
      } else {
        matchedLevel = scoring.levels[0]; // 阴性筛查
      }
    } else {
      matchedLevel = scoring.levels.find(l => primaryScore >= l.min && primaryScore <= l.max)
        || scoring.levels[scoring.levels.length - 1];
    }

    // Compute dimension scores (if multi-dimensional)
    let dimensionScores = null;
    if (scoring.dimensions && scoring.dimensions.length > 0) {
      dimensionScores = scoring.dimensions.map(dim => {
        const dimValues = dim.items.map(id => scoredValues[id] !== undefined ? scoredValues[id] : 0);
        const dimSum = dimValues.reduce((a, b) => a + b, 0);
        const dimMean = parseFloat((dimSum / dimValues.length).toFixed(2));

        let dimLevel = '正常';
        let dimLevelType = 'normal';
        let dimBadgeClass = 'badge-success';

        if (assessment.meta.id === 'psqi') {
          let compScore = 0;
          if (dim.id === 'c1') compScore = scoredValues[14] || 0;
          else if (dim.id === 'c2') {
            const latSum = (scoredValues[1] || 0) + (scoredValues[4] || 0);
            compScore = latSum === 0 ? 0 : (latSum <= 2 ? 1 : (latSum <= 4 ? 2 : 3));
          } else if (dim.id === 'c3') compScore = scoredValues[2] || 0;
          else if (dim.id === 'c4') compScore = scoredValues[3] || 0;
          else if (dim.id === 'c5') {
            const distSum = [5, 6, 7, 8, 9, 10, 11, 12, 13].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
            compScore = distSum === 0 ? 0 : (distSum <= 9 ? 1 : (distSum <= 18 ? 2 : 3));
          } else if (dim.id === 'c6') compScore = scoredValues[15] || 0;
          else if (dim.id === 'c7') {
            const daySum = (scoredValues[16] || 0) + (scoredValues[17] || 0);
            compScore = daySum === 0 ? 0 : (daySum <= 2 ? 1 : (daySum <= 4 ? 2 : 3));
          }
          if (compScore === 0) {
            dimLevel = '优良无困扰 (0分)';
            dimLevelType = 'normal';
            dimBadgeClass = 'badge-success';
          } else if (compScore === 1) {
            dimLevel = '轻度困扰 (1分)';
            dimLevelType = 'mild';
            dimBadgeClass = 'badge-info';
          } else if (compScore === 2) {
            dimLevel = '中度困扰 (2分)';
            dimLevelType = 'moderate';
            dimBadgeClass = 'badge-warning';
          } else {
            dimLevel = '严重障碍 (3分)';
            dimLevelType = 'severe';
            dimBadgeClass = 'badge-danger';
          }
          return {
            name: dim.name,
            desc: dim.desc,
            itemCount: dim.items.length,
            score: compScore,
            level: dimLevel,
            levelType: dimLevelType,
            badgeClass: dimBadgeClass
          };
        } else if (assessment.meta.id === 'hcl32') {
          const ratio = dimSum / dimValues.length;
          if (ratio >= 0.65) {
            dimLevel = '高度集中表现';
            dimLevelType = 'severe';
            dimBadgeClass = 'badge-danger';
          } else if (ratio >= 0.4) {
            dimLevel = '中度活跃特征';
            dimLevelType = 'moderate';
            dimBadgeClass = 'badge-warning';
          } else if (ratio >= 0.2) {
            dimLevel = '轻微偶发表现';
            dimLevelType = 'mild';
            dimBadgeClass = 'badge-info';
          } else {
            dimLevel = '常态平稳';
            dimLevelType = 'normal';
            dimBadgeClass = 'badge-success';
          }
          return {
            name: dim.name,
            desc: dim.desc,
            itemCount: dim.items.length,
            score: dimSum,
            level: dimLevel,
            levelType: dimLevelType,
            badgeClass: dimBadgeClass
          };
        }

        if (assessment.meta.id === 'mid') {
          const dimPct = parseFloat((dimMean * 10).toFixed(1));
          const l = scoring.levels.find(lvl => dimPct >= lvl.min && dimPct <= lvl.max)
            || scoring.levels[scoring.levels.length - 1];
          return {
            name: dim.name,
            desc: dim.desc,
            itemCount: dim.items.length,
            score: dimPct,
            level: l.label,
            levelType: l.type,
            badgeClass: l.badgeClass
          };
        } else if (scoring.method === 'mean_subscale') {
          const l = scoring.levels.find(lvl => dimMean >= lvl.min && dimMean <= lvl.max)
            || scoring.levels[scoring.levels.length - 1];
          dimLevel = l.label;
          dimLevelType = l.type;
          dimBadgeClass = l.badgeClass;
        } else if (assessment.meta.id === 'itq') {
          if (dimMean >= 2.0) {
            dimLevel = '达到症状界线';
            dimLevelType = 'severe';
            dimBadgeClass = 'badge-danger';
          } else if (dimMean >= 1.0) {
            dimLevel = '轻度应激';
            dimLevelType = 'mild';
            dimBadgeClass = 'badge-warning';
          } else {
            dimLevel = '无显著困扰';
            dimLevelType = 'normal';
            dimBadgeClass = 'badge-success';
          }
        } else if (assessment.meta.id === 'asrs') {
          if (dimMean >= 2.5) {
            dimLevel = '显著倾向';
            dimLevelType = 'severe';
            dimBadgeClass = 'badge-danger';
          } else if (dimMean >= 1.5) {
            dimLevel = '中度表现';
            dimLevelType = 'moderate';
            dimBadgeClass = 'badge-warning';
          } else if (dimMean >= 0.8) {
            dimLevel = '轻度表现';
            dimLevelType = 'mild';
            dimBadgeClass = 'badge-info';
          } else {
            dimLevel = '无明显表现';
            dimLevelType = 'normal';
            dimBadgeClass = 'badge-success';
          }
        } else if (assessment.meta.id === 'aqa') {
          if (dimMean >= 0.7) {
            dimLevel = '显著自闭特质';
            dimLevelType = 'severe';
            dimBadgeClass = 'badge-danger';
          } else if (dimMean >= 0.4) {
            dimLevel = '中度特质';
            dimLevelType = 'moderate';
            dimBadgeClass = 'badge-warning';
          } else {
            dimLevel = '典型表现';
            dimLevelType = 'normal';
            dimBadgeClass = 'badge-success';
          }
        } else if (assessment.meta.id === 'mdq') {
          if (dimMean >= 0.6) {
            dimLevel = '显著阳性';
            dimLevelType = 'severe';
            dimBadgeClass = 'badge-danger';
          } else if (dimMean >= 0.3) {
            dimLevel = '中度表现';
            dimLevelType = 'moderate';
            dimBadgeClass = 'badge-warning';
          } else {
            dimLevel = '无明显表现';
            dimLevelType = 'normal';
            dimBadgeClass = 'badge-success';
          }
        } else if (assessment.meta.id === 'des2') {
          if (dimMean >= 45) {
            dimLevel = '极重度解离';
            dimLevelType = 'severe';
            dimBadgeClass = 'badge-danger';
          } else if (dimMean >= 30) {
            dimLevel = '达到临床界限';
            dimLevelType = 'moderate';
            dimBadgeClass = 'badge-warning';
          } else if (dimMean >= 15) {
            dimLevel = '轻中度解离';
            dimLevelType = 'mild';
            dimBadgeClass = 'badge-info';
          } else {
            dimLevel = '常模正常水平';
            dimLevelType = 'normal';
            dimBadgeClass = 'badge-success';
          }
        } else if (assessment.meta.id === 'ocir') {
          if (dimMean >= 2.5) {
            dimLevel = '显著强迫亚型';
            dimLevelType = 'severe';
            dimBadgeClass = 'badge-danger';
          } else if (dimMean >= 1.5) {
            dimLevel = '中度困扰';
            dimLevelType = 'moderate';
            dimBadgeClass = 'badge-warning';
          } else if (dimMean >= 0.7) {
            dimLevel = '轻度倾向';
            dimLevelType = 'mild';
            dimBadgeClass = 'badge-info';
          } else {
            dimLevel = '无明显困扰';
            dimLevelType = 'normal';
            dimBadgeClass = 'badge-success';
          }
        } else if (assessment.meta.id === 'isi') {
          if (dimMean >= 2.5) {
            dimLevel = '重度困扰';
            dimLevelType = 'severe';
            dimBadgeClass = 'badge-danger';
          } else if (dimMean >= 1.5) {
            dimLevel = '中度表现';
            dimLevelType = 'moderate';
            dimBadgeClass = 'badge-warning';
          } else if (dimMean >= 0.7) {
            dimLevel = '轻度影响';
            dimLevelType = 'mild';
            dimBadgeClass = 'badge-info';
          } else {
            dimLevel = '良好无困扰';
            dimLevelType = 'normal';
            dimBadgeClass = 'badge-success';
          }
        } else if (assessment.meta.id === 'pcl5') {
          if (dimMean >= 2.5) {
            dimLevel = '显著创伤症状';
            dimLevelType = 'severe';
            dimBadgeClass = 'badge-danger';
          } else if (dimMean >= 1.5) {
            dimLevel = '中度应激';
            dimLevelType = 'moderate';
            dimBadgeClass = 'badge-warning';
          } else if (dimMean >= 0.7) {
            dimLevel = '轻度应激反应';
            dimLevelType = 'mild';
            dimBadgeClass = 'badge-info';
          } else {
            dimLevel = '无明显反应';
            dimLevelType = 'normal';
            dimBadgeClass = 'badge-success';
          }
        } else if (assessment.meta.id === 'rses') {
          if (dimMean >= 3.0) {
            dimLevel = '高水平 (积极健康)';
            dimLevelType = 'normal';
            dimBadgeClass = 'badge-success';
          } else if (dimMean >= 2.1) {
            dimLevel = '中等水平 (常模平均)';
            dimLevelType = 'mild';
            dimBadgeClass = 'badge-info';
          } else {
            dimLevel = '偏低水平 (倾向消极)';
            dimLevelType = 'severe';
            dimBadgeClass = 'badge-warning';
          }
        } else if (assessment.meta.id === 'dass21') {
          const dimDoubleSum = dimSum * 2;
          if (dim.name.includes('抑郁')) {
            if (dimDoubleSum >= 21) { dimLevel = '重度/极重度抑郁'; dimLevelType = 'severe'; dimBadgeClass = 'badge-danger'; }
            else if (dimDoubleSum >= 14) { dimLevel = '中度抑郁状态'; dimLevelType = 'moderate'; dimBadgeClass = 'badge-warning'; }
            else if (dimDoubleSum >= 10) { dimLevel = '轻度抑郁波动'; dimLevelType = 'mild'; dimBadgeClass = 'badge-info'; }
            else { dimLevel = '正常平稳'; dimLevelType = 'normal'; dimBadgeClass = 'badge-success'; }
          } else if (dim.name.includes('焦虑')) {
            if (dimDoubleSum >= 15) { dimLevel = '重度/极重度焦虑'; dimLevelType = 'severe'; dimBadgeClass = 'badge-danger'; }
            else if (dimDoubleSum >= 10) { dimLevel = '中度焦虑状态'; dimLevelType = 'moderate'; dimBadgeClass = 'badge-warning'; }
            else if (dimDoubleSum >= 8) { dimLevel = '轻度焦虑倾向'; dimLevelType = 'mild'; dimBadgeClass = 'badge-info'; }
            else { dimLevel = '正常平稳'; dimLevelType = 'normal'; dimBadgeClass = 'badge-success'; }
          } else {
            // 压力
            if (dimDoubleSum >= 26) { dimLevel = '重度/极度压力负荷'; dimLevelType = 'severe'; dimBadgeClass = 'badge-danger'; }
            else if (dimDoubleSum >= 19) { dimLevel = '中度压力紧绷'; dimLevelType = 'moderate'; dimBadgeClass = 'badge-warning'; }
            else if (dimDoubleSum >= 15) { dimLevel = '轻度压力感'; dimLevelType = 'mild'; dimBadgeClass = 'badge-info'; }
            else { dimLevel = '正常平稳'; dimLevelType = 'normal'; dimBadgeClass = 'badge-success'; }
          }
        } else if (assessment.meta.id === 'ess') {
          if (dimMean >= 2.0) {
            dimLevel = '高嗜睡倾向';
            dimLevelType = 'severe';
            dimBadgeClass = 'badge-danger';
          } else if (dimMean >= 1.3) {
            dimLevel = '中度困倦';
            dimLevelType = 'moderate';
            dimBadgeClass = 'badge-warning';
          } else if (dimMean >= 0.8) {
            dimLevel = '轻微困倦';
            dimLevelType = 'mild';
            dimBadgeClass = 'badge-info';
          } else {
            dimLevel = '清醒自如';
            dimLevelType = 'normal';
            dimBadgeClass = 'badge-success';
          }
        } else if (assessment.meta.id === 'pdss') {
          if (dimMean >= 2.5) {
            dimLevel = '显著重度惊恐';
            dimLevelType = 'severe';
            dimBadgeClass = 'badge-danger';
          } else if (dimMean >= 1.5) {
            dimLevel = '中度症状困扰';
            dimLevelType = 'moderate';
            dimBadgeClass = 'badge-warning';
          } else if (dimMean >= 0.7) {
            dimLevel = '轻度/阈下困扰';
            dimLevelType = 'mild';
            dimBadgeClass = 'badge-info';
          } else {
            dimLevel = '良好无惊恐';
            dimLevelType = 'normal';
            dimBadgeClass = 'badge-success';
          }
        } else if (assessment.meta.id === 'eat26') {
          if (dim.name.includes('节食')) {
            if (dimSum >= 15) { dimLevel = '高度病理节食'; dimLevelType = 'severe'; dimBadgeClass = 'badge-danger'; }
            else if (dimSum >= 8) { dimLevel = '中度节食倾向'; dimLevelType = 'moderate'; dimBadgeClass = 'badge-warning'; }
            else if (dimSum >= 4) { dimLevel = '轻度体型敏感'; dimLevelType = 'mild'; dimBadgeClass = 'badge-info'; }
            else { dimLevel = '进食态度健康'; dimLevelType = 'normal'; dimBadgeClass = 'badge-success'; }
          } else if (dim.name.includes('暴食')) {
            if (dimSum >= 7) { dimLevel = '频繁暴食/催吐高危'; dimLevelType = 'severe'; dimBadgeClass = 'badge-danger'; }
            else if (dimSum >= 4) { dimLevel = '中度食物侵入念头'; dimLevelType = 'moderate'; dimBadgeClass = 'badge-warning'; }
            else if (dimSum >= 2) { dimLevel = '偶发食物关注'; dimLevelType = 'mild'; dimBadgeClass = 'badge-info'; }
            else { dimLevel = '无暴食倾向'; dimLevelType = 'normal'; dimBadgeClass = 'badge-success'; }
          } else {
            // 口腔控制
            if (dimSum >= 7) { dimLevel = '显著进食克制强迫'; dimLevelType = 'severe'; dimBadgeClass = 'badge-danger'; }
            else if (dimSum >= 4) { dimLevel = '中度克制行为'; dimLevelType = 'moderate'; dimBadgeClass = 'badge-warning'; }
            else if (dimSum >= 2) { dimLevel = '轻度习惯控制'; dimLevelType = 'mild'; dimBadgeClass = 'badge-info'; }
            else { dimLevel = '自然进食'; dimLevelType = 'normal'; dimBadgeClass = 'badge-success'; }
          }
        } else if (assessment.meta.id === 'edeq') {
          if (dimMean >= 4.0) {
            dimLevel = '严重病理表现';
            dimLevelType = 'severe';
            dimBadgeClass = 'badge-danger';
          } else if (dimMean >= 2.8) {
            dimLevel = '显著临床界限';
            dimLevelType = 'moderate';
            dimBadgeClass = 'badge-warning';
          } else if (dimMean >= 1.6) {
            dimLevel = '轻度关切倾向';
            dimLevelType = 'mild';
            dimBadgeClass = 'badge-info';
          } else {
            dimLevel = '健康正常状态';
            dimLevelType = 'normal';
            dimBadgeClass = 'badge-success';
          }
        } else if (assessment.meta.id === 'ders16') {
          if (dimMean >= 3.8) {
            dimLevel = '重度调节阻滞';
            dimLevelType = 'severe';
            dimBadgeClass = 'badge-danger';
          } else if (dimMean >= 3.0) {
            dimLevel = '中度调节困扰';
            dimLevelType = 'moderate';
            dimBadgeClass = 'badge-warning';
          } else if (dimMean >= 2.1) {
            dimLevel = '轻度情绪波动';
            dimLevelType = 'mild';
            dimBadgeClass = 'badge-info';
          } else {
            dimLevel = '调节良好韧性高';
            dimLevelType = 'normal';
            dimBadgeClass = 'badge-success';
          }
        } else if (assessment.meta.id === 'ctqsf') {
          if (dimMean >= 3.2) {
            dimLevel = '重度创伤暴露';
            dimLevelType = 'severe';
            dimBadgeClass = 'badge-danger';
          } else if (dimMean >= 2.4) {
            dimLevel = '中度创伤经历';
            dimLevelType = 'moderate';
            dimBadgeClass = 'badge-warning';
          } else if (dimMean >= 1.6) {
            dimLevel = '轻度逆境暴露';
            dimLevelType = 'mild';
            dimBadgeClass = 'badge-info';
          } else {
            dimLevel = '无显著创伤';
            dimLevelType = 'normal';
            dimBadgeClass = 'badge-success';
          }
        } else if (assessment.meta.id === 'epds') {
          if (dimMean >= 2.0) {
            dimLevel = '显著抑郁焦虑';
            dimLevelType = 'severe';
            dimBadgeClass = 'badge-danger';
          } else if (dimMean >= 1.2) {
            dimLevel = '中度情绪负担';
            dimLevelType = 'moderate';
            dimBadgeClass = 'badge-warning';
          } else if (dimMean >= 0.6) {
            dimLevel = '轻微情绪波动';
            dimLevelType = 'mild';
            dimBadgeClass = 'badge-info';
          } else {
            dimLevel = '心绪平稳良好';
            dimLevelType = 'normal';
            dimBadgeClass = 'badge-success';
          }
        } else if (assessment.meta.id === 'ace') {
          if (dimSum >= 2 || (dim.items.length === 2 && dimSum >= 1)) {
            dimLevel = '明确不良经历暴露';
            dimLevelType = 'severe';
            dimBadgeClass = 'badge-danger';
          } else if (dimSum === 1) {
            dimLevel = '单项不良经历暴露';
            dimLevelType = 'moderate';
            dimBadgeClass = 'badge-warning';
          } else {
            dimLevel = '无此类经历';
            dimLevelType = 'normal';
            dimBadgeClass = 'badge-success';
          }
        } else if (assessment.meta.id === 'pid5') {
          if (dimMean >= 2.0) {
            dimLevel = '显著病理特质';
            dimLevelType = 'severe';
            dimBadgeClass = 'badge-danger';
          } else if (dimMean >= 1.4) {
            dimLevel = '中度偏离倾向';
            dimLevelType = 'moderate';
            dimBadgeClass = 'badge-warning';
          } else if (dimMean >= 0.8) {
            dimLevel = '轻度风格特征';
            dimLevelType = 'mild';
            dimBadgeClass = 'badge-info';
          } else {
            dimLevel = '正常健康基线';
            dimLevelType = 'normal';
            dimBadgeClass = 'badge-success';
          }
        } else if (assessment.meta.id === 'lpfsbf') {
          if (dimMean >= 3.0) {
            dimLevel = '显著功能受损';
            dimLevelType = 'severe';
            dimBadgeClass = 'badge-danger';
          } else if (dimMean >= 2.2) {
            dimLevel = '轻中度受损';
            dimLevelType = 'moderate';
            dimBadgeClass = 'badge-warning';
          } else if (dimMean >= 1.6) {
            dimLevel = '轻微张力波动';
            dimLevelType = 'mild';
            dimBadgeClass = 'badge-info';
          } else {
            dimLevel = '功能健康完整';
            dimLevelType = 'normal';
            dimBadgeClass = 'badge-success';
          }
        } else if (assessment.meta.id === 'scoff') {
          if (dimSum >= 1) {
            dimLevel = '阳性指征';
            dimLevelType = 'severe';
            dimBadgeClass = 'badge-danger';
          } else {
            dimLevel = '阴性无异常';
            dimLevelType = 'normal';
            dimBadgeClass = 'badge-success';
          }
        } else if (assessment.meta.id === 'bes') {
          if (dimMean >= 1.7) {
            dimLevel = '严重暴食困扰';
            dimLevelType = 'severe';
            dimBadgeClass = 'badge-danger';
          } else if (dimMean >= 1.1) {
            dimLevel = '中度暴食倾向';
            dimLevelType = 'moderate';
            dimBadgeClass = 'badge-warning';
          } else if (dimMean >= 0.6) {
            dimLevel = '轻微表现';
            dimLevelType = 'mild';
            dimBadgeClass = 'badge-info';
          } else {
            dimLevel = '正常进食自律';
            dimLevelType = 'normal';
            dimBadgeClass = 'badge-success';
          }
        } else if (assessment.meta.id === 'nias') {
          if (dimSum >= 10) {
            dimLevel = '显著表型阳性';
            dimLevelType = 'severe';
            dimBadgeClass = 'badge-danger';
          } else if (dimSum >= 6) {
            dimLevel = '中度回避倾向';
            dimLevelType = 'moderate';
            dimBadgeClass = 'badge-warning';
          } else if (dimSum >= 3) {
            dimLevel = '轻度进食敏感';
            dimLevelType = 'mild';
            dimBadgeClass = 'badge-info';
          } else {
            dimLevel = '正常无受限';
            dimLevelType = 'normal';
            dimBadgeClass = 'badge-success';
          }
        } else if (assessment.meta.id === 'mspss') {
          if (dimMean >= 5.1) {
            dimLevel = '高支持 (强韧屏障)';
            dimLevelType = 'normal';
            dimBadgeClass = 'badge-success';
          } else if (dimMean >= 3.0) {
            dimLevel = '中等支持 (基础资源)';
            dimLevelType = 'mild';
            dimBadgeClass = 'badge-info';
          } else {
            dimLevel = '低支持 (孤立无援)';
            dimLevelType = 'severe';
            dimBadgeClass = 'badge-danger';
          }
        } else if (assessment.meta.id === 'audit') {
          if (dimMean >= 2.0) {
            dimLevel = '高度依赖/有害';
            dimLevelType = 'severe';
            dimBadgeClass = 'badge-danger';
          } else if (dimMean >= 1.2) {
            dimLevel = '中度危险饮酒';
            dimLevelType = 'moderate';
            dimBadgeClass = 'badge-warning';
          } else if (dimMean >= 0.5) {
            dimLevel = '轻度摄入表现';
            dimLevelType = 'mild';
            dimBadgeClass = 'badge-info';
          } else {
            dimLevel = '安全低风险';
            dimLevelType = 'normal';
            dimBadgeClass = 'badge-success';
          }
        } else if (assessment.meta.id === 'pds') {
          if (dimMean >= 2.0) {
            dimLevel = '重度创伤反应';
            dimLevelType = 'severe';
            dimBadgeClass = 'badge-danger';
          } else if (dimMean >= 1.2) {
            dimLevel = '中度创伤应激';
            dimLevelType = 'moderate';
            dimBadgeClass = 'badge-warning';
          } else if (dimMean >= 0.6) {
            dimLevel = '轻度应激波动';
            dimLevelType = 'mild';
            dimBadgeClass = 'badge-info';
          } else {
            dimLevel = '无明显反应';
            dimLevelType = 'normal';
            dimBadgeClass = 'badge-success';
          }
        } else if (assessment.meta.id === 'cds') {
          if (dimMean >= 2.0) {
            dimLevel = '重度解离表征';
            dimLevelType = 'severe';
            dimBadgeClass = 'badge-danger';
          } else if (dimMean >= 1.0) {
            dimLevel = '中度解离体验';
            dimLevelType = 'moderate';
            dimBadgeClass = 'badge-warning';
          } else if (dimMean >= 0.5) {
            dimLevel = '偶发轻度波动';
            dimLevelType = 'mild';
            dimBadgeClass = 'badge-info';
          } else {
            dimLevel = '基线健康稳定';
            dimLevelType = 'normal';
            dimBadgeClass = 'badge-success';
          }
        } else if (assessment.meta.id === 'pqb') {
          if (dimMean >= 1.5) {
            dimLevel = '显著前驱风险';
            dimLevelType = 'severe';
            dimBadgeClass = 'badge-danger';
          } else if (dimMean >= 0.8) {
            dimLevel = '中度亚临床表现';
            dimLevelType = 'moderate';
            dimBadgeClass = 'badge-warning';
          } else if (dimMean >= 0.3) {
            dimLevel = '轻度知觉敏感';
            dimLevelType = 'mild';
            dimBadgeClass = 'badge-info';
          } else {
            dimLevel = '健康正常基线';
            dimLevelType = 'normal';
            dimBadgeClass = 'badge-success';
          }
        } else if (assessment.meta.id === 'cape42') {
          if (dimMean >= 2.8) {
            dimLevel = '高频显著体验';
            dimLevelType = 'severe';
            dimBadgeClass = 'badge-danger';
          } else if (dimMean >= 2.1) {
            dimLevel = '中度精神样偏离';
            dimLevelType = 'moderate';
            dimBadgeClass = 'badge-warning';
          } else if (dimMean >= 1.5) {
            dimLevel = '轻微偶发体验';
            dimLevelType = 'mild';
            dimBadgeClass = 'badge-info';
          } else {
            dimLevel = '健康常模基线';
            dimLevelType = 'normal';
            dimBadgeClass = 'badge-success';
          }
        } else if (assessment.meta.id === 'raadsr') {
          if (dimMean >= 1.6) {
            dimLevel = '典型自闭表型';
            dimLevelType = 'severe';
            dimBadgeClass = 'badge-danger';
          } else if (dimMean >= 1.0) {
            dimLevel = '中度自闭特质';
            dimLevelType = 'moderate';
            dimBadgeClass = 'badge-warning';
          } else if (dimMean >= 0.6) {
            dimLevel = '广泛自闭表型 (BAP)';
            dimLevelType = 'mild';
            dimBadgeClass = 'badge-info';
          } else {
            dimLevel = '神经典型表现';
            dimLevelType = 'normal';
            dimBadgeClass = 'badge-success';
          }
        } else if (assessment.meta.id === 'catq') {
          if (dimMean >= 5.2) {
            dimLevel = '极高强度伪装';
            dimLevelType = 'severe';
            dimBadgeClass = 'badge-danger';
          } else if (dimMean >= 4.2) {
            dimLevel = '高水平特质伪装';
            dimLevelType = 'moderate';
            dimBadgeClass = 'badge-warning';
          } else if (dimMean >= 3.2) {
            dimLevel = '中度常规适应';
            dimLevelType = 'mild';
            dimBadgeClass = 'badge-info';
          } else {
            dimLevel = '低度自然流露';
            dimLevelType = 'normal';
            dimBadgeClass = 'badge-success';
          }
        } else if (assessment.meta.id === 'cssrs' || assessment.meta.id === 'asq') {
          if (dimMean >= 0.8) {
            dimLevel = '阳性检出';
            dimLevelType = 'severe';
            dimBadgeClass = 'badge-danger';
          } else if (dimMean > 0) {
            dimLevel = '部分阳性';
            dimLevelType = 'moderate';
            dimBadgeClass = 'badge-warning';
          } else {
            dimLevel = '阴性平稳';
            dimLevelType = 'normal';
            dimBadgeClass = 'badge-success';
          }
        } else if (assessment.meta.id === 'sbqr') {
          if (dim.items[0] === 1) {
            const v = scoredValues[1] || 1;
            if (v >= 4) { dimLevel = '有自杀尝试史 (4分)'; dimLevelType = 'severe'; dimBadgeClass = 'badge-danger'; }
            else if (v === 3) { dimLevel = '曾有自杀计划 (3分)'; dimLevelType = 'moderate'; dimBadgeClass = 'badge-warning'; }
            else if (v === 2) { dimLevel = '短暂自杀念头 (2分)'; dimLevelType = 'mild'; dimBadgeClass = 'badge-info'; }
            else { dimLevel = '无自杀意念尝试 (1分)'; dimLevelType = 'normal'; dimBadgeClass = 'badge-success'; }
          } else if (dim.items[0] === 2) {
            const v = scoredValues[2] || 1;
            if (v >= 4) { dimLevel = '高频发作 (4-5分)'; dimLevelType = 'severe'; dimBadgeClass = 'badge-danger'; }
            else if (v >= 2) { dimLevel = '偶发/间歇 (2-3分)'; dimLevelType = 'moderate'; dimBadgeClass = 'badge-warning'; }
            else { dimLevel = '近一年无念头 (1分)'; dimLevelType = 'normal'; dimBadgeClass = 'badge-success'; }
          } else if (dim.items[0] === 3) {
            const v = scoredValues[3] || 1;
            if (v === 3) { dimLevel = '多次/向多人威胁 (3分)'; dimLevelType = 'severe'; dimBadgeClass = 'badge-danger'; }
            else if (v === 2) { dimLevel = '曾向单人透露 (2分)'; dimLevelType = 'moderate'; dimBadgeClass = 'badge-warning'; }
            else { dimLevel = '从未威胁或透露 (1分)'; dimLevelType = 'normal'; dimBadgeClass = 'badge-success'; }
          } else if (dim.items[0] === 4) {
            const v = scoredValues[4] || 0;
            if (v >= 4) { dimLevel = '高概率预期 (4-6分)'; dimLevelType = 'severe'; dimBadgeClass = 'badge-danger'; }
            else if (v >= 2) { dimLevel = '低度/存疑预期 (2-3分)'; dimLevelType = 'moderate'; dimBadgeClass = 'badge-warning'; }
            else { dimLevel = '绝不可能尝试 (0-1分)'; dimLevelType = 'normal'; dimBadgeClass = 'badge-success'; }
          }
        } else if (assessment.meta.id === 'bss') {
          if (dimMean >= 1.4) {
            dimLevel = '高危显著表现';
            dimLevelType = 'severe';
            dimBadgeClass = 'badge-danger';
          } else if (dimMean >= 0.7) {
            dimLevel = '中度风险倾向';
            dimLevelType = 'moderate';
            dimBadgeClass = 'badge-warning';
          } else if (dimMean > 0) {
            dimLevel = '轻微/偶发反应';
            dimLevelType = 'mild';
            dimBadgeClass = 'badge-info';
          } else {
            dimLevel = '常态平稳';
            dimLevelType = 'normal';
            dimBadgeClass = 'badge-success';
          }
        } else if (assessment.meta.id === 'isas') {
          if (dimMean >= 1.4) {
            dimLevel = '核心驱动功能';
            dimLevelType = 'severe';
            dimBadgeClass = 'badge-danger';
          } else if (dimMean >= 0.7) {
            dimLevel = '中度诱发功能';
            dimLevelType = 'moderate';
            dimBadgeClass = 'badge-warning';
          } else if (dimMean > 0) {
            dimLevel = '轻微偶发相关';
            dimLevelType = 'mild';
            dimBadgeClass = 'badge-info';
          } else {
            dimLevel = '无相关功能';
            dimLevelType = 'normal';
            dimBadgeClass = 'badge-success';
          }
        } else if (assessment.meta.id === 'mid') {
          const dimPct = parseFloat((dimMean * 10).toFixed(1));
          if (dimPct >= 45) {
            dimLevel = '重度解离特征';
            dimLevelType = 'severe';
            dimBadgeClass = 'badge-danger';
          } else if (dimPct >= 30) {
            dimLevel = '达到临床界限';
            dimLevelType = 'moderate';
            dimBadgeClass = 'badge-warning';
          } else if (dimPct >= 15) {
            dimLevel = '轻中度解离';
            dimLevelType = 'mild';
            dimBadgeClass = 'badge-info';
          } else {
            dimLevel = '常模正常水平';
            dimLevelType = 'normal';
            dimBadgeClass = 'badge-success';
          }
          return {
            name: dim.name,
            desc: dim.desc,
            itemCount: dim.items.length,
            score: dimPct,
            level: dimLevel,
            levelType: dimLevelType,
            badgeClass: dimBadgeClass
          };
        } else if (assessment.meta.id === 'bsds') {
          if (dim.items.includes(20)) {
            const q20 = scoredValues[20] || 0;
            if (q20 >= 4) { dimLevel = '高度吻合故事'; dimLevelType = 'severe'; dimBadgeClass = 'badge-danger'; }
            else if (q20 >= 2) { dimLevel = '部分吻合故事'; dimLevelType = 'moderate'; dimBadgeClass = 'badge-warning'; }
            else { dimLevel = '完全不吻合'; dimLevelType = 'normal'; dimBadgeClass = 'badge-success'; }
          } else {
            const ratio = dimSum / dimValues.length;
            if (ratio >= 0.7) { dimLevel = '显著符合特征'; dimLevelType = 'severe'; dimBadgeClass = 'badge-danger'; }
            else if (ratio >= 0.4) { dimLevel = '中度符合表现'; dimLevelType = 'moderate'; dimBadgeClass = 'badge-warning'; }
            else if (ratio > 0) { dimLevel = '轻度偶发体验'; dimLevelType = 'mild'; dimBadgeClass = 'badge-info'; }
            else { dimLevel = '未见此类表现'; dimLevelType = 'normal'; dimBadgeClass = 'badge-success'; }
          }
          return {
            name: dim.name,
            desc: dim.desc,
            itemCount: dim.items.length,
            score: dimSum,
            level: dimLevel,
            levelType: dimLevelType,
            badgeClass: dimBadgeClass
          };
        } else if (assessment.meta.id === 'asrm') {
          if (dimMean >= 2.5) { dimLevel = '显著亢进'; dimLevelType = 'severe'; dimBadgeClass = 'badge-danger'; }
          else if (dimMean >= 1.5) { dimLevel = '中度活跃'; dimLevelType = 'moderate'; dimBadgeClass = 'badge-warning'; }
          else if (dimMean >= 0.8) { dimLevel = '轻度偏高'; dimLevelType = 'mild'; dimBadgeClass = 'badge-info'; }
          else { dimLevel = '正常平稳'; dimLevelType = 'normal'; dimBadgeClass = 'badge-success'; }
          return {
            name: dim.name,
            desc: dim.desc,
            itemCount: dim.items.length,
            score: dimSum,
            level: dimLevel,
            levelType: dimLevelType,
            badgeClass: dimBadgeClass
          };
        } else if (assessment.meta.id === 'ymrs') {
          const maxDimSum = dim.items.reduce((s, id) => s + ([5, 6, 8, 9].includes(id) ? 8 : 4), 0);
          const ratio = maxDimSum > 0 ? (dimSum / maxDimSum) : 0;
          if (ratio >= 0.6) { dimLevel = '重度发作表现'; dimLevelType = 'severe'; dimBadgeClass = 'badge-danger'; }
          else if (ratio >= 0.35) { dimLevel = '中度活跃特征'; dimLevelType = 'moderate'; dimBadgeClass = 'badge-warning'; }
          else if (ratio >= 0.15) { dimLevel = '轻度偏高特征'; dimLevelType = 'mild'; dimBadgeClass = 'badge-info'; }
          else { dimLevel = '常模平稳'; dimLevelType = 'normal'; dimBadgeClass = 'badge-success'; }
          return {
            name: dim.name,
            desc: dim.desc,
            itemCount: dim.items.length,
            score: dimSum,
            level: dimLevel,
            levelType: dimLevelType,
            badgeClass: dimBadgeClass
          };
        } else {
          const l = scoring.levels.find(lvl => dimMean >= lvl.min && dimMean <= lvl.max)
            || scoring.levels[scoring.levels.length - 1];
          dimLevel = l.label;
          dimLevelType = l.type;
          dimBadgeClass = l.badgeClass;
        }

        return {
          name: dim.name,
          desc: dim.desc,
          itemCount: dim.items.length,
          score: dimMean,
          level: dimLevel,
          levelType: dimLevelType,
          badgeClass: dimBadgeClass
        };
      });
    }

    // Secondary metrics
    let secondaryMetrics = [];
    if (assessment.meta.id === 'mdq') {
      const isCoOccur = (scoredValues[14] || 0) === 1 ? '是 (同期集中)' : '否 (不同期分散)';
      const impairmentNames = ['没有问题', '轻微问题', '中度问题', '严重问题'];
      const impText = impairmentNames[scoredValues[15] || 0] || '未评估';
      const isPositive = primaryScore >= 7 && (scoredValues[14] || 0) === 1 && (scoredValues[15] || 0) >= 2;
      secondaryMetrics = [
        { label: '核心阳性项数', value: `${primaryScore} / 13`, unit: '项' },
        { label: '发作同期共现', value: isCoOccur, unit: '' },
        { label: '社会功能损害', value: impText, unit: '' },
        { label: '双相临床初筛', value: isPositive ? '阳性 (高度提示)' : (primaryScore >= 5 ? '可疑/建议关注' : '阴性'), unit: '' }
      ];
    } else if (assessment.meta.id === 'des2') {
      const highCount = Object.values(scoredValues).filter(v => v >= 40).length;
      secondaryMetrics = [
        { label: '解离体验总均分', value: `${primaryScore}`, unit: '%' },
        { label: '高频解离项数', value: `${highCount} / 28`, unit: '项 (≥40%)' },
        { label: '病理临床界限', value: '30 %', unit: '分界线' },
        { label: '临床解离初筛', value: primaryScore >= 30 ? '达到临床界限' : '常模正常范围', unit: '' }
      ];
    } else if (assessment.meta.id === 'ocir') {
      const dominantDim = (dimensionScores && dimensionScores.length > 0)
        ? [...dimensionScores].sort((a, b) => b.score - a.score)[0]
        : null;
      secondaryMetrics = [
        { label: '强迫症状总分', value: `${primaryScore} / 72`, unit: '分' },
        { label: '临床筛查界限', value: '21 分', unit: '阳性阈值' },
        { label: '主导强迫特征', value: dominantDim ? dominantDim.name : '--', unit: dominantDim ? `(${dominantDim.score}分)` : '' },
        { label: '临床筛查初判', value: primaryScore >= 21 ? '阳性 (达到筛查界限)' : '阴性 (常模正常)', unit: '' }
      ];
    } else if (assessment.meta.id === 'scl90') {
      const totalRaw = questions.reduce((s, q) => s + (scoredValues[q.id] || 1), 0);
      const positiveCount = Object.values(scoredValues).filter(v => v >= 2).length;
      const positiveDistress = positiveCount > 0
        ? parseFloat(((totalRaw - (questions.length - positiveCount)) / positiveCount).toFixed(2))
        : 0;
      secondaryMetrics = [
        { label: '总粗分', value: totalRaw, unit: '分' },
        { label: '阳性项目数', value: positiveCount, unit: '项' },
        { label: '阳性均分', value: positiveDistress, unit: '分' }
      ];
    } else if (scoring.method === 'weighted_standard') {
      const rawSum = Object.values(scoredValues).reduce((a, b) => a + b, 0);
      secondaryMetrics = [
        { label: '原始粗分', value: rawSum, unit: '分' },
        { label: '标准化公式', value: `粗分 × ${scoring.standardScoreFormula.multiply}`, unit: '' },
        { label: '常模基线界限', value: `${scoring.levels[1]?.min || 50} 分`, unit: '' }
      ];
    } else if (assessment.meta.id === 'asrs') {
      const inattentionSum = [1, 2, 3, 4, 5, 6, 7, 8, 9].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      const hyperactivitySum = [10, 11, 12, 13, 14, 15, 16, 17, 18].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      const partAPositive = [
        (scoredValues[1] || 0) >= 2,
        (scoredValues[2] || 0) >= 2,
        (scoredValues[3] || 0) >= 2,
        (scoredValues[4] || 0) >= 3,
        (scoredValues[5] || 0) >= 3,
        (scoredValues[6] || 0) >= 3
      ].filter(Boolean).length;
      secondaryMetrics = [
        { label: '注意力缺陷得分', value: `${inattentionSum} / 36`, unit: '分' },
        { label: '多动与冲动得分', value: `${hyperactivitySum} / 36`, unit: '分' },
        { label: 'Part A 核心筛查', value: `${partAPositive} / 6`, unit: '项阳性' }
      ];
    } else if (assessment.meta.id === 'isi') {
      const nightSum = [1, 2, 3].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      const satisfDistressSum = [4, 7].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      const daytimeSum = [5, 6].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      secondaryMetrics = [
        { label: '夜间症状粗分', value: `${nightSum} / 12`, unit: '分' },
        { label: '满意与苦恼分', value: `${satisfDistressSum} / 8`, unit: '分' },
        { label: '日间功能损害', value: `${daytimeSum} / 8`, unit: '分' },
        { label: '临床失眠初筛', value: primaryScore >= 15 ? '达到临床界限' : (primaryScore >= 8 ? '轻度/阈下' : '正常无失眠'), unit: '' }
      ];
    } else if (assessment.meta.id === 'pcl5') {
      const clusterB = [1, 2, 3, 4, 5].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      const clusterC = [6, 7].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      const clusterD = [8, 9, 10, 11, 12, 13, 14].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      const clusterE = [15, 16, 17, 18, 19, 20].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      secondaryMetrics = [
        { label: '侵入再体验 (B)', value: `${clusterB} / 20`, unit: '分' },
        { label: '回避反应 (C)', value: `${clusterC} / 8`, unit: '分' },
        { label: '负面认知心境(D)', value: `${clusterD} / 28`, unit: '分' },
        { label: '过度警觉唤起(E)', value: `${clusterE} / 24`, unit: '分' }
      ];
    } else if (assessment.meta.id === 'rses') {
      const positiveWorthSum = [1, 3, 4, 7, 10].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      const antiDepreciationSum = [2, 5, 6, 8, 9].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      secondaryMetrics = [
        { label: '自我肯定得分', value: `${positiveWorthSum} / 20`, unit: '分' },
        { label: '抗贬损防卫分', value: `${antiDepreciationSum} / 20`, unit: '分' },
        { label: '自尊健康评级', value: primaryScore >= 30 ? '高自尊水平' : (primaryScore >= 21 ? '中等自尊' : '偏低自尊'), unit: '' }
      ];
    } else if (assessment.meta.id === 'dass21') {
      const depSum = [3, 5, 10, 13, 16, 17, 21].reduce((sum, id) => sum + (scoredValues[id] || 0), 0) * 2;
      const anxSum = [2, 4, 7, 9, 15, 19, 20].reduce((sum, id) => sum + (scoredValues[id] || 0), 0) * 2;
      const stressSum = [1, 6, 8, 11, 12, 14, 18].reduce((sum, id) => sum + (scoredValues[id] || 0), 0) * 2;
      secondaryMetrics = [
        { label: '抑郁折算分 (×2)', value: `${depSum} / 42`, unit: '分' },
        { label: '焦虑折算分 (×2)', value: `${anxSum} / 42`, unit: '分' },
        { label: '压力折算分 (×2)', value: `${stressSum} / 42`, unit: '分' },
        { label: '总体负性负荷', value: primaryScore >= 39 ? '重度负荷' : (primaryScore >= 26 ? '中度困扰' : (primaryScore >= 15 ? '轻度波动' : '正常')), unit: '' }
      ];
    } else if (assessment.meta.id === 'ess') {
      const passiveSum = [1, 2, 3, 4].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      const restSum = [5, 7].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      const alertSum = [6, 8].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      secondaryMetrics = [
        { label: '被动静态情境', value: `${passiveSum} / 12`, unit: '分' },
        { label: '放松休整情境', value: `${restSum} / 6`, unit: '分' },
        { label: '警觉交互情境', value: `${alertSum} / 6`, unit: '分' },
        { label: '临床嗜睡初筛', value: primaryScore >= 10 ? '阳性 (达到 EDS 阳性界限)' : '阴性 (常模清醒正常)', unit: '' }
      ];
    } else if (assessment.meta.id === 'pdss') {
      const coreSum = [1, 2].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      const avoidSum = [3, 4, 5].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      const impairSum = [6, 7].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      secondaryMetrics = [
        { label: '发作核心症状', value: `${coreSum} / 8`, unit: '分' },
        { label: '预期回避行为', value: `${avoidSum} / 12`, unit: '分' },
        { label: '社会功能受损', value: `${impairSum} / 8`, unit: '分' },
        { label: '临床筛查初判', value: primaryScore >= 11 ? '阳性 (达到惊恐障碍筛查界限)' : (primaryScore >= 8 ? '亚临床轻度' : '阴性正常'), unit: '' }
      ];
    } else if (assessment.meta.id === 'eat26') {
      const dietSum = [1, 2, 6, 7, 10, 11, 12, 13, 14, 16, 17, 22, 23, 24].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      const bulimiaSum = [3, 4, 9, 18, 21, 25].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      const oralSum = [5, 8, 15, 19, 20, 26].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      secondaryMetrics = [
        { label: '节食体型关注', value: `${dietSum} / 42`, unit: '分' },
        { label: '暴食食物关注', value: `${bulimiaSum} / 18`, unit: '分' },
        { label: '口腔控制克制', value: `${oralSum} / 18`, unit: '分' },
        { label: '临床风险筛查', value: primaryScore >= 20 ? '高危阳性 (≥ 20分，建议就诊)' : '阴性 (健康进食常模)', unit: '' }
      ];
    } else if (assessment.meta.id === 'edeq') {
      const dims = dimensionScores || [];
      const d1 = dims.find(d => d.name.includes('限制'))?.score || 0;
      const d2 = dims.find(d => d.name.includes('进食'))?.score || 0;
      const d3 = dims.find(d => d.name.includes('体型'))?.score || 0;
      const d4 = dims.find(d => d.name.includes('体重'))?.score || 0;
      secondaryMetrics = [
        { label: '限制进食均分', value: `${d1}`, unit: '/ 6.0' },
        { label: '进食关注均分', value: `${d2}`, unit: '/ 6.0' },
        { label: '体型关注均分', value: `${d3}`, unit: '/ 6.0' },
        { label: '体重关注均分', value: `${d4}`, unit: '/ 6.0' },
        { label: '临床初筛判定', value: primaryScore >= 2.8 ? '阳性 (达到临床显著界限)' : '阴性 (常模健康)', unit: '' }
      ];
    } else if (assessment.meta.id === 'ders16') {
      const dominantDim = (dimensionScores && dimensionScores.length > 0)
        ? [...dimensionScores].sort((a, b) => b.score - a.score)[0]
        : null;
      const impulseSum = [4, 8, 11].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      const stratSum = [6, 10, 12, 14, 16].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      secondaryMetrics = [
        { label: '调节困难总分', value: `${primaryScore} / 80`, unit: '分' },
        { label: '冲动失控得分', value: `${impulseSum} / 15`, unit: '分' },
        { label: '策略匮乏得分', value: `${stratSum} / 25`, unit: '分' },
        { label: '主导困难特征', value: dominantDim ? dominantDim.name : '--', unit: dominantDim ? `(${dominantDim.score}均分)` : '' }
      ];
    } else if (assessment.meta.id === 'ctqsf') {
      const eaSum = [3, 8, 14, 18, 25].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      const paSum = [9, 10, 11, 12, 15, 17].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      const saSum = [20, 21, 22, 23, 24, 27].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      const enSum = [5, 7, 13, 16, 19, 28].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      const pnSum = [1, 2, 4, 6, 26].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      const abuseTotal = eaSum + paSum + saSum;
      const neglectTotal = enSum + pnSum;
      secondaryMetrics = [
        { label: '虐待总粗分', value: `${abuseTotal} / 85`, unit: '分' },
        { label: '忽视总粗分', value: `${neglectTotal} / 55`, unit: '分' },
        { label: '童年逆境等级', value: primaryScore >= 76 ? '重度复合创伤' : (primaryScore >= 59 ? '中度创伤经历' : (primaryScore >= 43 ? '轻度逆境' : '安全基准')), unit: '' }
      ];
    } else if (assessment.meta.id === 'epds') {
      const q10Val = scoredValues[10] || 0;
      secondaryMetrics = [
        { label: '产后抑郁总分', value: `${primaryScore} / 30`, unit: '分' },
        { label: '阳性截断阈值', value: '13 分', unit: '标准临界点' },
        { label: '自伤意念风险 (Q10)', value: q10Val > 0 ? '⚠️ 存在自伤念头' : '无自伤念头', unit: q10Val > 0 ? `(${q10Val}分)` : '' },
        { label: '产后抑郁初筛', value: primaryScore >= 13 ? '阳性 (达到产后抑郁界限)' : (primaryScore >= 10 ? '轻度波动/疑似' : '阴性 (心绪健康)'), unit: '' }
      ];
    } else if (assessment.meta.id === 'ace') {
      const abuseCount = [1, 2, 3].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      const neglectCount = [4, 5].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      const dysCount = [6, 7, 8, 9, 10].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      secondaryMetrics = [
        { label: 'ACE 累计项数', value: `${primaryScore} / 10`, unit: '项' },
        { label: '虐待经历项数', value: `${abuseCount} / 3`, unit: '项' },
        { label: '忽视经历项数', value: `${neglectCount} / 2`, unit: '项' },
        { label: '家庭失调项数', value: `${dysCount} / 5`, unit: '项' },
        { label: '毒性应激预警', value: primaryScore >= 4 ? '⚠️ 达到医学高危警戒线 (≥4项)' : '低至中度暴露', unit: '' }
      ];
    } else if (assessment.meta.id === 'pid5') {
      const dominantDim = (dimensionScores && dimensionScores.length > 0)
        ? [...dimensionScores].sort((a, b) => b.score - a.score)[0]
        : null;
      const highDomains = (dimensionScores || []).filter(d => d.score >= 1.5).length;
      secondaryMetrics = [
        { label: '病理特质总分', value: `${primaryScore} / 75`, unit: '分' },
        { label: '主导失调领域', value: dominantDim ? dominantDim.name : '--', unit: dominantDim ? `(${dominantDim.score}均分)` : '' },
        { label: '显著病理领域数', value: `${highDomains} / 5`, unit: '个 (均分≥1.5)' },
        { label: 'AMPD 临床筛查', value: primaryScore >= 30 ? '阳性 (达到显著适应不良界限)' : '阴性 (正常健康基准)', unit: '' }
      ];
    } else if (assessment.meta.id === 'lpfsbf') {
      const selfSum = [1, 2, 3, 4, 5, 6].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      const interSum = [7, 8, 9, 10, 11, 12].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      secondaryMetrics = [
        { label: '自我功能受损分', value: `${selfSum} / 24`, unit: '分' },
        { label: '人际功能受损分', value: `${interSum} / 24`, unit: '分' },
        { label: '主导受损轴向', value: selfSum >= interSum ? '自我功能受损' : '人际功能受损', unit: '' },
        { label: 'Criterion A 筛查', value: primaryScore >= 31 ? '阳性 (达到临床失调界限 ≥31)' : (primaryScore >= 26 ? '亚临床 (轻度受损 26-30)' : '阴性 (健康正常 <26)'), unit: '' }
      ];
    } else if (assessment.meta.id === 'scoff') {
      const isSick = (scoredValues[1] || 0) === 1;
      secondaryMetrics = [
        { label: '阳性指征总数', value: `${primaryScore} / 5`, unit: '项' },
        { label: '临床阳性界限', value: '2 项', unit: '阳性临界' },
        { label: '催吐代偿指征', value: isSick ? '⚠️ 存在催吐倾向' : '无催吐', unit: '' },
        { label: '进食障碍初筛', value: primaryScore >= 2 ? '高危阳性 (达到筛查界限)' : '阴性 (健康正常)', unit: '' }
      ];
    } else if (assessment.meta.id === 'bes') {
      const behavSum = [1, 2, 5, 6, 7, 10, 12, 14].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      const cogSum = [3, 4, 8, 9, 11, 13, 15, 16].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      secondaryMetrics = [
        { label: '行为暴食得分', value: `${behavSum} / 23`, unit: '分' },
        { label: '认知情绪内疚', value: `${cogSum} / 23`, unit: '分' },
        { label: '暴食障碍等级', value: primaryScore >= 27 ? '严重暴食障碍 (BED)' : (primaryScore >= 18 ? '中度暴食倾向' : '无暴食问题'), unit: '' },
        { label: '临床筛查判定', value: primaryScore >= 18 ? '阳性 (达到临床关注水平)' : '阴性 (正常自律)', unit: '' }
      ];
    } else if (assessment.meta.id === 'nias') {
      const pickySum = [1, 2, 3].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      const appSum = [4, 5, 6].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      const fearSum = [7, 8, 9].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      const isPositive = primaryScore >= 25 || pickySum >= 10 || appSum >= 10 || fearSum >= 10;
      secondaryMetrics = [
        { label: '挑食感官敏感', value: `${pickySum} / 15`, unit: '分' },
        { label: '食欲缺乏无趣', value: `${appSum} / 15`, unit: '分' },
        { label: '恐惧进食后果', value: `${fearSum} / 15`, unit: '分' },
        { label: 'ARFID 初筛判定', value: isPositive ? '疑似阳性 (达到 ARFID 界限)' : '阴性 (无限制性摄食)', unit: '' }
      ];
    } else if (assessment.meta.id === 'mspss') {
      const famSum = [3, 4, 8, 11].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      const friSum = [6, 7, 9, 12].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      const othSum = [1, 2, 5, 10].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      secondaryMetrics = [
        { label: '支持总分 (均分)', value: `${primaryScore} 分`, unit: `(均分 ${(primaryScore / 12).toFixed(1)})` },
        { label: '家庭支持均分', value: `${(famSum / 4).toFixed(1)} / 7.0`, unit: '分' },
        { label: '朋友支持均分', value: `${(friSum / 4).toFixed(1)} / 7.0`, unit: '分' },
        { label: '重要他人支持', value: `${(othSum / 4).toFixed(1)} / 7.0`, unit: '分' }
      ];
    } else if (assessment.meta.id === 'audit') {
      const hazSum = [1, 2, 3].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      const depSum = [4, 5, 6].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      const harmSum = [7, 8, 9, 10].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      secondaryMetrics = [
        { label: '危险摄入得分', value: `${hazSum} / 12`, unit: '分' },
        { label: '依赖症状得分', value: `${depSum} / 12`, unit: '分' },
        { label: '有害后果得分', value: `${harmSum} / 16`, unit: '分' },
        { label: 'WHO 风险初筛', value: primaryScore >= 20 ? '酒精依赖 (重度成瘾)' : (primaryScore >= 16 ? '有害性饮酒' : (primaryScore >= 8 ? '危险性饮酒 (阳性)' : '安全低风险')), unit: '' }
      ];
    } else if (assessment.meta.id === 'pds') {
      const reexpSum = [1, 2, 3, 4, 5].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      const avoidSum = [6, 7, 8, 9, 10, 11, 12].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      const hyperSum = [13, 14, 15, 16, 17].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      secondaryMetrics = [
        { label: '侵入再体验分', value: `${reexpSum} / 15`, unit: '分' },
        { label: '回避与麻木分', value: `${avoidSum} / 21`, unit: '分' },
        { label: '过度警觉评分', value: `${hyperSum} / 15`, unit: '分' },
        { label: 'PTSD 筛查判定', value: primaryScore >= 21 ? '阳性 (达到中重度干预界限)' : (primaryScore >= 11 ? '轻中度创伤反应' : '阴性 (常模正常)'), unit: '' }
      ];
    } else if (assessment.meta.id === 'cds') {
      const dereSum = [1, 2, 8, 12, 13, 16, 21, 28].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      const bodySum = [3, 5, 9, 14, 17, 23, 26].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      const emotSum = [4, 6, 11, 18, 22, 24, 29].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      const autoSum = [7, 10, 15, 19, 20, 25, 27].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      secondaryMetrics = [
        { label: '现实解体得分', value: `${dereSum} / 32`, unit: '分' },
        { label: '身体疏离得分', value: `${bodySum} / 28`, unit: '分' },
        { label: '情感麻木得分', value: `${emotSum} / 28`, unit: '分' },
        { label: 'DPDR 临床判定', value: primaryScore >= 28 ? '阳性 (达到人格解体筛查界限)' : '阴性 (基线无显著解离)', unit: '' }
      ];
    } else if (assessment.meta.id === 'pqb') {
      const perceptSum = [1, 6, 8, 10, 16, 17, 20].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      const delusSum = [2, 4, 9, 11, 14, 15, 21].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      const disorgSum = [3, 5, 7, 12, 13, 18, 19].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      secondaryMetrics = [
        { label: '知觉异常得分', value: `${perceptSum} / 21`, unit: '分' },
        { label: '猜疑妄想得分', value: `${delusSum} / 21`, unit: '分' },
        { label: '思维混乱得分', value: `${disorgSum} / 21`, unit: '分' },
        { label: 'CHR 风险初筛', value: primaryScore >= 15 ? '高危预警 (达到 CHR 临床界限)' : (primaryScore >= 6 ? '轻度知觉敏感' : '阴性 (安全低风险)'), unit: '' }
      ];
    } else if (assessment.meta.id === 'cape42') {
      const posSum = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      const negSum = [21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      const depSum = [35, 36, 37, 38, 39, 40, 41, 42].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      secondaryMetrics = [
        { label: '阳性体验均分', value: `${(posSum / 20).toFixed(2)} / 4.0`, unit: '分' },
        { label: '阴性特质均分', value: `${(negSum / 14).toFixed(2)} / 4.0`, unit: '分' },
        { label: '抑郁心境均分', value: `${(depSum / 8).toFixed(2)} / 4.0`, unit: '分' },
        { label: 'UHR 风险评估', value: (posSum >= 42 || primaryScore >= 119) ? '显著高频异常体验 (建议评估)' : (primaryScore >= 89 ? '亚临床体验偏离' : '常模健康基线'), unit: '' }
      ];
    } else if (assessment.meta.id === 'raadsr') {
      const socSum = [1, 6, 8, 11, 14, 17, 18, 20, 24, 26, 27, 33, 35, 37, 38, 41, 42, 43, 44, 45, 47, 48, 52, 53, 55, 58, 59, 60, 61, 63, 64, 65, 68, 70, 71, 74, 75, 78, 80].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      const sensSum = [4, 7, 13, 16, 21, 23, 29, 31, 34, 36, 39, 46, 50, 54, 56, 62, 66, 69, 73, 79].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      const intSum = [3, 9, 12, 19, 25, 28, 30, 32, 40, 49, 57, 67, 72, 77].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      const langSum = [2, 5, 10, 15, 22, 51, 76].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      secondaryMetrics = [
        { label: '社交关联得分', value: `${socSum} / 117`, unit: '分' },
        { label: '感觉运动得分', value: `${sensSum} / 60`, unit: '分' },
        { label: '专注兴趣得分', value: `${intSum} / 42`, unit: '分' },
        { label: '自闭谱系判定', value: primaryScore >= 65 ? '阳性 (达到自闭谱系门槛 65 分)' : '阴性 (神经典型表现)', unit: '' }
      ];
    } else if (assessment.meta.id === 'catq') {
      const compSum = [1, 4, 5, 8, 11, 14, 17, 20, 23].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      const maskSum = [2, 6, 9, 12, 15, 18, 21, 24].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      const assimSum = [3, 7, 10, 13, 16, 19, 22, 25].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      secondaryMetrics = [
        { label: '补偿策略得分', value: `${compSum} / 63`, unit: '分' },
        { label: '掩饰控制得分', value: `${maskSum} / 56`, unit: '分' },
        { label: '同化融入得分', value: `${assimSum} / 56`, unit: '分' },
        { label: '伪装程度判定', value: primaryScore >= 101 ? '高水平自闭伪装 (高倦怠风险)' : (primaryScore >= 76 ? '中等常规适应' : '低度伪装 (自然真实)'), unit: '' }
      ];
    } else if (assessment.meta.id === 'psqi') {
      const c1 = scoredValues[14] || 0;
      const latSum = (scoredValues[1] || 0) + (scoredValues[4] || 0);
      const c2 = latSum === 0 ? 0 : (latSum <= 2 ? 1 : (latSum <= 4 ? 2 : 3));
      const c3 = scoredValues[2] || 0;
      const c4 = scoredValues[3] || 0;
      const distSum = [5, 6, 7, 8, 9, 10, 11, 12, 13].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      const c5 = distSum === 0 ? 0 : (distSum <= 9 ? 1 : (distSum <= 18 ? 2 : 3));
      const c6 = scoredValues[15] || 0;
      const daySum = (scoredValues[16] || 0) + (scoredValues[17] || 0);
      const c7 = daySum === 0 ? 0 : (daySum <= 2 ? 1 : (daySum <= 4 ? 2 : 3));

      const compLabels = [
        { name: '主观质量 (C1)', val: c1 },
        { name: '入睡潜伏 (C2)', val: c2 },
        { name: '睡眠时长 (C3)', val: c3 },
        { name: '睡眠效率 (C4)', val: c4 },
        { name: '障碍干扰 (C5)', val: c5 },
        { name: '催眠药物 (C6)', val: c6 },
        { name: '日间功能 (C7)', val: c7 }
      ];
      const maxComp = compLabels.reduce((prev, curr) => curr.val > prev.val ? curr : prev, compLabels[0]);

      secondaryMetrics = [
        { label: '临床划界判定', value: primaryScore > 7 ? '阳性 (跨越中国成人界限 >7分)' : '阴性 (常模健康/临界区间)', unit: '' },
        { label: '突出困扰成分', value: `${maxComp.name} (${maxComp.val}分)`, unit: '' },
        { label: '入睡延迟评估', value: scoredValues[1] === 0 ? '<15分钟' : (scoredValues[1] === 1 ? '16~30分钟' : (scoredValues[1] === 2 ? '31~60分钟' : '>60分钟')), unit: '' },
        { label: '实际睡眠时长', value: scoredValues[2] === 0 ? '>7小时' : (scoredValues[2] === 1 ? '6~7小时' : (scoredValues[2] === 2 ? '5~6小时' : '<5小时')), unit: '' }
      ];
    } else if (assessment.meta.id === 'hcl32') {
      const activeSum = [1, 2, 3, 4, 5, 6, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 24, 28].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      const riskSum = [7, 8, 9, 21, 22, 23, 25, 26, 27, 29, 30, 31, 32].reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      secondaryMetrics = [
        { label: '活跃-精力得分', value: `${activeSum} / 19`, unit: '分' },
        { label: '冒险-易激惹分', value: `${riskSum} / 13`, unit: '分' },
        { label: '临床划界分', value: '≥ 14 分 (轻躁狂阳性筛查)', unit: '' },
        { label: '初筛判定结论', value: primaryScore >= 14 ? '阳性预警 (达到临床界限，建议排查双相)' : '筛查阴性 (常模情绪波动范围)', unit: '' }
      ];
    } else if (assessment.meta.id === 'cssrs') {
      const q1 = scoredValues[1] || 0;
      const q2 = scoredValues[2] || 0;
      const q3 = scoredValues[3] || 0;
      const q4 = scoredValues[4] || 0;
      const q5 = scoredValues[5] || 0;
      const q6 = scoredValues[6] || 0;
      let ideationSeverity = '无自杀意念';
      if (q5 === 1) ideationSeverity = '明确计划与执行意图 (第5级)';
      else if (q4 === 1) ideationSeverity = '有行动意图无具体计划 (第4级)';
      else if (q3 === 1) ideationSeverity = '考虑自杀方法但无意图 (第3级)';
      else if (q2 === 1) ideationSeverity = '非特异主动自杀念头 (第2级)';
      else if (q1 === 1) ideationSeverity = '被动求死愿望 (第1级)';

      secondaryMetrics = [
        { label: '自杀意念最高层级', value: ideationSeverity, unit: '' },
        { label: '自杀计划与意图', value: (q4 === 1 || q5 === 1) ? '阳性 (具备意向/方案)' : '阴性 (无明确意图)', unit: '' },
        { label: '自杀行为与尝试史', value: q6 === 1 ? '阳性 (有自杀尝试/准备行动)' : '阴性 (无自杀行为史)', unit: '' },
        { label: '哥伦比亚协议响应', value: (q4 === 1 || q5 === 1) ? '红色预警 (急诊干预与专人陪护)' : ((q3 === 1 || q6 === 1) ? '橙色关注 (心理精神科深入评估)' : (q1 === 1 || q2 === 1 ? '黄色关注 (情感倾听与支持)' : '绿色安全 (常模基线平稳)')), unit: '' }
      ];
    } else if (assessment.meta.id === 'asq') {
      const q1 = scoredValues[1] || 0;
      const q2 = scoredValues[2] || 0;
      const q3 = scoredValues[3] || 0;
      const q4 = scoredValues[4] || 0;
      const q5 = scoredValues[5] || 0;
      const hasCore = (q1 === 1 || q2 === 1 || q3 === 1 || q4 === 1);
      secondaryMetrics = [
        { label: 'NIMH 筛查总判定', value: q5 === 1 ? '急性阳性 (Acute Positive)' : (hasCore ? '非急性阳性 (Non-acute Positive)' : '筛查阴性 (Negative)'), unit: '' },
        { label: '即刻急性危机意念', value: q5 === 1 ? '阳性 (当下正在产生自杀想法)' : '阴性 (此时无即刻意念)', unit: '' },
        { label: '既往自杀尝试史', value: q4 === 1 ? '阳性 (曾有尝试史)' : '阴性 (无既往自杀尝试)', unit: '' },
        { label: '急诊临床响应指引', value: q5 === 1 ? '必须专人陪护，即刻就医干预' : (hasCore ? '需简短安全评估 (BSSA) 并建卡' : '保持健康规律，无需特殊干预'), unit: '' }
      ];
    } else if (assessment.meta.id === 'sbqr') {
      const q1Desc = ['', '无终生念头与尝试', '短暂念头', '曾有自杀计划', '曾有自杀尝试'][scoredValues[1] || 1] || '无自杀经历';
      const q2Desc = ['', '从未', '极少(1次)', '有时(2次)', '经常(3-4次)', '非常频繁(≥5次)'][scoredValues[2] || 1] || '从未';
      const q3Desc = ['', '从未威胁/透露', '曾向1人透露', '曾向多人/多次威胁'][scoredValues[3] || 1] || '从未威胁';
      const q4Desc = ['绝不可能(0分)', '完全没有可能(1分)', '可能性极小(2分)', '不太可能(3分)', '有一定可能(4分)', '很有可能(5分)', '极有可能(6分)'][scoredValues[4] || 0] || '绝不可能';
      secondaryMetrics = [
        { label: '终生自杀经历', value: q1Desc, unit: '' },
        { label: '过去一年念头频度', value: q2Desc, unit: '' },
        { label: '自杀言语沟通威胁', value: q3Desc, unit: '' },
        { label: '自评未来尝试可能', value: q4Desc, unit: '' }
      ];
    } else if (assessment.meta.id === 'bss') {
      const wishActive = ['无主动愿望', '轻微主动愿望', '中度至强烈主动尝试愿望'][scoredValues[4] || 0] || '无主动愿望';
      const wishPassive = ['主动避险求生', '生死无所谓/听之任之', '希望遭遇意外或疾病而死'][scoredValues[5] || 0] || '主动避险求生';
      const prepSum = (scoredValues[16] || 0) + (scoredValues[17] || 0) + (scoredValues[18] || 0);
      let prepStatus = '无实质准备与遗言';
      if (prepSum >= 4) prepStatus = '准备充分且备好遗书善后';
      else if (prepSum >= 2) prepStatus = '开始部分物资或遗言准备';
      else if (prepSum >= 1) prepStatus = '偶有准备或写遗书构思';

      const concealDesc = ['坦诚求助/无隐瞒', '有所保留或只对少数人说', '极力掩饰与欺骗他人'][scoredValues[19] || 0] || '坦诚求助';

      secondaryMetrics = [
        { label: '主动求死愿望 (Q4)', value: wishActive, unit: '' },
        { label: '被动自杀欲望 (Q5)', value: wishPassive, unit: '' },
        { label: '物资准备与遗书 (Q16-18)', value: prepStatus, unit: '' },
        { label: '对外界掩饰程度 (Q19)', value: concealDesc, unit: '' }
      ];
    } else if (assessment.meta.id === 'isas') {
      const intraItems = [1, 3, 6, 8, 11, 14, 16, 19, 21, 24, 27, 29, 32, 34, 37];
      const intraSum = intraItems.reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      const interItems = [2, 4, 5, 7, 9, 10, 12, 13, 15, 17, 18, 20, 22, 23, 25, 26, 28, 30, 31, 33, 35, 36, 38, 39];
      const interSum = interItems.reduce((sum, id) => sum + (scoredValues[id] || 0), 0);

      let maxDimName = '未见显著主导';
      let maxDimScore = -1;
      if (scoring.dimensions) {
        scoring.dimensions.forEach(d => {
          const s = d.items.reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
          const mean = s / d.items.length;
          if (mean > maxDimScore) {
            maxDimScore = mean;
            maxDimName = d.name;
          }
        });
      }

      let profileType = '常态健康';
      if (primaryScore >= 29) {
        if (intraSum >= 15 && interSum >= 15) profileType = '复杂身心双重驱动型';
        else if (intraSum > interSum) profileType = '内部情绪负荷调控主导型';
        else profileType = '人际沟通与边界求助主导型';
      } else if (primaryScore >= 13) {
        profileType = '偶发轻度功能调节型';
      }

      secondaryMetrics = [
        { label: '个人内部功能总分', value: `${intraSum} / 30`, unit: '分' },
        { label: '人际间社会功能总分', value: `${interSum} / 48`, unit: '分' },
        { label: '最显著主导驱动', value: maxDimScore > 0 ? maxDimName : '无突出维度', unit: '' },
        { label: '自伤功能动力分型', value: profileType, unit: '' }
      ];
    } else if (assessment.meta.id === 'mid') {
      const highItems = Object.values(scoredValues).filter(v => v >= 5).length;
      const idDim = scoring.dimensions ? scoring.dimensions.find(d => d.name.includes('身份') || d.name.includes('多重人格')) : null;
      let idScore = 0;
      if (idDim) {
        const idSum = idDim.items.reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
        idScore = parseFloat(((idSum / idDim.items.length) * 10).toFixed(1));
      }
      const voiceDim = scoring.dimensions ? scoring.dimensions.find(d => d.name.includes('声音')) : null;
      let voiceScore = 0;
      if (voiceDim) {
        const voiceSum = voiceDim.items.reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
        voiceScore = parseFloat(((voiceSum / voiceDim.items.length) * 10).toFixed(1));
      }

      secondaryMetrics = [
        { label: '解离总均分 (MID Mean)', value: `${primaryScore}`, unit: '分 (%)' },
        { label: '高频解离条目数', value: `${highItems} / 218`, unit: '项 (≥50%频度)' },
        { label: '多重身份交替指数', value: `${idScore}`, unit: '分 (%)' },
        { label: '病理性解离初筛', value: primaryScore >= 45 ? '重度解离 (高度提示 DID/OSDD-1)' : (primaryScore >= 30 ? '阳性 (跨越解离障碍界限 ≥30)' : (primaryScore >= 15 ? '轻中度创伤应激解离' : '常模健康基线')), unit: '' }
      ];
    } else if (assessment.meta.id === 'bsds') {
      const q1to19Sum = Array.from({ length: 19 }, (_, i) => i + 1).reduce((sum, id) => sum + (scoredValues[id] || 0), 0);
      const q20Val = scoredValues[20] || 0;
      const q20Labels = { 0: '完全不符合 (0分)', 2: '部分符合 (2分)', 4: '较为主流符合 (4分)', 6: '高度吻合 (6分)' };
      const q20Text = q20Labels[q20Val] || `${q20Val}分`;
      const screenResult = primaryScore >= 20 ? '极高可能性 (双相Ⅰ/Ⅱ型高符合)' : (primaryScore >= 13 ? '中度可能性 (双相谱系筛查阳性)' : (primaryScore >= 7 ? '低至中度可能性' : '双相可能性极低 (单相抑郁/常模)'));

      secondaryMetrics = [
        { label: '故事陈述符合项数 (Q1-19)', value: `${q1to19Sum} / 19`, unit: '项' },
        { label: '整体故事吻合程度 (Q20)', value: q20Text, unit: '' },
        { label: '双相谱系诊断符合倾向', value: screenResult, unit: '' },
        { label: '临床鉴别诊断指导', value: primaryScore >= 13 ? '阳性预警 (慎用单相抗抑郁单药)' : '常规心境监测 (无特殊转躁预警)', unit: '' }
      ];
    } else if (assessment.meta.id === 'asrm') {
      const positiveCount = Object.values(scoredValues).filter(v => v >= 3).length;
      const q3Val = scoredValues[3] || 0;
      const sleepDesc = ['睡眠需求正常', '少睡精力充沛', '少睡数小时不困', '每晚仅睡2-4小时', '彻夜不眠极度亢奋'][q3Val] || '正常';
      const screenResult = primaryScore >= 6 ? '筛查阳性 (≥6分，提示轻躁狂/躁狂可能)' : '筛查阴性 (<6分，常模基线)';

      secondaryMetrics = [
        { label: '临床筛查结论 (Cut-off ≥6)', value: screenResult, unit: '' },
        { label: '重度症状条目数 (≥3分)', value: `${positiveCount} / 5`, unit: '项' },
        { label: '睡眠需求减少评定 (Q3)', value: sleepDesc, unit: '' },
        { label: '临床敏感性与特异性', value: '敏感度 85.5% / 特异度 87.3%', unit: '' }
      ];
    } else if (assessment.meta.id === 'ymrs') {
      const doubleItemsSum = (scoredValues[5] || 0) + (scoredValues[6] || 0) + (scoredValues[8] || 0) + (scoredValues[9] || 0);
      const q8Val = scoredValues[8] || 0;
      const thoughtDesc = q8Val >= 6 ? '明确夸大妄想/幻觉' : (q8Val >= 4 ? '显著夸大观念' : (q8Val >= 2 ? '盲目自负自傲' : '无夸大观念'));
      const q11Val = scoredValues[11] || 0;
      const insightDesc = ['完整充分', '承认过度否认生病', '归咎外界他人', '勉强承认但拒绝治疗', '完全缺乏病识感'][q11Val] || '正常';

      secondaryMetrics = [
        { label: '破坏性双倍项总分 (Q5/6/8/9)', value: `${doubleItemsSum} / 32`, unit: '分' },
        { label: '思维内容与夸大观念 (Q8)', value: thoughtDesc, unit: '' },
        { label: '疾病自知力水平 (Q11)', value: insightDesc, unit: '' },
        { label: '临床发作严重度评估', value: primaryScore >= 26 ? '重度急性发作 (建议专科住院)' : (primaryScore >= 20 ? '中度躁狂状态' : (primaryScore >= 13 ? '轻躁狂发作水平' : '临床缓解/常模健康')), unit: '' }
      ];
    } else {
      secondaryMetrics = [
        { label: '评分区间', value: `${scoring.minScore} - ${scoring.maxScore}`, unit: '分' },
        { label: '题目总数', value: questions.length, unit: '题' }
      ];
    }

    const now = new Date();
    const durationSeconds = this.startTime ? Math.max(1, Math.round((Date.now() - this.startTime) / 1000)) : 0;

    return {
      scaleId: assessment.meta.id,
      scaleName: assessment.meta.name,
      scaleFullName: assessment.meta.fullName,
      scaleEnglishName: assessment.meta.englishName,
      scaleCategory: assessment.meta.category,
      scaleDescription: assessment.meta.description,
      scaleTimeframe: assessment.meta.timeframe,
      references: assessment.meta.references,
      primaryScore,
      primaryMetric: {
        label: scoring.primaryMetricLabel,
        value: primaryScore,
        unit: scoring.primaryMetricUnit,
        min: scoring.minScore,
        max: scoring.maxScore
      },
      secondaryMetrics,
      level: matchedLevel.label,
      levelType: matchedLevel.type,
      badgeClass: matchedLevel.badgeClass,
      summary: matchedLevel.summary,
      advice: matchedLevel.advice,
      dimensionScores,
      subscales: dimensionScores, // Alias for backward compatibility
      answers: Object.entries(answers).map(([id, val]) => {
        const numId = Number(id);
        const qObj = questions.find(q => q.id === numId);
        return {
          id: numId,
          text: qObj ? qObj.text : '',
          dimension: qObj ? qObj.dimension : undefined,
          value: val,
          scored: scoredValues[numId]
        };
      }),
      timestamp: now.toISOString(),
      completedTimeFormatted: AssessmentEngine.formatDate(now),
      durationSeconds
    };
  }

  /**
   * Helper: Format Date in Chinese readable format
   * @param {Date} date 
   * @returns {string}
   */
  static formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}年${month}月${day}日 ${hours}:${minutes}`;
  }

  // =========================================================================
  // Draft Save / Restore
  // =========================================================================

  /**
   * Returns the localStorage key for draft data for the current assessment.
   * @returns {string}
   */
  get draftKey() {
    return `psy_draft_${this.assessment.meta.id}`;
  }

  /**
   * Persist current answers and page position as a draft.
   */
  saveDraft() {
    try {
      const draft = {
        answers: this.answers,
        currentPage: this.currentPage,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(this.draftKey, JSON.stringify(draft));
    } catch (e) {
      // Silently ignore storage errors (e.g. private mode)
    }
  }

  /**
   * Load a previously saved draft for this assessment.
   * @returns {{ answers: Object, currentPage: number, savedAt: string } | null}
   */
  loadDraft() {
    try {
      const raw = localStorage.getItem(this.draftKey);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  /**
   * Restore answers and page from a draft object.
   * @param {{ answers: Object, currentPage: number }} draft
   */
  restoreDraft(draft) {
    if (!draft) return;
    this.answers = Object.assign({}, draft.answers);
    this.currentPage = Math.min(draft.currentPage || 0, this.totalPages - 1);
  }

  /**
   * Delete the saved draft for this assessment.
   */
  clearDraft() {
    try {
      localStorage.removeItem(this.draftKey);
    } catch (e) { }
  }
}

// =========================================================================
// Browser DOM Wiring Controller
// =========================================================================

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    // 1. Resolve Assessment from URL Parameter or fallback
    const urlParams = new URLSearchParams(window.location.search);
    const scaleId = (urlParams.get('id') || 'scl90').toLowerCase();

    const registry = (typeof REGISTRY !== 'undefined') ? REGISTRY : (window.REGISTRY || {});
    const currentAssessment = registry[scaleId] || registry.scl90;

    if (!currentAssessment) {
      console.error(`Assessment with id "${scaleId}" not found in REGISTRY.`);
      return;
    }

    // 2. Initialize Engine
    const engine = new AssessmentEngine(currentAssessment);

    // 3. Bind DOM Elements
    const navScaleName = document.getElementById('nav-scale-name');
    const navScaleCat = document.getElementById('nav-scale-cat');
    const navProgressContainer = document.getElementById('nav-progress-container');
    const progressText = document.getElementById('progress-text');
    const progressPercent = document.getElementById('progress-percent');
    const progressBarFill = document.getElementById('progress-bar-fill');

    const instructionsView = document.getElementById('instructions-view');
    const introCategoryBadge = document.getElementById('intro-category-badge');
    const introScaleName = document.getElementById('intro-scale-name');
    const introScaleFullname = document.getElementById('intro-scale-fullname');
    const introQuestionCount = document.getElementById('intro-question-count');
    const introDuration = document.getElementById('intro-duration');
    const introType = document.getElementById('intro-type');
    const introInstructionText = document.getElementById('intro-instruction-text');
    const btnStartScale = document.getElementById('btn-start-scale');

    const questionsView = document.getElementById('questions-view');
    const questionsContainer = document.getElementById('questions-container');
    const actionBar = document.getElementById('action-bar');
    const btnPrevPage = document.getElementById('btn-prev-page');
    const btnNextPage = document.getElementById('btn-next-page');
    const pageIndicator = document.getElementById('page-indicator');
    const validationToast = document.getElementById('validation-toast');
    const toastMessage = document.getElementById('toast-message');
    const assessmentNav = document.getElementById('assessment-nav');

    // Sticky Assessment Nav scroll feedback
    if (assessmentNav) {
      window.addEventListener('scroll', () => {
        if (window.scrollY > 8) {
          assessmentNav.classList.add('scrolled');
        } else {
          assessmentNav.classList.remove('scrolled');
        }
      }, { passive: true });
    }

    // 4. Populate Header & Introduction Screen
    document.title = `${currentAssessment.meta.name} 测评 | 群岛 Psychipelago`;
    if (navScaleName) navScaleName.textContent = currentAssessment.meta.name;
    if (navScaleCat) navScaleCat.textContent = currentAssessment.meta.category;

    if (introCategoryBadge) introCategoryBadge.textContent = currentAssessment.meta.category;
    if (introScaleName) introScaleName.textContent = `${currentAssessment.meta.name} (${currentAssessment.meta.fullName})`;
    if (introScaleFullname) introScaleFullname.textContent = currentAssessment.meta.description;
    if (introQuestionCount) introQuestionCount.textContent = `${currentAssessment.questions.length} 题`;
    if (introDuration) introDuration.textContent = `约 ${currentAssessment.meta.duration} 分钟`;
    if (introType) {
      introType.textContent = engine.totalPages > 1
        ? `标准分页评估 (${engine.totalPages}页)`
        : '完整单页评估';
    }
    if (introInstructionText) introInstructionText.textContent = currentAssessment.meta.instructions;

    // 4b. Draft Restore Banner
    // Check if a saved draft exists and inject a prompt banner above the start button
    (function injectDraftBanner() {
      const draft = engine.loadDraft();
      if (!draft) return;

      const answeredCount = Object.keys(draft.answers || {}).length;
      if (answeredCount === 0) return; // empty draft — ignore

      const savedDate = draft.savedAt ? new Date(draft.savedAt) : null;
      const savedStr = savedDate ? AssessmentEngine.formatDate(savedDate) : '未知时间';

      const totalQ = currentAssessment.questions.length;
      const pct = Math.round((answeredCount / totalQ) * 100);

      // Create the banner element
      const banner = document.createElement('div');
      banner.id = 'draft-restore-banner';
      banner.className = 'draft-restore-banner';
      banner.innerHTML = `
        <div class="draft-restore-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2a10 10 0 1 0 10 10H12V2z"></path>
            <path d="M12 2a10 10 0 0 1 10 10"></path>
            <path d="M12 12l4-4"></path>
          </svg>
        </div>
        <div class="draft-restore-body">
          <div class="draft-restore-title">检测到未完成的作答记录</div>
          <div class="draft-restore-meta">上次保存于 ${savedStr}，已作答 ${answeredCount} / ${totalQ} 题 (${pct}%)</div>
          <div class="draft-restore-actions">
            <button id="btn-restore-draft" class="btn btn-primary btn-sm">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="1 4 1 10 7 10"></polyline>
                <path d="M3.51 15a9 9 0 1 0 .49-3.51"></path>
              </svg>
              继续上次作答
            </button>
            <button id="btn-discard-draft" class="btn btn-ghost btn-sm">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6l-1 14H6L5 6"></path>
                <path d="M10 11v6"></path>
                <path d="M14 11v6"></path>
                <path d="M9 6V4h6v2"></path>
              </svg>
              丢弃，重新开始
            </button>
          </div>
        </div>
      `;

      // Insert before start button
      if (btnStartScale && btnStartScale.parentNode) {
        btnStartScale.parentNode.insertBefore(banner, btnStartScale);
      }

      // Wire up: Restore draft
      const btnRestore = document.getElementById('btn-restore-draft');
      if (btnRestore) {
        btnRestore.addEventListener('click', () => {
          engine.restoreDraft(draft);
          assessmentStarted = true;
          enableExitGuard();
          engine.startTime = Date.now();

          // Show questions view
          if (instructionsView) instructionsView.style.display = 'none';
          if (questionsView) questionsView.style.display = 'block';
          if (actionBar) actionBar.style.display = 'block';
          if (navProgressContainer) {
            navProgressContainer.style.display = 'block';
            navProgressContainer.classList.add('is-active');
          }
          if (navScaleCat) navScaleCat.style.display = 'inline-flex';

          renderCurrentPage();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      }

      // Wire up: Discard draft
      const btnDiscard = document.getElementById('btn-discard-draft');
      if (btnDiscard) {
        btnDiscard.addEventListener('click', () => {
          engine.clearDraft();
          banner.remove();
        });
      }
    })();

    // Gender Selector for MMPI or gender-normed scales
    if (currentAssessment.meta.requiresGender) {
      const instructionGrid = document.querySelector('.instruction-grid');
      if (instructionGrid && !document.getElementById('gender-select-box')) {
        const genderBox = document.createElement('div');
        genderBox.id = 'gender-select-box';
        genderBox.style.cssText = 'background: #F8FAFC; border: 1.5px solid #E2E8F0; border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1.5rem;';
        genderBox.innerHTML = `
          <div style="font-weight: 600; color: var(--color-text-primary); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem; font-size: 0.95rem;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--color-primary);">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span>受测者指派性别（MMPI-2 常模换算需区分性别）：</span>
          </div>
          <div style="display: flex; gap: 1rem;">
            <button type="button" id="btn-gender-male" class="btn ${engine.gender === 0 ? 'btn-primary' : 'btn-secondary'}" style="flex: 1; padding: 0.75rem 1rem; font-weight: 600;">
              👨 男 
            </button>
            <button type="button" id="btn-gender-female" class="btn ${engine.gender === 1 ? 'btn-primary' : 'btn-secondary'}" style="flex: 1; padding: 0.75rem 1rem; font-weight: 600;">
              👩 女 
            </button>
          </div>
        `;
        instructionGrid.parentNode.insertBefore(genderBox, instructionGrid.nextSibling);

        const btnMale = document.getElementById('btn-gender-male');
        const btnFemale = document.getElementById('btn-gender-female');
        if (btnMale && btnFemale) {
          btnMale.addEventListener('click', () => {
            engine.gender = 0;
            try { localStorage.setItem('psy_gender', '0'); } catch (e) { }
            btnMale.className = 'btn btn-primary';
            btnFemale.className = 'btn btn-secondary';
          });
          btnFemale.addEventListener('click', () => {
            engine.gender = 1;
            try { localStorage.setItem('psy_gender', '1'); } catch (e) { }
            btnFemale.className = 'btn btn-primary';
            btnMale.className = 'btn btn-secondary';
          });
        }
      }
    }

    // 5. Start Assessment Action
    // Track whether the user has started answering (used to gate exit confirmation)
    let assessmentStarted = false;
    let submitting = false; // set true right before navigation to result.html

    // --- Exit Guard: beforeunload (browser refresh / close / address-bar nav) ---
    function handleBeforeUnload(e) {
      e.preventDefault();
      e.returnValue = ''; // Required for Chrome to show the native dialog
    }

    function enableExitGuard() {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    function disableExitGuard() {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    }

    // --- Exit Confirmation Modal ---
    function buildExitModal() {
      if (document.getElementById('exit-confirm-modal')) return; // already exists

      const overlay = document.createElement('div');
      overlay.id = 'exit-confirm-modal';
      overlay.className = 'exit-modal-overlay';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-labelledby', 'exit-modal-title');
      overlay.innerHTML = `
        <div class="exit-modal-card">
          <div class="exit-modal-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          <h2 class="exit-modal-title" id="exit-modal-title">确认退出作答？</h2>
          <p class="exit-modal-desc" id="exit-modal-desc">
            您的作答进度已自动保存。<br>
            下次进入该量表时，可选择继续上次作答。
          </p>
          <div class="exit-modal-actions">
            <button id="exit-modal-confirm" class="btn btn-secondary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              退出并保存进度
            </button>
            <button id="exit-modal-cancel" class="btn btn-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 14 4 9 9 4"></polyline>
                <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
              </svg>
              继续作答
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      // Close on backdrop click
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeExitModal();
      });

      // Close on Escape key
      overlay.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeExitModal();
      });
    }

    let _exitDestination = null; // the href to navigate to after confirm

    function openExitModal(destination) {
      buildExitModal();
      _exitDestination = destination;

      // Update description based on answered count
      const { answered, total } = engine.getProgress();
      const descEl = document.getElementById('exit-modal-desc');
      if (descEl) {
        const pct = Math.round((answered / total) * 100);
        descEl.innerHTML = answered > 0
          ? `您的作答进度已自动保存（已完成 ${answered} / ${total} 题，${pct}%）。<br>下次进入该量表时，可选择继续上次作答。`
          : `还没有已保存的作答记录，退出后本次数据将丢失。`;
      }

      const overlay = document.getElementById('exit-confirm-modal');
      if (overlay) {
        overlay.classList.add('is-open');
        // Focus the "continue" button for keyboard accessibility
        const cancelBtn = document.getElementById('exit-modal-cancel');
        if (cancelBtn) setTimeout(() => cancelBtn.focus(), 50);
      }

      // Bind action buttons (re-bind each time in case modal was rebuilt)
      const confirmBtn = document.getElementById('exit-modal-confirm');
      const cancelBtn = document.getElementById('exit-modal-cancel');

      if (confirmBtn) {
        confirmBtn.onclick = () => {
          disableExitGuard();
          closeExitModal();
          window.location.href = _exitDestination || 'index.html';
        };
      }
      if (cancelBtn) {
        cancelBtn.onclick = () => closeExitModal();
      }
    }

    function closeExitModal() {
      const overlay = document.getElementById('exit-confirm-modal');
      if (overlay) overlay.classList.remove('is-open');
    }

    // --- Intercept the nav "返回" anchor ---
    const navBackLink = document.querySelector('.assessment-nav a[href]');
    if (navBackLink) {
      navBackLink.addEventListener('click', (e) => {
        if (!assessmentStarted || submitting) return; // not in-progress; allow normal nav
        e.preventDefault();
        openExitModal(navBackLink.getAttribute('href'));
      });
    }

    if (btnStartScale) {
      btnStartScale.addEventListener('click', () => {
        assessmentStarted = true;
        enableExitGuard();
        engine.startTime = Date.now();
        if (instructionsView) instructionsView.style.display = 'none';
        if (questionsView) questionsView.style.display = 'block';
        if (actionBar) actionBar.style.display = 'block';
        if (navProgressContainer) {
          navProgressContainer.style.display = 'block';
          navProgressContainer.classList.add('is-active');
        }
        if (navScaleCat) navScaleCat.style.display = 'inline-flex';

        renderCurrentPage();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    // 6. Render Current Page Questions
    function renderCurrentPage() {
      if (!questionsContainer) return;
      questionsContainer.innerHTML = '';

      // Show instructions banner at the top of the questions area on every page
      if (currentAssessment.meta.instructions) {
        const banner = document.createElement('div');
        banner.className = 'instructions-banner';
        banner.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;opacity:0.7">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          <span>${currentAssessment.meta.instructions}</span>
        `;
        questionsContainer.appendChild(banner);
      }

      const pageQuestions = engine.getCurrentPageQuestions();
      const startIndex = engine.currentPage * engine.pageSize;

      pageQuestions.forEach((q, idx) => {
        const qGlobalIndex = startIndex + idx + 1;
        const card = document.createElement('div');
        card.className = 'question-card animate-slide-up';
        card.id = `q-card-${q.id}`;
        card.dataset.qid = q.id;

        // Header
        const header = document.createElement('div');
        header.className = 'question-card-header';
        header.innerHTML = `
          <div class="question-num">${qGlobalIndex}</div>
          <div class="question-text">${q.text}</div>
        `;
        card.appendChild(header);

        // Options
        const optionsList = (q.options && q.options.length > 0) ? q.options : currentAssessment.defaultOptions;
        const optionsGroup = document.createElement('div');
        const colClass = optionsList.length === 5 ? 'options-group-5' : (optionsList.length === 4 ? 'options-group-4' : (optionsList.length === 11 ? 'options-group-11' : ''));
        optionsGroup.className = `options-group ${colClass}`;

        optionsList.forEach(opt => {
          const isSelected = engine.answers[q.id] === opt.value;
          const label = document.createElement('label');
          label.className = `option-label ${isSelected ? 'selected' : ''}`;

          label.innerHTML = `
            <input type="radio" 
                   name="question_${q.id}" 
                   value="${opt.value}" 
                   class="option-input" 
                   ${isSelected ? 'checked' : ''} />
            <div class="option-indicator"></div>
            <div class="option-text-wrapper">
              <span class="option-name">${opt.label}</span>
              ${opt.desc ? `<span class="option-subtext">${opt.desc}</span>` : ''}
            </div>
          `;

          const input = label.querySelector('input');
          input.addEventListener('change', () => {
            engine.setAnswer(q.id, opt.value);

            // Auto-save draft on every answer change
            engine.saveDraft();

            // Clear validation highlight
            card.classList.remove('unanswered-highlight');

            // Toggle visual class
            optionsGroup.querySelectorAll('.option-label').forEach(lbl => lbl.classList.remove('selected'));
            label.classList.add('selected');

            updateProgressBar();
          });

          optionsGroup.appendChild(label);
        });

        card.appendChild(optionsGroup);
        questionsContainer.appendChild(card);
      });

      updatePaginationControls();
      updateProgressBar();
    }

    // 7. Update Pagination Controls
    function updatePaginationControls() {
      if (!pageIndicator) return;
      if (engine.totalPages > 1) {
        pageIndicator.textContent = `第 ${engine.currentPage + 1} / ${engine.totalPages} 页`;
      } else {
        pageIndicator.textContent = `共 ${currentAssessment.questions.length} 题`;
      }

      if (btnPrevPage) {
        btnPrevPage.style.display = engine.currentPage > 0 ? 'inline-flex' : 'none';
      }

      if (btnNextPage) {
        if (engine.currentPage === engine.totalPages - 1) {
          btnNextPage.innerHTML = `
            提交测评并生成报告
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          `;
        } else {
          btnNextPage.innerHTML = `
            下一页
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          `;
        }
      }
    }

    // 8. Progress Calculation
    function updateProgressBar() {
      const { answered, total, percent } = engine.getProgress();
      if (progressText) progressText.textContent = `已作答 ${answered} / ${total} 题`;
      if (progressPercent) progressPercent.textContent = `${percent}%`;
      if (progressBarFill) progressBarFill.style.width = `${percent}%`;
    }

    // 9. Page Validation
    function validateCurrentPage() {
      const unanswered = engine.getUnansweredOnCurrentPage();
      if (unanswered.length > 0) {
        unanswered.forEach(id => {
          const card = document.getElementById(`q-card-${id}`);
          if (card) card.classList.add('unanswered-highlight');
        });

        showToast(`本页还有 ${unanswered.length} 道题目未完成，请作答后再继续`);
        const firstCard = document.getElementById(`q-card-${unanswered[0]}`);
        if (firstCard) {
          firstCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return false;
      }
      return true;
    }

    // Toast Notification Helper
    let toastTimer = null;
    function showToast(msg) {
      if (!validationToast || !toastMessage) return;
      if (toastTimer) clearTimeout(toastTimer);
      toastMessage.textContent = msg;
      validationToast.classList.add('show');
      toastTimer = setTimeout(() => {
        validationToast.classList.remove('show');
      }, 3200);
    }

    // 10. Navigation Event Handlers
    if (btnPrevPage) {
      btnPrevPage.addEventListener('click', () => {
        if (engine.currentPage > 0) {
          engine.currentPage--;
          engine.saveDraft();
          renderCurrentPage();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    }

    if (btnNextPage) {
      btnNextPage.addEventListener('click', () => {
        if (!validateCurrentPage()) return;

        if (engine.currentPage < engine.totalPages - 1) {
          engine.currentPage++;
          engine.saveDraft();
          renderCurrentPage();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          submitAssessment();
        }
      });
    }

    // 11. Final Assessment Submission
    function submitAssessment() {
      const resultData = engine.computeResult();

      try {
        localStorage.setItem('psy_result', JSON.stringify(resultData));
        engine.clearDraft(); // ✓ Clear draft on successful submission
        submitting = true;
        disableExitGuard();
        window.location.href = 'result.html';
      } catch (e) {
        console.error('Storage error:', e);
        engine.clearDraft();
        submitting = true;
        disableExitGuard();
        alert('测评完成！正在为您展现报告。');
        window.location.href = 'result.html';
      }
    }
  });
}

// Universal export

export default AssessmentEngine;
