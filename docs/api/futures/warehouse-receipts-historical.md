# 期货历史仓单

[业务导航](README.md)

查询指定期货合约在日期范围内的仓单数据。

- 期货合约使用完整 `thscode`，品种代码使用大写形式；接口返回统一 `ApiResponse` 信封。
- ISO 日期按 `Asia/Shanghai` 解释，Unix 时间戳为毫秒。金融数值与日期来源缺失时可为 `null`，合法无数据时返回 `[]`。

```text
GET /api/futures/warehouse-receipts/historical
```

## 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 期货合约完整同花顺代码。 |
| `start_date` | string | 是 | — | 开始日期，格式 `yyyy-MM-dd`。 |
| `end_date` | string | 是 | — | 结束日期，不早于开始日期。 |

## 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/futures/warehouse-receipts/historical?thscode=CU2601.SHF&start_date=2026-09-01&end_date=2026-09-10' \
  -H 'X-api-key: <your-api-key>'
```

## 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "request-id",
  "data": {
    "timestamp": 1789036800000,
    "item": [
      {
        "date": "2026-09-10",
        "amount": 12000,
        "amount_change": 300,
        "equivalent_lots": 2400
      }
    ]
  }
}
```

## 返回字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` | long | 数据时间。 |
| `item[]` | array | 仓单列表；每项含 `date` 与可空的 `amount`、`amount_change`、`equivalent_lots`。 |
