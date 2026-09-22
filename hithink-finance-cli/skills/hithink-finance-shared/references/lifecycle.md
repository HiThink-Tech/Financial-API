# 生命周期命令

## 命令

```bash
hithink-finance version --format json
hithink-finance doctor --format json
hithink-finance update --check --format json
hithink-finance update --format json
hithink-finance update --repair --format json
hithink-finance update --target-version <version> --format json
hithink-finance uninstall --plan --format json
```

## 参数选择策略

- `update --check` 只检查版本；确认后直接运行 `update` 更新到 npm latest。
- `update --target-version <version>` 安装指定版本，可用于升级或回滚；`update --repair` 仅重新安装当前版本。
- `--check`、`--repair` 与 `--target-version` 互斥，不要组合使用。
- 卸载先 `uninstall --plan`，真实清理按计划和用户确认执行。
- Skills、更新和卸载响应取消并具有执行时限；超时返回 `CLI_CHILD_TIMEOUT`，SIGINT/SIGTERM 的退出码为 130/143。
- 直接 `npm uninstall -g` 不可靠清理 Agent Skill 目录；需要先运行 `hithink-finance uninstall --yes` 或 `hithink-finance skills remove`。
- 诊断输出包括版本、配置路径、认证来源（不含密钥）、DuckDB、数据库文件、数据锁和包内 Skills manifest；不要把它当业务数据。

## 常见错误

- 普通命令可能在完成后向 stderr 输出更新提示；不要把它混入业务数据。
- 不要因为更新提示中断取数、翻页或导出流程；需要升级时先运行 `update --check`，获得用户确认后再运行 `update`。
- `update` 会同步查询 npm latest 并安装对应的精确版本；查询失败时可检查 npm registry，或改用 `--target-version <version>`。
- `--target-version` 只接受合法 SemVer 版本号；更新、回滚或修复后仍须用 `hithink-finance version --format json` 复核实际生效版本。
