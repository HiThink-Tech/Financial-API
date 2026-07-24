# `hithink-finance valuation snapshot`

## 前置条件

- 先读取本 skill 的 `SKILL.md` 和 `../hithink-finance-shared/SKILL.md`。
- 执行前用 `hithink-finance schema valuation.snapshot --format json` 确认当前参数契约。
- 远端命令需要 API Key；认证失败时回到 shared skill。

## 命令

```bash
hithink-finance schema valuation.snapshot --format json
hithink-finance valuation snapshot --thscodes <codes> --format json
```

## 参数选择策略

| 参数                 | 必填 | 说明                                                      |
| -------------------- | ---- | --------------------------------------------------------- |
| `--thscodes <codes>` | 是   | comma-separated A-share thscodes (at most 100 raw tokens) |
| `--output <path>`    | 否   | write the full JSON response envelope to a file           |

## 窗口与分页

- 无额外时间窗口限制，仍按命令参数和上游返回为准。
- 无分页参数；仍检查返回中的 count/数组长度。

## 常见错误

- 参数校验失败时按 `error.hint` 修正，不要猜字段名。
- 认证失败时不要重试刷屏；先处理 API Key。

## 批量操作说明

- 批量或全量请求必须落盘，最终只报告路径、行数和窗口。
- 通过必填的 `--thscodes` 传入最多 100 个原始 token；大结果用 `--output` 落盘。
