# `hithink-finance data remove`

## 前置条件

- 先读取本 skill 的 `SKILL.md` 和 `../hithink-finance-shared/SKILL.md`。
- 执行前用 `hithink-finance schema data.remove --format json` 确认当前参数契约。
- 本地命令通常需要可用 DuckDB 或本地数据目录。
- 高风险操作；先运行 `--plan` 报告路径和大小。

## 命令

```bash
hithink-finance schema data.remove --format json
hithink-finance data remove --plan --format json
```

## 参数选择策略

- 真正删除需要全局 `--yes`；可用全局 `--db <path>` 指定目标。

## 窗口与分页

- 本地命令无远端分页；只有声明 `--output` 的命令可直接落盘；其他大结果改用导出命令。

## 常见错误

- 本地库不存在或 schema 不兼容时先运行 `data status` / `data migrate`。
- 没有用户明确确认时不要追加 `--yes`。

## 批量操作说明

- 批量或全量请求必须落盘，最终只报告路径、行数和窗口。
- 如果需要多标的循环，逐批执行并记录每批参数；不要把完整结果塞进上下文。
