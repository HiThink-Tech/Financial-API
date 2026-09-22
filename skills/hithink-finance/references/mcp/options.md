# 期权 MCP 工具

期权品种、合约与行情；按完整合约代码定位。

## 资料与标识

查询目录、搜索、合约或基本资料，取得后续请求所需标识。

### 期权合约详情（`get_options_contracts_detail`）

**描述**

按完整同花顺代码查询期权合约详情。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 期权合约完整同花顺代码。 |

**响应**

返回统一数据对象；字段、空值和数组语义见 [期权合约详情](../api/options/options-reference.md#contracts-detail--contracts-detail)。

### 期权合约基础信息列表（`get_options_contracts_list`）

**描述**

从完整目录快照分页查询期权合约基础信息。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `limit` | integer | 否 | `100` | 单页条数，范围 1-1000。 |
| `offset` | integer | 否 | `0` | 分页偏移。 |

**响应**

返回期权合约基础信息分页列表，字段详见 [期权合约基础资料](../api/options/options-reference.md#contracts-list--contracts-list)。

### 期权品种资料（`get_options_varieties_list`）

**描述**

查询期权品种、交易所、交易单位与交割方式等基础资料。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| — | — | — | — | 无业务参数。 |

**响应**

返回统一数据对象；字段、空值和数组语义见 [期权品种资料](../api/options/varieties-list.md)。

## 行情

查询分时走势选择期权分时行情，查询日线选择期权日 K。

### 期权K线（`get_options_prices_daily`）

**描述**

查询期权 K 线；端外仅允许 `day_1`，AI 客户端内可使用完整周期集合。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 期权合约完整同花顺代码。 |
| `start` | integer(int64) | 否 | — | 与 end 成对提供的正毫秒时间戳。 |
| `end` | integer(int64) | 否 | — | 与 start 成对提供且不早于 start。 |
| `time_period` | enum | 否 | — | 端外仅允许 `day_1`；AI 客户端内支持 `min_1`、`min_10`、`hour_1`、`day_1`、`week_1`、`month_1`、`quarter_1`、`year_1`。 |

**响应**

返回统一数据对象；字段、空值和数组语义见 [期权日K](../api/options/options-prices.md#prices-daily--prices-daily)。

### 期权分时（`get_options_prices_intraday`）

**描述**

查询期权合约当前或最近交易日指定行情阶段的分时行情。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 期权合约完整同花顺代码。 |
| `session` | enum | 否 | — | 行情阶段：`pre_market`-盘前、`intraday`-盘中、`post_market`-盘后；省略时使用 `intraday`。 |
| `trade_date` | string | 否 | — | 端外仅允许 `0`；AI 客户端内可传 `0` 或合法历史交易日 `yyyyMMdd`。 |

**响应**

返回统一数据对象；字段、空值和数组语义见 [期权分时行情](../api/options/options-prices.md#prices-intraday--prices-intraday)。

## 交易日程

交易日、交易时段与会话时间。

### 期权会话时间轴（`get_options_calendar_session_timeline`）

**描述**

查询期权合约所属交易会话时间轴。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 期权合约同花顺代码。 |

**响应**

返回交易日期、时区、交易阶段与交易所会话时间范围。
