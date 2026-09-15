# 基金画线指标

[业务导航](README.md)

- 对象和数组参数以 URL 编码的 JSON 字符串传递；指标值、动态属性、空值和 `idx` 关联保持上游语义。
- 证券与基金均使用含市场后缀的完整 `thscode`；批量字段使用 `thscodes`，例如 `000001.OF`。
- 画线接口的 `time_range.start`、`time_range.end` 及响应时间轴使用 Unix 毫秒整数。指标元信息中的正数 `timestamp` 也是 Unix 毫秒，`0` 和负数表示位置选择。
- 响应中的合法 `null` 数组占位和可空业务字段保持原义。
- 示例参数已通过真实上游调用验证；返回数据会随上游更新。

## 基金画线指标

```text
GET /api/fund/indicators/line
```

### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `indexes` | string | 是 | — | 指标分组 JSON 数组。每组必须包含完整代码数组 `thscodes` 和指标数组 `index_info`；`index_info[]` 必须包含字符串 `index_id`，可按指标定义提供 `attribute`。 |
| `time_range` | string | 是 | — | 时间范围 JSON 对象。`time_type` 字符串必填；`start`、`end` 为 Unix 毫秒整数，`offset` 为整数周期偏移。 |

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/indicators/line?indexes=%5B%7B%22thscodes%22%3A%5B%22000001.OF%22%5D%2C%22index_info%22%3A%5B%7B%22index_id%22%3A%22rsi_pct%22%7D%5D%7D%5D&time_range=%7B%22time_type%22%3A%22DAY_1%22%2C%22start%22%3A1788192000000%2C%22end%22%3A1788796800000%7D' \
  -H 'X-api-key: <your-api-key>'
```

### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "d7f643cb1f564de7b0922aeab12602e6",
  "data": {
    "time_range": [
      1788192000000,
      1788278400000,
      1788364800000,
      1788451200000,
      1788710400000,
      1788796800000
    ],
    "indexes": [
      {
        "index_id": "rsi_pct",
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
            "values": [
              43.29,
              39.94,
              27.61,
              23.6,
              43.48,
              40.7
            ]
          }
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
| `time_range` | integer array | Unix 毫秒时间轴，与每组 `values` 按位置对应；数组元素可为 `null`。 |
| `indexes` | array | 指标元信息。 |
| `data` | array | 按代码组织的指标序列。 |

`data.indexes[]` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `index_id` | string | 指标编码。 |
| `value_type` | string \| null | 指标值类型。 |
| `timestamp` | integer \| null | 正数为 Unix 毫秒时间戳；`0` 和负数表示位置选择。 |
| `time_type` | string \| null | 指标时间类型。 |
| `attribute` | JSON \| null | 动态指标属性。 |

`data.data[]` 及其 `values[]` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `thscode` | string | 含市场后缀的完整同花顺代码。 |
| `values[].idx` | integer | 对应 `data.indexes[]` 的指标下标。 |
| `values[].values` | JSON array | 与 `data.time_range` 对应的指标值序列。 |
