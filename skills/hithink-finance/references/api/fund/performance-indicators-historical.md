# 基金历史业绩指标

[业务导航](README.md)

- `thscode` 是基金唯一标识，必须保留市场后缀。收益率、占比和回撤字段为百分数原值。

## 基金历史业绩指标

```text
GET /api/fund/performance/indicators-historical
```

### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode。 |
| `start` | long | 是 | — | 起始时间，毫秒 Unix 时间戳。 |
| `end` | long | 是 | — | 结束时间，毫秒 Unix 时间戳。 |

> **caution 参数必填**
> `start` 和 `end` 均为必填参数。此前未传这两个参数的客户端需要补充起止时间后再调用。

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/performance/indicators-historical?thscode=510300.SH&start=1735689600000&end=1767225599000' \
  -H 'X-api-key: <your-api-key>'
```

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

### 返回字段

`data` 仅包含 `timestamp` 和 `item`，其中 `timestamp` 保留明确的上游数据时间。指标周期固定为 `DAY_1`，不作为顶层字段返回；响应也不返回顶层 `thscode` 或 `interval`。

`data.item[]` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `date_ms` | long | 指标日期，毫秒 Unix 时间戳。 |
| `rsi_pct` | number | 净值波动（RSI）指标值。 |
| `donchian_channel` | number | 趋势强弱（唐奇安通道）指标值。 |
| `track_index_pe_ttm_five_year_percentile` | number | 估值百分位（跟踪指数 PE TTM 五年分位）。 |
