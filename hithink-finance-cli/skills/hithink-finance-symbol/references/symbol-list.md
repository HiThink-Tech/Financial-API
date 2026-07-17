# `hithink-finance symbol list`

## 前置条件

- 先读取本 skill 的 `SKILL.md` 和 `../hithink-finance-shared/SKILL.md`。
- 执行前用 `hithink-finance schema symbol.list --format json` 确认当前参数契约。
- 远端命令需要 API Key；认证失败时回到 shared skill。

## 命令

```bash
hithink-finance schema symbol.list --format json
hithink-finance symbol list --format json
```

## 参数选择策略

| 参数                     | 必填 | 说明                                                                                                                                      |
| ------------------------ | ---- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `--exchange <exchanges>` | 否   | comma-separated exchanges；默认: SH,SZ                                                                                                    |
| `--asset-type <type>`    | 否   | comma-separated asset types: a-share, a-share-index, forex, fund-otc, fund-etf, fund-lof, fund-reits；默认: a-share；上游参数: asset_type |
| `--limit <number>`       | 否   | page size (1-10000)；默认: 1000                                                                                                           |
| `--offset <number>`      | 否   | row offset；默认: 0                                                                                                                       |
| `--output <path>`        | 否   | write the full JSON response envelope to a file                                                                                           |

## 窗口与分页

- 无额外时间窗口限制，仍按命令参数和上游返回为准。
- 使用 `--limit` + `--offset` 翻页；全量抓取时循环到返回条数小于 limit。

## 常见错误

- 参数校验失败时按 `error.hint` 修正，不要猜字段名。
- 认证失败时不要重试刷屏；先处理 API Key。

## 批量操作说明

- 批量或全量请求必须落盘，最终只报告路径、行数和窗口。
- 如果需要多标的循环，逐批执行并记录每批参数；不要把完整结果塞进上下文。
