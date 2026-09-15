# 期货公司品种日持仓

[业务导航](README.md)

期货持仓提供品种、公司和合约维度的日持仓与历史持仓数据。

- 期货合约使用完整 `thscode`，品种代码使用大写形式；接口返回统一 `ApiResponse` 信封。
- ISO 日期按 `Asia/Shanghai` 解释，Unix 时间戳为毫秒。金融数值与日期来源缺失时可为 `null`，合法无数据时返回 `[]`。

<a id="positions-company-variety-daily"></a>
## 期货公司品种日持仓

```text
GET /api/futures/positions/company-variety-daily
```

### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `date` | string | 是 | — | 交易日期，格式 `yyyy-MM-dd`。 |
| `varieties` | string | 是 | — | 1～5 个逗号分隔的大写期货品种代码。 |

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/futures/positions/company-variety-daily?date=2026-09-10&varieties=CU,AU' \
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
    "item": [
      {
        "date": "2026-09-10",
        "variety_code": "CU",
        "company_name": "示例期货",
        "volume": 1200,
        "volume_change": 30,
        "long_position": 800,
        "long_position_change": 10,
        "short_position": 700,
        "short_position_change": -5,
        "net_position": 100,
        "net_position_change": 15,
        "price_spread_contract": null,
        "day_profit": null,
        "year_profit": null,
        "week_win_rate": null,
        "day_mood": null,
        "three_day_mood": null,
        "five_day_mood": null,
        "three_day_net_change": null,
        "five_day_net_change": null,
        "max_funds": null,
        "year_profit_days": null
      }
    ]
  }
}
```

### 返回字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` | long | 数据时间。 |
| `item[]` | array | 各期货公司的品种持仓列表。 |
| `date` / `variety_code` / `company_name` | string \| null | 交易日期（`yyyy-MM-dd`）、品种代码与公司名称。 |
| `volume` / `volume_change` / `long_position` / `long_position_change` / `short_position` / `short_position_change` / `net_position` / `net_position_change` | number \| null | 成交量、多空与净持仓及其变化。 |
| `price_spread_contract` | string \| null | 价差合约代码文本；多个代码按上游原值以逗号分隔。 |
| `day_profit` / `year_profit` / `week_win_rate` | number \| null | 日收益、年收益与周胜率。 |
| `day_mood` / `three_day_mood` / `five_day_mood` | number \| null | 不同周期情绪值。 |
| `three_day_net_change` / `five_day_net_change` / `max_funds` | number \| null | 净变化与最大资金。 |
| `year_profit_days` | integer \| null | 年度盈利天数。 |
