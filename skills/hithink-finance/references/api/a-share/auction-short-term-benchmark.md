# 短线风向标竞价基准

[业务导航](README.md)

集合竞价接口返回统一 `ApiResponse` 信封。`thscode` 使用带交易所后缀的标准代码，时间戳均为毫秒级 Unix 时间戳。

- A 股标的使用带交易所后缀的完整 `thscode`；时间戳均为毫秒级 Unix 时间戳，时区按 `Asia/Shanghai`。

## 短线风向标竞价基准

```text
GET /api/a-share/auction/short-term-benchmark
```

### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `date` | string | 否 | 上海时区当日 | 查询日期，格式 `yyyy-MM-dd`；缺失或传入空字符串时使用 `Asia/Shanghai` 当日，显式指定非交易日时不自动回退。 |

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/a-share/auction/short-term-benchmark?date=2026-08-14' \
  -H 'X-api-key: <your-api-key>'
```

### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "4e2f1c8c38e54ff1be9be3d17533bef9",
  "data": {
    "timestamp": 1786690800000,
    "date": "2026-08-14",
    "date_ms": 1786636800000,
    "item": [
      {
        "thscode": "600519.SH",
        "ticker": "600519",
        "name": "贵州茅台",
        "auction_pct": 0.35,
        "tags": [
          "高开",
          "放量"
        ]
      }
    ]
  }
}
```

### 返回字段

`data` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` | long | 接口响应组装时间，毫秒 Unix 时间戳。 |
| `date` | string | 最终查询日期，格式 `yyyy-MM-dd`。 |
| `date_ms` | long | 最终查询日期在 `Asia/Shanghai` 当日零点的毫秒 Unix 时间戳。 |
| `item` | array | 短线风向标竞价基准明细。 |

`data.item[]` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `thscode` | string | 完整 A 股 thscode。 |
| `ticker` | string | 纯股票代码。 |
| `name` | string | 股票简称。 |
| `auction_pct` | number | 集合竞价涨跌幅，百分数原值。 |
| `tags` | array | 短线风向标标签。 |

通用鉴权、响应信封与错误码参见 [API 参考](../README.md)。
