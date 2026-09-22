# 期货K线

[业务导航](README.md)

期货行情提供合约分时和 K 线数据；端外访问分时仅支持当前交易日、K 线仅支持日 K，AI 客户端内可使用历史交易日和全部周期。

- 期货合约与期货商品指数使用完整 `thscode`（例如 `CU2601.SHF`、`850002.TI`）；接口返回统一 `ApiResponse` 信封。
- ISO 日期按 `Asia/Shanghai` 解释，Unix 时间戳为毫秒。金融数值与日期来源缺失时可为 `null`，合法无数据时返回 `[]`。

<a id="prices-daily"></a>
## 期货K线

```text
GET /api/futures/prices/daily
```

### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 期货合约或期货商品指数完整同花顺代码。 |
| `start` | long | 否 | — | 与 `end` 成对提供的正毫秒时间戳；两者均省略时查询最近 100 根。 |
| `end` | long | 否 | — | 与 `start` 成对提供，且不早于 `start`。 |
| `time_period` | enum | 否 | — | 端外仅允许 `day_1`；AI 客户端内可使用 `min_1`、`min_10`、`hour_1`、`day_1`、`week_1`、`month_1`、`quarter_1`、`year_1`。 |

商品指数 K 线同样使用对应 `thscode`，例如 `850002.TI`。

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/futures/prices/daily?thscode=CU2601.SHF' \
  -H 'X-api-key: <your-api-key>'
```

### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "request-id",
  "data": {
    "timestamp": 1767922260000,
    "thscode": "CU2601.SHF",
    "interval": "1d",
    "item": [
      {
        "timestamp": 1767888000000,
        "open_price": 78000,
        "high_price": 78400,
        "low_price": 77800,
        "close_price": 78200,
        "volume": 120000,
        "turnover": 46920000000
      }
    ]
  }
}
```

### 返回字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` | long | 数据时间。 |
| `thscode` | string | 期货合约或期货商品指数代码。 |
| `interval` | string | 实际返回的 K 线周期；端外调用固定为 `day_1`。 |
| `item[]` | array | 日 K；每项含可空的 `timestamp`、`open_price`、`high_price`、`low_price`、`close_price`、`volume`、`turnover`。 |
