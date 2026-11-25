const meta = {
  "id": "pdq4plus",
  "name": "PDQ-4+",
  "fullName": "人格障碍诊断问卷",
  "englishName": "Personality Diagnostic Questionnaire-4+",
  "category": "人格与情绪调节",
  "timeframe": "",
  "description": "按 DSM-IV 类别筛查人格障碍相关特征，达到筛查参考值的结果可供进一步评估。",
  "instructions": "根据自己过去几年的一贯表现选择「是」或「否」。最后两题分为若干小项，每一项都需作答，全卷共 126 个应答项。",
  "formVersion": "pdq4plus-zh-cxmed-107",
  "attribution": {
    "label": "中文题面及计分来源：常笑医学网",
    "url": "https://www.cxmed.cn/ms/details_300.html"
  }
};

const items = [
  "我尽量避免与可能批评我的人一块工作",
  "没有得到别人的建议和再三宽心，我难以作出决定",
  "我常常将功夫花在细节上而忽略了大目标",
  "我希望能引人注目",
  "我所作出的成绩远比别人所认为的要多",
  "为了使我所爱的人不离开我，我会走极端",
  "别人抱怨我没有能够完成我的工作任务和所承诺的事情",
  "我曾几次遇到过法律上的麻烦（或如果我当时被抓住，我将会有这类麻烦）",
  "与家人或朋友一起消磨时间并不使我感到有趣",
  "我从周围所发生的事中接受到特殊的信息",
  "我知道如果我任别人怎样待我，他们将会从我身上乘机得利或试图欺骗我",
  "我有时心情不好",
  "只有当我确信对方喜欢我，我才会与他们交朋友",
  "我通常心情抑郁",
  "我让我的家人和朋友为我生活中的重要事情作出决定",
  "我做事过份追求完美，因此花费不少时间",
  "我比一般人对于异性更具有吸引力",
  "我经常发现自己在想我是一个怎样重要的人，或将会成为这样的人",
  "我要么喜欢和佩服某人，要么怨恨他们，没有介于两者之间的感受",
  "我与别人打过许多次架",
  "我觉得别人并不理解和赏识我",
  "我宁可独自工作而不愿与他人一块工作",
  "我能够在一些事情发生之前便知道他们会要发生",
  "我常常寻思我所认识的人是否真正信得过",
  "我偶尔在背后议论别人",
  "由于我不受到别人的奚落或取笑而在与我有亲密关系的人面前压抑自己的情感",
  "我担心如果我表示与别人不一致的看法，便会失去他们的支持实施",
  "我为自卑感而苦恼",
  "我将工作置于与家人或朋友相聚或娱乐之前",
  "我容易显露出自己的情绪",
  "只有某些特别的人才能真正赏识和理解我",
  "我常想弄清自己究竟是何人",
  "我常缺勤，也比我所认识到大多数人更多的调换工作",
  "性方面的事不能引起我的兴趣",
  "别人认为我心情易变及脾气躁",
  "我常能觉察和感受别人感受不到的事情",
  "别人会把我向他们所说的话当作将来此我处于不利的把柄",
  "有一些人我不怎么喜欢",
  "我比大多数人对于批评或拒绝更敏感",
  "一旦事情需要我独自去干，我便感到难以开展",
  "我比别人有更强的道德观念",
  "我是我自己最严厉的批评者",
  "我用自己外貌来得到我所需要的注意",
  "我很需要别人注意我或称赞我",
  "我曾试过伤害自己或自杀",
  "我做过很多不考虑后果的事情",
  "很少有什么活动能够使我感兴趣",
  "人们常常难以理解我谈话中的内容",
  "我不喜欢上级交待我应该怎样干活的工作",
  "我时常留意与捉摸别人话中所隐含的意思",
  "我从未说过一次谎",
  "我害怕于陌生人，因为那会使我感到不自在",
  "我很需要别人喜欢我以致为此作出许多我不情愿做的事情",
  "我积累了不少我不再需要而又不忍心扔掉的东西",
  "我虽然说得很多，但别人说我难以抓住要点",
  "我有很多的忧虑",
  "当店员或营业员使我在柜台前和排队等待较长时间，我容易感到受到怠慢而生气",
  "我是一个情绪不稳定的人",
  "对我来说说谎很容易，我常常这样做",
  "我对于拥有亲密朋友没有什么兴趣",
  "我常常保持警惕以防被别人乘机利用",
  "我不会忘记和原谅那些待我不好的人",
  "我对那些较我“走运”的人感到不满",
  "核战争也许不是一个那么坏的想法",
  "我会在独处时感到无能为力和无法照顾自己",
  "我常常不愿与他人合作或将事情托付给别人干，只是因为我不放心他们是否真正会按我的要求和方式去干",
  "我有一种表演天赋",
  "有些人认为我利用别人",
  "我觉得我的生活乏味",
  "我对周围的人甚为挑剔与苛求",
  "我不在乎别人会怎么说我",
  "我难以在一种只有两人的场合单独与对方打交道",
  "人们常怪我没能意识到他们心情不好",
  "我看上去可能会使别人认为我有些古怪和离奇",
  "我喜欢干冒险的事",
  "我在回答了这份问卷时说到不少谎",
  "我诉说许多我的苦楚和不幸",
  "我难以控制恼怒或脾气",
  "有的人嫉妒我",
  "我易受别人的影响",
  "我认为自己节约，而别人认为我吝啬",
  "一旦我与别人的亲密关系终止，我便需要很快与其他人建立起这种关系",
  "我为自卑感而苦恼",
  "我是一个悲观的人",
  "当别人中伤我时，我毫不犹豫给予还击",
  "别人围在我身旁会使我感到紧张不安",
  "在没有经历过的新场合，我害怕自己会发窘",
  "我时常很害怕别人会离开我而让我自己照顾自己的一切事情",
  "人们说我相当固执",
  "与跟我交往的人相比，我总是很快变成与别人建立起亲密关系",
  "我能在对别人发火之后很快向他们道歉",
  "别人觉得我傲慢",
  "遇到紧张的事情时，我会变得敏感多疑或记不起刚刚发生过的事情",
  "只要我能得到我所需要的，我不会在乎别人会受到什么伤害",
  "我与别人保持相当的距离",
  "我常想弄明白我的妻子（丈夫、女朋友或男朋友）是否有过不忠实的行为",
  "我常有内疚感",
  "我回避做许多我应做但需人际接触的事情，因为我害怕会得不到别人的赞许或遭到拒绝与批评",
  "必须承认，我做事时总是要花许多时间考虑细节、规则或程序以至于我感到难以象别人那样迅速和有效地完成事情",
  "一旦我发现与我关系亲密的人不再接近我，我便会感到十分烦恼并作出各种强烈的反应",
  "我与别人的关系有时变得很亲密，有时则变得充满怨恨",
  "我在表达自己的感受和情绪时比一般人更为兴奋和强烈",
  "我常常禁不住要对我周围人们的一些毛病作些否定性的评价",
  "我无论对别人还是对自己都很注意节省，尽管有人会认为我很吝惜",
  "我习惯于按自己的方式行事，难以因别人的建议而改变，即使是这些建议看来很有道理",
];

const groups = [
  {
    number: 106,
    prompt: "我凭一时冲动干过一些以下的事情以至给我带来麻烦",
    minimumYes: 2,
    items: [
      "花费的金钱超前了我自己所容有的数额",
      "与我不熟悉的人发生性关系",
      "喝酒过多",
      "服用成瘾药物",
      "无节制的大吃",
      "莽撞骑车或驾驶",
    ],
  },
  {
    number: 107,
    prompt: "我小时候（15岁以前）干过以下某些事情",
    minimumYes: 3,
    items: [
      "我被认为是一个霸道的人",
      "我曾先动手打别的小孩",
      "我曾用我手头的武器打架",
      "我曾对别人进行抢劫",
      "我曾对别人进行身体上的虐待",
      "我曾虐待动物",
      "我曾强迫别人与我发生性关系",
      "我曾多次说慌",
      "我曾没经父母的允许而在外面过夜",
      "我偷过别人的东西",
      "我纵过火",
      "我曾打破窗户或捣坏财物",
      "我曾不止一次离家在外过夜",
      "我在13岁之前经常逃学",
      "我曾撬门窗而入别人的家，房子或汽车",
    ],
  },
];

const defaultOptions = [{ label: '是', value: 1 }, { label: '否', value: 0 }];
const questions = items.map((text, index) => ({ id: index + 1, text }));
for (const group of groups) {
  group.ids = group.items.map((text, index) => {
    const id = questions.length + 1;
    const displayNumber = `${group.number}${String.fromCharCode(97 + index)}`;
    questions.push({ id, text, displayNumber, groupPrompt: `${group.number}. ${group.prompt}` });
    return id;
  });
}

// This key accompanies the 107-item Chinese form. Its replacement items are already resolved.
const dimensions = [
  ['偏执型', 4, [11, 24, 37, 50, 62, 85, 96]],
  ['分裂样型', 4, [9, 22, 34, 47, 60, 71, 95]],
  ['分裂型', 5, [10, 23, 36, 48, 60, 61, 72, 74, 86]],
  ['表演型', 5, [4, 17, 30, 43, 55, 102, 80, 90]],
  ['自恋型', 5, [5, 18, 31, 44, 57, 68, 73, 79, 92]],
  ['边缘型', 5, [100, 101, 32, 45, 58, 69, 78, 93, 106]],
  ['反社会型', 3, [8, 20, 33, 46, 59, 75, 94, 107]],
  ['回避型', 4, [98, 13, 26, 39, 52, 83, 87]],
  ['依赖型', 5, [2, 15, 27, 40, 53, 65, 82, 88]],
  ['强迫型', 4, [99, 16, 29, 41, 54, 66, 81, 105, 104]],
  ['抑郁型', 5, [14, 28, 42, 56, 70, 84, 97]],
  ['被动攻击型', 4, [7, 21, 35, 49, 63, 77, 91]],
];
// Item 60 belongs to two dimensions and counts once toward the total.
const totalItems = [...new Set(dimensions.flatMap(([, , ids]) => ids))];

function computeResult(answers) {
  const itemScores = { ...answers };
  for (const { number, ids, minimumYes } of groups) {
    const yes = ids.reduce((count, id) => count + answers[id], 0);
    itemScores[number] = Number(yes >= minimumYes);
  }
  const sum = (ids) => ids.reduce((total, id) => total + itemScores[id], 0);
  const primaryScore = sum(totalItems);
  const validityScore = 3 - sum([12, 25, 38]) + sum([51, 70, 84, 64, 76]);
  const now = new Date();
  return {
    scaleId: meta.id,
    scaleName: meta.name,
    scaleFullName: meta.fullName,
    scaleEnglishName: meta.englishName,
    scaleCategory: meta.category,
    scoringVersion: meta.formVersion,
    primaryScore,
    primaryMetric: { label: 'PDQ-4+ 总分', value: primaryScore, min: 0, max: totalItems.length, unit: '分' },
    level: '',
    dimensionScores: dimensions.map(([name, cutoff, ids]) => {
      const score = sum(ids);
      return { name, score, max: ids.length, level: score >= cutoff ? '达到筛查参考值' : '低于筛查参考值' };
    }),
    validityConclusion: validityScore >= 5 ? '作答效度指标达到参考界值，解读筛查结果时需结合进一步评估。' : undefined,
    answers: questions.map(({ id, text, displayNumber }) => ({
      id,
      text: `${displayNumber ?? id}. ${text}`,
      value: answers[id],
      scored: answers[id],
      label: answers[id] ? '是' : '否',
    })),
    timestamp: now.toISOString(),
    completedTimeFormatted: now.toLocaleString('zh-CN', { hour12: false }),
  };
}

export default { meta, defaultOptions, questions, scoring: { computeResult } };
