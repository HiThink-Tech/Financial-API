# 期货交易日

[业务导航](README.md)

查询指定期货合约在日期范围内的交易日列表及对应交易时间安排。

- 期货合约使用完整 `thscode`，品种代码使用大写形式；接口返回统一 `ApiResponse` 信封。
- ISO 日期按 `Asia/Shanghai` 解释，Unix 时间戳为毫秒。金融数值与日期来源缺失时可为 `null`，合法无数据时返回 `[]`。

```text
GET /api/futures/calendar/trading-schedule
```

## 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 期货合约完整同花顺代码。 |
| `start_date` | string | 是 | — | 开始日期，格式 `yyyy-MM-dd`。 |
| `end_date` | string | 是 | — | 结束日期，不早于开始日期。 |

## 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/futures/calendar/trading-schedule?thscode=CU2601.SHF&start_date=2026-01-09&end_date=2026-01-09' \
  -H 'X-api-key: <your-api-key>'
```

## 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "request-id",
  "data": {
    "timestamp": 1767888000000,
    "thscode": "CU2601.SHF",
    "trade_dates": [
      "2026-01-09"
    ],
    "regular_schedules": [],
    "special_schedules": [],
    "timezone": "Asia/Shanghai",
    "daylight_saving_periods": []
  }
}
```

## 返回字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` / `thscode` / `timezone` | long / string | 数据时间、合约代码与时区。 |
| `trade_dates[]` | array | ISO 交易日期。 |
| `regular_schedules[]` | array | 常规日程；含 `start_date`、`end_date`、`times[]`，时间项含 `start_time`、`end_time`、`offset`、`trans_day_type`、`type`。 |
| `special_schedules[]` | array | 特殊日程；含 `date`、`times[]`，时间项含毫秒 `start_time`、`end_time` 与 `type`。 |
| `daylight_saving_periods[]` | array | 夏令时原值；每项含 `start`、`end`、`offset`。 |
