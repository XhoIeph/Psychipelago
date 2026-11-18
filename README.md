# 群岛Psychipelago

按地区、机构和来源浏览就诊线索，查看原文、出处与地图位置。使用 Next.js、React、高德 JS API 2.0 与 GSAP，构建为静态导出。


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

## 部署

推送 `main` 触发 `.github/workflows/deploy-pages.yml`，构建产物发布到 GitHub Pages，站点为 <https://traumacompass.us.ci>。

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

数据与地图另有 `test:data`、`test:geo`、`test:map-layout`、`test:map-wheel`、`test:amap`。提交规范见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可

代码与数据结构采用 [Apache-2.0](LICENSE)。引用保留原来源。
