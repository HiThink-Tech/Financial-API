# 基金持有人结构

[业务导航](README.md)

- `thscode` 是基金唯一标识，必须保留市场后缀。占比字段为百分数原值，例如 `8.88` 表示 `8.88%`。

## 基金持有人结构

```text
GET /api/fund/holders/detail
```

### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode，必须保留市场后缀。 |
| `merge_scope` | enum | 否 | `all` | `all`（分别返回合并/独立份额的最新记录）/ `merged`（A/C 等份额合并披露）/ `separate`（当前份额独立披露）。 |

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/holders/detail?thscode=161725.SZ&merge_scope=all' \
  -H 'X-api-key: <your-api-key>'
```

### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "efcdf379c79349ec8a2eb7bdf0d27882",
  "data": {
    "timestamp": 1767110400000,
    "item": [
      {
        "merge_scope": "merged",
        "report_date_ms": 1609344000000,
        "ins_position": 0.1800,
        "holder_amount": 7058156,
        "avg_holder_share": 4819.4200,
        "psnl_rate": 99.8200,
        "mgmt_staff_hold_rate": 0.0062
      },
      {
        "merge_scope": "separate",
        "report_date_ms": 1767110400000,
        "ins_position": 0.9700,
        "holder_amount": 3951034,
        "avg_holder_share": 10159.8300,
        "psnl_rate": 99.0300,
        "mgmt_staff_hold_rate": 0.0097
      }
    ]
  }
}
```

### 返回字段

`data.item[]` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `merge_scope` | string | 该条记录的实际披露口径：`merged` 或 `separate`。 |
| `report_date_ms` | integer | 该条记录的披露报告日，毫秒 Unix 时间戳。 |
| `ins_position` | number | 机构投资者占比，百分数原值。 |
| `holder_amount` | integer | 基金份额持有人户数。 |
| `avg_holder_share` | number | 平均每户持有基金份额。 |
| `psnl_rate` | number | 个人投资者占比，百分数原值。 |
| `mgmt_staff_hold_rate` | number | 管理人员工持有比例，百分数原值。 |

`merge_scope=all` 时 `item` 最多包含两条：`merged` 和 `separate` 口径各自报告日最新的记录。指定单一口径时最多返回一条。`data.timestamp` 取返回记录中最新的报告日；所选口径暂无可用数据时返回 `code=3002`。
