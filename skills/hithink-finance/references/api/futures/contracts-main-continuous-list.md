# 期货主连资料

[业务导航](README.md) · **端内专用** · [使用说明](../README.md#端内能力说明) · **待上线，当前不可调用**

期货合约扩展资料提供品种板块、主连、主力、次主力和商品指数等客户端内能力

- 期货合约使用完整 `thscode`，品种列表每次最多 5 项；金融数值与日期可为 `null`，合法无数据返回空数组。

<a id="futures-main-continuous"></a>
## 期货主连资料

```text
GET /api/futures/contracts/main-continuous-list
```

### 请求参数

无业务参数。

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| — | — | — | — | 无业务参数。 |

### 请求示例

以下命令仅展示接口路径与参数格式，当前不可用于外部调用。

```bash
curl 'https://fuyao.aicubes.cn/api/futures/contracts/main-continuous-list'
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
        "thscode": "CU.L8",
        "ticker": "CU",
        "name": "沪铜主连",
        "variety_code": "CU",
        "variety_name": "沪铜",
        "exchange_code": "SHFE",
        "minute_visit_count": 1200,
        "kline_visit_count": 300,
        "statistics_date": "2026-09-10"
      }
    ]
  }
}
```

### 返回字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` | long | 数据时间。 |
| `item[]` | array | 主连列表。 |
| `thscode` / `ticker` / `name` / `variety_code` / `variety_name` / `exchange_code` | string \| null | 主连代码、名称、品种与交易所信息。 |
| `minute_visit_count` / `kline_visit_count` | integer \| null | 分时与 K 线访问次数。 |
| `statistics_date` | string \| null | 统计日期。 |
