# 全局规则

## 前置条件

- 优先运行 `hithink-finance capabilities --format json` 获取当前 CLI 事实。
- 机器读取必须显式使用 `--format json`；需要表格给人看时才用 `table`。
- `--output <path>` 只在声明该参数的具体命令上使用；远端能力命令会把完整 JSON envelope 写入文件，本地 `db export` / `market panel` 会写数据文件。它不是全局参数。

## 输出契约

- 成功以进程退出码 0 和 `ok: true` 为准。
- 错误以非 0 退出码和 `ok: false` 为准；读取 `error.code`、`error.category`、`error.hint`。
- 需要诊断时使用 `--debug`；已脱敏的 request ID 与堆栈位于 `meta.diagnostics`，非预期内部错误的预填问题链接位于 `error.report_url`。
- HTTP 429/502/503/504 优先于响应体中的业务错误信封进行有界重试；耗尽后返回 `UPSTREAM_HTTP_<status>`。
- 不要按上游旧格式 `code == 0` 判断成功。

## 大结果纪律

- 全市场、分页、长区间、多 ticker 数据不得回显完整内容。
- 远端大结果用该命令自己的 `--output <path>`，stdout 只保留路径/count 摘要。
- 本地大结果用 `db export --output <path>` 或 `market panel --output <path>`。
- 最终回答只报告输出路径、行数、时间窗口、命令摘要和必要字段名。
- 下游需要数据时让 pandas/notebook/脚本读取落盘文件。
