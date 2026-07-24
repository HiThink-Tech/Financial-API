# A 股估值数据端点

> 批量查询 A 股最新估值快照。当前只提供最新快照，不提供历史估值、分页或客户端指标选择。

## 估值快照

```text
GET /api/a-share/valuations/snapshot
```

能力与 OpenAPI operationId：`get_a_share_valuations_snapshot`。

### 请求参数

| 参数 | 位置 | 类型 | 必填 | 说明 | 默认值 |
| --- | --- | --- | --- | --- | --- |
| `thscodes` | query | string | 是 | 英文逗号分隔的 A 股 `thscode` 列表；每项为 6 位数字加 `.SH`、`.SZ` 或 `.BJ`。原始 token 默认最多 100 个。 | — |

服务端先按原始 token 数量检查 100 个上限，再逐项去除首尾空白、转为大写并校验格式，最后去重且保留首次出现顺序。空 token、纯 6 位代码、非 A 股后缀或超过上限分别按既有 `1002` / `1003` 参数错误处理。

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/a-share/valuations/snapshot?thscodes=600519.SH,000001.SZ' \
  -H 'X-api-key: <your-api-key>'
```

### 响应字段

`data` 为 `{timestamp, total, item[]}`：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `timestamp` | long \| null | 返回行的固定五项指标中最新有效上游时间，毫秒 Unix 时间戳；无有效时间时为 `null`。 |
| `total` | integer | 实际返回的股票行数。 |
| `item` | array | 按规范化、去重后的请求顺序返回的股票估值行。 |

`item[]` 固定包含：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `thscode` | string | 完整 A 股 `thscode`。 |
| `ticker` | string | 6 位股票代码。 |
| `name` | string \| null | 股票名称。 |
| `pe_ttm` | number \| null | 市盈率 TTM。 |
| `pe_mrq` | number \| null | 市盈率 MRQ。 |
| `pb_mrq` | number \| null | 市净率 MRQ。 |
| `ps_ttm` | number \| null | 市销率 TTM。 |
| `pcf_ttm` | number \| null | 市现率 TTM。 |

五项估值指标允许为 `null` 或负数。`null` 表示上游没有有效值，负数可能反映亏损或负现金流；调用方不得自动补零、取绝对值或据此推断数据错误。

### 避错要点

- 先去重再判断上限：错误。上限按原始 token 计算，101 个重复代码仍然超限。
- 传指数代码或 `.TI` 板块：本端点只接受 A 股股票，不接受指数、板块或基金。
- 期待 `roe_ttm`、历史序列或自选指标：当前固定返回上述五项估值指标，不提供这些能力。
- 把 `timestamp` 当每一项指标自己的时间：它是本次返回中最新有效上游时间，不代表所有指标在该时点同时更新。
