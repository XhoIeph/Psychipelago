# a11y spec 快照（工具与断言）

这两个文件是**快照**，原件的权威副本不在本仓库：

| 文件 | 原件位置 | 快照 sha256（前 16 位） | 字节 |
| --- | --- | --- | --- |
| `spec.cjs` | `C:\Users\Lenovo\.dsh\skills\design-audit\scripts\spec.cjs` | `7892d4cacd7e374e` | 57716 |
| `ui-spec.json` | `docs/departments/designer/assertions/ui-spec.traumacompass.json`（`docs/` 被 `.gitignore` 排除） | `7669370b09f75841` | 153906 |

`ui-spec.json` 是从 `docs/` 原件的逐字节拷贝，只改名不改内容；`spec.cjs` 同样逐字节拷贝（skill 目录那份也已同步成这一版）。换行统一成 LF 后再算 sha 与字节数（工作流里打印的也是这个）；这一版原件与快照同为 LF，两个文件逐字节相同。

**v3 版（2026-11-07，当前）**：**212 条断言**（其中 1 个 id `copy.no-verify-disclaimer` 重复，唯一 id 211 个；另有 98 条退役），按视口生效 1440 = 134 条、390 = 76 条、375 = 13 条、320 = 10 条。**2026-11-08 的「进详情抬起来」当晚被小雨撤回**（Kiwi 改判：医院/医生详情一律停 medium 424），所以 `v3.m-hospital-medium` 回到在跑状态、`v3.m-hospital-can-peek` 仍按一次 ↓（424 → peek），分流用的 `v3.m-hospital-large-from-list` / `v3.m-hospital-medium-from-pin` 已删除；本表因此与当晚冻结的 `7669370b` 逐字节相同。比参考跑（129+2 / 65+8 / 12+1 / 9+1）多的是：两条图钉前置守卫（`v3.pin-selected-guard` / `-390`，不带 `skipIfMissing`，前置跑不成就算失败而不是静默记不适用），以及四条「返回后焦点别丢」的断言 —— 手机两条判 `.sheet .head-title`（`v3.m-back-focus-title-390` / `-country-390`），桌面两条判被点的那一行（`v3.d-back-focus-row-1440` 判 `button.tc-hospital-row`、`v3.d-back-focus-row-country-1440` 判 `button.tc-province-row`）。落点按布局定：手机回退后列表整页重渲染、落标题才不会把人扔到某一行上；桌面是分栏、行还在列表里，落回触发行才能接着 Tab 往下看（Kiwi 2026-11-07 定的这条口径，见下面 1440 段）。这一版不能手改：由 `assertions/build-spec.cjs` 从 **基线 `11767be` 的 185 条**（kept 115，其中 23 条 repath）+ `v3-checks.cjs` 的 97 条生成，新增退役 71 条。重生成时先把基线取回来、不能带 BOM —— `git show 11767be:tools/a11y/ui-spec.json` 用 PowerShell 的 `Out-File -Encoding utf8` 会写出 BOM，`JSON.parse` 直接失败；用 node 落盘、归 LF 后再跑 `build-spec.cjs`，跑完把 docs 原件拷回本快照。**别用 PowerShell 的 `Get-Content -Raw` + `WriteAllText` 改这几个含中文的文件**：PS 会按 GBK 读入再写回，整份中文被写坏（2026-11-07 踩过一次，靠生成好的 spec 反推恢复，产物逐字节一致）；要改用 edit/write 工具或 node 脚本。

V3-02 那五条（选中钉橙色 / 光圈 / 标签 / 其余钉不压透明度 / 手机同款）的前置必须是「点省 → 点 `.tc-cluster-pin` 展开 → 点 `.tc-hospital-pin` → 等 `.tc-pin--selected`」。聚合钉的类名是 `tc-cluster-pin` 而不是 `tc-cluster`，写成 `.tc-map-node:not(.tc-cluster)` 会抓到聚合钉、点了只展开不选中，五条会一直「前置没跑成」。选中后 canvas 加 `tc-mapapp-canvas--pinned`、标签 `display:block`、其余钉 `opacity: 1`（`v3.css:17` 走 `--tc-nodes-opacity`）。

定稿构建（`out/index.html` 22:13:38，388707 B，含小镜的「返回后焦点落到标题」修复）的四档自检，spec `153906 B / sha256 前 16 7669370b09f75841`：1440×900 = **134 通过 / 0 失败 / 0 不适用**、390×844 = **75 / 0 / 1**（连跑三次都是这个数）、375×812 = **12 / 0 / 1**、320×568 = **9 / 0 / 1**；三处「不适用」都是 `s5-disabled-opacity`（`.tc-map-zoom button[disabled]` 本页没有该状态）。累计 230 通过 / 0 失败 / 3 不适用，分母 134+76+13+10 = 233 闭合。报告在 `.botharness/mobile-v3-accept/a11y-reports/`（`freeze-<视口>` 与 `stab390-<1..3>` 是冻结这版；`deskrow-<视口>`、`final2-<视口>`、`desk-focus-1440` 是前几版）。

这一版把 `a11y.mapclick-*` 六条链的时序固定下来，判据一字未动：点击前 `wait .amap-layers` 加 `settle: 900`（等相机与切片稳定，否则点击会落空、量到 736），`clickat` 加 `afterMs: 700`（底卡收档过渡 340ms，350ms 的默认等待正好卡在尾巴上，会量到 432 这种中间值）。独立复跑曾在这六条里出过 `432.2>428` 与 `736>428` 两种偶发——都是采样时机、不是实现不稳定，所以固的是等待、不是容差。

桌面这两条是改过判据的：第一版按手机口径写成「返回后焦点落上一层标题」`v3.d-back-focus-title-1440`，实测红——焦点落在被点的本院行（`button.tc-hospital-row`，回省层是 `button.tc-province-row`），键盘与指针两条路径一致，没掉 `document.body`、行在视口内、有 2px `--tc-text` 环。Kiwi 2026-11-07 定：桌面按布局用「落回触发行」的口径，手机保持「落标题」，两处共同目标只是「位置别丢」。所以现在是 `v3.d-back-focus-row-1440` 与 `v3.d-back-focus-row-country-1440` 两条，实测全 pass；焦点环与视口内的读数在 `.botharness/mobile-v3-accept/probe-desk-focus.json` 与 `probe-desk-focus-kbd.json`（`focusOn` 一次只判一个 `document.activeElement`，环和矩形是手工量的，没进机器判）。

**所有图钉链的第一步都是 `wait .amap-layers` + `envGate:"amap"`**：冷启动时高德运行时还没起来就点省行，会点在空地图上、随后 `wait .tc-map-node` 超时，四条桌面图钉断言会假红（九条可怜 2026-11-07 独立复跑时遇到，重跑即消失）；先等运行时再点就稳定。手机两条图钉链还要走「山东」而不是「北京」：390 下北京两家医院没超出合并半径，点一次聚合只从 1 枚变 2 枚聚合钉、出不来单钉（小镜复现，`probe-pin-beijing.mjs` / `probe-pin-mobile.mjs` 留在 `.botharness/mobile-v3-accept/`）；桌面 1440 用北京仍正常。`desktop.scale-present` 也吃过一次采样竞态：全量跑时偶发读到「没有该组件」被记不适用（单跑 5/5 通过、bisect 里 N=5 与 N=30 过、N=15 不过），根因是高德把比例尺挂在 `.amap-controls` 里、比 `.amap-layers` 晚一步进 DOM，而 runner 导航后只等 1800ms；现给它加前置 `wait .tc-mapapp-canvas .amap-logo`（`envGate:"amap"`，logo 与控件层同时挂载且有真实盒子）+ `afterMs: 400`，判据仍是 rect ≥40×10 没改。注意不能等 `.amap-controls`：它是有尺寸子元素的零尺寸容器，Playwright 的 `visible` 永远等不到。此前 19:00 那版 390 = 67 / 5 / 1，五条全卡在一个已修掉的生产包崩溃上：搜索框输入第一个字符整页变 Next 错误页，`ReferenceError: Cannot access 'tn' before initialization` —— `components/map/MapApp.tsx` 的搜索 `useMemo` 当时调用了组件体内的 `provinceShortName`（现改为模块级、四处调用显式传 `props.provinces`）。

**上一版（第 6 批，`5d13382` 上的 185 条）**留档：唯一 id 184 个、退役 28 条，按视口生效 1440 = 110、390 = 75、375 = 15、320 = 9；四档实测 **1440×900 = 110 / 0 / 0**、**390×844 = 74 / 0 / 1**、375×812 = 14 / 0 / 1、320×568 = 8 / 0 / 1（三档「不适用」都是 `s5-disabled-opacity`）。报告在 `.botharness/mobile-v3-accept/a11y-reports/`（`cta-390` 与 `cta-1440` 是这版 spec 的 390/1440 两档，`b6-narrow2` 含 375 与 320）。Kiwi 追加的 390 正向隐藏断言 `mobile.cta-hidden-390` 也在这一版里：手机详情里 `.tc-hospital-actions`（「在地图上定位」容器）在 DOM 但 `display: none`，判 display 而不是只看 Tab 序列。

第 6 批把省列表从 `.sheet-body` 挪进筛选菜单、全国层直接列医院行，所以这一版顺手改了入口相关的前置：手机端进省走「搜索框 → 筛选钮 → 省份卡 → 菜单里点省名」，进医院详情走「保险起见先抬卡到 medium，再点全国列表的医院行」（peek 档 `.sheet-body` 只有 24px 且在视口外，行根本点不到）。原来两个视口共用一条的四条文案/尺寸断言（`copy.no-disease-count`、`copy.no-scope-explainer`、`copy.no-unsourced-service`、`s5-row-highlight-hospital`）拆成 `at:1440` 原样加 `at:390` 手机版；`type.button` 只留桌面 —— 手机端机构详情里这个 CTA 是渲染的但盒子 0×0，没有可量的东西。省菜单的滚动节点是里层 `ul`（外框 `.fmenu` 是 `overflow: visible`，判外框会永远绿），`filter.provmenu-scrolls` 与 `filter.dismenu-no-scroll` 都落在 `ul` 上。375 的 `size-row-375` 也随之改判菜单行。

这一版的 A30/A35 断言（27 条，`at: 390`）按 HANDOFF 的终版判据与实测写，选择器约定：面板根 `.fpanel`、两张卡 `.fcard[data-kind="province"|"disorder"]`、卡面文字 `.fcard-label`、菜单 `.fmenu[data-kind=…]` + 展开态 `.open`、省菜单行 `.fmenu[data-kind="province"] li`（**35 行**：首行「全部省份」+ 34 个省级区划，geo 里无名字的要素已滤掉）、病症勾选 `.fmenu[data-kind="disorder"] [role="checkbox"]`（3 个）。高度用区间：面板 69±4（只露卡）/ 301±6（省菜单）/ 209±4（病症菜单）；开省菜单底卡抬到 736、开病症菜单留在 424。行为上：选省份后菜单收起，**勾病症菜单保持展开**（多选），多个病名按标签定义顺序用「、」连接 —— 卡面（`filter.label-joined-order`）与头部 meta 前缀（`filter.meta-joined-order`）各判一条，两处都按 `TAGS` 的定义顺序，防「卡面对、meta 反」。同一个拼接函数的两个边界也落进机器判：单病名时 `filter.meta-single-sep` 要求名字后面是空格加「·」、`filter.meta-single-no-joiner` 与 `filter.card-single-no-joiner` 要求 meta 和卡面都不许留顿号；只选省份时 `filter.meta-province-only` 要求 meta 里不出现省名（完全不带前缀）。A30 里留在手工走查的两条——点同一省回全国、点「全部省份」回全国——已在第 6 批上手工走过：从省级 424 选同一省份落回 `is-country` 424、选「全部省份」同样回 `is-country` 424，头部 meta 无病症时不带前缀、勾一个病名时是「人格障碍 · N 家医院 · N 条线索」，都不带多余顿号。

这一版还清掉了最后 4 条 `at:999` 的断言（`s5-tab-min-height-999`、`s6-drawer-closed-999`、`s6-drawer-top-104`、`s6-drawer-width-999`）：v3 之后 ≤999px 不渲染 `.tc-sidebar`，而 999 宽度又不在矩阵里，它们从来不会执行。改成 1440 会变成拿桌面侧栏去判手机规则，等于把断言换成另一件事，所以退役并在 `retired.why` 里写明各自被哪条接住。

这一版把移动端抽屉换成非模态底卡（A1–A29），`.tc-mobile-browse` 相关 54 处逐条改过，逐条理由在 `spec-change-table.md`。`spec.cjs` 相对 skill 旧快照只多一个 `clickat` 前置动作（见下）。

其中 `mobile.scale-hidden` 带 `absentOk`：元素不存在时记 pass 并标 `absent`。它解决的是 CI runner 起不来 AMap、比例尺控件压根不进 DOM 的误报；配的正向是 `desktop.scale-present`（1440 档要求控件真渲染，带 `skipIfMissing`，CI 里记不适用）。所以 CI 的结果是「通过 / 失败 / 不适用」三态，不适用不等于验过。

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
