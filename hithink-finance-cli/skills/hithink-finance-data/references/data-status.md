# `hithink-finance data status`

## 前置条件

- 按需读取[本域入口](../SKILL.md)与[共享规则](../../hithink-finance-shared/SKILL.md)，同会话已加载内容可复用。
- 首次执行或版本变化时用 `hithink-finance schema data.status --format json` 确认参数，未说明的组合规则再看命令 `--help`。
- 查看库路径和 schema 版本；该命令可创建缺失数据库，严格只读任务须先用文件系统确认目标存在。

## 命令

```bash
hithink-finance schema data.status --format json
hithink-finance data status --format json
```

## 参数选择策略

- 可用全局 `--db <path>` 指定库。

## 窗口与分页

- 本地命令按目标库执行；查询大结果使用 `db export` 或 `market panel --output`。

## 常见错误

- schema 过新时升级 CLI；schema 过旧时看 `data migrate`。

## 批量操作说明

- 维护操作按目标库逐项执行，并检查每个结果。
- 确认目标路径与影响；不要从只读查询意图推断清理、迁移或修复授权。
