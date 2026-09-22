# `hithink-finance fund history`

## 前置条件

- 按需读取[本域入口](../SKILL.md)与[共享规则](../../hithink-finance-shared/SKILL.md)，同会话已加载内容可复用。
- 首次执行或版本变化时用 `hithink-finance schema fund.history --format json` 确认参数，未说明的组合规则再看命令 `--help`。
- 远端调用需要 API Key，先按共享规则复用已有凭据。

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

- 单次请求窗口最多 5 年；更长范围按允许的日期参数分段并核对边界。
- 无分页参数；仍检查返回中的 count/数组长度。

## 常见错误

- 参数校验失败时按 `error.hint` 修正，不要猜字段名。
- 认证失败时不要重试刷屏；先处理 API Key。

## 批量操作说明

- 批量或全量请求必须落盘，最终只报告路径、行数和窗口。
- 如果需要多标的循环，逐批执行并记录每批参数；不要把完整结果塞进上下文。
