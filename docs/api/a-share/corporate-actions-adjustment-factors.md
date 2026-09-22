# 除复权

[业务导航](README.md)

除复权模块，提供 A 股复权因子事件流。
返回原始的 cash-dividend / stock-dividend / rights-issue 事件，供客户端自行推导复权因子；
若需预计算的复权后价格，请使用价格模块的 [历史 K 线](README.md) 接口（`adjust=forward|backward`）。

- 请求参数 `from` / `to` 使用 `YYYY-MM-DD` 字符串；响应中的事件日期为毫秒 Unix 时间戳 `ex_date_ms`。

<a id="复权因子事件流"></a>

```text
GET /api/a-share/corporate-actions/adjustment-factors
```

获取单只标的的 A 股复权因子事件流。**每次请求仅一个 thscode**。

## 请求参数

| 参数 | 位置 | 类型 | 必需 | 说明 | 默认值 |
|---|---|---|---|---|---|
| `thscode` | query | string | 是 | 单只标的 thscode，**不接受逗号**。 | - |
| `from` | query | string | 否 | 事件起始日，格式 `YYYY-MM-DD`。 | - |
| `to` | query | string | 否 | 事件截止日，格式 `YYYY-MM-DD`。 | - |

## 请求示例

```bash
# 茅台全部历史复权事件
curl 'https://fuyao.aicubes.cn/api/a-share/corporate-actions/adjustment-factors?thscode=600519.SH' \
  -H 'X-api-key: <your-api-key>'

# 平安银行近 5 年事件
curl 'https://fuyao.aicubes.cn/api/a-share/corporate-actions/adjustment-factors?thscode=000001.SZ&from=2021-01-01&to=2026-01-01' \
  -H 'X-api-key: <your-api-key>'
```

## 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "558c1d59d2e548149fb27b83eca5016a",
  "data": {
    "thscode": "600519.SH",
    "ticker": "600519",
    "item": [
      {
        "ticker": "600519",
        "ex_date_ms": 1766073600000,
        "dividend_per_share": 23.957,
        "per_share_bonus": 0
      },
      {
        "ticker": "600519",
        "ex_date_ms": 1437062400000,
        "dividend_per_share": 4.374,
        "per_share_bonus": 0.1
      }
    ]
  }
}
```

## 响应字段

`data` 为 `AdjustmentFactorsData`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `thscode` | string | 带交易所后缀的完整 thscode（与 `item` 同级，标识本次返回所属标的）。 |
| `ticker` | string | 纯代码（无交易所后缀）。 |
| `item` | array | 事件列表，按 `ex_date_ms` 降序排列（最新在前）。 |

`item[]` 为 `AdjustmentFactorItem`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `ticker` | string | 纯代码（无交易所后缀），如 `600519`。 |
| `ex_date_ms` | long | 除权除息日，Asia/Shanghai 00:00:00 毫秒 Unix 时间戳。 |
| `dividend_per_share` | number | 每股现金分红（税前，原始货币）。非现金事件为 `0`。 |
| `per_share_bonus` | number | 每股送股比例（如 `0.1` 表示 10 送 1）。纯现金分红事件为 `0`。 |

> **note 字段约定差异**
> - 响应中**不返回** `event_type` / `record_date` / `adjust_factor`，事件类型由 `dividend_per_share` 与 `per_share_bonus` 两个数值字段隐式区分。
> - 复权因子需调用方按 `dividend_per_share` + `per_share_bonus` 自行推导；若仅需复权后价格，直接调用 [`/api/a-share/prices/historical`](prices.md#prices-historical--历史-k-线) 并传 `adjust=forward|backward`。
