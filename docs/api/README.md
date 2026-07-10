# REST API 契约

本目录是“同花顺金融数据服务”上游 REST API 在本仓库中的唯一契约源。它面向直接 HTTP 调用者、SDK/CLI 维护者和 AI Agent，统一维护端点、参数、响应字段、错误码与能力边界。

> 上游完整机器可读契约始终以 <https://fuyao.aicubes.cn/llms-full.txt> 为准。仓库不保存 `llms.txt` 或 `llms-full.txt`，避免远端更新后出现双份真相。

## 通用协议

| 项目 | 契约 |
| --- | --- |
| Base URL | `https://fuyao.aicubes.cn` |
| 方法 | 当前公开数据端点均为 `GET` |
| 认证 | HTTP Header `X-api-key: <API_KEY>` |
| 成功判断 | HTTP 200 且响应 `code == 0` |
| 响应信封 | `{code, message, request_id, data}` |
| 标的代码 | 完整 `thscode`，例如 `600519.SH`；不要猜交易所后缀 |
| 时间戳 | 毫秒 Unix 时间戳；具体日期字符串格式以端点页为准 |
| 空值 | `null` 表示未披露或上游无值，不得自动补零 |

获取统一 API Key：<https://fuyao.aicubes.cn/admin>。API Key 不得写入代码、Prompt、日志、公开配置或 Git 提交。

最小请求：

```bash
curl 'https://fuyao.aicubes.cn/api/meta/tickers/search?q=600519&limit=1' \
  -H 'X-api-key: <API_KEY>'
```

## 契约导航

先读 [能力与意图路由](capability-map.md)，再按需要打开一个端点组：

| 领域 | 契约 |
| --- | --- |
| 标的检索、代码消歧、代码表 | [元信息端点](endpoints-meta.md) |
| 个股行情、历史 K 线、公司行动 | [行情与公司行为端点](endpoints-prices.md) |
| 利润表、资产负债表、现金流量表、财务指标 | [财务数据端点](endpoints-financials.md) |
| 交易日历 | [交易日历端点](endpoints-calendar.md) |
| 指数/板块目录、成分股、指数行情 | [指数与板块端点](endpoints-index.md) |
| 涨停、连板、异动、热榜、龙虎榜 | [特色数据端点](endpoints-special-data.md) |
| 全市场 Parquet 与本地建库数据源 | [全市场数据导出](endpoints-market-dumps.md) |

## 错误处理

所有响应先检查 `code`。HTTP 200 不代表业务成功。

| `code` | 含义 | 调用方处理 |
| --- | --- | --- |
| `0` | 成功 | 使用 `data` |
| `1001` | 缺少必填参数 | 补齐参数，不重试原请求 |
| `1002` | 参数格式无效 | 规范化代码、枚举、日期或时间戳 |
| `1003` | 参数超出范围 | 缩小分页或拆分允许拆分的时间窗口 |
| `1004` | 参数冲突 | 按端点互斥规则重组参数 |
| `2001` | 未认证 | 检查 `X-api-key` 是否存在且格式正确 |
| `2003` | 无权限或 Key 无效 | 前往 API Key 管理页检查授权或重新签发 |
| `4001` | 限流 | 指数退避，最多重试 3 次 |
| `5001`/`5002`/`5003` | 服务端或上游异常 | 退避重试；持续失败时保留 `request_id` |

`1xxx` 和 `2xxx` 属于调用方可修复错误，不应无条件重试。网络错误、`4001` 和 `5xxx` 可在有界次数内退避重试。

## 大结果规则

全市场、分页全集、多标的或多年数据必须落盘。调用者只在终端或对话中报告文件路径、行数、时间窗口和摘要，不展开原始结果。全市场历史建库优先使用 [Market Dumps](endpoints-market-dumps.md)，不要逐标的请求多年 REST 数据。

## 维护规则

1. 先根据上游变更更新本目录。
2. 运行 `python scripts/sync_skill_contracts.py` 镜像到独立 Skill。
3. 运行 `python scripts/sync_skill_contracts.py --check` 和相关契约测试。
4. CLI/Python 文档只同步命令或运行方式，不复制本目录的字段契约。
