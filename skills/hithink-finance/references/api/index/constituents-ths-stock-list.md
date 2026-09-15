# 同花顺指数成分股

[业务导航](README.md)

指数数据域，承载同花顺指数列表浏览、成分股清单、指数行情快照与历史 K 线。
典型调用顺序：先用 catalog 或 meta 拿到目标指数的 `thscode`，再按场景取成分股、快照或历史 K 线。

- `thscode` 入参均会被 `trim().toUpperCase()` 标准化，**不接受逗号**，单次仅支持一个指数。
- 指数行情覆盖上证交易所指数（如 `000001.SH`）、深证交易所指数（如 `399001.SZ`）、同花顺板块（如 `886042.TI`）与同花顺行业指数（如 `881101.TI`）。

## 同花顺指数成分股

```text
GET /api/a-share-index/constituents/ths-stock-list
```

按单个指数 `thscode` 返回当前成分股清单。
支持同花顺板块指数（如 `886042.TI`）与标准指数（如沪深 300 `000300.SH` / `399300.SZ`）。

### 请求参数

| 参数 | 位置 | 类型 | 必需 | 说明 | 默认值 |
|---|---|---|---|---|---|
| `thscode` | query | string | 是 | 指数 thscode，形如 `{ticker}.{suffix}`。入参会被 `trim().toUpperCase()` 标准化；**不接受逗号**，单次仅支持一个指数。 | - |

### 请求示例

```bash
# 拉取某同花顺概念板块成分股
curl 'https://fuyao.aicubes.cn/api/a-share-index/constituents/ths-stock-list?thscode=886042.TI' \
  -H 'X-api-key: <your-api-key>'

# 拉取沪深 300 成分股
curl 'https://fuyao.aicubes.cn/api/a-share-index/constituents/ths-stock-list?thscode=000300.SH' \
  -H 'X-api-key: <your-api-key>'
```

### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "f6g7h8i9",
  "data": {
    "timestamp": 1748102400000,
    "item": [
      {
        "thscode": "600519.SH",
        "ticker": "600519",
        "name": "贵州茅台"
      },
      {
        "thscode": "000858.SZ",
        "ticker": "000858",
        "name": "五粮液"
      }
    ]
  }
}
```

### 响应字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` | long | 数据时间戳（毫秒）。 |
| `item[].thscode` | string | 成分股完整 thscode。 |
| `item[].ticker` | string | 成分股纯代码。 |
| `item[].name` | string | 成分股展示名称。 |
