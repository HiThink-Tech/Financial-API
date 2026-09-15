# 基金表格指标

[业务导航](README.md)

- 对象和数组参数以 URL 编码的 JSON 字符串传递；指标值、动态属性、空值和 `idx` 关联保持上游语义。
- 证券与基金均使用含市场后缀的完整 `thscode`；批量字段使用 `thscodes`，例如 `000001.OF`。
- 画线接口的 `time_range.start`、`time_range.end` 及响应时间轴使用 Unix 毫秒整数。指标元信息中的正数 `timestamp` 也是 Unix 毫秒，`0` 和负数表示位置选择。
- 响应中的合法 `null` 数组占位和可空业务字段保持原义。
- 示例参数已通过真实上游调用验证；返回数据会随上游更新。

## 基金表格指标

```text
GET /api/fund/indicators/table
```

### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `code_selectors` | string | 否 | — | 代码选择器 JSON 对象。`stock_code`、`fund_code` 类型必须使用完整代码数组 `thscodes`；其它实体类型使用 `values`。 |
| `indexes` | string | 否 | — | 指标 JSON 数组。`index_id` 字符串必填；`timestamp` 可选，正数为 Unix 毫秒，`0` 为最新位置，负数为位置偏移；`attribute` 按指标定义。 |
| `page_info` | string | 否 | — | 分页 JSON 对象。`page_begin`、`page_size`、`code_begin`、`code_page_size` 均为可选整数，起点为 `0`。 |
| `sort` | string | 否 | — | 排序 JSON 数组。每项的 `idx` 为指标下标整数，`type` 为排序方向字符串。 |

传入时，`code_selectors`、`page_info` 必须是 JSON 对象，`indexes`、`sort` 必须是 JSON 数组；省略任一参数时不会注入业务默认值。

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/indicators/table?code_selectors=%7B%22include%22%3A%5B%7B%22type%22%3A%22fund_code%22%2C%22thscodes%22%3A%5B%22000001.OF%22%5D%7D%5D%7D&indexes=%5B%7B%22index_id%22%3A%22maxDrawDownWeek%22%7D%2C%7B%22index_id%22%3A%22maxDrawDownNow%22%7D%5D' \
  -H 'X-api-key: <your-api-key>'
```

### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "9e12297c034b4362ad5a0383dc5fc1c0",
  "data": {
    "total": 1,
    "indexes": [
      {
        "index_id": "maxDrawDownWeek",
        "value_type": null,
        "timestamp": null,
        "time_type": null,
        "attribute": null
      },
      {
        "index_id": "maxDrawDownNow",
        "value_type": null,
        "timestamp": null,
        "time_type": null,
        "attribute": null
      }
    ],
    "data": [
      {
        "thscode": "000001.OF",
        "values": [
          {
            "idx": 0,
            "value": "3.127400"
          },
          {
            "idx": 1,
            "value": "59.088000"
          }
        ]
      }
    ],
    "part_order_thscodes": null
  }
}
```

### 返回字段

`data` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `total` | integer | 上游结果总数。 |
| `indexes` | array | 指标元信息，字段语义与画线接口一致。 |
| `data` | array | 按代码组织的指标值。 |
| `part_order_thscodes` | string array \| null | 部分排序结果的完整同花顺代码列表；元素可为 `null`。 |

`data.data[]` 及其 `values[]` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `thscode` | string | 含市场后缀的完整同花顺代码。 |
| `values[].idx` | integer | 对应 `data.indexes[]` 的指标下标。 |
| `values[].value` | JSON \| null | 单个表格指标值；数值字符串保持原样。 |
