# `hithink-finance data validate`

## 前置条件

- 按需读取[本域入口](../SKILL.md)与[共享规则](../../hithink-finance-shared/SKILL.md)，同会话已加载内容可复用。
- 首次执行或版本变化时用 `hithink-finance schema data.validate --format json` 确认参数，未说明的组合规则再看命令 `--help`。
- 质量检查会先应用普通迁移。严格只读研究须先确认目标文件存在，并用 data migrate 的默认计划确认 versions 为空。

## 命令

```bash
hithink-finance schema data.validate --format json
hithink-finance data validate --format json
```

## 参数选择策略

- 可用全局 `--db <path>` 指定库。

## 窗口与分页

- 本地命令按目标库执行；查询大结果使用 `db export` 或 `market panel --output`。

## 常见错误

- 退出码 0 且外层 ok=true 表示检查执行成功；质量通过还要求 data.ok=true。data.issues 非空时按 code/count 报告问题。
- 空库也可能质量通过；研究前另核对目标窗口、样本和行数。

## 批量操作说明

- 维护操作按目标库逐项执行，并检查每个结果。
- 确认目标路径与影响；不要从只读查询意图推断清理、迁移或修复授权。
