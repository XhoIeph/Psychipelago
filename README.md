# 群岛Psychipelago

按地区、机构、病症与医生浏览就诊线索，查看原文、出处与地图位置。使用 Next.js、React、高德 JS API 2.0 与 GSAP，构建为静态导出，产物发布在 GitHub Pages。

站点：<https://traumacompass.us.ci>

## 能做什么

- 全国 → 省 → 医院 → 医生四级浏览，地图与列表联动；手机端用可拖拽的底部面板承载列表与详情。
- 线索卡片保留来源原文与上下文，不把「有反馈」改写成确诊。
- 病症、夜间模式、键盘与屏幕阅读器可用：抽屉有 dialog 语义，关闭后焦点回入口，地图标记不进 Tab 序。
- 界面断言表（`tools/a11y/`）把布局、文本与键盘行为写成可执行的检查，在 PR 上跑。

## 本地运行

使用 **Node.js 24**。在 `.env.local` 配置：

- `NEXT_PUBLIC_AMAP_JS_KEY`：高德 Web 端 JS API Key。
- `AMAP_SECURITY_JS_CODE`：JS API 安全密钥，仅由本地代理读取。
- `NEXT_PUBLIC_AMAP_SERVICE_HOST`：本地写 `http://127.0.0.1:4174/_AMapService`。

```sh
npm ci
npm run build
npm run serve
```

打开 <http://127.0.0.1:4174/>。`npm run serve` 同时提供静态文件与高德安全代理；源码或数据修改后重新构建。

## 数据

线索只有两个来源，逐行转写进 `data/evidence/`：

- 就诊地图电子表格（cptsd / osdd-did / 人格障碍 三张工作表）：`data/evidence/kdocs/<日期>/document.json`
- 高德定位返回：`data/evidence/locations/amap-<日期>.json`

`data/curated/` 里的 `hospitals.json`、`doctors.json`、`reports.json` 由上述证据加人工修订生成。人工修订放进 `data/overrides/<kind>/<id>.json`，一条记录一个文件。脚本逐条核对结果与依据，不能手改坐标、不能恢复已退役的机构。

```sh
npm run data:import     # 证据表 → curated
npm run data:build      # curated → data/generated/（省级聚合与定位索引）
npm run data:validate   # 校验 curated 与证据、人工修订是否一致
npm run data:stats      # 统计条数
```

## 部署

推送 `main` 触发 `.github/workflows/deploy-pages.yml`，先跑校验与测试，通过后再发布到 GitHub Pages。

生产构建需要两项仓库配置：

- secret `NEXT_PUBLIC_AMAP_JS_KEY`
- variable `NEXT_PUBLIC_AMAP_SERVICE_HOST`，值为 `https://amap.traumacompass.us.ci/_AMapService`

安全代理单独托管，Pages 只发布静态文件。`AMAP_SECURITY_JS_CODE` 与 `AMAP_WEB_SERVICE_KEY` 不进入构建。

## 校验

```sh
npm run data:validate
npm run build
npm run typecheck
```

数据与地图另有 `test:data`、`test:geo`、`test:map-layout`、`test:map-wheel`、`test:amap`。界面断言见 [tools/a11y/README.md](tools/a11y/README.md)。提交规范见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 目录

```text
app/          路由与页面
components/   界面组件（地图、侧栏、详情、筛选）
lib/          数据读取、地图运行时、格式化
data/         证据、人工修订、curated 与生成物
scripts/      导入、定位、聚合、校验
tests/        node:test 用例
tools/a11y/   界面断言表与执行器
```

## 许可

代码与数据结构采用 [Apache-2.0](LICENSE)。引用保留原来源。
