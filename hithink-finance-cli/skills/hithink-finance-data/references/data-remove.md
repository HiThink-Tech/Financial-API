# `hithink-finance data remove`

## 前置条件

- 按需读取[本域入口](../SKILL.md)与[共享规则](../../hithink-finance-shared/SKILL.md)，同会话已加载内容可复用。
- 首次执行或版本变化时用 `hithink-finance schema data.remove --format json` 确认参数，未说明的组合规则再看命令 `--help`。
- 高风险操作；先运行 `--plan` 报告路径和大小。

## 命令

```bash
hithink-finance schema data.remove --format json
hithink-finance data remove --plan --format json
```

## 参数选择策略

- 真正删除需要全局 `--yes`；可用全局 `--db <path>` 指定目标。

## 窗口与分页

- 本地命令按目标库执行；查询大结果使用 `db export` 或 `market panel --output`。

## 常见错误

- 没有用户明确确认时不要追加 `--yes`。

## 批量操作说明

- 维护操作按目标库逐项执行，并检查每个结果。
- 确认目标路径与影响；不要从只读查询意图推断清理、迁移或修复授权。
