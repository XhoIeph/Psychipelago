# TraumaCompass

按地区、机构和来源分类浏览就诊线索，查看原文、出处与地图位置。使用 Next.js、React、高德 JS API 2.0 和 GSAP，支持静态导出。

当前唯一线索来源为[《就诊地图10.25》](https://www.kdocs.cn/l/crOlzFWeu2GY)，保留原文与附注。来源分类不代表诊断结论，旧人工采集线索已退出当前数据。

## 本地运行

使用 **Node.js 24**。先按[开发与环境](docs/development.md#配置)配置 `.env.local` 中的高德 JS Key 与服务端安全密钥，再执行：

```sh
npm ci
npm run build
npm run serve
```

打开 <http://127.0.0.1:4174/>。项目预览服务同时提供高德安全代理；源码或数据更新后重新构建。

## 开发与贡献

- [贡献与提交规范](CONTRIBUTING.md)：改动范围、提交格式和验证要求。
- [开发与环境](docs/development.md)：配置、开发服务与部署。
- [来源更新流程](docs/collection-runbook.md) · [数据字典](docs/data-dictionary.md) · [证据规范](docs/evidence-standards.md)。
- [项目交接](HANDOFF.md)：当前进度与部门分工；更正或撤下见[处理流程](docs/takedown.md)。

`main` 推送会触发 GitHub Pages。当前高德候选已在本地验收；上线前还需配置独立安全代理及 Pages 构建变量，静态站点不运行代理服务。

## 许可

代码与数据结构采用 [Apache-2.0](LICENSE)。引用保留原来源。
