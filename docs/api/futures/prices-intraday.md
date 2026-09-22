# 期货分时

[业务导航](README.md)

期货行情提供合约分时和 K 线数据；端外访问分时仅支持当前交易日、K 线仅支持日 K，AI 客户端内可使用历史交易日和全部周期。

- 期货合约与期货商品指数使用完整 `thscode`（例如 `CU2601.SHF`、`850002.TI`）；接口返回统一 `ApiResponse` 信封。
- ISO 日期按 `Asia/Shanghai` 解释，Unix 时间戳为毫秒。金融数值与日期来源缺失时可为 `null`，合法无数据时返回 `[]`。

<a id="prices-intraday"></a>
## 期货分时

```text
GET /api/futures/prices/intraday
```

### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 期货合约或期货商品指数完整同花顺代码。 |
| `session` | enum | 否 | — | 行情阶段：`pre_market`-盘前、`intraday`-盘中、`post_market`-盘后；省略时使用 `intraday`。 |
| `trade_date` | string | 否 | — | 端外仅允许 `0`；AI 客户端内可传 `0` 或合法历史交易日 `yyyyMMdd`。 |

商品指数行情可直接传入对应 `thscode`，例如 `850002.TI`。

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/futures/prices/intraday?thscode=CU2601.SHF&session=intraday' \
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
    "date": "2026-01-09",
    "session": "intraday",
    "item": [
      {
        "timestamp": 1767922260000,
        "price": 78200,
        "volume": 12,
        "turnover": 4692000
      }
    ]
  }
}
```

### 返回字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` | long | 数据时间。 |
| `thscode` / `date` / `session` | string | 行情标的代码、当前或最近交易日与行情阶段。 |
| `item[]` | array | 分时点；每项含可空的 `timestamp`、`price`、`volume`、`turnover`。 |
