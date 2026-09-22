# QDII 额度

[业务导航](README.md)

- [QDII额度汇总](#quota-summary)：`GET /api/fund/quota/summary`
- [QDII额度列表](#quota-list)：`GET /api/fund/quota/list`

- `tab` 以 URL 编码的 JSON 数组字符串传递；分类值由上游判定，未知分类按正常空结果返回。
- 本页接口不使用时间查询参数；返回字段 `year` 是上游提供的近一年收益率字符串，不作单位换算。
- 基金列表使用含市场后缀的完整 `thscode`；额度 `quota` 为 `null` 时表示无限额；`classify` 为共享基金额度类别列表，可为空。
- 分类、子分类和基金列表中的合法 `null` 占位保持原义。
- 示例参数已通过真实上游调用验证；额度和收益数据会随上游更新。

<a id="quota-summary"></a>
<a id="quota-summary--qdii额度汇总"></a>
## QDII额度汇总

```text
GET /api/fund/quota/summary
```

<a id="quota-summary--请求参数"></a>
### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `tab` | string | 是 | — | 分类数组 JSON 字符串，例如 `["nazhi100"]`。 |

<a id="quota-summary--请求示例"></a>
### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/quota/summary?tab=%5B%22nazhi100%22%5D' \
  -H 'X-api-key: <your-api-key>'
```

<a id="quota-summary--响应示例"></a>
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

<a id="quota-summary--返回字段"></a>
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

<a id="quota-list"></a>

<a id="quota-list--qdii额度列表"></a>
## QDII额度列表

```text
GET /api/fund/quota/list
```

<a id="quota-list--请求参数"></a>
### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `tab` | string | 是 | — | 分类数组 JSON 字符串。 |
| `buy` | boolean | 否 | — | 可购状态过滤；省略时不向上游注入默认值。 |

<a id="quota-list--请求示例"></a>
### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/quota/list?tab=%5B%22remen%22%5D&buy=true' \
  -H 'X-api-key: <your-api-key>'
```

<a id="quota-list--响应示例"></a>
### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "b8d9894004a04b3dbb93f8679e1de383",
  "data": [
    {
      "name": "remen",
      "sub_tab": [
        {
          "name": "all",
          "fund_list": [
            {
              "thscode": "539001.OF",
              "fund_name": "建信纳斯达克100指数(QDII)A人民币",
              "quota": "10.00",
              "year": "16.21",
              "classify": [
                "A",
                "C",
                "I"
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

<a id="quota-list--返回字段"></a>
### 返回字段

`data[]` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `name` | string | 分类名称。 |
| `sub_tab` | array | 子分类列表。 |

`data[].sub_tab[]` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `name` | string | 子分类名称。 |
| `fund_list` | array | 当前子分类下的基金列表。 |

`data[].sub_tab[].fund_list[]` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `thscode` | string | 含市场后缀的完整基金代码。 |
| `fund_name` | string | 基金名称。 |
| `quota` | string \| null | 基金额度；`null` 表示无限额。 |
| `year` | string \| null | 近一年收益率。 |
| `classify` | string[] \| null | 共享基金额度类别列表。 |
