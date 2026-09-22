# `hithink-finance data init`

## 前置条件

- 按需读取[本域入口](../SKILL.md)与[共享规则](../../hithink-finance-shared/SKILL.md)，同会话已加载内容可复用。
- 首次执行或版本变化时用 `hithink-finance schema data.init --format json` 确认参数，未说明的组合规则再看命令 `--help`。
- 远端初始化需要 API Key，先按 shared 复用已有凭据来源；本地文件导入无需远端认证。
- 本地文件导入必须同时提供 `--kline` 和 `--events`。

## 命令

```bash
hithink-finance schema data.init --format json
hithink-finance data init --kline <kline.parquet> --events <events.parquet> --format json
```

## 参数选择策略

- `--kline <path>` 与 `--events <path>` 成对出现；可选 `--symbols <path>`。
- 省略本地文件时从远端 Market Dump 初始化，使用全局 `--profile` / `--api-key-stdin`。

## 窗口与分页

- 本地命令按目标库执行；查询大结果使用 `db export` 或 `market panel --output`。

## 常见错误

- 只给 `--kline` 或只给 `--events` 会失败；两者必须成对。

## 批量操作说明

- 维护操作按目标库逐项执行，并检查每个结果。
- 确认目标路径与影响；不要从只读查询意图推断清理、迁移或修复授权。
