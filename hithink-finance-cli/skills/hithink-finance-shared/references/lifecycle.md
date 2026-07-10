# 生命周期命令

## 命令

```bash
hithink-finance version --format json
hithink-finance doctor --format json
hithink-finance update --check --format json
hithink-finance update --repair --format json
hithink-finance uninstall --plan --format json
```

## 参数选择策略

- 先 `update --check`，只有用户确认修复/升级时再 `update --repair`。
- 卸载先 `uninstall --plan`，真实清理按计划和用户确认执行。
- 直接 `npm uninstall -g` 不可靠清理 Agent Skill 目录；需要先运行 `hithink-finance uninstall --yes` 或 `hithink-finance skills remove`。
- 诊断输出用于定位环境、路径、依赖和版本问题；不要把它当业务数据。

## 常见错误

- 普通命令可能在完成后向 stderr 输出更新提示；不要把它混入业务数据。
- 不要因为更新提示中断取数、翻页或导出流程；需要升级时先运行 `update --check`，获得用户确认后再 `update --repair`。
