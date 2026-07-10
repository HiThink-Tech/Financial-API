# hithink-finance-a-share 工具契约

用于 A 股行情、公司行为、财务、交易日历和特色数据的选型与避错。历史研究若本地 `marketdb` 已覆盖，应优先使用本地数据，不要为相同历史窗口重复调用远端 MCP。

## 行情与公司行为

| 工具 | 适用场景 | 关键参数与边界 | 常见错误 |
| --- | --- | --- | --- |
| `get_a_share_prices_snapshot` | 单只或有限多只 A 股最新快照 | `thscodes` 为逗号分隔列表；省略时才使用 `limit/offset` 遍历全市场 | 认证探测时省略 `thscodes`，意外拉取全市场 |
| `get_a_share_prices_historical` | 单只 A 股日 K 线 | 单次一个 `thscode`；`start/end` 为毫秒时间戳；窗口最长 10 年；`adjust` 为 `none/forward/backward`；当前仅支持 `interval=1d` | 一次传多只股票，或误用其他周期枚举 |
| `get_a_share_corporate_actions_adjustment_factors` | 获取现金分红、送股、配股事件，供调用方推导复权因子 | 单次一个 `thscode`；`from/to` 使用 `YYYY-MM-DD` | 将事件流误当作服务端已计算好的每日复权因子 |

## 财务数据

| 工具 | 适用场景 | 关键参数与边界 | 常见错误 |
| --- | --- | --- | --- |
| `get_a_share_financials_income_statements` | 整体合并利润表多期序列 | 单只股票；`period` 为 `annual/quarterly`；最近 N 期模式与 `start+end` 区间模式互斥 | 同时传 `limit` 和时间区间，或只传 start/end 之一 |
| `get_a_share_financials_balance_sheets` | 整体合并资产负债表多期序列 | 与利润表相同；最近期数通常 1–20，区间最长 10 年 | 把报告期模式理解为自然月数据 |
| `get_a_share_financials_cash_flow_statements` | 整体合并现金流量表多期序列 | 与利润表相同 | 未对齐不同报表的报告期就直接拼接 |
| `get_a_share_financials_indicators` | 指定报告期的成长、盈利、偿债、营运和现金流指标 | `report` 格式 `yyyy-{1|2|3|4}`；`abilities` 为数组，每项含 `ability` 与 `indicators` | 期待行业均值、评分、排名或点评；把日期当 report；把 `abilities` 当 object |

三张报表的时间区间使用毫秒时间戳；财务指标使用专用报告期字符串，不可互换。

## 日历

| 工具 | 适用场景 | 关键参数与边界 | 常见错误 |
| --- | --- | --- | --- |
| `get_a_share_calendar_trading_days` | 判断最近一年 A 股交易日 | 无参数，固定为 Asia/Shanghai 今日向前一年 | 用它查询任意十年日历，或把非交易日空数据当服务故障 |

## 涨停与连板

| 工具 | 适用场景 | 关键参数与边界 | 常见错误 |
| --- | --- | --- | --- |
| `get_a_share_special_data_limit_up_pool` | 指定交易日的全市场涨停股清单 | `date_ms` 为上海时区自然日零点毫秒戳；`page/size` 分页；排序字段有白名单 | 在非交易日期待报错；混用 `limit/offset` |
| `get_a_share_special_data_limit_up_ladder` | 观察近 30 个交易日、2/3/4/5/6/7+ 板梯队 | 无参数，返回固定窗口矩阵 | 期待逐股明细或自定义时间窗口 |

## 异动与热榜

| 工具 | 适用场景 | 关键参数与边界 | 常见错误 |
| --- | --- | --- | --- |
| `get_a_share_special_data_anomaly_analysis_stock` | 批量查询当日个股异动原因 | `thscodes` 必填、逗号分隔、仅股票；去重后数量受服务端上限约束 | 查询历史异动、传指数代码或超量标的 |
| `get_a_share_special_data_skyrocket_list` | A 股飙升榜 | `period` 为 `day/hour`，缺省 day；条目含代码、名称、排名、热度和排名趋势等 7 个字段 | 把榜单排名当作无延迟交易信号，或虚构分析字段 |
| `get_a_share_special_data_hot_stock_list` | 当前热股榜 | `period` 为 `day/hour`；day 表示 24 小时榜；字段与飙升榜一致 | 与飙升榜混淆，或忽略数据时间 |
| `get_a_share_special_data_hot_stock_list_history` | 指定自然日的历史热股排名 | `date` 必填，格式 `YYYY-MM-DD` | 用毫秒时间戳传 date，或期待区间走势 |
| `get_a_share_special_data_hot_stock_rank_trend` | 单只股票在日期区间内的热榜排名走势 | 单个 `thscode`；`start_date/end_date` 为 `YYYY-MM-DD` | 一次传多只股票，或把无排名日期误作接口缺失 |

## 龙虎榜

| 工具 | 适用场景 | 关键参数与边界 | 常见错误 |
| --- | --- | --- | --- |
| `get_a_share_special_data_dragon_tiger_list` | 查询全部榜、机构榜或游资榜 | `board_type` 为 `all/org/hot_money`；`date` 可选且为 `YYYY-MM-DD` | 假设省略 date 一定等于今天；服务端取最新可用日期 |

## 选型检查

- 名称未消歧：先用 `hithink-finance-meta`。
- 代码是指数或 `.TI`：改用 `hithink-finance-a-share-index`。
- 需要分钟 K、tick 或连续多年批量研究：当前 MCP 契约不覆盖；优先评估本地数据库或 REST 导出能力。
- 工具报参数错误：读取当前目标服务的 `tools/list` 后修正，不要全量探测其他服务。
