# `hithink-finance special anomaly-stock`

## 前置条件

- 按需读取[本域入口](../SKILL.md)与[共享规则](../../hithink-finance-shared/SKILL.md)，同会话已加载内容可复用。
- 首次执行或版本变化时用 `hithink-finance schema special.anomaly-stock --format json` 确认参数，未说明的组合规则再看命令 `--help`。
- 远端调用需要 API Key，先按共享规则复用已有凭据。

## 命令

```bash
hithink-finance schema special.anomaly-stock --format json
hithink-finance special anomaly-stock --thscodes <codes> --format json
hithink-finance special anomaly-stock --codes-file codes.txt --output result.json --format json
```

## 参数选择策略

| 参数                 | 必填 | 说明                                            |
| -------------------- | ---- | ----------------------------------------------- |
| `--thscodes <codes>` | 是   | 1-50 comma-separated A-share thscodes           |
| `--output <path>`    | 否   | write the full JSON response envelope to a file |

## 窗口与分页

- 仅当前交易日/今日数据；不能补历史。
- 无分页参数；仍检查返回中的 count/数组长度。

## 常见错误

- 参数校验失败时按 `error.hint` 修正，不要猜字段名。
- 认证失败时不要重试刷屏；先处理 API Key。

## 批量操作说明

- 批量或全量请求必须落盘，最终只报告路径、行数和窗口。
- 支持 `--codes-file` 或 `--codes-stdin` 读取多 thscode；不要同时用 `--api-key-stdin` 和 `--codes-stdin`。
