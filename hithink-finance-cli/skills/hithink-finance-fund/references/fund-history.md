# `hithink-finance fund history`

## 前置条件

- 先读取本 skill 的 `SKILL.md` 和 `../hithink-finance-shared/SKILL.md`。
- 执行前用 `hithink-finance schema fund.history --format json` 确认当前参数契约。
- 远端命令需要 API Key；认证失败时回到 shared skill。

## 命令

```bash
hithink-finance schema fund.history --format json
hithink-finance fund history --thscode <code> --start-ms <milliseconds> --end-ms <milliseconds> --format json
```

## 参数选择策略

| 参数                        | 必填 | 说明                                            |
| --------------------------- | ---- | ----------------------------------------------- |
| `--thscode <code>`          | 是   | single ETF thscode                              |
| `--interval <interval>`     | 否   | bar interval；可选: 1d；默认: 1d                |
| `--start-ms <milliseconds>` | 是   | start timestamp；上游参数: start                |
| `--end-ms <milliseconds>`   | 是   | end timestamp；上游参数: end                    |
| `--output <path>`           | 否   | write the full JSON response envelope to a file |

## 窗口与分页

- undefined
- 无分页参数；仍检查返回中的 count/数组长度。

## 常见错误

- 参数校验失败时按 `error.hint` 修正，不要猜字段名。
- 认证失败时不要重试刷屏；先处理 API Key。

## 批量操作说明

- 批量或全量请求必须落盘，最终只报告路径、行数和窗口。
- 如果需要多标的循环，逐批执行并记录每批参数；不要把完整结果塞进上下文。
