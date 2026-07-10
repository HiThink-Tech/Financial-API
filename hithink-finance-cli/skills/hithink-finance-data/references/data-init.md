# `hithink-finance data init`

## 前置条件

- 先读取本 skill 的 `SKILL.md` 和 `../hithink-finance-shared/SKILL.md`。
- 执行前用 `hithink-finance schema data.init --format json` 确认当前参数契约。
- 本地命令通常需要可用 DuckDB 或本地数据目录。
- 远端初始化需要 API Key；执行前先运行 `hithink-finance auth status --format json`，未登录时到 https://fuyao.aicubes.cn/admin 获取 API Key 并运行 `hithink-finance auth login`。
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

- 本地命令无远端分页；只有声明 `--output` 的命令可直接落盘；其他大结果改用导出命令。

## 常见错误

- 本地库不存在或 schema 不兼容时先运行 `data status` / `data migrate`。
- 只给 `--kline` 或只给 `--events` 会失败；两者必须成对。

## 批量操作说明

- 批量或全量请求必须落盘，最终只报告路径、行数和窗口。
- 如果需要多标的循环，逐批执行并记录每批参数；不要把完整结果塞进上下文。
