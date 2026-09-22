# 基金业绩与回撤

[业务导航](README.md)

- [基金净值](#performance-nav)：`GET /api/fund/performance/nav`
- [基金区间收益](#performance-returns)：`GET /api/fund/performance/returns`
- [基金历史业绩指标](#performance-indicators-historical)：`GET /api/fund/performance/indicators-historical`
- [基金最大回撤](#performance-drawdowns)：`GET /api/fund/performance/drawdowns`

- `thscode` 是基金唯一标识，必须保留市场后缀。收益率、占比和回撤字段为百分数原值。

<a id="performance-nav"></a>
<a id="performance-nav--基金净值"></a>
## 基金净值

```text
GET /api/fund/performance/nav
```

<a id="performance-nav--请求参数"></a>
### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode，必须保留市场后缀。 |
| `range` | string | 否 | 最新一条 | `week` / `month` / `tmonth` / `hyear` / `year` / `twoyear` / `tyear` / `fyear`。 |
| `nav_type` | string | 否 | `unit,adj` | `unit`（单位净值）/ `adj`（复权净值）/ `unit,adj`（同时返回）。 |

不传 `range` 时最多返回最新一个净值日期；传入后按 `nav_date` 升序返回区间序列。
`unit_nav` 为单位净值，`adj_nav` 为复权净值，复权净值不等同于累计净值。

<a id="performance-nav--请求示例"></a>
### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/performance/nav?thscode=510300.SH&range=year&nav_type=unit' \
  -H 'X-api-key: <your-api-key>'
```

<a id="performance-nav--响应示例"></a>
### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "97634b0fbf4746afaa32e8a71adbd636",
  "data": {
    "timestamp": 1784131200000,
    "item": [
      {
        "nav_date": 1752595200000,
        "unit_nav": 4.0713
      },
      {
        "nav_date": 1752681600000,
        "unit_nav": 4.1015
      }
    ]
  }
}
```

<a id="performance-nav--返回字段"></a>
### 返回字段

`data.item[]` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `nav_date` | long | 净值日期，毫秒级 Unix 时间戳。 |
| `unit_nav` | number | 单位净值；未通过 `nav_type` 请求时不输出。 |
| `adj_nav` | number | 复权净值；未通过 `nav_type` 请求时不输出，不等同于累计净值。 |

<a id="performance-returns"></a>

<a id="performance-returns--基金区间收益"></a>
## 基金区间收益

```text
GET /api/fund/performance/returns
```

<a id="performance-returns--请求参数"></a>
### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode，必须保留市场后缀。 |

<a id="performance-returns--请求示例"></a>
### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/performance/returns?thscode=510300.SH' \
  -H 'X-api-key: <your-api-key>'
```

<a id="performance-returns--响应示例"></a>
### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "61cb2a8b9340483aaf00e36748f77918",
  "data": {
    "timestamp": 0,
    "item": [
      {
        "return_month": -3.33,
        "return_tmonth": 0.03,
        "return_hyear": 0.19,
        "return_year": 19.66,
        "return_tyear": 28.69,
        "return_fyear": 1.77,
        "return_nowyear": 2.49,
        "return_now": 121.58
      }
    ]
  }
}
```

<a id="performance-returns--返回字段"></a>
### 返回字段

`data.item[]` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `return_month` | number | 近一月收益率，百分数原值。 |
| `return_week` | number | 近一周收益率，百分数原值。 |
| `return_tmonth` | number | 近三月收益率，百分数原值。 |
| `return_hyear` | number | 近半年收益率，百分数原值。 |
| `return_year` | number | 近一年收益率，百分数原值。 |
| `return_twoyear` | number | 近两年收益率，百分数原值。 |
| `return_tyear` | number | 近三年收益率，百分数原值。 |
| `return_fyear` | number | 近五年收益率，百分数原值。 |
| `return_nowyear` | number | 今年以来收益率，百分数原值。 |
| `return_now` | number | 成立以来收益率，百分数原值。 |
| `peer_average_*` | number | 对应周期的同类平均收益率；周期后缀覆盖 `week`、`month`、`tmonth`、`hyear`、`year`、`twoyear`、`tyear`、`fyear`。 |
| `rank_*` / `rank_total_*` | integer | 对应周期的同类排名与参与排名总数。 |

<a id="performance-indicators-historical"></a>

<a id="performance-indicators-historical--基金历史业绩指标"></a>
## 基金历史业绩指标

```text
GET /api/fund/performance/indicators-historical
```

<a id="performance-indicators-historical--请求参数"></a>
### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode。 |
| `start` | long | 是 | — | 起始时间，毫秒 Unix 时间戳。 |
| `end` | long | 是 | — | 结束时间，毫秒 Unix 时间戳。 |

> **caution 参数必填**
> `start` 和 `end` 均为必填参数。此前未传这两个参数的客户端需要补充起止时间后再调用。

<a id="performance-indicators-historical--请求示例"></a>
### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/performance/indicators-historical?thscode=510300.SH&start=1735689600000&end=1767225599000' \
  -H 'X-api-key: <your-api-key>'
```

<a id="performance-indicators-historical--响应示例"></a>
### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "046f8a0b787c44a7b995c568096fa16c",
  "data": {
    "timestamp": 1767225599000,
    "item": [
      {
        "date_ms": 1767139200000,
        "rsi_pct": 53.8,
        "donchian_channel": 0.42,
        "track_index_pe_ttm_five_year_percentile": 61.3
      }
    ]
  }
}
```

<a id="performance-indicators-historical--返回字段"></a>
### 返回字段

`data` 仅包含 `timestamp` 和 `item`，其中 `timestamp` 保留明确的上游数据时间。指标周期固定为 `DAY_1`，不作为顶层字段返回；响应也不返回顶层 `thscode` 或 `interval`。

`data.item[]` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `date_ms` | long | 指标日期，毫秒 Unix 时间戳。 |
| `rsi_pct` | number | 净值波动（RSI）指标值。 |
| `donchian_channel` | number | 趋势强弱（唐奇安通道）指标值。 |
| `track_index_pe_ttm_five_year_percentile` | number | 估值百分位（跟踪指数 PE TTM 五年分位）。 |

<a id="performance-drawdowns"></a>

<a id="performance-drawdowns--基金最大回撤"></a>
## 基金最大回撤

```text
GET /api/fund/performance/drawdowns
```

<a id="performance-drawdowns--请求参数"></a>
### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode。 |

<a id="performance-drawdowns--请求示例"></a>
### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/performance/drawdowns?thscode=510300.SH' \
  -H 'X-api-key: <your-api-key>'
```

<a id="performance-drawdowns--响应示例"></a>
### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "7c7fdfe771fc4c61bbab8410a250b61e",
  "data": {
    "timestamp": 1786690800000,
    "item": [
      {
        "thscode": "510300.SH",
        "ticker": "510300",
        "week": -1.2,
        "month": -3.6,
        "tmonth": -6.8,
        "hyear": -9.1,
        "year": -12.5,
        "twoyear": -18.4,
        "tyear": -21.7,
        "fyear": -28.9,
        "nowyear": -7.3,
        "now": -31.2
      }
    ]
  }
}
```

<a id="performance-drawdowns--返回字段"></a>
### 返回字段

`data.timestamp` 为接口响应时间戳；`data.item[]` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `thscode` / `ticker` | string | 完整基金代码与纯代码。 |
| `week` / `month` / `tmonth` | number | 近一周、近一月、近三月最大回撤。 |
| `hyear` / `year` / `twoyear` | number | 近半年、近一年、近两年最大回撤。 |
| `tyear` / `fyear` | number | 近三年、近五年最大回撤。 |
| `nowyear` / `now` | number | 今年以来、成立以来最大回撤。 |

通用参数与错误码参见[基金 API 总览](README.md)。
