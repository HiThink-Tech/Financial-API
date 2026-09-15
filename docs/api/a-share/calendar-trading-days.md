# 交易日历

[业务导航](README.md)

交易日历模块，提供 A 股近一年交易日序列。
返回统一响应信封 `ApiResponse`，业务错误经 `code` 字段表达，HTTP 状态码恒为 200。

- 信封 `data.timestamp` 为毫秒级 Unix 时间戳；`item` 内同时返回毫秒戳 `date_ms` 与可读日期 `date`（`yyyyMMdd`），时区按 `Asia/Shanghai`。

<a id="交易日序列"></a>

```text
GET /api/a-share/calendar/trading-days
```

A 股近一年交易日序列，**固定窗口**为 `[今日 - 1 年, 今日]`（Asia/Shanghai 自然日），无任何请求参数。

## 请求参数

| 参数 | 位置 | 类型 | 必需 | 说明 | 默认值 |
|---|---|---|---|---|---|
| - | - | - | - | 无入参。 | - |

## 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/a-share/calendar/trading-days' \
  -H 'X-api-key: <your-api-key>'
```

## 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "a1b2c3d4e5f6789012345678abcdef01",
  "data": {
    "timestamp": 1748102400000,
    "item": [
      {
        "date_ms": 1716566400000,
        "date": "20250525"
      },
      {
        "date_ms": 1716652800000,
        "date": "20250526"
      },
      {
        "date_ms": 1716739200000,
        "date": "20250527"
      }
    ]
  }
}
```

## 响应字段

`data` 为 `TradingDaysData`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` | long | 数据就绪时间（毫秒）。 |
| `item` | array | 交易日列表，按时间升序。 |

`item[]` 为 `TradingDayItem`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `date_ms` | long | 单个交易日的 Asia/Shanghai 00:00:00 毫秒戳。 |
| `date` | string | 同一交易日的 `yyyyMMdd` 格式（Asia/Shanghai），方便直接展示 / 对账。 |
