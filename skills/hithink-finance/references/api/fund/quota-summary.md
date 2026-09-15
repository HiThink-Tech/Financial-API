# QDII额度汇总

[业务导航](README.md)

- `tab` 以 URL 编码的 JSON 数组字符串传递；分类值由上游判定，未知分类按正常空结果返回。
- 本页接口不使用时间查询参数；返回字段 `year` 是上游提供的近一年收益率字符串，不作单位换算。
- 基金列表使用含市场后缀的完整 `thscode`；额度 `quota` 为 `null` 时表示无限额。
- 分类、子分类和基金列表中的合法 `null` 占位保持原义。
- 示例参数已通过真实上游调用验证；额度和收益数据会随上游更新。

## QDII额度汇总

```text
GET /api/fund/quota/summary
```

### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `tab` | string | 是 | — | 分类数组 JSON 字符串，例如 `["nazhi100"]`。 |

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/quota/summary?tab=%5B%22nazhi100%22%5D' \
  -H 'X-api-key: <your-api-key>'
```

### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "6c7651d4a90141cda51b1fa16ed76272",
  "data": [
    {
      "name": "nazhi100",
      "unlimited": "0",
      "total_limit": "10690.00",
      "total": "25",
      "buy": "25"
    }
  ]
}
```

### 返回字段

`data[]` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `name` | string | 分类名称。 |
| `unlimited` | string | 无额度限制的基金数。 |
| `total_limit` | string | 限额合计。 |
| `total` | string | 基金总数。 |
| `buy` | string | 可购基金数。 |

数值以字符串原样返回，不作单位转换。
