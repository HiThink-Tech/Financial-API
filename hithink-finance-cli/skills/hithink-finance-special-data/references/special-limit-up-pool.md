# `hithink-finance special limit-up-pool`

## 前置条件

- 先读取本 skill 的 `SKILL.md` 和 `../hithink-finance-shared/SKILL.md`。
- 执行前用 `hithink-finance schema special.limit-up-pool --format json` 确认当前参数契约。
- 远端命令需要 API Key；认证失败时回到 shared skill。

## 命令

```bash
hithink-finance schema special.limit-up-pool --format json
hithink-finance special limit-up-pool --format json
```

## 参数选择策略

| 参数                       | 必填 | 说明                                                                                                              |
| -------------------------- | ---- | ----------------------------------------------------------------------------------------------------------------- |
| `--date-ms <milliseconds>` | 否   | trade date at Asia/Shanghai midnight；上游参数: date_ms                                                           |
| `--page <number>`          | 否   | page number；默认: 1                                                                                              |
| `--size <number>`          | 否   | page size (1-200)；默认: 50                                                                                       |
| `--sort-field <field>`     | 否   | sort field；可选: last_price, continue_day_cnt, seal_money, limit_up_time；默认: last_price；上游参数: sort_field |
| `--sort-dir <direction>`   | 否   | sort direction；可选: asc, desc；默认: desc；上游参数: sort_dir                                                   |
| `--output <path>`          | 否   | write the full JSON response envelope to a file                                                                   |

## 窗口与分页

- 无额外时间窗口限制，仍按命令参数和上游返回为准。
- 使用 `--page` + `--size` 翻页；全量抓取时逐页推进。

## 常见错误

- 参数校验失败时按 `error.hint` 修正，不要猜字段名。
- 认证失败时不要重试刷屏；先处理 API Key。

## 批量操作说明

- 批量或全量请求必须落盘，最终只报告路径、行数和窗口。
- 如果需要多标的循环，逐批执行并记录每批参数；不要把完整结果塞进上下文。
