# 指数与板块 MCP 工具

指数和板块目录、成分股、行情。先目录或搜索，再查成分与价格。

## 资料与标识

查询目录、搜索、合约或基本资料，取得后续请求所需标识。

### THS 指数目录（`get_a_share_index_catalog_ths_index_list`）

**描述**

按 `tag`（概念 / 区域 / 特色 / 行业）列出同花顺指数清单。当用户提到「板块」「概念」
或某类指数（如「白酒概念」「锂电池」「半导体行业」）时，**先用本工具拿到目标指数的
`thscode`**，再交给
`get_a_share_index_constituents_ths_stock_list`
取成分股。单 `tag` 一次性全量返回，无需分页。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `tag` | enum | 否 | `cn_concept` | 标签白名单：`cn_concept`(A 股概念) / `region`(区域指数) / `tszs`(特色指数) / `industry`(行业指数)。大小写不敏感。 |

**响应**

返回 `{ timestamp, item: [{ thscode, name }, ...] }`。字段含义见 [同花顺指数列表和成分股 · 同花顺指数列表](../api/index/a-share-index.md#catalog-ths-index-list--响应字段)。

### THS 指数成分股列表（`get_a_share_index_constituents_ths_stock_list`）

**描述**

按单个指数 `thscode` 返回当前成分股清单。支持同花顺板块指数（如 `886042.TI`）与
标准指数（如沪深 300 `000300.SH` / `399300.SZ`）。不接受逗号，单次只能查一个指数。
拿到成分股 `thscode` 列表后，可继续调
`get_a_share_prices_snapshot` 取实时行情，或调
`get_a_share_prices_historical` 取历史 K 线。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 指数 thscode，形如 `{ticker}.{suffix}`。入参会被 `trim().toUpperCase()` 标准化。**不接受逗号**，单次仅支持一个指数。 |

**响应**

返回 `{ timestamp, item: [{ thscode, ticker, name }, ...] }`。字段含义见 [同花顺指数列表和成分股 · 同花顺指数成分股](../api/index/a-share-index.md#constituents-ths-stock-list--响应字段)。

## 行情

按所需时间范围选择行情快照或历史价格序列。

### A股指数历史K线（`get_a_share_index_prices_historical`）

**描述**

获取单只指数的历史 K 线数据，覆盖上证交易所指数、深证交易所指数、同花顺板块与同花顺行业指数。
每次只能传一个 `thscode`，只支持 `start` / `end` 时间区间模式，窗口最长 10 年。指数没有复权语义，因此不提供 `adjust` 参数。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 单只指数 thscode，不接受逗号，如 `000001.SH` / `399001.SZ` / `886042.TI` / `881101.TI`。 |
| `interval` | string | 是 | `1d` | K 线周期，当前仅支持 `1d`（日线）。 |
| `start` | long | 是 | — | 起始时间，毫秒 Unix 时间戳。 |
| `end` | long | 是 | — | 结束时间，毫秒 Unix 时间戳。`end - start` 不超过 10 年。 |

**响应**

返回 `{ timestamp, adjust, item: [PriceBarItem, ...] }`，其中 `adjust` 固定为 `null`。字段含义见 [指数历史 K 线](../api/index/a-share-index.md#prices-historical--指数历史-k-线)。

### A股指数行情快照（`get_a_share_index_prices_snapshot`）

**描述**

按 `thscodes` 批量获取指数最新行情，覆盖上证交易所指数、深证交易所指数、同花顺板块与同花顺行业指数。
本工具必须显式传入 `thscodes`，不支持空参数枚举全指数。返回最新价、涨跌额、涨跌幅、开盘 / 最高 / 最低 / 前收价、成交量、成交额。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscodes` | string | 是 | — | 逗号分隔的指数 thscode 列表，如 `000001.SH,399001.SZ,886042.TI,881101.TI`。 |
| `limit` | integer | 否 | — | 与 A 股行情快照签名对齐，对本工具无效。 |
| `offset` | integer | 否 | — | 与 A 股行情快照签名对齐，对本工具无效。 |

**响应**

返回 `{ timestamp, total, item: [PriceSnapshotItem, ...] }`。字段含义见 [指数行情快照](../api/index/a-share-index.md#prices-snapshot--指数行情快照)。
