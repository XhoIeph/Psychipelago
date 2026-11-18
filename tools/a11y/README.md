# 界面断言

把「页面长什么样、键盘怎么走、哪些数字必须对得上」写成一张可执行的表，用 Chromium 逐条跑，输出 JSON 与 Markdown 报告。用于在改动界面或数据后，机械地确认没有碰坏已有行为。

## 文件

| 文件 | 作用 |
| --- | --- |
| `ui-spec.json` | 断言表。每条含 `id`、`type`、`desc`，按需带选择器、属性、期望值、视口与前置动作。 |
| `spec.cjs` | 执行器。读表、起浏览器、逐条跑，写 `spec-report.json` 与 `spec-report.md`。 |
| `na-budget.cjs` | 不适用（NA）条数闸。核对报告里每档的 NA 条数是否等于预期，不等就退非零。 |

## 本地运行

```sh
npm run build
npm run serve                 # 静态文件 + 高德安全代理，默认 4174
npx -y playwright@1.63.0 install chromium
node tools/a11y/spec.cjs http://127.0.0.1:4174/ tools/a11y/ui-spec.json \
  --viewports 1440x900,390x844 --name local --out a11y-reports
```

报告写在 `--out` 目录下。`--viewports` 只跑列出的档位；不传则跑全部四档：`1440x900`、`390x844`、`375x812`、`320x568`。

地图相关断言需要高德运行时。没有 key 时用 `--no-map`（或在环境里设 `A11Y_MAP_STATE=absent`），依赖地图的断言直接记不适用，而不是等超时：

```sh
node tools/a11y/spec.cjs http://127.0.0.1:4174/ tools/a11y/ui-spec.json --no-map --name local-nomap
```

## 断言类型

常用的几类：

| 类型 | 判什么 |
| --- | --- |
| `computed`、`cssProp`、`styleMatch` | 计算样式或指定属性的值 |
| `rect`、`layoutRel`、`scrollFit`、`textFits`、`noHScroll` | 尺寸、相对位置、溢出与截断 |
| `hasText`、`textEquals`、`forbidText`、`uniqueText` | 文本存在、相等、禁止出现、唯一 |
| `count`、`numberEquals`、`sumEquals` | 元素个数与必须相等/相加相等的数字 |
| `mustExist`、`mustNotExist`、`attr` | 元素存在性与属性值 |
| `tabOrder`、`focusOn`、`focusRing`、`focusRingCdp`、`focusBorder`、`focusNoColor` | Tab 顺序、焦点落点、焦点环 |
| `mapPan`、`polygonPaint` | 地图拖动与区域着色（依赖地图运行时） |
| `media`、`layerOrder`、`singleEntry` | 断点表现、层叠顺序、单一入口 |

前置动作支持 `wait`、`click`、`clickat`、`clickjs`、`focus`、`fill`、`key`、`reload`、`drag`、`expectfocus`、`assertrect`。`clickjs` 在页面内派发点击，用于动画进行中点的场景——`click` 即使带 `force` 也要等元素可点，量到的是动画结束之后。

## 三种「不适用」

把它们分开是有意的：把一个断言记成「没验到」和记成「验过了」，是两回事。

- `envGate`：这条依赖某个运行时能力（如 `amap`）。能力缺失时该条记不适用，note 写明缺什么。
- `skipIfMissing`：组件不在本页时跳过的层内断言，例如只在详情页出现的元素。
- `absentOk`：元素不存在本身就满足断言，例如「手机端不显示比例尺」。

前置动作失败默认判红，不会退化成不适用；只有那一步自己带 `envGate` 时才算不适用。这样省视图打不开仍然会红。

## 不适用预算

`na-budget.cjs` 按「地图状态 + 视口」卡条数，防止「本该跑的都变成不适用」被当成通过：

- `auto`（有地图运行时）：1440 = 0、390 = 1、375 = 1、320 = 1
- `absent`（无 key）：1440 = 12、390 = 14、375 = 1、320 = 1

地图状态取自报告里的 `mapState`。`present` 状态下除上述条数外，还要求 NA 只出现在白名单 id（当前只有 `s5-disabled-opacity`）。报告的档位数对不上、出现未知档位，同样算失败。

## CI

`.github/workflows/a11y.yml` 在 `pull_request` 上跑四档并行 job，另有每周一的无 key 演练。它是 advisory：结果写检查与产物，但不进必需检查，不拦发布。

## 约定

- 不写固定 sleep。等焦点、等元素一律轮询，上限 250ms。
- 断言写行为，不写毫秒。观测到的耗时是证据，不是判据。
- 手改 `ui-spec.json` 会让它和发布记录里的身份对不上；改完要重跑并把新的 sha、条数一起更新。
- 用 Node 读写这些 JSON。PowerShell 的 `Get-Content -Raw` 与 `Out-File -Encoding utf8` 会改编码或加 BOM，中文和 `JSON.parse` 都会坏。
- `reports.json`、`hospitals.json`、`locations.json` 这类生成物不要手改，改来源后重跑脚本。
