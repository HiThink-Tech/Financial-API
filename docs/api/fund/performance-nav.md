# 基金净值

[业务导航](README.md)

- `thscode` 是基金唯一标识，必须保留市场后缀。收益率、占比和回撤字段为百分数原值。

## 基金净值

```text
GET /api/fund/performance/nav
```

### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode，必须保留市场后缀。 |
| `range` | string | 否 | 最新一条 | `week` / `month` / `tmonth` / `hyear` / `year` / `twoyear` / `tyear` / `fyear`。 |
| `nav_type` | string | 否 | `unit,adj` | `unit`（单位净值）/ `adj`（复权净值）/ `unit,adj`（同时返回）。 |

不传 `range` 时最多返回最新一个净值日期；传入后按 `nav_date` 升序返回区间序列。
`unit_nav` 为单位净值，`adj_nav` 为复权净值，复权净值不等同于累计净值。

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/performance/nav?thscode=510300.SH&range=year&nav_type=unit' \
  -H 'X-api-key: <your-api-key>'
```

### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "97634b0fbf4746afaa32e8a71adbd636",
  "data": {
    "timestamp": 1784131200000,
    "item": [
      {
        "nav_date": 1752595200000,
        "unit_nav": 4.0713
      },
      {
        "nav_date": 1752681600000,
        "unit_nav": 4.1015
      }
    ]
  }
}
```

### 返回字段

`data.item[]` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `nav_date` | long | 净值日期，毫秒级 Unix 时间戳。 |
| `unit_nav` | number | 单位净值；未通过 `nav_type` 请求时不输出。 |
| `adj_nav` | number | 复权净值；未通过 `nav_type` 请求时不输出，不等同于累计净值。 |
