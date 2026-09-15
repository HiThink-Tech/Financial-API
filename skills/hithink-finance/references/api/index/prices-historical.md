# 指数历史 K 线

[业务导航](README.md)

指数数据域，承载同花顺指数列表浏览、成分股清单、指数行情快照与历史 K 线。
典型调用顺序：先用 catalog 或 meta 拿到目标指数的 `thscode`，再按场景取成分股、快照或历史 K 线。

- `thscode` 入参均会被 `trim().toUpperCase()` 标准化，**不接受逗号**，单次仅支持一个指数。
- 指数行情覆盖上证交易所指数（如 `000001.SH`）、深证交易所指数（如 `399001.SZ`）、同花顺板块（如 `886042.TI`）与同花顺行业指数（如 `881101.TI`）。

## 指数历史 K 线

```text
GET /api/a-share-index/prices/historical
```

获取单只指数的历史 K 线序列。每次请求仅支持一个 `thscode`，只支持 `start` / `end` 时间区间模式，
窗口跨度不超过 10 年。指数无复权语义，因此没有 `adjust` 参数；本接口也没有 `offset` 参数。

### 请求参数

| 参数 | 位置 | 类型 | 必需 | 说明 | 默认值 |
|---|---|---|---|---|---|
| `thscode` | query | string | 是 | 单只指数 thscode，**不接受逗号**。 | - |
| `interval` | query | string | 是 | K 线周期，当前仅支持 `1d`（日线）。 | `1d` |
| `start` | query | long | 是 | 起始时间，毫秒 Unix 时间戳。 | - |
| `end` | query | long | 是 | 结束时间，毫秒 Unix 时间戳。`end - start` 超过 10 年返回 `code=1003`。 | - |

### 请求示例

```bash
# 上证综指过去一年日线
curl 'https://fuyao.aicubes.cn/api/a-share-index/prices/historical?thscode=000001.SH&interval=1d&start=1716105600000&end=1747641600000' \
  -H 'X-api-key: <your-api-key>'

# 同花顺白酒概念
curl 'https://fuyao.aicubes.cn/api/a-share-index/prices/historical?thscode=886042.TI&interval=1d&start=1716105600000&end=1747641600000' \
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
    "adjust": null,
    "item": [
      {
        "date_ms": 1716134400000,
        "open_price": 3108.22,
        "high_price": 3125.74,
        "low_price": 3101.15,
        "close_price": 3120.68,
        "volume": 281000000,
        "turnover": 360000000000
      }
    ]
  }
}
```

### 响应字段

`data` 为 `HistoricalData`，`item[]` 为 `PriceBarItem`，字段结构与
[A 股历史 K 线](../a-share/prices-historical.md#响应字段) 一致。指数接口响应中的 `data.adjust`
固定为 `null`。
