# `hithink-finance data migrate`

## 前置条件

- 按需读取[本域入口](../SKILL.md)与[共享规则](../../hithink-finance-shared/SKILL.md)，同会话已加载内容可复用。
- 首次执行或版本变化时用 `hithink-finance schema data.migrate --format json` 确认参数，未说明的组合规则再看命令 `--help`。
- 默认只输出迁移计划；应用迁移前让用户确认。

## 命令

```bash
hithink-finance schema data.migrate --format json
hithink-finance data migrate --format json
```

## 参数选择策略

- `--apply` 应用迁移；重型迁移需要 `--allow-heavy`。

## 窗口与分页

- 本地命令按目标库执行；查询大结果使用 `db export` 或 `market panel --output`。

## 常见错误

- 看到重型迁移提示时不要自动加 `--allow-heavy`。

## 批量操作说明

- 维护操作按目标库逐项执行，并检查每个结果。
- 确认目标路径与影响；不要从只读查询意图推断清理、迁移或修复授权。
