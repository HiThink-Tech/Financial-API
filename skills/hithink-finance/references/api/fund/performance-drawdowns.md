# 基金最大回撤

[业务导航](README.md)

- `thscode` 是基金唯一标识，必须保留市场后缀。收益率、占比和回撤字段为百分数原值。

## 基金最大回撤

```text
GET /api/fund/performance/drawdowns
```

### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode。 |

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/performance/drawdowns?thscode=510300.SH' \
  -H 'X-api-key: <your-api-key>'
```

### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "7c7fdfe771fc4c61bbab8410a250b61e",
  "data": {
    "timestamp": 1786690800000,
    "item": [
      {
        "thscode": "510300.SH",
        "ticker": "510300",
        "week": -1.2,
        "month": -3.6,
        "tmonth": -6.8,
        "hyear": -9.1,
        "year": -12.5,
        "twoyear": -18.4,
        "tyear": -21.7,
        "fyear": -28.9,
        "nowyear": -7.3,
        "now": -31.2
      }
    ]
  }
}
```

### 返回字段

`data.timestamp` 为接口响应时间戳；`data.item[]` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `thscode` / `ticker` | string | 完整基金代码与纯代码。 |
| `week` / `month` / `tmonth` | number | 近一周、近一月、近三月最大回撤。 |
| `hyear` / `year` / `twoyear` | number | 近半年、近一年、近两年最大回撤。 |
| `tyear` / `fyear` | number | 近三年、近五年最大回撤。 |
| `nowyear` / `now` | number | 今年以来、成立以来最大回撤。 |

通用参数与错误码参见[基金 API 总览](README.md)。
