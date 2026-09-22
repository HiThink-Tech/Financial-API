# `hithink-finance db export`

## 前置条件

- 按需读取[本域入口](../SKILL.md)与[共享规则](../../hithink-finance-shared/SKILL.md)，同会话已加载内容可复用。
- 首次执行或版本变化时用 `hithink-finance schema db.export --format json` 确认参数，未说明的组合规则再看命令 `--help`。
- 用于大结果或下游 pandas/notebook 消费。

## 命令

```bash
hithink-finance schema db.export --format json
hithink-finance db export --sql "<readonly sql>" --output <result.parquet> --file-format parquet --format json
```

## 参数选择策略

- 必填 `--sql <sql>` 和 `--output <path>`；`--file-format ndjson|csv|parquet`。

## 窗口与分页

- 本地命令按目标库执行；查询大结果使用 `db export` 或 `market panel --output`。

## 常见错误

- 导出后只汇报路径、格式、行数，不回显文件内容。

## 批量操作说明

- 批量或全量请求必须落盘，最终只报告路径、行数和窗口。
- 如果需要多标的循环，逐批执行并记录每批参数；不要把完整结果塞进上下文。
