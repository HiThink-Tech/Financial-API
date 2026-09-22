# 期货 MCP 工具

先确定品种或合约，再查询持仓、仓单、基差、交易日程与行情。

## 资料与标识

查询目录、搜索、合约或基本资料，取得后续请求所需标识。

### 期货合约详情（`get_futures_contracts_detail`）

**描述**

按完整同花顺代码查询期货合约详情。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 期货合约完整同花顺代码。 |

**响应**

返回统一数据对象；字段、空值和数组语义见 [期货合约详情](../api/futures/futures-reference.md#contracts-detail--contracts-detail)。

### 期货合约基础信息列表（`get_futures_contracts_list`）

**描述**

从完整目录快照分页查询期货合约基础信息。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `limit` | integer | 否 | `100` | 单页条数，范围 1-1000。 |
| `offset` | integer | 否 | `0` | 分页偏移。 |

**响应**

返回期货合约基础信息分页列表，字段详见 [期货合约基础资料](../api/futures/futures-reference.md#contracts-list--contracts-list)。

### 期货品种资料（`get_futures_varieties_list`）

**描述**

查询期货品种、交易所、交易单位与时段等基础资料。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| — | — | — | — | 无业务参数。 |

**响应**

返回统一数据对象；字段、空值和数组语义见 [期货品种资料](../api/futures/varieties-list.md)。

### 期货品种板块（`get_futures_variety_plates_list`）

**描述**

查询期货品种板块资料。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| — | — | — | — | 无业务参数。 |

**响应**

返回期货品种板块列表，字段详见 [期货品种板块](../api/futures/variety-plates-list.md)。

## 行情

查询分时走势选择期货分时行情，查询日线选择期货日 K。

### 期货K线（`get_futures_prices_daily`）

**描述**

查询期货 K 线；端外仅允许 `day_1`，AI 客户端内可使用完整周期集合。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 期货合约或期货商品指数完整同花顺代码，例如 `CU2601.SHF`、`850002.TI`。 |
| `start` | integer(int64) | 否 | — | 与 end 成对提供的正毫秒时间戳。 |
| `end` | integer(int64) | 否 | — | 与 start 成对提供且不早于 start。 |
| `time_period` | enum | 否 | — | 端外仅允许 `day_1`；AI 客户端内支持 `min_1`、`min_10`、`hour_1`、`day_1`、`week_1`、`month_1`、`quarter_1`、`year_1`。 |

**响应**

返回统一数据对象；字段、空值和数组语义见 [期货日K](../api/futures/futures-prices.md#prices-daily--prices-daily)。

### 期货分时（`get_futures_prices_intraday`）

**描述**

查询期货合约或期货商品指数当前或最近交易日指定行情阶段的分时行情。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 期货合约或期货商品指数完整同花顺代码，例如 `CU2601.SHF`、`850002.TI`。 |
| `session` | enum | 否 | — | 行情阶段：`pre_market`-盘前、`intraday`-盘中、`post_market`-盘后；省略时使用 `intraday`。 |
| `trade_date` | string | 否 | — | 端外仅允许 `0`；AI 客户端内可传 `0` 或合法历史交易日 `yyyyMMdd`。 |

**响应**

返回统一数据对象；字段、空值和数组语义见 [期货分时行情](../api/futures/futures-prices.md#prices-intraday--prices-intraday)。

## 交易日程

交易日、交易时段与会话时间。

### 期货会话时间轴（`get_futures_calendar_session_timeline`）

**描述**

查询期货合约所属交易会话时间轴。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 期货合约同花顺代码。 |

**响应**

返回交易日期、时区、交易阶段与交易所会话时间范围。

### 期货交易日日程（`get_futures_calendar_trading_schedule`）

**描述**

查询指定期货合约在日期范围内的交易日列表及对应交易时间安排。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 期货合约完整同花顺代码。 |
| `start_date` | string(date) | 是 | — | 开始日期。 |
| `end_date` | string(date) | 是 | — | 结束日期。 |

**响应**

返回统一数据对象；字段、空值和数组语义见 [期货交易日](../api/futures/calendar-trading-schedule.md)。

## 持仓

品种与公司、合约维度不同；日期查询和历史序列分别选择。

### 期货公司列表（`get_futures_positions_company_list`）

**描述**

查询可用于持仓检索的期货公司列表。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| — | — | — | — | 无业务参数。 |

**响应**

返回统一数据对象；字段、空值和数组语义见 [期货公司列表](../api/futures/futures-positions.md#positions-company-list--positions-company-list)。

### 公司品种日持仓（`get_futures_positions_company_variety_daily`）

**描述**

查询指定日期和品种集合的期货公司持仓。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `date` | string(date) | 是 | — | 交易日期。 |
| `varieties` | string | 是 | — | 1至5个逗号分隔的大写品种代码。 |

**响应**

返回统一数据对象；字段、空值和数组语义见 [期货公司品种日持仓](../api/futures/futures-positions.md#positions-company-variety-daily--positions-company-variety-daily)。

### 期货合约日持仓（`get_futures_positions_contract_daily`）

**描述**

查询指定合约和交易日的公司持仓与多空均价。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 期货合约完整同花顺代码。 |
| `variety` | string | 是 | — | 与合约一致的大写品种代码。 |
| `date` | string(date) | 是 | — | 交易日期。 |

**响应**

返回统一数据对象；字段、空值和数组语义见 [期货公司合约日持仓](../api/futures/futures-positions.md#positions-contract-daily--positions-contract-daily)。

### 期货合约历史持仓（`get_futures_positions_contract_historical`）

**描述**

查询指定公司在合约上的历史持仓与多空均价。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 期货合约完整同花顺代码。 |
| `variety` | string | 是 | — | 与合约一致的大写品种代码。 |
| `company` | string | 是 | — | 期货公司名称。 |
| `start_date` | string(date) | 是 | — | 调用日前一年内的开始日期；结束日期固定为调用日。 |

**响应**

返回统一数据对象；字段、空值和数组语义见 [期货公司合约历史持仓](../api/futures/futures-positions.md#positions-contract-historical--positions-contract-historical)。

### 期货品种日持仓（`get_futures_positions_variety_daily`）

**描述**

查询指定交易日的期货品种持仓。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `date` | string(date) | 是 | — | 交易日期，格式 yyyy-MM-dd。 |

**响应**

返回统一数据对象；字段、空值和数组语义见 [期货品种日持仓](../api/futures/futures-positions.md#positions-variety-daily--positions-variety-daily)。

## 基差

最新主连基差与指定合约历史基差。

### 期货历史基差（`get_futures_basis_historical`）

**描述**

查询指定期货合约的历史基差序列。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 期货合约完整同花顺代码。 |
| `spot_indicator_id` | string | 否 | — | 可选现货指标 ID；省略时使用上游默认口径。 |

**响应**

返回统一数据对象；字段、空值和数组语义见 [期货历史基差](../api/futures/futures-basis.md#basis-historical--basis-historical)。

### 期货主连最新基差（`get_futures_basis_main_continuous_latest`）

**描述**

查询期货主连的最新现货、期货价格与基差。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| — | — | — | — | 无业务参数。 |

**响应**

返回统一数据对象；字段、空值和数组语义见 [期货主连最新基差](../api/futures/futures-basis.md#basis-main-continuous-latest--basis-main-continuous-latest)。

## 仓单

历史仓单与变化。

### 期货历史仓单（`get_futures_warehouse_receipts_historical`）

**描述**

查询期货合约在指定日期范围内的仓单记录。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 期货合约完整同花顺代码。 |
| `start_date` | string(date) | 是 | — | 开始日期。 |
| `end_date` | string(date) | 是 | — | 结束日期。 |

**响应**

返回统一数据对象；字段、空值和数组语义见 [期货历史仓单](../api/futures/warehouse-receipts-historical.md)。

## 端内扩展资料

端内品种板块、主连、主力与次主力合约、商品指数和 F10。

### 期货商品指数资料（`get_futures_contracts_commodity_index_list`）

**描述**

查询期货商品指数资料。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| — | — | — | — | 无业务参数。 |

**响应**

返回期货商品指数合约列表；也可用 `asset_type=futures-commodity-index` 在标的目录中发现。

### 期货主连列表（`get_futures_contracts_main_continuous_list`）

**描述**

查询期货主连资料。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| — | — | — | — | 无业务参数。 |

**响应**

返回期货主连列表，字段详见 [期货主力与指数合约](../api/futures/futures-contracts-extended.md#contracts-main-continuous-list--futures-main-continuous)。

### 期货主力合约列表（`get_futures_contracts_main_list`）

**描述**

查询期货主力合约。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| — | — | — | — | 无业务参数。 |

**响应**

返回期货主力合约列表，字段详见 [期货主力与指数合约](../api/futures/futures-contracts-extended.md#contracts-main-list--futures-main-contracts)。

### 期货次主力合约列表（`get_futures_contracts_secondary_main_list`）

**描述**

查询期货次主力合约。

**入参**

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| — | — | — | — | 无业务参数。 |

**响应**

返回期货次主力合约列表，字段详见 [期货主力与指数合约](../api/futures/futures-contracts-extended.md#contracts-secondary-main-list--futures-secondary-main-contracts)。
