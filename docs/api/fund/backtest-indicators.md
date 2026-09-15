# 基金回测可用指标

[业务导航](README.md)

- 回测基金使用含市场后缀的完整 `thscode`，例如 `000001.OF`；裸代码和上游市场代码不是公开入参。
- 回测条件以 URL 编码的 JSON 字符串传递；具体指标、操作符和阈值以“回测可用指标”返回结果为准。
- 回测日期使用 `yyyy-MM-dd` 字符串；数值和动态曲线键值保持上游语义，不进行单位换算。
- 示例参数已通过真实上游调用验证；返回数据会随上游更新，响应示例仅展示部分交易和曲线点。

## 基金回测可用指标

```text
GET /api/fund/backtest/indicators
```

### 请求参数

| 参数 | 位置 | 类型 | 必需 | 说明 | 默认值 |
|---|---|---|---|---|---|
| - | - | - | - | 无业务参数。 | - |

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/backtest/indicators' \
  -H 'X-api-key: <your-api-key>'
```

### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "af1c4ed643f744218950885dd58bd2c9",
  "data": [
    {
      "id": 1,
      "indicator_name": "净值波动",
      "indicator_code": "rsi_pct",
      "type": 0,
      "value_kind": 0,
      "support_operation": ">,<",
      "unit": null,
      "description": null,
      "state_rules": null,
      "create_time": "2026-05-27T16:57:32",
      "update_time": "2026-05-27T16:57:32"
    }
  ]
}
```

### 返回字段

`data[]` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | number | 指标标识。 |
| `indicator_name` | string | 指标名称。 |
| `indicator_code` | string | 指标编码。 |
| `type` | number | 上游定义的指标类型。 |
| `value_kind` | number | 上游定义的指标值类型。 |
| `support_operation` | string | 支持的条件操作符。 |
| `unit` | string \| null | 指标单位。 |
| `description` | string \| null | 指标说明。 |
| `state_rules` | string \| null | 状态规则。 |
| `create_time` | string | 上游记录创建时间，使用 ISO 本地日期时间。 |
| `update_time` | string | 上游记录更新时间，使用 ISO 本地日期时间。 |
