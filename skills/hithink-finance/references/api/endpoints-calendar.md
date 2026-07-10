# 交易日历端点

> A 股近一年交易日序列。参数定义、响应字段以本文档为准。

## 交易日历

```text
GET /api/a-share/calendar/trading-days
```

返回 A 股近一年的交易日序列，同时返回毫秒戳与可读日期，方便展示与对账。

### 请求参数

无入参。窗口固定为 `[今日 - 1 年, 今日]`（Asia/Shanghai 时区）。

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/a-share/calendar/trading-days' \
  -H 'X-api-key: <your-api-key>'
```

### 响应字段

`data` 为 `{timestamp, item[]}`，`item` 按日期升序（ASC）排列：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `timestamp` | long | 数据就绪时间（毫秒）。 |
| `item` | array | 交易日列表。 |

`item[]` 元素：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `date_ms` | long | 交易日，Asia/Shanghai 00:00:00 毫秒 Unix 时间戳。 |
| `date` | string | 可读日期，格式 `yyyyMMdd`（如 `20250701`）。 |

### 避错要点

- 查询任意十年日历：窗口固定为近一年，不支持自定义时间范围。
- 把非交易日空数据当服务故障：非交易日不在列表中是正常行为，不代表接口异常。
- 用它判断「今天是否开盘」：先确认今天是否在返回的 `item` 列表中。
