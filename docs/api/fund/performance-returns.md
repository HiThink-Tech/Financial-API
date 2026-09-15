# 基金区间收益

[业务导航](README.md)

- `thscode` 是基金唯一标识，必须保留市场后缀。收益率、占比和回撤字段为百分数原值。

## 基金区间收益

```text
GET /api/fund/performance/returns
```

### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode，必须保留市场后缀。 |

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/performance/returns?thscode=510300.SH' \
  -H 'X-api-key: <your-api-key>'
```

### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "61cb2a8b9340483aaf00e36748f77918",
  "data": {
    "timestamp": 0,
    "item": [
      {
        "return_month": -3.33,
        "return_tmonth": 0.03,
        "return_hyear": 0.19,
        "return_year": 19.66,
        "return_tyear": 28.69,
        "return_fyear": 1.77,
        "return_nowyear": 2.49,
        "return_now": 121.58
      }
    ]
  }
}
```

### 返回字段

`data.item[]` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `return_month` | number | 近一月收益率，百分数原值。 |
| `return_week` | number | 近一周收益率，百分数原值。 |
| `return_tmonth` | number | 近三月收益率，百分数原值。 |
| `return_hyear` | number | 近半年收益率，百分数原值。 |
| `return_year` | number | 近一年收益率，百分数原值。 |
| `return_twoyear` | number | 近两年收益率，百分数原值。 |
| `return_tyear` | number | 近三年收益率，百分数原值。 |
| `return_fyear` | number | 近五年收益率，百分数原值。 |
| `return_nowyear` | number | 今年以来收益率，百分数原值。 |
| `return_now` | number | 成立以来收益率，百分数原值。 |
| `peer_average_*` | number | 对应周期的同类平均收益率；周期后缀覆盖 `week`、`month`、`tmonth`、`hyear`、`year`、`twoyear`、`tyear`、`fyear`。 |
| `rank_*` / `rank_total_*` | integer | 对应周期的同类排名与参与排名总数。 |
