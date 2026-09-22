# 期货合约详情

[业务导航](README.md)

期货合约基础资料提供单个合约详情与分页合约目录。

- 期货合约使用完整 `thscode`，品种代码使用大写形式；接口返回统一 `ApiResponse` 信封。
- ISO 日期按 `Asia/Shanghai` 解释，Unix 时间戳为毫秒。金融数值与日期来源缺失时可为 `null`，列表无数据时返回 `[]`。

<a id="contracts-detail"></a>
## 期货合约详情

```text
GET /api/futures/contracts/detail
```

### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 期货合约完整同花顺代码。 |

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/futures/contracts/detail?thscode=CU2601.SHF' \
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
    "thscode": "CU2601.SHF",
    "ticker": "CU2601",
    "name": "沪铜2601",
    "variety_code": "CU",
    "variety_name": "沪铜",
    "exchange_code": "SHFE",
    "list_date": "2025-01-01",
    "end_date": "2026-01-15",
    "last_trade_date": "2026-01-15",
    "last_delivery_date": "2026-01-20"
  }
}
```

### 返回字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` | long | 数据时间，毫秒时间戳。 |
| `thscode` / `ticker` / `name` | string \| null | 完整代码、纯代码与合约名称。 |
| `variety_code` / `variety_name` / `exchange_code` | string \| null | 品种代码、品种名称与交易所代码。 |
| `list_date` | string \| null | 合约上市日期；来源缺失时为 `null`。 |
| `end_date` | string \| null | 合约上市结束日期。 |
| `last_trade_date` / `last_delivery_date` | string \| null | 最后交易日与最后交割日；来源缺失时为 `null`。 |
