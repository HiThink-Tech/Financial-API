# `hithink-finance market panel`

## 前置条件

- 先读取本 skill 的 `SKILL.md` 和 `../hithink-finance-shared/SKILL.md`。
- 执行前用 `hithink-finance schema market.panel --format json` 确认当前参数契约。
- 本地命令通常需要可用 DuckDB 或本地数据目录。
- 需要本地库覆盖请求窗口；适合作为研究样本输入。

## 命令

```bash
hithink-finance schema market.panel --format json
hithink-finance market panel --start <date> --end <date> --output <path> --format json
```

## 参数选择策略

- 必填 `--start YYYY-MM-DD --end YYYY-MM-DD --output <path>`；默认 parquet。

## 窗口与分页

- 本地命令无远端分页；只有声明 `--output` 的命令可直接落盘；其他大结果改用导出命令。

## 常见错误

- 本地库不存在或 schema 不兼容时先运行 `data status` / `data migrate`。
- 日期必须是 `YYYY-MM-DD`；大面板永远落盘。

## 批量操作说明

- 批量或全量请求必须落盘，最终只报告路径、行数和窗口。
- 如果需要多标的循环，逐批执行并记录每批参数；不要把完整结果塞进上下文。
