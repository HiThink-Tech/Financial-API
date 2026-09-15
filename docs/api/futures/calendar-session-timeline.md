# 期货交易时间轴

[业务导航](README.md) · **端内专用** · [使用说明](../README.md#端内能力说明) · **待上线，当前不可调用**

期货交易时间轴提供合约最近交易日的交易阶段、交易所阶段与跨日时间范围。

- 期货合约使用完整 `thscode`；金融数值与日期可为 `null`，合法无数据返回空数组。

```text
GET /api/futures/calendar/session-timeline
```

## 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 期货合约完整同花顺代码。 |

## 请求示例

以下命令仅展示接口路径与参数格式，当前不可用于外部调用。

```bash
curl 'https://fuyao.aicubes.cn/api/futures/calendar/session-timeline?thscode=CU2601.SHF'
```

## 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "request-id",
  "data": {
    "timestamp": 1789036800000,
    "thscode": "CU2601.SHF",
    "trade_date": "2026-09-10",
    "timezone": "Asia/Shanghai",
    "trade_stages": [],
    "exchange_sessions": []
  }
}
```

## 返回字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` / `thscode` / `trade_date` / `timezone` | long / string | 数据时间、合约代码、最近交易日与时区。 |
| `trade_stages[]` | array | 交易阶段；每项含 `trade_period` 与 `trade_ranges[]`，范围含毫秒 `begin_time`、`end_time`。 |
| `exchange_sessions[]` | array | 交易所阶段；每项含 `trade_phase` 与 `phase_range[]`，范围结构同上。 |
