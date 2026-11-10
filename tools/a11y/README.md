# a11y spec 快照（工具与断言）

这两个文件是**快照**，原件的权威副本不在本仓库：

| 文件 | 原件位置 | 快照 sha256（前 16 位） | 字节 |
| --- | --- | --- | --- |
| `spec.cjs` | `C:\Users\Lenovo\.dsh\skills\design-audit\scripts\spec.cjs` | `cc71e3944ba77af0` | 87926 |
| `ui-spec.json` | `docs/departments/designer/assertions/ui-spec.traumacompass.json`（`docs/` 被 `.gitignore` 排除） | `10f43ab871bdd3e1` | 229505 |

`ui-spec.json` 是从 `docs/` 原件的逐字节拷贝，只改名不改内容；`spec.cjs` 同样逐字节拷贝（skill 目录那份也已同步成这一版）。换行统一成 LF 后再算 sha 与字节数（工作流里打印的也是这个）；这一版原件与快照同为 LF，两个文件逐字节相同。

**v3 版（2026-11-07 起，当前）**：**301 条断言**（唯一 id 300 个；本轮新增退役计数 81），按视口生效 1440 = 184 条、390 = 113 条、375 = 14 条、320 = 11 条（7 条不标视口，计入每一档）。**2026-11-09 追加两批**：第一批三条——一条手机「医院↔医生互跳保持当前档」（390）、两条桌面「筛选联动省面高亮 / 取消后回到密度着色」（1440）；第二批 27 条——筛选抽屉 7、夜间模式 14、卡头拖拽 2、地图拖动 4；第三批 2 条——筛选下「列表行条数 = 详情条数」（医院、医生各一条），并把三条 `key`/`Escape` 的等待窗放到 700、卡头下拖从 400px 改成 600px（判据未动）。见下面「手机详情互跳保档与桌面筛选联动」与「手机筛选抽屉、夜间模式与拖拽」两节。**2026-11-08 的「进详情抬起来」当晚被小雨撤回**（Kiwi 改判：医院/医生详情一律停 medium 424），所以 `v3.m-hospital-medium` 回到在跑状态、`v3.m-hospital-can-peek` 仍按一次 ↓（424 → peek），分流用的 `v3.m-hospital-large-from-list` / `v3.m-hospital-medium-from-pin` 已删除；11-08 那版与当晚冻结的 `7669370b` 逐字节相同；11-09 追加三条后不再相同。比参考跑（129+2 / 65+8 / 12+1 / 9+1）多的是：两条图钉前置守卫（`v3.pin-selected-guard` / `-390`，不带 `skipIfMissing`，前置跑不成就算失败而不是静默记不适用），以及四条「返回后焦点别丢」的断言 —— 手机两条判 `.sheet .head-title`（`v3.m-back-focus-title-390` / `-country-390`），桌面两条判被点的那一行（`v3.d-back-focus-row-1440` 判 `button.tc-hospital-row`、`v3.d-back-focus-row-country-1440` 判 `button.tc-province-row`）。落点按布局定：手机回退后列表整页重渲染、落标题才不会把人扔到某一行上；桌面是分栏、行还在列表里，落回触发行才能接着 Tab 往下看（Kiwi 2026-11-07 定的这条口径，见下面 1440 段）。1440 那 16 条是桌面侧栏把手的（Kiwi 2026-11-08 追加，选择器见下一节）：存在、`role=separator`、命中带 ≥10px、Tab 顺序在页签之前、`End`/`Home`/`Enter` 各判「盒子宽 ±2 + `aria-valuenow` 同步」、刷新后记住 456（键 `tc.sidebar.width`）、顶栏 `transform` 与「侧栏右缘到顶栏左缘 ≥20px」、`.tc-sidebar-body` 在 280/520 不横向溢出。这一版不能手改：由 `assertions/build-spec.cjs` 从 **基线 `11767be` 的 185 条**（kept 115，其中 23 条 repath）+ `v3-checks.cjs` 的 145 条生成，新增退役 70 条。重生成时先把基线取回来、不能带 BOM —— `git show 11767be:tools/a11y/ui-spec.json` 用 PowerShell 的 `Out-File -Encoding utf8` 会写出 BOM，`JSON.parse` 直接失败；用 node 落盘、归 LF 后再跑 `build-spec.cjs`，跑完把 docs 原件拷回本快照。**别用 PowerShell 的 `Get-Content -Raw` + `WriteAllText` 改这几个含中文的文件**：PS 会按 GBK 读入再写回，整份中文被写坏（2026-11-07 踩过一次，靠生成好的 spec 反推恢复，产物逐字节一致）；要改用 edit/write 工具或 node 脚本。

V3-02 那五条（选中钉橙色 / 光圈 / 标签 / 其余钉不压透明度 / 手机同款）的前置必须是「点省 → 点 `.tc-cluster-pin` 展开 → 点 `.tc-hospital-pin` → 等 `.tc-pin--selected`」。聚合钉的类名是 `tc-cluster-pin` 而不是 `tc-cluster`，写成 `.tc-map-node:not(.tc-cluster)` 会抓到聚合钉、点了只展开不选中，五条会一直「前置没跑成」。选中后 canvas 加 `tc-mapapp-canvas--pinned`、标签 `display:block`、其余钉 `opacity: 1`（`v3.css:17` 走 `--tc-nodes-opacity`）。

**当前被测身份**：`out/index.html` **2026-11-10 22:13:26 / 865,726 B / sha256 前 16 `B7F54AE1046B5ADA`**（`app/globals.css` 22:12:33 早于产物；数据 17:12:33 未动：127 家医院 / 326 条线索已发布 / 252 位医生）；配断言表 301 条 / `10f43ab871bdd3e1`（229,505 B）。四档实跑与报告路径见本节末尾。

**第十二轮：数据换到 326 条、搜索排序、卡数 13**。界面读数：全国「127 家医院 · 326 条线索」、cptsd「35 家医院 · 90 条线索」、cptsd＋人格障碍「111 家医院 · 267 条线索」、回龙观 24 条 / 13 张卡（首卡以原文串「创伤后应激障碍专病门诊」当卡名，含 3 条线索）。跟着改的写死数：`v3.chip-union` → 111 家 / 267 条；`v3.d-filter-paints-provinces-1440` 的 `headerIncludes` → 35 家 / 90 条；八条卡身计数 12 → 13；`base185.json` 的并集文案同步 267。`doctor.note-empty`（原判「没有备注时写『无』」）在换轮后第一条 `.tc-doctor-link` 指向了带备注的卡，样本改指**潘伟刚**（回龙观里备注为空的一位），判据不动。新加两条搜索排序断言（1440 / 390 各一）：搜「武汉」时医院结果首行必须含「湖北」——`v3.d-search-wuhan-first-1440` 判 `li[role="group"][aria-label="医院"] ul.tc-plainlist > li:first-child .tc-mapapp-result`，`v3.m-search-wuhan-first-390` 判手机底卡 `.sheet-search > div:first-of-type > .sr-row:first-of-type`（手机不渲染 `.tc-mapapp-result`，先点 `.sheet .grab` 再用 `.sfield input`）。省行家数不变量（`v3.d-province-count-matches-rows-1440`）保持一般表述：当前数据 127 家全部有线索，0 条分支没有样本、未覆盖。

**第十三轮（2026-11-10 晚）：卡头名字超长时的省略号**。小雨看到「心身疾病一科设有“人格障碍专业组”」这类以原文串当卡名的卡，名字把标签挤到卡片边框外。修法分两步：先把卡头做成 `grid-template-columns: minmax(0, 1fr)`、卡头行 `display:flex; min-width:0`、标签 `flex:0 0 auto`（越界那一层）；再把 `display:block; min-width:0; max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap` 落到名字的 `button.tc-doctor-link` 自己身上（省略号落点）——DOM 是 `.tc-lead-doctor > span > button`，省略号写在 `span` 上时文字被硬切、末尾没有「…」。

断言用注入式，不依赖数据里恰好有超长姓名（数据一改就不会悄悄失真）：进绵阳市第三人民医院详情取第一张卡，把 `.tc-doctor-link` 的文本临时换成 30 字长名，量完立刻在同一个 `evaluate` 的 `finally` 里还原。五条：`v3.card-head-ellipsis-320/375/390/1440`（`scrollWidth > clientWidth`、`text-overflow` 为 `ellipsis`、单行、标签右缘 ≤ 卡片内容右缘、卡高 112±1 / 桌面 113±1）与反向对照 `v3.card-head-ellipsis-390-fit`（注入 1 字短名，`scrollWidth == clientWidth`，仍单行）。实测证据（锚点 22:13:26）：320 = 427/187、375 = 427/242、390 = 427/257、1440 = 454/230，标签右缘分别 287≤288、342≤343、357≤358、338≤339，卡高 112/112/112/113；短名 14/14。

反证：把 390 那条的注入改成 1 字短名后**必红**（`scrollWidth 14 = clientWidth 14（期望裁切）`），说明这条不是「只要有 ellipsis 就绿」。

**上一轮被锁定的身份**：`out/index.html` **2026-11-09 09:41:38 / 390,514 B / sha256 前 16 `0C3A1F663952ED8F`**，配断言表 258 条 / `00435191f7a96285`（表未动）。这一版由 Kiwi 在小镜停手后锁定，九条在同一哈希上跑三门。被它取代的 09:17:50（`5BD36C2F6EEC62FF`）只改了医生详情三行网格的 CSS，但 hover 的 `::before` 压住文字——几何探针量不出来、只有截图看得见，所以修好后又重出了一版。留档：09:17:50 只改医生详情三行网格；08:58:42（`21372E9E73D51527`，已取代）把手势判定抽成 `lib/sheet-drag.ts` 并补 `tests/sheet-drag.test.mjs`（`test:map-layout` 22 条），纯重构、不进 a11y 分母；08:41:30（`96AB29EFE033FD3E`，已被本版取代）把相机约束从「中国全境留在框内」换成 `constrainChinaCenter`——中国至少留 48px 在屏内、中心可自由移动，`chinaCameraBounds` 已删，`lib/amap-runtime.ts` 的 `move()` 改调 `constrainChinaCenter({ ...camera, getZoom: () => zoom }, point, 48)`；同版让 `.searchrow` 挂上 `dragProps`（输入框移出拖拽排除名单，`beginDrag` 按下即 `setPointerCapture`，6px 只决定写不写高度）；03:02:36（`2A040FB3FB07CD8E`）加了手机筛选按钮抽屉（`.chipbtn` + `.chipdrawer`）、夜间模式（`.theme-toggle`，键 `tc.theme`）、卡头与地图拖拽，并修了深色下侧栏滚动条与比例尺的对比度；00:43:56（`BB221CE6142956BB`）改了 `components/map/MapApp.tsx` 两处——手机医院↔医生互跳保住当前档位（large 留 large、medium 留 medium，peek 例外仍抬 medium），桌面筛选开始联动地图、与手机共用 `paintProvince()`；22:57:29（`1383CD09566589F1`）是把 `Sidebar.tsx` 的宽度把手从 `<aside>` 末尾挪到最前（绝对定位、视觉不变），Tab 顺序因此从「…省行 → 把手」变成「关于 → 把手 → 品牌 → 页签」。`tabOrder` 一类断言在更早的构建上会假红，对身份要连改动文件一起看。

## 第十轮（2026-11-09 晚）：数据换轮、「评价」改区块、图钉链换省

断言表 **280 条 / 唯一 279 / 退役 105 / 205,303 B / `C1E3D3460C116BEC`**；登记分母 **1440 = 175、390 = 103、375 = 13、320 = 10，合计 301**（多为换序与空值那条新增，减掉退役的「评价是末节」）。

- **数据换轮**：医院 119 → 123 → 124 → **127**，线索已发布 **272**（文件 273，1 条未挂机构：澳门心理卫生中心），医生 **245**。界面读数：全国「127 家医院 · 272 条线索」、cptsd「35 家医院 · 55 条线索」、cptsd+pd「111 家医院 · 223 条线索」；回龙观 13 卡，筛 cptsd 6、cptsd+pd 11。
- **判据以界面读数为准**：源文件按线索条数数出来会比界面多几条（构建期按机构合并重复段，未挂机构的线索不进医院行），拿源文件数去对断言会差几条，别这么对。
- **跟着数据改的两处**：`v3.chip-union` → 「111 家医院 · 223 条线索」；`v3.d-filter-paints-provinces-1440` 的 `headerIncludes` 保持「35 家医院」「55 条线索」（cptsd 那组没变），只把 desc 里的旧数改掉；`base185.json` 的 `filter.multi-select-union-leads` 期望文本同步成 223。
- **两处换样本（判据不动）**：`v3.doctor-clinic` 与 `doctor.clinic-empty` 改指于宏华（回龙观里科室为空的一位）；`v3.doctor-separator` 改指山西唯一医院那条线索（「曹晓华、王祎坤」，全库唯一并列两位医生的线索）——山东拆院后不再是单家省。
- **「评价」从元信息第四行改成区块**：`section.tc-detail-section.tc-doctor-rating`（`h3`「评价」），正文 `article.tc-report > p.tc-quote`。元信息固定三行（门诊 / 所在医院 / 备注）。**2026-11-09 深夜小雨再改一次序**：评价在前、线索原文在末位——现在 `.tc-detail` 的子节点是 `head → 医生线索列表 → 元信息 → 评价节 → 线索原文节`，判顺序的两条是 `v3.doctor-leads-section-last-1440`（末节文本含「线索原文」）与 `v3.doctor-eval-section-before-leads-1440`（倒数第二节文本含「评价」）。
- **回声规则最终版**：评价节**一律渲染**，不再按 `evaluation_echoes_report` 隐藏。原本「回声医生整节不渲染」的实现被小雨打回，表里那条 `v3.doctor-eval-absent-echo-1440` 随之退役，**没有改成反向断言**（这轮不动面）。
- **空值不成卡片**（`UI_SPEC.md` §3）：评价为空时正文是一行灰字「无」，类名 `tc-doctor-rating-empty`，与该节 `h3` 左缘对齐、不画边框不铺底色，区块本身不消失。两条断言按此写：`v3.d-doctor-eval-empty-not-card-1440`（`borderTopWidth` / `borderLeftWidth` 为 `0px`、`backgroundColor` 透明）与 `v3.d-doctor-eval-empty-align-1440`（`styleMatch` 比 `left`，容差 1）。
- **评价节的其余三条**：评价节紧挨在末节（线索原文）之前（马弘）；正文排版与同页线索原文逐项一致（`styleMatch`，评价节 `.tc-quote` 对 `section.tc-detail-section:last-child .tc-quote`——换序前这两处指到同一个元素、会自己跟自己比，所以换序后必须按节前缀各取一处）；空评价正文「无」（刘华清、罗新妮）。
- **退役**：`v3.doctor-rating`（原判 `hasText .tc-doctor-meta--rating` = 评价无）、`doctor.rating-empty`、`v3.doctor-eval-section-last-1440`（原判「评价是最后一节」，换序后方向相反；末位判定改由 `v3.doctor-leads-section-last-1440` 承担）、`doctor.profile-only-with-record`（档案块整块删除）、`v3.doctor-eval-absent-echo-1440`。改指等于换样本换判据，那是新检查，不是修旧检查。
- **图钉链换省**：山东拆院后成 2 家，全库只剩山西 1 家（山西医科大学第一医院 解放路院区）；单钉 34×34 在 (192,232)，`elementFromPoint(中心)` 就是钉体、没被右上角按钮列挡住，所以链里从 `clickat` 偏移改成直接点中心。
- **新能力 `styleMatch`**：两处元素逐项比 `fontSize` / `lineHeight` / `color` / `whiteSpace` 与 `left` / `width`，容差 1px。读与比必须在**一次 `page.evaluate`** 里完成——分两次读会撞 `Execution context was destroyed, most likely because of a navigation`，把比较搬到 Node 侧还会反复报 `Cannot access 'delta' before initialization`。
- **退役机制**：`RETIRE_V3_BY_ID` 里的 id 必须仍留在 `v3-checks.cjs`，由 `build-spec.cjs` 在生成时摘掉；先把检查块物理删掉再登记，会直接报 `RETIRE_V3_BY_ID ids not found in v3-checks`。另：删块脚本别留下空槽，`[...]` 里多出一个逗号会让 `for (const c of v3)` 读到 `undefined`，报错是 `Cannot read properties of undefined (reading 'id')`。
- **本轮构建换得很密**（20:22:11 → 20:49:41 → 20:59:04 → 21:37:26 → 22:07:33 → 22:28:44 → 22:31:50 → 数据 22:35:54 后的重建）。每次换锚点都先核三件套：`out/index.html` 的时间、字节、sha256 前 16 位，三者必须来自同一次读取；字节相同而哈希不同，先怀疑取自两次构建。

断言表登记 **1440 = 184、390 = 113、375 = 14、320 = 11，合计 322**（301 条表）。四档实跑（spec `229505 B / sha256 前 16 10f43ab871bdd3e1`，锚点 22:13:26 / `B7F54AE1046B5ADA`，跑前跑后时间、字节、sha 一致）：1440×900 = **184 / 0 / 0**、390×844 = **112 / 0 / 1**、375×812 = **13 / 0 / 1**、320×568 = **10 / 0 / 1**，合计 **319 通过 / 0 失败 / 3 不适用**（`s5-disabled-opacity`）。报告留在 `a11y-reports/lock-221326-<视口>/`。这一版把卡头超长名字的省略号写成注入式五条（四档裁切 + 390 短名反向对照），上一版（17:29:01 / `B70C49BB`，296 条 / `a5d5bfbb`）的四档 314/0/3 已被取代。
**五列对账（分母 / 实跑 / 通过 / 不适用 / 未执行）**：1440 = 184 / 184 / 184 / 0 / 0；390 = 113 / 113 / 112 / 1 / 0；375 = 14 / 14 / 13 / 1 / 0；320 = 11 / 11 / 10 / 1 / 0；合计 322 / 322 / 319 / 3 / 0。7 条无 `at` 的通用条目（`type.body`、`type.input`、`copy.no-arrow`、`s5-disabled-opacity`、`s6-z-map`、`s6-z-ctl`、`s6-z-topbar`）在每一档都执行，窄屏上 6 通过、`s5-disabled-opacity` 不适用（本页没有 `.tc-map-zoom button[disabled]`）。


这一版把 `a11y.mapclick-*` 六条链的时序固定下来，判据一字未动：点击前 `wait .amap-layers` 加 `settle: 900`（等相机与切片稳定，否则点击会落空、量到 736），`clickat` 加 `afterMs: 700`（底卡收档过渡 340ms，350ms 的默认等待正好卡在尾巴上，会量到 432 这种中间值）。独立复跑曾在这六条里出过 `432.2>428` 与 `736>428` 两种偶发——都是采样时机、不是实现不稳定，所以固的是等待、不是容差。

桌面这两条是改过判据的：第一版按手机口径写成「返回后焦点落上一层标题」`v3.d-back-focus-title-1440`，实测红——焦点落在被点的本院行（`button.tc-hospital-row`，回省层是 `button.tc-province-row`），键盘与指针两条路径一致，没掉 `document.body`、行在视口内、有 2px `--tc-text` 环。Kiwi 2026-11-07 定：桌面按布局用「落回触发行」的口径，手机保持「落标题」，两处共同目标只是「位置别丢」。所以现在是 `v3.d-back-focus-row-1440` 与 `v3.d-back-focus-row-country-1440` 两条，实测全 pass；焦点环与视口内的读数在 `.botharness/mobile-v3-accept/probe-desk-focus.json` 与 `probe-desk-focus-kbd.json`（`focusOn` 一次只判一个 `document.activeElement`，环和矩形是手工量的，没进机器判）。

**所有图钉链的第一步都是 `wait .amap-layers` + `envGate:"amap"`**：冷启动时高德运行时还没起来就点省行，会点在空地图上、随后 `wait .tc-map-node` 超时，四条桌面图钉断言会假红（九条可怜 2026-11-07 独立复跑时遇到，重跑即消失）；先等运行时再点就稳定。手机两条图钉链还要走「山东」而不是「北京」：390 下北京两家医院没超出合并半径，点一次聚合只从 1 枚变 2 枚聚合钉、出不来单钉（小镜复现，`probe-pin-beijing.mjs` / `probe-pin-mobile.mjs` 留在 `.botharness/mobile-v3-accept/`）；桌面 1440 用北京仍正常。`desktop.scale-present` 也吃过一次采样竞态：全量跑时偶发读到「没有该组件」被记不适用（单跑 5/5 通过、bisect 里 N=5 与 N=30 过、N=15 不过），根因是高德把比例尺挂在 `.amap-controls` 里、比 `.amap-layers` 晚一步进 DOM，而 runner 导航后只等 1800ms；现给它加前置 `wait .tc-mapapp-canvas .amap-logo`（`envGate:"amap"`，logo 与控件层同时挂载且有真实盒子）+ `afterMs: 400`，判据仍是 rect ≥40×10 没改。注意不能等 `.amap-controls`：它是有尺寸子元素的零尺寸容器，Playwright 的 `visible` 永远等不到。此前 19:00 那版 390 = 67 / 5 / 1，五条全卡在一个已修掉的生产包崩溃上：搜索框输入第一个字符整页变 Next 错误页，`ReferenceError: Cannot access 'tn' before initialization` —— `components/map/MapApp.tsx` 的搜索 `useMemo` 当时调用了组件体内的 `provinceShortName`（现改为模块级、四处调用显式传 `props.provinces`）。

**上一版（第 6 批，`5d13382` 上的 185 条）**留档：唯一 id 184 个、退役 28 条，按视口生效 1440 = 110、390 = 75、375 = 15、320 = 9；四档实测 **1440×900 = 110 / 0 / 0**、**390×844 = 74 / 0 / 1**、375×812 = 14 / 0 / 1、320×568 = 8 / 0 / 1（三档「不适用」都是 `s5-disabled-opacity`）。报告在 `.botharness/mobile-v3-accept/a11y-reports/`（`cta-390` 与 `cta-1440` 是这版 spec 的 390/1440 两档，`b6-narrow2` 含 375 与 320）。Kiwi 追加的 390 正向隐藏断言 `mobile.cta-hidden-390` 也在这一版里：手机详情里 `.tc-hospital-actions`（「在地图上定位」容器）在 DOM 但 `display: none`，判 display 而不是只看 Tab 序列。

第 6 批把省列表从 `.sheet-body` 挪进筛选菜单、全国层直接列医院行，所以这一版顺手改了入口相关的前置：手机端进省走「搜索框 → 筛选钮 → 省份卡 → 菜单里点省名」，进医院详情走「保险起见先抬卡到 medium，再点全国列表的医院行」（peek 档 `.sheet-body` 只有 24px 且在视口外，行根本点不到）。原来两个视口共用一条的四条文案/尺寸断言（`copy.no-disease-count`、`copy.no-scope-explainer`、`copy.no-unsourced-service`、`s5-row-highlight-hospital`）拆成 `at:1440` 原样加 `at:390` 手机版；`type.button` 只留桌面 —— 手机端机构详情里这个 CTA 是渲染的但盒子 0×0，没有可量的东西。省菜单的滚动节点是里层 `ul`（外框 `.fmenu` 是 `overflow: visible`，判外框会永远绿），`filter.provmenu-scrolls` 与 `filter.dismenu-no-scroll` 都落在 `ul` 上。375 的 `size-row-375` 也随之改判菜单行。

这一版的 A30/A35 断言（27 条，`at: 390`）按 HANDOFF 的终版判据与实测写，选择器约定：面板根 `.fpanel`、两张卡 `.fcard[data-kind="province"|"disorder"]`、卡面文字 `.fcard-label`、菜单 `.fmenu[data-kind=…]` + 展开态 `.open`、省菜单行 `.fmenu[data-kind="province"] li`（**35 行**：首行「全部省份」+ 34 个省级区划，geo 里无名字的要素已滤掉）、病症勾选 `.fmenu[data-kind="disorder"] [role="checkbox"]`（3 个）。高度用区间：面板 69±4（只露卡）/ 301±6（省菜单）/ 209±4（病症菜单）；开省菜单底卡抬到 736、开病症菜单留在 424。行为上：选省份后菜单收起，**勾病症菜单保持展开**（多选），多个病名按标签定义顺序用「、」连接 —— 卡面（`filter.label-joined-order`）与头部 meta 前缀（`filter.meta-joined-order`）各判一条，两处都按 `TAGS` 的定义顺序，防「卡面对、meta 反」。同一个拼接函数的两个边界也落进机器判：单病名时 `filter.meta-single-sep` 要求名字后面是空格加「·」、`filter.meta-single-no-joiner` 与 `filter.card-single-no-joiner` 要求 meta 和卡面都不许留顿号；只选省份时 `filter.meta-province-only` 要求 meta 里不出现省名（完全不带前缀）。A30 里留在手工走查的两条——点同一省回全国、点「全部省份」回全国——已在第 6 批上手工走过：从省级 424 选同一省份落回 `is-country` 424、选「全部省份」同样回 `is-country` 424，头部 meta 无病症时不带前缀、勾一个病名时是「人格障碍 · N 家医院 · N 条线索」，都不带多余顿号。

这一版还清掉了最后 4 条 `at:999` 的断言（`s5-tab-min-height-999`、`s6-drawer-closed-999`、`s6-drawer-top-104`、`s6-drawer-width-999`）：v3 之后 ≤999px 不渲染 `.tc-sidebar`，而 999 宽度又不在矩阵里，它们从来不会执行。改成 1440 会变成拿桌面侧栏去判手机规则，等于把断言换成另一件事，所以退役并在 `retired.why` 里写明各自被哪条接住。

`spec.cjs` 相对 skill 旧快照多了十个前置/断言能力，判据一处没改：`clickat`（点地图，见下）、`reload`（刷新页面，验持久化；含 `reload` 的前置组会先清 `localStorage` 再重载，否则上一组留下的主题或宽度会把起点带偏）、`scrollFit`（容器内不得横向溢出，判 `scrollWidth = clientWidth`）、`tabOrder`（真按 Tab 判两个元素的先后，`first` 必须先于 `second` 到达——不写成「一直按到出现为止」，那样顺序坏了也会绿）、`assertrect`（前置动作，量当前元素高度并判区间，实测值进证据，用来锁住「这一步必须已经到 736」）、`polygonPaint`（挂 `AMap.Polygon.prototype.setOptions` 采集省面上色参数，判完还原原型）、`drag`（按下—分步移动—抬起，真实鼠标序列，用来测卡头与地图拖动）、`mapPan`（读 `.amap-container` 上 `el.amap.getCenter()/getZoom()`，判拖动后地图中心确实移了）、`styleMatch`（两处元素逐项比 `fontSize`/`lineHeight`/`color`/`whiteSpace` 与 `left`/`width`，容差 1px；读与比必须在一次 `page.evaluate` 里做完，分两次会撞 `Execution context was destroyed`）。、`textFits`（判一段文本的 `scrollWidth` 与 `clientWidth`、`text-overflow`、行数；可先用 `injectText` 注入长名/短名，量完在同一个 `evaluate` 的 `finally` 里还原；另可附带判兄弟元素右缘不越过卡片内容右缘、卡片高度区间）`attr` 另有 `allowHidden`：`html` 这类零尺寸元素按可见性过滤会全红，显式打开后取全部匹配，证据里标「元素无盒子」。

其中 `mobile.scale-hidden` 带 `absentOk`：元素不存在时记 pass 并标 `absent`。它解决的是 CI runner 起不来 AMap、比例尺控件压根不进 DOM 的误报；配的正向是 `desktop.scale-present`（1440 档要求控件真渲染，带 `skipIfMissing`，CI 里记不适用）。所以 CI 的结果是「通过 / 失败 / 不适用」三态，不适用不等于验过。

**上一轮独立验收（九条可怜，2026-11-08 23:57，构建 22:57:29 / spec `f40aa8415c3add09`）**：门 1 登记 249 / **实跑 246 通过 / 0 失败 / 3 不适用**（`s5-disabled-opacity`），分档 150 / 75 / 12 / 9，与我上面自检逐档一致；门 2 **17/17** 几何一致（m09 记命中范围差异、m06 焦点环按 Kiwi 裁定不判红）；门 3 焦点返回 5/5、换层滑入 8/8、图钉 8 轮不发灰、侧栏与 Tab 往返全过。跑前跑后 `out/index.html` 的 sha 与 spec 的 `f40aa8415c3add09` 逐字相同，没重建。报告在 `.botharness/a11y-v3-independent/final-222957/`，门 1 明细是其中的 `independent-222957/spec-report.md`。这一轮作数是针对 22:57:29 的。当前锚点 09:41:38 / 258 条这一版的自检数在上面的「断言表登记」一段（03:02:36、08:41:30、08:58:42 三份构建用同一份表，同为 276/0/3）；九条的独立复跑以 Kiwi 发给她、与上面对得上的那份锚点为准。

侧栏把手的专用断言是 **16 条**（`v3.sidebar-resize-*`，全部 1440）。九条另自写了三组探针——侧栏换档、页签切换、标签层序——不进门 1 分母，别把「16 条断言 + 3 组探针」写成「19 条断言」。

## 第十一轮（2026-11-10 凌晨）：医院页卡身改三行、原文搬到医生页

锚点 **08:12:10 / 860,993 B / `F297BF1E6162AE7A`**，表 293 条 / `2cd513fc00ac2244`（219,372 B），分母 181 / 110 / 13 / 10 = 314，四档 **311 / 0 / 3**。

- **医院页按医生合并成卡**：一位医生一张 `section.tc-doctor-card`，回龙观 15 张 = 12 位有名医生 + 3 条无医生名的发言（无名不再合并、各自成卡）；卡内 `article.tc-report` 仍是一条发言（24 条），所以「行 N = 详情 N = `.tc-report` 数」不变。
- **卡身固定三行**：医生名 + 病症标签、`p.tc-doctor-card-dept`、`p.tc-doctor-card-note`；后两行单行、超出省略（实测 15px / 行高 22.5px、`nowrap` + `ellipsis`、`scrollWidth == clientWidth`），空值灰字「无」。**卡内不再有原文、评价、来源与展开控件**——`.tc-report` / `.tc-quote` / `.tc-evidence-source` / `.tc-quote-toggle` 在医院页计数必须为 0。
- **原文折叠只在医生页判**：新增三条 1440 —— `v3.doctor-quote-clamp-1440`（`.is-clamped` 的 `-webkit-line-clamp: 2`）、`v3.doctor-quote-clamp-height-1440`（`.is-clamped` 高 50.5–54.5）、`v3.doctor-quote-clamp-has-toggle-1440`（`.tc-evidence:has(.tc-quote.is-clamped) .tc-quote-toggle` 存在）。**高度必须挂在 `.is-clamped` 上**：潘伟刚原文节里第一节未封顶（15 行、367.5），第二节才是折叠态（52.5）。
- **退役**：`v3.quote-type`、`v3.source-type`、`v3.source-icon`、`v3.quote-clamp-two-lines-1440`（医院页对象消失）；`doctor.profile-only-with-record`、`v3.doctor-rating`、`doctor.rating-empty`、`v3.doctor-eval-section-last-1440`、`v3.doctor-eval-absent-echo-1440` 等前几轮已在退役表。
- **改指两条**：`copy.lead-quote-before-source`、`order.lead-source-not-first` 的样本 马弘 → **潘伟刚**（回龙观第一位；马弘在北大六院海淀，前置点不到），选择器不动、不带 `skipIfMissing`——点不到就必须红。
- **卡头字号**：`type.lead-doctor` 桌面 17px / 650（卡身改版放大），手机 16px 无对应断言。
- **医生页顺序**：`head → 医生线索列表 → 元信息（门诊 / 所在医院 / 备注）→ 评价节 → 线索原文节`；末节是原文（`v3.doctor-leads-section-last-1440`），评价节是倒数第二节（`v3.doctor-eval-section-before-leads-1440`）。
- **踩过的坑**：`v3.d-doctor-leads-match-labels-1440` 的前置还在等医院页 `.tc-report`（改版后没有），改成等 `.tc-doctor-card` 再点医生链接；`v3.quote-clamp-two-lines-1440` 的退役登记漏过一次，表里还在跑、首轮 1440 报 2 红，补齐后复跑全绿。**改表后先单跑改动的那几条，再跑整档**，比整档跑完再查快得多。
- **`mobileSelector` 现在也管断言评估**：以前只有前置动作按视口换选择器，`type.input` 这类检查在手机上测的仍是桌面那支（元素 hidden，量到了也没意义）。现在窄屏（<1000）先把 `selector` 换成 `mobileSelector` 再进页面求值，所有检查类型一并生效。`type.input` 已补 `mobileSelector: ".sfield input"`，写在基线 `base185.json`，下次重生成进表，本轮已交付快照不动。
  验证办法（不碰快照）：造一条 `selector` 故意写成不存在元素、`mobileSelector` 写真实手机元素的检查——390 通过、1440 报「选择器没有可见元素」，即证明分流只在窄屏发生。


## 为什么要快照

CI 跑在 GitHub 的机器上，拿不到本机的 skill 目录，也拿不到被忽略的 `docs/`。断言又必须在合并前跑，所以把当前版本拷进仓库，工作流直接跑这份。

## 什么时候要重做快照

设计侧改了断言文件或 `spec.cjs` 之后。步骤：

1. 拷回两个文件（覆盖同名文件）：

   ```powershell
   Copy-Item "$env:USERPROFILE\.dsh\skills\design-audit\scripts\spec.cjs" tools\a11y\spec.cjs -Force
   Copy-Item "docs\departments\designer\assertions\ui-spec.traumacompass.json" tools\a11y\ui-spec.json -Force
   ```

2. 把两个文件统一成 LF（原件这一版已是 LF 与快照一致；换行不同 sha 就对不上）：

   ```powershell
   node -e "const fs=require('fs');for(const p of ['tools/a11y/spec.cjs','tools/a11y/ui-spec.json']){fs.writeFileSync(p,fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n'))}"
   ```

3. 重新算 sha256 前 16 位，更新本文件表格里两行：

   ```powershell
   node -e "const c=require('crypto'),fs=require('fs');for(const p of ['tools/a11y/spec.cjs','tools/a11y/ui-spec.json']){const b=fs.readFileSync(p);console.log(p,b.length,c.createHash('sha256').update(b).digest('hex').slice(0,16))}"
   ```

4. 本地跑一遍（见下），数字对得上再提交。

工作流会把两个 sha256 打进 job summary，方便和这里核对；对不上说明快照旧了。

## 本地怎么跑

```powershell
npm run build
node scripts/preview.ts --port 4177
# 另一个终端
$env:NODE_PATH="$PWD\.ci\node_modules"
node tools/a11y/spec.cjs http://127.0.0.1:4177/ tools/a11y/ui-spec.json --viewports 1440x900 --out reports/a11y --name local-1440
node tools/a11y/spec.cjs http://127.0.0.1:4177/ tools/a11y/ui-spec.json --viewports 390x844 --out reports/a11y --name local-390
node tools/a11y/spec.cjs http://127.0.0.1:4177/ tools/a11y/ui-spec.json --viewports 375x812 --out reports/a11y --name local-375
node tools/a11y/spec.cjs http://127.0.0.1:4177/ tools/a11y/ui-spec.json --viewports 320x568 --out reports/a11y --name local-320
```

`playwright` 装在 `.ci/node_modules`（工作流里同样这么做，不污染根 `package.json`），首次需要 `npm i --no-save --prefix .ci playwright@1.63.0` 和 `.ci/node_modules/.bin/playwright install chromium`。

## 用 clickat 点地图

`clickat` 是前置动作里唯一能点地图的方式：高德只认真实指针序列，`clickjs` 或 `el.click()` 派发的合成 click 它不接。

```json
{ "action": "clickat", "x": 200, "y": 70, "expect": ".tc-mapapp-canvas" }
{ "action": "clickat", "selector": ".tc-mapapp-canvas", "dx": 195, "dy": 200, "expect": ".tc-mapapp-canvas" }
```

- 绝对坐标适合写死取景；`selector + dx/dy` 从元素 rect 推，换视口不用改数。
- `expect` 先校验这一点上确实是它（`elementFromPoint` 命中或 `closest`），落在图钉、底卡、版权条上的「空白点」会当场报失败并附命中链，不会静默点下去再给结论。
- 点完等 `afterMs`，缺省 350ms：底卡收档是 340ms 的 height 过渡，立刻量会量到收档前的 736。
- 依赖地图的用例在 `clickat` 前加一条 `{ "action": "wait", "selector": ".amap-layers", "envGate": "amap" }`：CI 里没有高德运行时，这条等不到就把整组记不适用，而不是「点了没反应」判红。

## 桌面侧栏把手（1440）

16 条，全部 `at: 1440`，id 前缀 `v3.sidebar-resize-`。把手是 `.tc-sidebar` 的直接子元素：`div.tc-sidebar-resize`，`role="separator"`、`aria-orientation="vertical"`、`aria-label="调整侧栏宽度"`、`tabindex="0"`，`aria-valuenow/min/max` 随宽度实时同步（初值 380 / 280 / 520）。

几条容易写错的地方：

- **Tab 顺序用 `tabOrder` 判**，不是「按到出现为止」。全序列实测：画布 → 收起侧栏 → 搜索 → 关于 → **把手（第 5）** → 品牌 → 页签 → 病症 → 省行。Kiwi 的脚本去重把序列提前截断，一度误报「把手排在省行之后」，重跑全序列才确认。
- **每个键位拆两条**：一条判 `.tc-sidebar` 的实际盒子宽（`End` 518–522、`Home` 278–282、`Enter` 378–382），一条判 `aria-valuenow`。只判 aria 会漏掉「值和盒子不同步」这种真 bug。`Enter` 那组前置是 `Home → End → Enter`，验的是「从 520 回 380」，原地不动骗不过去。
- **持久化必须真刷新**：`Home → 11 次 →`（456）→ `reload` → 判盒子 454–458 与 aria 456，再判顶栏 `transform` 是 `translateX(456px)`、`.tc-sidebar` 右缘到 `.tc-mapapp-topbar` 左缘 ≥20px。`localStorage` 键是 `tc.sidebar.width`，存纯数字字符串。
- **容器横向溢出用 `scrollFit`**：`.tc-sidebar-body` 在 280 与 520 各一条，实测 279/279、519/519。

## 手机详情互跳保档与桌面筛选联动（2026-11-09 追加三条）

**手机（390，1 条）** `v3.m-detail-to-detail-keeps-stop`：从列表进医院（应停 424）→ 把手 `ArrowUp` 抬到 736 → 点 `.tc-doctor-link` 进医生 → 点 `.sheet .head-back .back-btn` 回医院，四次都量 `.sheet` 高度写进证据：424.0 → 736.0 → 736.0 → 736.0。中途那一档必须量，只判终点会漏掉「没抬起来、后面被别的路径凑到 736」的假绿。老行为由既有 `v3.m-hospital-medium`（列表直接进医院 = 424）继续守着，不重复。手机上可点的返回不是 `.tc-detail-back`（它在 `.tc-level-head` 里、手机是 0×0），是 `.sheet-head` 里的 `.back-btn`。

**桌面（1440，2 条）** `v3.d-filter-paints-provinces-1440` / `v3.d-filter-clear-restores-density-1440`：省面底色画在 canvas 的多边形上，DOM 里没有节点，所以走 `polygonPaint`——挂 `AMap.Polygon.prototype.setOptions`，按下开、关各收一轮上色参数，判完还原原型，两条都自带复位、不把选中态留给下一条。勾「cptsd」时命中省 142 次 `#087f7b / .26`、其余 187 次全部 ≤.05，头部同步「32 家医院 · 32 条线索」；取消勾选后 321 次回到密度着色（`#147a52` / `#4dbb83` / `#2f9e68` / `#7dd3a4` / `#b9e6c8` 五档）、近零透明只剩 8 个 0 报告省的白底、不留 `#087f7b / .26`。

**像素探针留档（不进分母）**：`.botharness/mobile-v3-accept/probe-map-highlight.mjs` 在 1440×900 上不拖不缩，`.amap-logo` 出现后等 2600ms 各截一张地图区（`networkidle` 被高德长连接卡住，用等选择器 + 固定等待等价替代）。diff 掩码里命中省均值 `rgb(174,207,207)`——比 `#087f7b` 26% 压白的理论值 191/222/221 略深，是瓦片底色透上来的结果，色相方向一致；未命中省 `rgb(237,241,239)` 明显更淡；改动像素占地图 9.85%，`pageerror` 0。结论：高亮确实画出来了，「命中更青、未命中更淡」在像素上成立。

## 手机筛选抽屉、夜间模式与拖拽（2026-11-09 追加）

**筛选抽屉（390，7 条）**：搜索行改成 `.chipbtn`（48×44、`role=button`、`aria-expanded`）+ `.chipdrawer`，三个病症标签搬进抽屉、默认收起。`v3.m-filter-btn-390` 判按钮盒子、`-filter-btn-collapsed-390` / `-filter-btn-expanded-390` 判 `aria-expanded` 翻转、`v3.m-filter-default-closed` 判抽屉 `gridTemplateRows = "0px"`、`v3.m-filter-open` 判展开后抽屉高 40–52、`v3.m-filter-badge` / `v3.m-filter-badge-label` 判勾选并收起后的角标 `1` 与 `aria-label = "筛选，已选 1 项"`。

抽屉里的标签**不能按 rect 判可见**：收起时 `grid-template-rows:0fr` + `overflow:hidden`，`getBoundingClientRect()` 仍是 48×34 非零，数宽高会数出 3 个。收起态判 `getComputedStyle(.chipdrawer).gridTemplateRows`，展开态才判高度；`v3.m-chips-visible` 因此改成「先点 `.chipbtn`、等 300ms，再数抽屉里的 `.tc-disorder-chip`」。

**Tab 序（A23）**：`.grab → 搜索框 → .chipbtn → 正文首行`，收起态抽屉里的标签不得占 Tab 位（第一版实测占 3 位，焦点落在被裁掉的区域、屏幕没有反馈，已让小镜改成 `visibility:hidden` + `transition: visibility 0s 200ms`）。A23 的高度判据同时放宽到 424–742：聚焦正文会直接抬到 large 736，只认 medium 424 会把正确行为判红。

**夜间模式（14 条）**：桌面与 390 各 7 条 —— `v3.theme-toggle-{1440,390}` 判盒子（桌面 48×48、手机 44×44，手机与「关于」「回全国」并成一列、三块同宽 44）、`-icon-{vp}` 判 `.theme-toggle svg` 存在、`-initial-{vp}` 判 `aria-pressed=false`、`-dark-{vp}` 判 `html[data-theme]=dark`、`-pressed-{vp}` 判 `aria-pressed=true`、`-persist-{vp}` 刷新后仍 dark、`-back-{vp}` 连点两次回 light。颜色不进断言（门 2 截图把关），只判图标在不在——常态无底无边，图标丢了 `aria-pressed` 仍然是对的。`persist` / `back` 的前置首位都有 `reload`，起点先被清成浅色，否则排在 `-dark` 之后跑会假红（踩过）。三块按钮的圆角是 Kiwi 的一次性视觉修补，按他的口径不写断言。

**拖拽（2 条卡片 + 4 条地图）**：`v3.m-sheet-drag-up-390` 从 peek 154 拖 400px 到 730–742（拖 216px 只会吸附到 medium 424，是比例吸附、不是缺陷）、`-drag-down-390` 先到 736 再拖回 148–162；`v3.{m,d}-map-drag-{lat,lng}-*` 用 `mapPan` 判地图中心确实移了（手机纵向、桌面横纵各一条，阈值 3）。

**图钉被控件压住（写法，不是缺陷）**：390 进山东后聚合钉中心正落在「关于」按钮上，Playwright 报 `.tc-about-icon` 拦截。控件压在钉之上是刻意的，不改图层顺序；7 处点击改成 `clickat` + `selector:.tc-cluster-pin` + `dx:8 / dy:20`，点可见的左半。

**金样偏差（门 2，09:41:38 定稿）**：共 **4 张授权偏差，其余 13 张几何一致**（17 张里含这张的 320 档）。

- **m01 / m04 / m10，medium 档 y 差 −46**：筛选标签收进抽屉后，抽屉那一行 46px 消失，peek 从 200 降到 154。m02（peek 档本来没有那一行）与 m03（点开抽屉后 46px 回来）一致，正好反证是同一行而不是三处回归。
- **n02-doctor-320，y 差 −8**：「所在医院」行由两行变一行（66 → 49），居中的 chevron 跟着上移半个差；x 与宽逐值不变。值 span 的 `scrollWidth == clientWidth`、行数 1，长名在两行时仍完整换行，不截断。同一行在 375 / 390 / 1440 也都是单行 49px，320 只是追上了更宽档位。

Kiwi 2026-11-09 裁定：**放行这四张、不重拍**——金样是设计基线，重拍等于把基线改成实现的样子。交回表与 PR 正文按这个名单写。

## 覆盖边界

CI 跑 1440×900、390×844、375×812、320×568 四档（`.github/workflows/a11y.yml`）。窄屏两档是 2026-11-06 补的：此前只有两档，`at:375` / `at:320` 的断言一次都没执行过。

CI 的机器上起不来高德地图：没有渲染运行时，标记（`.tc-map-node`）、比例尺控件、聚合这些依赖地图的部分根本不会进 DOM。所以：

- 依赖地图的断言写成 `skipIfMissing`，CI 里记**不适用**，本地或有地图运行时的环境里照常验。`desktop.scale-present`、`a11y.marker-tabindex-1440/390`、`a11y.mapclick-*` 属于这一类。
- 如果断言靠一段前置先进入状态（例如先 `wait .tc-map-node` 再查标记），前置在 CI 里会超时失败，`skipIfMissing` 管不到前置。这类前置步骤单独声明环境门 `envGate`（写能力名，如 `"envGate": "amap"`），只有声明了的步骤超时才把整组记成不适用；没声明的照旧判红，避免把真坏了也吞成不适用。
- 不依赖地图的部分（布局、排版、焦点、键盘、底卡语义）在 CI 里是真验的，绿就是绿。
- 「不适用」不等于验过。读 A11y 结果时把三态分开看：通过 / 失败 / 不适用。地图相关的绿点只能来自本地或人工线上核对。
- `force: true` 仍然受视口约束——元素在视口外照样点不到。想测「过渡还在跑的时候点关闭」只能用 `clickjs`，它在页面里直接派发点击，不等稳定、不看视口。用 `force` 以为在测动画中间，实际测到的是动画结束之后。
- 有一类绿是空的：`count ... expect 0`（例如「没有任何标记带 `tabindex="0"`」）在标记整批不存在时也会通过，因为它数的是 0 个。它只能和旁边那条「标记存在且 `tabindex=-1`」一起读——旁边那条在 CI 里是不适用，就能看出这组没验到。别单独把这行绿当结论。
- `mustNotExist` 判的是**选择器在 DOM 里查不到**，不是「看不见」。要证明一个元素「已经不渲染了」，用它；要证明「渲染了但被 CSS 藏了」（例如手机上隐藏、只留桌面的按钮），用 `computed` 判 `display: none`。两者混用只会得一种结果：拿 `mustNotExist` 判 CSS 隐藏会永远红，拿 `computed display:none` 判「不该存在」则可能在元素根本不该出现时悄悄变绿。

这不只是断言写法问题，也是这套 CI 能承诺的范围：它保证 CSS、布局、键盘不回归，不保证地图运行时正常。

## 注意事项

- 这套检查**不进 required**：它依赖浏览器时序，flake 会卡住所有人的 PR；等连续 20 次运行不抖，再由仓库管理侧决定是否提为必需。
- 报告 JSON 里 `ok: false` 时进程退出码非 0，工作流会红；这是预期行为，红了看 `reports/a11y` 里的 `spec-report.json`。
- 不要用 `file://` 打开 `out/index.html` 跑断言：静态导出依赖相对路径与本地服务，直接开文件会拿到另一套结果。

## 第五轮：筛选一致性、等待窗与拖拽距离（260 条）

小雨报「开了病症筛选进医院详情，里面仍是全部线索」。复现（1440、cptsd、北京 → 回龙观）：修前详情 4 条线索、12 个医生链接，行上写的是「1 条线索」——列表层筛了、详情层没筛；根因是 `MapApp.tsx` 的 `selectedLeads` 取全量、不与 `selectedDisorders` 求交。修后详情 1 条、5 个医生。这一轮把「同一屏里两处说法必须一致」写成断言，同时把上一轮记下的两处一次性抖动一次打包收紧，避免「先跑一版、再改表、再跑一版」。

**新增 2 条（1440）**
- `v3.d-hospital-leads-match-row-1440`：先勾一个病症、进省、点医院行，用 `remember` 记下行上「N 条线索」；详情标题的 N 必须等于它。数字比较，不比整句文案（行里有省市、地址，详情里没有）。
- `v3.d-doctor-leads-match-labels-1440`：医生详情标题条数必须等于「关联病症」里所选病症那一项的条数（那一项取自同一份未筛选线索，所以是真不变量）。

**已被撤销的一条**：`v3.d-hospital-filter-note-1440` 原判「标题下必须有『另有 N 条线索与所选病症无关』」。小雨否掉了那行说明（原话「谁让你加这种无用文本的」），Kiwi 定「只删说明行、保留收窄」，所以断言撤掉、不改成反向用例。教训写在规则里：`UI_SPEC.md` 第 3 节「筛选态同集合」——筛选靠数字自证，不另加解释句；以后写「某元素必须存在」的用例，先确认这行文案是产品要的，再落表。

**runner 能力：** 新增 `numberEquals`——两边各抽一个数再比。对照可以是前置 `remember` 记下的文本（`from`），也可以是页面上另一个元素（`expectSelector`，配 `expectMatch` 按文字挑条目、`expectPattern` 单独抽数）。写这条不是为了给某一条特判：凡是「两处同类数据必须一致」都能用。

**等待窗（判据未动，只改窗口）**
- `v3.m-hospital-can-peek` 的 `key ArrowDown`、`a11y.escape-province-peek` 的 `key Escape`：`afterMs 450 → 700`；`v3.m-detail-to-detail-keeps-stop` 的 `key ArrowUp`：`500 → 700`。入场动画 340ms，原来 450/500 只留 110/160ms 余量，整轮里偶发量到「还没抬上去」的 424。旧条目一点没删，就是要后面对得上「为什么放宽」。
- `v3.m-sheet-drag-down-390`：下拖 400 → **600px**。400 正卡在「速度项能到 736、纯位移只到 424」两段吸附的缝里，会随采样节奏在 154/424 之间跳；600px 是纯位移就够的距离，三轮复跑全同。

- `v3.m-sheet-drag-up-390`：上拖 400 → **600px**（2026-11-10，Kiwi 定）。这条要证明的是「向上拖到底卡应该落到 large」，而 154 + 400 = 554 恰好落在 424 与 736 中间，落点由合成事件的帧间隔决定——runner 里同一条单独跑 3 次是 1 过 2 红，我用与 runner 完全相同的浏览器设置（`chromium.launch()`、`deviceScaleFactor: 1`、无 touch）另写探针跑 400px 是 15/15 全 736，说明这是判具的抖、不是界面行为；改 600px 后纯位移就过 large 阈值，runner 里 4/4 通过。「必须落到 736」一个字没松。

## 两处已知的读数抖动（不改判据，下一轮再收紧）

- `v3.m-sheet-drag-down-390`：在 09:17:50 的整轮里读到 `424`（要求 148–162），同一构建单独重跑一轮就绿。用 runner 相同参数（24 步、每步 16ms、`afterMs` 800）连跑三轮是 154 → 736 → 154，另跑 400 / 500 / 600px 下拖六次全是 154——动作本身没问题。缺口在起点档位取决于上一组残留，而 400px 正好落在「速度项能顶到 736 / 纯位移只到 424」两个吸附区间之间。两条拖拽现已都改成 600px：154 + 600 到顶、736 − 600 到底，纯位移就够（上拖那条 2026-11-10 落表，见上一条）。
- `a11y.escape-province-peek`：整轮里读到 `179.8`（要求 151–163），重跑是 157。直接复现该链路（点 `.grab` → 点「北京」→ Esc）采样：150ms 时 170.9，300ms 后稳定 157，所以 179.8 是过渡中的读数。下一轮把这条 `key` 的 `afterMs` 从 450 提到 700。
- 两条都只影响一次读数、不影响判据；本轮锚点与断言表已锁定，不改表，记录在此供下一轮落。

## 第十二轮（2026-11-10）：搜索排序、省行家数不变量与数据换轮

小雨报「搜『武汉』第一条是郑州的医院」：`lib/search.ts` 把线索原文也算命中，`MapApp.tsx` 又按数据顺序取前四，没有相关性排序。小镜按「名字 > 城市 > 科室/病症 > 只有原文提到」分层后，本轮加两条排序断言（1440 / 390 各一）：搜「武汉」时结果首条必须是本地医院。判据选「首行文本含『湖北』」——武汉的医院都在湖北，所以「省份是湖北」与「名称含武汉」在这份数据里同真，没必要为二选一去扩 runner。

同时数据换了轮（09:02:25）：姓名格不是医生的行撤了发布，全国从 127/326 变成 **127/318**，cptsd **34/86**、cptsd＋人格障碍 **110/259**，回龙观 21 条 / 12 张医生卡（筛 cptsd 13/5、加人格障碍 19/10）。写死的数字按这套换；回龙观那条只走 `numberEquals`（行 ↔ 详情），不写死。

**新增不变量**：Kiwi 定「医院收录与线索发布是两件事」，四川大学华西厦门医院唯一一条线索被撤后仍留在列表里、显示「0 条线索」，所以省行的「N 家」要等于该省医院行数（含 0 条线索的行）。为此给 runner 的 `numberEquals` 加了 `expectCountSelector`——右边取「可见元素个数」而不是抽文本里的数字：

```json
{"type":"numberEquals","selector":".tc-level-head--province .tc-level-meta","pattern":"(\\d+)\\s*家",
 "expectCountSelector":".tc-hospital-row"}
```

样本选福建（5 家，含 0 条线索那行）；实测「5 家医院 · 15 条线索」对「5」，两边都是 5。

四档（锚点 13:35:33，跑前跑后时间/字节/sha 一致）：1440 **183/0/0**、390 **110/0/1**、375 **12/0/1**、320 **9/0/1** = **314 通过 / 0 失败 / 3 不适用**（三处同为 `s5-disabled-opacity`）；分母 183 / 111 / 13 / 10 = 317。报告在 `a11y-reports/lock-133533-<视口>/`。搜索排序那条在 13:35:33 之前的构建上是红的（首条「郑州大学第一附属医院(东院区) 河南 · 线索 7 条」），换版后转绿——它确实咬住了排序缺陷，不是恒真。
