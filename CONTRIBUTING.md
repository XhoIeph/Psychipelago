# 贡献与提交

小型文字修正可直接开 PR。涉及功能、数据来源或地图行为时，先在 Issue 或维护者已确认的任务中定好范围和负责人。

## 提交与 PR

提交标题用 `type(scope): 摘要`，`scope` 可省略。类型按改动选用 `feat`、`fix`、`data`、`docs`、`test`、`ci` 或 `chore`。每次提交完成一件事，同步带上相关测试、资源和文档。标题写清结果，必要时用简短正文说明原因或影响。

```text
feat(site): 新增首页并将就诊地图移到 /map
fix(psy): 刷新后恢复最近作答页
docs(readme): 精简开发与贡献入口
```

从最新 `main` 新建短名工作分支（如 `codex/home-redesign` 或 `docs/readme`），推送后向 `main` 开 PR。PR 用 `Summary`、`Files changed`、`Validation` 记录改动、验收和待处理项。`verify` 通过且发布负责人放行后合并，`main` 的更新会触发 Pages。

## 验证与发布

应用或数据改动运行 `npm run data:validate`、`npm run build`、`npm run typecheck`，再按改动运行对应回归。项目的检查入口见 [CI 工作流](.github/workflows/ci.yml) 和 [界面断言](tools/a11y/README.md)。量表改动运行 `node --test tests/psy-licensing.test.mjs tests/psy-scoring.test.mjs`。

[Pages 工作流](.github/workflows/deploy-pages.yml) 在域名根路径发布 `out/`。生产构建使用仓库 Secret `NEXT_PUBLIC_AMAP_JS_KEY` 和 Variable `NEXT_PUBLIC_AMAP_SERVICE_HOST`（以 `/_AMapService` 结尾的独立代理地址）。安全密钥由代理读取。

## 数据与隐私

就诊线索来自维护者持有的原始电子表格，定位使用高德。引文保留原文、公开出处和上下文，来源分类不代表确诊。原表名称、链接、逐格内容及已退役的线索留在本机。

提交前核对暂存差异及新文件引用。环境文件、凭据、登录态、原始采集、交接文档、验收产物、依赖和构建缓存留在本机。
