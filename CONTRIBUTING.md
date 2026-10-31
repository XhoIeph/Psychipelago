# 贡献与提交

涉及功能、来源或地图行为的修改，先通过 Issue 确定范围和负责人；小型文字修正可直接提交。

## 提交格式

使用 `type(scope): 摘要`，scope 可省略。摘要写实际变化，不用“更新代码”这类空泛描述。类型按改动选择：`feat` 新功能、`fix` 修复、`data` 数据、`docs` 文档、`test` 测试、`ci` 工作流、`chore` 仓库维护。

```text
fix(map): constrain dragging before drawing the camera
data(source): replace retired leads with the Kdocs source
docs(readme): shorten setup and contribution entry points
```

一次提交对应一个完整目的，包含必要的调用、测试与文档。正文记录原因、验证结果和实际缺口，区分本地提交、远端推送、CI 与部署。

工作分支使用 `codex/<任务短名>`。保存进度不等于发布；推送 `main` 会触发 Pages 部署，发布前需完成验收。

## 验证

应用或数据修改须通过 `npm run data:validate`、`npm run build`、`npm run typecheck`；来源、定位、地图变更分别运行 `npm run test:data`、`test:geo`、`test:map-layout`、`test:map-wheel`、`test:amap` 中的相关检查。

## 数据与隐私

唯一线索来源为[《就诊地图10.25》](https://www.kdocs.cn/l/crOlzFWeu2GY)。引文保留原文与上下文，分类不改写为确诊，不恢复退役采集的线索、截图与去标识记录。

提交前核对暂存差异，纳入被引用的新文件，排除 `.env.local`、凭据、登录态、`data/raw/`、`tmp/`、依赖与构建缓存。不擅自改写远端历史。

代码许可沿用 [Apache-2.0](LICENSE)，引文保留来源。
