# `hithink-finance data clean`

## 前置条件

- 按需读取[本域入口](../SKILL.md)与[共享规则](../../hithink-finance-shared/SKILL.md)，同会话已加载内容可复用。
- 首次执行或版本变化时用 `hithink-finance schema data.clean --format json` 确认参数，未说明的组合规则再看命令 `--help`。
- 只清理 CLI 管理的下载缓存，不删除数据库。

## 命令

```bash
hithink-finance schema data.clean --format json
hithink-finance data clean --format json
```

## 参数选择策略

- 当前实现清理 cache；仍使用 `--format json` 读取结果。

## 窗口与分页

- 本地命令按目标库执行；查询大结果使用 `db export` 或 `market panel --output`。

## 常见错误

- 不要把 cache 清理当作数据库删除。

## 批量操作说明

- 维护操作按目标库逐项执行，并检查每个结果。
- 确认目标路径与影响；不要从只读查询意图推断清理、迁移或修复授权。
