# `hithink-finance db query`

## 前置条件

- 按需读取[本域入口](../SKILL.md)与[共享规则](../../hithink-finance-shared/SKILL.md)，同会话已加载内容可复用。
- 首次执行或版本变化时用 `hithink-finance schema db.query --format json` 确认参数，未说明的组合规则再看命令 `--help`。
- 只读 SQL；小结果才可直接读取 JSON。

## 命令

```bash
hithink-finance schema db.query --format json
hithink-finance db query --sql "<readonly sql>" --format json
```

## 参数选择策略

- 必填 `--sql <sql>`；大结果改用 `db export`。

## 窗口与分页

- 本地命令按目标库执行；查询大结果使用 `db export` 或 `market panel --output`。

## 常见错误

- 不要执行写入、DDL、删除、外部函数或会改变状态的 SQL。

## 批量操作说明

- 批量或全量请求必须落盘，最终只报告路径、行数和窗口。
- 如果需要多标的循环，逐批执行并记录每批参数；不要把完整结果塞进上下文。
