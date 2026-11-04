# a11y spec 快照（工具与断言）

这两个文件是**快照**，原件的权威副本不在本仓库：

| 文件 | 原件位置 | 快照 sha256（前 16 位） | 字节 |
| --- | --- | --- | --- |
| `spec.cjs` | `C:\Users\Lenovo\.dsh\skills\design-audit\scripts\spec.cjs` | `df30b7293dcfbdcc` | 53570 |
| `ui-spec.json` | `docs/departments/designer/assertions/ui-spec.traumacompass.json`（`docs/` 被 `.gitignore` 排除） | `f14cbbc7ad3edd94` | 77561 |

`ui-spec.json` 是从 `docs/` 原件的逐字节拷贝，只改名不改内容；`spec.cjs` 同样逐字节拷贝。**唯一例外是换行**：原件是 CRLF，仓库里统一存 LF，所以 sha 与字节数按 LF 版本算（工作流里打印的也是这个）。快照这一版：145 条断言，按视口生效 1440 = 111 条、390 = 30 条（`at` 与 `all` 门控后）。

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

## 注意事项

- 这套检查**不进 required**：它依赖浏览器时序，flake 会卡住所有人的 PR；等连续 20 次运行不抖，再由仓库管理侧决定是否提为必需。
- 报告 JSON 里 `ok: false` 时进程退出码非 0，工作流会红；这是预期行为，红了看 `reports/a11y` 里的 `spec-report.json`。
- 不要用 `file://` 打开 `out/index.html` 跑断言：静态导出依赖相对路径与本地服务，直接开文件会拿到另一套结果。
