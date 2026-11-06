# a11y spec 快照（工具与断言）

这两个文件是**快照**，原件的权威副本不在本仓库：

| 文件 | 原件位置 | 快照 sha256（前 16 位） | 字节 |
| --- | --- | --- | --- |
| `spec.cjs` | `C:\Users\Lenovo\.dsh\skills\design-audit\scripts\spec.cjs` | `7892d4cacd7e374e` | 57716 |
| `ui-spec.json` | `docs/departments/designer/assertions/ui-spec.traumacompass.json`（`docs/` 被 `.gitignore` 排除） | `0b0fd2949c7e469a` | 121262 |

`ui-spec.json` 是从 `docs/` 原件的逐字节拷贝，只改名不改内容；`spec.cjs` 同样逐字节拷贝（skill 目录那份也已同步成这一版）。换行统一成 LF 后再算 sha 与字节数（工作流里打印的也是这个）；这一版原件与快照同为 LF，两个文件逐字节相同。快照这一版：**180 条断言**（其中 1 个 id `copy.no-verify-disclaimer` 重复，唯一 id 179 个；另有 28 条退役，见 `retired`），按视口生效 1440 = 110 条、390 = 75 条、375 = 20 条、320 = 14 条（`at` 与无 `at` 的并集，与 `spec.cjs` 的门控一致）。四档红数这一版不给：第 6 批还没交（A30/A33/A34 未动手），新写的 27 条 `filter.*` 在旧界面上必然红，跑出来的数不构成基线，等这批齐了整轮重跑。第 5.2 版（`5964fcb`）上先跑过一次确认这组能被 runner 执行：390 档 47 通过 / 22 失败 / 1 不适，失败全是前置 `wait .fcard` 超时（旧界面没有两张卡），不是规则写错。后来补的三条单病名边界和一条零病症边界共用两段前置：冒烟是 47 通过 / 27 失败 / 1 不适，27 条一样卡在 `wait .fcard`。

这一版的 A30/A35 断言（27 条，`at: 390`）按 HANDOFF 的终版判据与实测写，选择器约定：面板根 `.fpanel`、两张卡 `.fcard[data-kind="province"|"disorder"]`、卡面文字 `.fcard-label`、菜单 `.fmenu[data-kind=…]` + 展开态 `.open`、省菜单行 `.fmenu[data-kind="province"] li`（**35 行**：首行「全部省份」+ 34 个省级区划，geo 里无名字的要素已滤掉）、病症勾选 `.fmenu[data-kind="disorder"] [role="checkbox"]`（3 个）。高度用区间：面板 69±4（只露卡）/ 301±6（省菜单）/ 209±4（病症菜单）；开省菜单底卡抬到 736、开病症菜单留在 424。行为上：选省份后菜单收起，**勾病症菜单保持展开**（多选），多个病名按标签定义顺序用「、」连接 —— 卡面（`filter.label-joined-order`）与头部 meta 前缀（`filter.meta-joined-order`）各判一条，两处都按 `TAGS` 的定义顺序，防「卡面对、meta 反」。同一个拼接函数的两个边界也落进机器判：单病名时 `filter.meta-single-sep` 要求名字后面是空格加「·」、`filter.meta-single-no-joiner` 与 `filter.card-single-no-joiner` 要求 meta 和卡面都不许留顿号；只选省份时 `filter.meta-province-only` 要求 meta 里不出现省名（完全不带前缀）。A30 里还留在手工走查的两条：点同一省 / 点「全部省份」回全国、头部 meta 到底带不带病名前缀 —— 前者要串多层状态，后者要看整条 meta 的排布，写成机器判断容易假绿。

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
