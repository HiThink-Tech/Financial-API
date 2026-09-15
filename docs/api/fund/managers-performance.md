# 基金经理业绩

[业务导航](README.md)

基金经理接口使用从基金基本资料中取得的 `manager_id`。

- `manager_id` 是基金经理 ID，可从基金基本资料返回值获取；收益率和占比字段为百分数原值。
- 下方示例于 2026-08-19 使用真实远端响应验证，选用宽基的沪深300ETF华泰柏瑞（`510300.SH`）及其管理人柳军（`H000200384`）；数据与时间戳会随数据源更新而变化。

## 基金经理业绩

```text
GET /api/fund/managers/performance
```

### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `manager_id` | string | 是 | — | 基金经理 ID。 |
| `range` | enum | 是 | — | `month` / `tmonth` / `year` / `nowyear` / `now`。 |

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/managers/performance?manager_id=H000200384&range=year' \
  -H 'X-api-key: <your-api-key>'
```

### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "89385428873f44a98cc27530b88c01c2",
  "data": {
    "timestamp": 1787140798642,
    "item": [
      {
        "date_ms": 1774281600000,
        "manager_return_pct": 2.2001672,
        "peer_return_pct": 5.75548505,
        "benchmark_return_pct": 4474.72
      }
    ]
  }
}
```

### 返回字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `date_ms` | long | 数据日期，毫秒 Unix 时间戳。 |
| `manager_return_pct` | number | 基金经理收益率，百分数原值。 |
| `peer_return_pct` | number | 同类收益率，百分数原值。 |
| `benchmark_return_pct` | number | 基准收益率，百分数原值。 |
