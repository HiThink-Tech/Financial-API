# 期权分时

[业务导航](README.md)

期权行情提供合约分时和 K 线数据；端外访问分时仅支持当前交易日、K 线仅支持日 K，AI 客户端内可使用历史交易日和全部周期。

- 期权合约使用完整 `thscode`；接口返回统一 `ApiResponse` 信封。
- Unix 时间戳均为毫秒；日期按 `Asia/Shanghai` 解释。金融数值与日期来源缺失时可为 `null`，列表无数据时返回 `[]`。

<a id="prices-intraday"></a>
## 期权分时

```text
GET /api/options/prices/intraday
```

### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 期权合约完整同花顺代码。 |
| `session` | enum | 否 | — | 行情阶段：`pre_market`-盘前、`intraday`-盘中、`post_market`-盘后；省略时使用 `intraday`。 |
| `trade_date` | string | 否 | — | 端外仅允许 `0`；AI 客户端内可传 `0` 或合法历史交易日 `yyyyMMdd`。 |

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/options/prices/intraday?thscode=IO2601-C-4000.CFE&session=intraday' \
  -H 'X-api-key: <your-api-key>'
```

### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "request-id",
  "data": {
    "timestamp": 1789036800000,
    "thscode": "IO2601-C-4000.CFE",
    "date": "2026-09-10",
    "session": "intraday",
    "item": [
      {
        "timestamp": 1789036860000,
        "price": 35.2,
        "volume": 12,
        "turnover": 42240
      }
    ]
  }
}
```

### 返回字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` | long | 数据时间，毫秒时间戳。 |
| `thscode` / `date` / `session` | string | 合约代码、当前或最近交易日与行情阶段。 |
| `item[]` | array | 分时点列表；每项含可空的 `timestamp`、`price`、`volume`、`turnover`。 |
