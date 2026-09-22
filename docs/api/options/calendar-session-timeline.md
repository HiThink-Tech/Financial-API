# 期权交易时间轴

[业务导航](README.md)

期权交易时间轴提供合约最近交易日的交易阶段、交易所阶段与跨日时间范围。

- 期权合约使用完整 `thscode`；金融数值与日期可为 `null`，合法无数据返回空数组。

```text
GET /api/options/calendar/session-timeline
```

## 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 期权合约完整同花顺代码。 |

## 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/options/calendar/session-timeline?thscode=IO2601-C-4000.CFE' \
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
    "thscode": "IO2601-C-4000.CFE",
    "trade_date": "2026-09-10",
    "timezone": "Asia/Shanghai",
    "trade_stages": [],
    "exchange_sessions": []
  }
}
```

## 返回字段

字段结构与[期货交易时间轴](../futures/calendar-session-timeline.md)一致，使用期权合约代码和最近交易日的交易时间。
