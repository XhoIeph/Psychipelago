# 贡献与提交

涉及功能、来源或地图行为的修改，先通过 Issue 或部门交接确定范围和负责人；小型文字修正可直接提交。开发环境见[开发与环境](docs/development.md)，当前任务见[项目交接](HANDOFF.md)。

## 提交格式

使用 `type(scope): 摘要`，scope 可省略。摘要说明实际变化，不写“更新代码”等空泛描述。类型按改动选择：`feat` 新功能、`fix` 修复、`data` 数据、`docs` 文档、`test` 测试、`ci` 工作流、`chore` 仓库维护。

```text
fix(map): constrain dragging before drawing the camera
data(source): replace retired leads with the Kdocs source
docs(readme): shorten setup and contribution entry points
```

- 一次提交对应一个完整目的，包含必要的调用、测试与文档。耦合的来源迁移与地图适配可一起提交，不能为了拆分而制造不可用的中间版本。
- 正文记录重要原因、验证结果和实际缺口。区分本地提交、远端推送、CI 与部署。
- 工作分支使用 `codex/<任务短名>`。保存进度不等于发布；推送 `main` 会触发 Pages，须先由 Leader 验收候选与生产配置。
- 提交前逐项核对暂存差异，纳入必要的未跟踪依赖，保留其他会话工作。不提交 `.env.local`、凭据、登录态、`data/raw/`、`tmp/`、依赖与构建缓存，不擅自改写远端历史。

## 验证与数据

应用或数据修改须通过 `data:validate`、`build`、`typecheck`；来源、定位、地图变更分别运行 `test:data`、`test:geo`、`test:map-layout`、`test:map-wheel`、`test:amap` 中相关检查。地图还需检查实际画面、连续交互和当前数据量下的性能。复用同一候选的有效证据，纯文档修改检查事实、命令与链接即可。

唯一线索来源为[《就诊地图10.25》](https://www.kdocs.cn/l/crOlzFWeu2GY)。引文保留原文与上下文，分类不改写为确诊；不恢复退役线索。来源更正与撤下使用仓库 Issue 模板，具体要求见[证据规范](docs/evidence-standards.md)和[撤下流程](docs/takedown.md)。

提交说明列出改动、验证与未解决事项。代码许可沿用 [Apache-2.0](LICENSE)，引文保留来源。
