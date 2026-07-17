# hithink-finance-fund 工具契约

用于公募基金资料、披露数据、净值、收益、持有人结构和场内基金行情。服务地址为 `https://fuyao.aicubes.cn/mcp/fund`。名称或代码未消歧时，先调用 `hithink-finance-meta`，根据 `asset_type` 选择基金类型和能力。

## 工具

| 工具 | 适用场景 | 关键参数与边界 | 常见错误 |
| --- | --- | --- | --- |
| `get_fund_profile_detail` | 查询基金基本资料 | `fund_type=otc/exchange/reits`；单个 `thscode` | 根据代码后缀猜类型，或把可空资料补写为确定值 |
| `get_fund_portfolio_holdings` | 查询定期披露重仓股 | `fund_type` + 单个 `thscode`；`hold_ratio` 是百分数值 | 把披露持仓当实时组合，或把 8.88 解释为 0.0888% |
| `get_fund_performance_nav` | 查询最新或固定区间净值 | `range=week/month/tmonth/hyear/year/twoyear/tyear/fyear`；`nav_type=unit/adj/unit,adj`，默认二者 | 把 range 当自定义日期；忽略未选择字段会被省略 |
| `get_fund_performance_returns` | 查询固定区间收益 | `fund_type` + 单个 `thscode`；返回月/季/半年/年/三年/五年/今年/成立以来 | 把固定区间字段当任意起止日期收益 |
| `get_fund_holders_detail` | 查询持有人结构 | `fund_type` + 单个 `thscode`；披露口径 | 把持有人结构当实时账户统计 |
| `get_fund_market_snapshot` | 查询 ETF/LOF 场内快照 | 单个 `thscode`；不接收 `fund_type` | 对场外基金或 REITs 重试 `3004` |
| `get_fund_market_historical` | 查询 ETF 历史日线 | 单个 ETF；`interval=1d`；`start/end` 为毫秒戳；最多 5 年；无 `adjust` | 传 LOF、复权参数、批量代码或超过 5 年窗口 |

## 参数与错误语义

- `fund_type` 与 `thscode` 共同定位基金；`fund_type` 不支持逗号分隔多值。
- `market/snapshot` 支持 ETF 与 LOF，`market/historical` 当前只支持 ETF。
- `3001` 表示基金未找到；回到 meta 搜索核对 `asset_type` 和 `thscode`。
- `3002` 表示数据尚未准备；保留 `request_id`，不要补零或使用模拟数据。
- `3004` 表示目标基金类型不支持该能力；改选适用工具，不重试原参数。

## Agent 选型

1. 名称、纯 ticker 或不确定代码先用 `get_meta_tickers_search`；可用 `asset_type=fund-otc,fund-etf,fund-lof,fund-reits` 缩小范围。
2. 用户问资料、披露、净值、收益或持有人时，根据搜索结果把 `asset_type` 映射为 `fund_type`。
3. 用户问交易所价格时，ETF/LOF 用 snapshot；只有 ETF 能用 historical。
4. 长结果或多基金循环必须落盘，只摘要路径、数量、窗口和口径。

## 边界

- 不提供基金申购、赎回、交易执行、风险评分、同类排名、基金推荐或收益承诺。
- 工具契约不等于当前会话已连接；首次调用或参数错误后读取该服务的 `tools/list`。
