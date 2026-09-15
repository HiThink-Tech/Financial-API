# 历史 K 线

[业务导航](README.md)

价格数据模块，提供 A 股行情快照与历史 K 线序列。
所有接口均返回统一响应信封 `ApiResponse`，业务错误经 `code` 字段表达，HTTP 状态码恒为 200。

- 价格类字段为原始货币计价，A 股恒为 `CNY`。

## 历史 K 线

```text
GET /api/a-share/prices/historical
```

获取单只标的的 A 股历史 K 线序列。接口层强约束：**每次请求仅一个 thscode**，
且 `[start, end]` 窗口跨度不超过 10 年。

### 请求参数

| 参数 | 位置 | 类型 | 必需 | 说明 | 默认值 |
|---|---|---|---|---|---|
| `thscode` | query | string | 是 | 单只标的 thscode，**不接受逗号**。多标的请分多次请求。 | - |
| `interval` | query | string | 是 | K 线周期，**当前仅支持** `1d`(日线)。 | `1d` |
| `start` | query | long | 是 | 起始时间，毫秒 Unix 时间戳。缺失返回 `code=1001`。 | - |
| `end` | query | long | 是 | 结束时间，毫秒 Unix 时间戳。`end - start` 超过 10 年返回 `code=1003`。 | - |
| `adjust` | query | string | 否 | 复权方式：`none` / `forward`(前复权) / `backward`(后复权)。 | `forward` |

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/a-share/prices/historical?thscode=600519.SH&interval=1d&start=1716105600000&end=1747641600000&adjust=forward' \
  -H 'X-api-key: <your-api-key>'
```

### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "b9f91af9c77a42d6b8a04738793d2fa2",
  "data": {
    "timestamp": 1747584000000,
    "item": [
      {
        "date_ms": 1716134400000,
        "open_price": 1611.602,
        "high_price": 1626.602,
        "low_price": 1601.722,
        "close_price": 1602.612,
        "volume": 3142572.0,
        "turnover": 5401389334.87
      }
    ]
  }
}
```

### 响应字段

`data` 为 `HistoricalData`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` | long | 数据就绪时间（毫秒），为序列中最新一根 K 线的上游有效时间。 |
| `item` | array | K 线列表。 |

`item[]` 为 `PriceBarItem`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `date_ms` | long | K 线日期（毫秒）。 |
| `open_price` | number | 开盘价。 |
| `high_price` | number | 最高价。 |
| `low_price` | number | 最低价。 |
| `close_price` | number | 收盘价。 |
| `volume` | number | 成交量（股）。 |
| `turnover` | number | 成交额（原始货币）。 |
