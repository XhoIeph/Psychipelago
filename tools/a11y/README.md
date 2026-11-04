# a11y spec 快照（工具与断言）

这两个文件是**快照**，原件的权威副本不在本仓库：

| 文件 | 原件位置 | 快照 sha256（前 16 位） | 字节 |
| --- | --- | --- | --- |
| `spec.cjs` | `C:\Users\Lenovo\.dsh\skills\design-audit\scripts\spec.cjs` | `2d361fdb6c11be6e` | 55246 |
| `ui-spec.json` | `docs/departments/designer/assertions/ui-spec.traumacompass.json`（`docs/` 被 `.gitignore` 排除） | `5c478b32abf6848c` | 80647 |

`ui-spec.json` 是从 `docs/` 原件的逐字节拷贝，只改名不改内容；`spec.cjs` 同样逐字节拷贝。**唯一例外是换行**：原件是 CRLF，仓库里统一存 LF，所以 sha 与字节数按 LF 版本算（工作流里打印的也是这个）。快照这一版：149 条断言，按视口生效 1440 = 112 条、390 = 33 条（`at` 与 `all` 门控后）。本地两档 112 / 0 / 0 与 33 / 0 / 0。

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

2. 把两个文件统一成 LF（原件是 CRLF，不转的话 sha 对不上）：

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
```

`playwright` 装在 `.ci/node_modules`（工作流里同样这么做，不污染根 `package.json`），首次需要 `npm i --no-save --prefix .ci playwright@1.63.0` 和 `.ci/node_modules/.bin/playwright install chromium`。

## 覆盖边界

CI 的机器上起不来高德地图：没有渲染运行时，标记（`.tc-map-node`）、比例尺控件、聚合这些依赖地图的部分根本不会进 DOM。所以：

- 依赖地图的断言写成 `skipIfMissing`，CI 里记**不适用**，本地或有地图运行时的环境里照常验。`desktop.scale-present`、`a11y.marker-tabindex-1440/390` 属于这一类。
- 如果断言靠一段前置先进入状态（例如先 `wait .tc-map-node` 再查标记），前置在 CI 里会超时失败，`skipIfMissing` 管不到前置。这类前置步骤单独声明环境门 `envGate`（写能力名，如 `"envGate": "amap"`），只有声明了的步骤超时才把整组记成不适用；没声明的照旧判红，避免把真坏了也吞成不适用。
- 不依赖地图的部分（布局、排版、焦点、键盘、抽屉语义）在 CI 里是真验的，绿就是绿。
- 「不适用」不等于验过。读 A11y 结果时把三态分开看：通过 / 失败 / 不适用。地图相关的绿点只能来自本地或人工线上核对。
- `force: true` 仍然受视口约束——元素在视口外照样点不到。想测「过渡还在跑的时候点关闭」只能用 `clickjs`，它在页面里直接派发点击，不等稳定、不看视口。用 `force` 以为在测动画中间，实际测到的是动画结束之后。
- 有一类绿是空的：`count ... expect 0`（例如「没有任何标记带 `tabindex="0"`」）在标记整批不存在时也会通过，因为它数的是 0 个。它只能和旁边那条「标记存在且 `tabindex=-1`」一起读——旁边那条在 CI 里是不适用，就能看出这组没验到。别单独把这行绿当结论。

这不只是断言写法问题，也是这套 CI 能承诺的范围：它保证 CSS、布局、键盘不回归，不保证地图运行时正常。

## 注意事项

- 这套检查**不进 required**：它依赖浏览器时序，flake 会卡住所有人的 PR；等连续 20 次运行不抖，再由仓库管理侧决定是否提为必需。
- 报告 JSON 里 `ok: false` 时进程退出码非 0，工作流会红；这是预期行为，红了看 `reports/a11y` 里的 `spec-report.json`。
- 不要用 `file://` 打开 `out/index.html` 跑断言：静态导出依赖相对路径与本地服务，直接开文件会拿到另一套结果。
