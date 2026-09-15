# 指数行情快照

[业务导航](README.md)

指数数据域，承载同花顺指数列表浏览、成分股清单、指数行情快照与历史 K 线。
典型调用顺序：先用 catalog 或 meta 拿到目标指数的 `thscode`，再按场景取成分股、快照或历史 K 线。

- `thscode` 入参均会被 `trim().toUpperCase()` 标准化，**不接受逗号**，单次仅支持一个指数。
- 指数行情覆盖上证交易所指数（如 `000001.SH`）、深证交易所指数（如 `399001.SZ`）、同花顺板块（如 `886042.TI`）与同花顺行业指数（如 `881101.TI`）。

## 指数行情快照

```text
GET /api/a-share-index/prices/snapshot
```

按 `thscodes` 批量获取指数最新行情。与 A 股行情快照不同，本接口**必须传 `thscodes`**，
不支持空入参枚举全指数；`limit` / `offset` 仅为签名对齐保留，对当前接口无效。

### 请求参数

| 参数 | 位置 | 类型 | 必需 | 说明 | 默认值 |
|---|---|---|---|---|---|
| `thscodes` | query | string | 是 | 逗号分隔的指数 thscode 列表，如 `000001.SH,399001.SZ,886042.TI,881101.TI`。 | - |
| `limit` | query | integer | 否 | 与 A 股行情快照签名对齐，对本接口无效。 | - |
| `offset` | query | integer | 否 | 与 A 股行情快照签名对齐，对本接口无效。 | - |

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/a-share-index/prices/snapshot?thscodes=000001.SH,399001.SZ,886042.TI,881101.TI' \
  -H 'X-api-key: <your-api-key>'
```

### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "7e25804be878464ba420037155f041e6",
  "data": {
    "timestamp": 1784275991000,
    "total": 4,
    "item": [
      {
        "thscode": "000001.SH",
        "ticker": "000001",
        "last_price": 3388.06,
        "price_change": 12.21,
        "price_change_ratio_pct": 0.3617,
        "open_price": 3370.25,
        "high_price": 3392.18,
        "low_price": 3365.4,
        "prev_price": 3375.85,
        "volume": 321000000,
        "turnover": 420000000000
      }
    ]
  }
}
```

### 响应字段

`data` 为 `SnapshotData`，`item[]` 为 `PriceSnapshotItem`，字段结构与
[A 股行情快照](../a-share/prices-snapshot.md#响应字段) 一致。
