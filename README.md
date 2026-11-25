<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset=".github/assets/psychipelago-dark.png">
    <img src=".github/assets/psychipelago.png" width="520" alt="群岛 Psychipelago">
  </picture>
</p>
<h1 align="center">群岛Psychipelago</h1>
<p align="center">
  <a href="https://psychipelago.cn/">网站首页</a> ·
  <a href="https://psychipelago.cn/map/">就诊地图</a> ·
  <a href="https://psychipelago.cn/psy/">量表库</a>
</p>

**群岛 Psychipelago** 是一个公益性非营利组织。我们致力于为相关亲历者、系统/多意识体及人格障碍群体提供科普支持、资源连接与社群互助，陪伴更多人获取心理帮助与治疗，共同构建一隅安宁之岛。

> “万物皆有裂痕，那是光照进来的地方。”<br>
> — 莱昂纳德·科恩《颂歌》

## 本地预览

网站用 Next.js 和 React 构建，地图使用高德 JS API 2.0。安装 Node.js 24。要加载地图，在 `.env.local` 填写高德 Web 端 Key `NEXT_PUBLIC_AMAP_JS_KEY` 和本地代理使用的安全密钥 `AMAP_SECURITY_JS_CODE`，再构建。

```sh
git clone https://github.com/XhoIeph/Psychipelago.git
cd Psychipelago
npm ci
npm run build
npm run serve
```

打开 <http://127.0.0.1:4174/>。`npm run serve` 同时提供静态页面和高德代理。

## 反馈与贡献

纠正记录、补充线索或申请撤下内容时，请附上页面链接和涉及的条目。[选择反馈表单](https://github.com/XhoIeph/Psychipelago/issues/new/choose)

提交格式、检查命令和 Pages 发布流程见 [贡献指南](CONTRIBUTING.md)。

## 许可

代码采用 [AGPL-3.0](LICENSE)，项目以 [CC BY-NC-ND 4.0](LICENSE-CC-BY-NC-ND) 发布的内容转载时须保留署名和出处。第三方引文、素材与量表适用各自的权利条款。
