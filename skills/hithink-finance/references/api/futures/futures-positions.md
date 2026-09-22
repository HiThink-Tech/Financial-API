# 期货持仓

[业务导航](README.md)

- [期货品种日持仓](#positions-variety-daily)：`GET /api/futures/positions/variety-daily`
- [期货公司品种日持仓](#positions-company-variety-daily)：`GET /api/futures/positions/company-variety-daily`
- [期货公司合约日持仓](#positions-contract-daily)：`GET /api/futures/positions/contract-daily`
- [期货公司合约历史持仓](#positions-contract-historical)：`GET /api/futures/positions/contract-historical`
- [期货公司列表](#positions-company-list)：`GET /api/futures/positions/company-list`

期货持仓提供品种、公司和合约维度的日持仓与历史持仓数据。

- 期货合约使用完整 `thscode`，品种代码使用大写形式；接口返回统一 `ApiResponse` 信封。
- ISO 日期按 `Asia/Shanghai` 解释，Unix 时间戳为毫秒。金融数值与日期来源缺失时可为 `null`，合法无数据时返回 `[]`。

<a id="positions-variety-daily--positions-variety-daily"></a>

<a id="positions-variety-daily"></a>
<a id="positions-variety-daily--期货品种日持仓"></a>
## 期货品种日持仓

```text
GET /api/futures/positions/variety-daily
```

<a id="positions-variety-daily--请求参数"></a>
### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `date` | string | 是 | — | 交易日期，格式 `yyyy-MM-dd`。 |

<a id="positions-variety-daily--请求示例"></a>
### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/futures/positions/variety-daily?date=2026-09-10' \
  -H 'X-api-key: <your-api-key>'
```

<a id="positions-variety-daily--响应示例"></a>
### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "request-id",
  "data": {
    "timestamp": 1789036800000,
    "item": [
      {
        "date": "2026-09-10",
        "variety_code": "CU",
        "variety_name": "沪铜",
        "volume": 120000,
        "volume_change": 1000,
        "long_position": 80000,
        "long_position_change": 500,
        "short_position": 76000,
        "short_position_change": -200,
        "net_position": 4000,
        "net_position_change": 700,
        "twenty_day_avg_price": 78000,
        "change_risk": null,
        "main_close_price": 78200,
        "index_close_price": 78100,
        "main_settle_price": 77900,
        "main_change_ratio": 0.012,
        "max_funds": null,
        "capital_flow": null
      }
    ]
  }
}
```

<a id="positions-variety-daily--返回字段"></a>
### 返回字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` | long | 数据时间。 |
| `item[]` | array | 品种日持仓列表。 |
| `date` / `variety_code` / `variety_name` | string \| null | 交易日期（`yyyy-MM-dd`）、品种代码与名称。 |
| `volume` / `volume_change` | number \| null | 成交量及变化。 |
| `long_position` / `long_position_change` / `short_position` / `short_position_change` | number \| null | 多空持仓及变化。 |
| `net_position` / `net_position_change` | number \| null | 净持仓及变化。 |
| `twenty_day_avg_price` / `main_close_price` / `index_close_price` / `main_settle_price` | number \| null | 均价、主力/指数收盘价及主力结算价。 |
| `change_risk` / `main_change_ratio` / `max_funds` / `capital_flow` | number \| null | 风险变化、涨跌幅、最大资金与资金流。 |

<a id="positions-company-variety-daily"></a>
<a id="positions-company-variety-daily--positions-company-variety-daily"></a>
<a id="positions-company-variety-daily--期货公司品种日持仓"></a>
## 期货公司品种日持仓

```text
GET /api/futures/positions/company-variety-daily
```

<a id="positions-company-variety-daily--请求参数"></a>
### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `date` | string | 是 | — | 交易日期，格式 `yyyy-MM-dd`。 |
| `varieties` | string | 是 | — | 1～5 个逗号分隔的大写期货品种代码。 |

<a id="positions-company-variety-daily--请求示例"></a>
### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/futures/positions/company-variety-daily?date=2026-09-10&varieties=CU,AU' \
  -H 'X-api-key: <your-api-key>'
```

<a id="positions-company-variety-daily--响应示例"></a>
### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "request-id",
  "data": {
    "timestamp": 1789036800000,
    "item": [
      {
        "date": "2026-09-10",
        "variety_code": "CU",
        "company_name": "示例期货",
        "volume": 1200,
        "volume_change": 30,
        "long_position": 800,
        "long_position_change": 10,
        "short_position": 700,
        "short_position_change": -5,
        "net_position": 100,
        "net_position_change": 15,
        "price_spread_contract": null,
        "day_profit": null,
        "year_profit": null,
        "week_win_rate": null,
        "day_mood": null,
        "three_day_mood": null,
        "five_day_mood": null,
        "three_day_net_change": null,
        "five_day_net_change": null,
        "max_funds": null,
        "year_profit_days": null
      }
    ]
  }
}
```

<a id="positions-company-variety-daily--返回字段"></a>
### 返回字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` | long | 数据时间。 |
| `item[]` | array | 各期货公司的品种持仓列表。 |
| `date` / `variety_code` / `company_name` | string \| null | 交易日期（`yyyy-MM-dd`）、品种代码与公司名称。 |
| `volume` / `volume_change` / `long_position` / `long_position_change` / `short_position` / `short_position_change` / `net_position` / `net_position_change` | number \| null | 成交量、多空与净持仓及其变化。 |
| `price_spread_contract` | string \| null | 价差合约代码文本；多个代码按上游原值以逗号分隔。 |
| `day_profit` / `year_profit` / `week_win_rate` | number \| null | 日收益、年收益与周胜率。 |
| `day_mood` / `three_day_mood` / `five_day_mood` | number \| null | 不同周期情绪值。 |
| `three_day_net_change` / `five_day_net_change` / `max_funds` | number \| null | 净变化与最大资金。 |
| `year_profit_days` | integer \| null | 年度盈利天数。 |

<a id="positions-contract-daily"></a>
<a id="positions-contract-daily--positions-contract-daily"></a>
<a id="positions-contract-daily--期货公司合约日持仓"></a>
## 期货公司合约日持仓

```text
GET /api/futures/positions/contract-daily
```

<a id="positions-contract-daily--请求参数"></a>
### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 期货合约完整同花顺代码。 |
| `variety` | string | 是 | — | 大写品种代码，须与 `thscode` 所属品种一致。 |
| `date` | string | 是 | — | 交易日期，格式 `yyyy-MM-dd`。 |

<a id="positions-contract-daily--请求示例"></a>
### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/futures/positions/contract-daily?thscode=CU2601.SHF&variety=CU&date=2026-09-10' \
  -H 'X-api-key: <your-api-key>'
```

<a id="positions-contract-daily--响应示例"></a>
### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "request-id",
  "data": {
    "timestamp": 1789036800000,
    "date": "2026-09-10",
    "position_item": [],
    "average_item": []
  }
}
```

<a id="positions-contract-daily--返回字段"></a>
### 返回字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` / `date` | long / string \| null | 数据时间与查询交易日。 |
| `position_item[]` | array | 公司持仓；每项含 `date`、`thscode`、`ticker`、`company_name`、成交量、多空与净持仓及其变化。 |
| `average_item[]` | array | 独立均价序列；每项含 `date`、`company_long_avg`、`company_short_avg`，不得与持仓数组按位置关联。 |

<a id="positions-contract-historical"></a>
<a id="positions-contract-historical--positions-contract-historical"></a>
<a id="positions-contract-historical--期货公司合约历史持仓"></a>
## 期货公司合约历史持仓

```text
GET /api/futures/positions/contract-historical
```

<a id="positions-contract-historical--请求参数"></a>
### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 期货合约完整同花顺代码。 |
| `variety` | string | 是 | — | 大写品种代码，须与合约一致。 |
| `company` | string | 是 | — | 期货公司名称。 |
| `start_date` | string | 是 | — | 开始日期；须位于调用日前一年内，结束日固定为调用日。 |

<a id="positions-contract-historical--请求示例"></a>
### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/futures/positions/contract-historical?thscode=CU2601.SHF&variety=CU&company=示例期货&start_date=2026-01-01' \
  -H 'X-api-key: <your-api-key>'
```

<a id="positions-contract-historical--响应示例"></a>
### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "request-id",
  "data": {
    "timestamp": 1789036800000,
    "start_date": "2026-01-01",
    "end_date": "2026-09-10",
    "position_item": [],
    "average_item": []
  }
}
```

<a id="positions-contract-historical--返回字段"></a>
### 返回字段

字段与[期货公司合约日持仓](#positions-contract-daily--positions-contract-daily)一致；`position_item[]` 与 `average_item[]` 是独立序列。

<a id="positions-company-list"></a>
<a id="positions-company-list--positions-company-list"></a>
<a id="positions-company-list--期货公司列表"></a>
## 期货公司列表

```text
GET /api/futures/positions/company-list
```

<a id="positions-company-list--请求参数"></a>
### 请求参数

无业务参数。

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| — | — | — | — | 无业务参数。 |

<a id="positions-company-list--请求示例"></a>
### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/futures/positions/company-list' \
  -H 'X-api-key: <your-api-key>'
```

<a id="positions-company-list--响应示例"></a>
### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "request-id",
  "data": {
    "timestamp": 1789036800000,
    "item": [
      {
        "company_id": "1001",
        "company_name": "示例期货"
      }
    ]
  }
}
```

<a id="positions-company-list--返回字段"></a>
### 返回字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` | long | 数据时间。 |
| `item[]` | array | 公司列表；每项含可空的 `company_id`、`company_name`。 |
