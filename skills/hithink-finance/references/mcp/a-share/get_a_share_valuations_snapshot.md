# A股估值快照

[业务导航](README.md)

> **info**
> 工具名：`get_a_share_valuations_snapshot`
>
> 对应 REST 端点：[`GET /api/a-share/valuations/snapshot`](../../api/a-share/valuations-snapshot.md)


## 工具描述

批量查询 A 股最新估值快照。`thscodes` 使用英文逗号分隔，大小写不敏感；
服务端会 trim、转为大写、去重并保留首次出现顺序，一次默认最多接受 100 个原始 token。

工具固定返回市盈率 TTM/MRQ、市净率 MRQ、市销率 TTM 和市现率 TTM 五个估值指标，
不提供历史估值、分页、指标选择或高低估结论。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscodes` | string | 是 | `600519.SH,000001.SZ` | 英文逗号分隔的 A 股 thscode 列表；每项必须为六位数字加 `.SH`、`.SZ` 或 `.BJ`。 |

## 调用示例

```text
工具：get_a_share_valuations_snapshot
参数：
  - thscodes: "600519.SH,000001.SZ"
```

## 返回

返回 `{ timestamp, total, item: [ValuationSnapshotItem, ...] }`。`item[]` 固定包含
`thscode`、`ticker`、`name`、`pe_ttm`、`pe_mrq`、`pb_mrq`、`ps_ttm`、`pcf_ttm`。

```json
{
  "timestamp": 1784736000000,
  "total": 1,
  "item": [
    {
      "thscode": "600519.SH",
      "ticker": "600519",
      "name": "贵州茅台",
      "pe_ttm": 21.3567,
      "pe_mrq": 20.8841,
      "pb_mrq": 7.1532,
      "ps_ttm": 10.3284,
      "pcf_ttm": 19.7716
    }
  ]
}
```

指标值为 `number | null`，负值和高精度十进制值原样返回。上游未返回的股票不生成占位项；
无匹配记录时返回 `total=0`、`item=[]`。完整字段和错误码见 REST 文档
[估值数据](../../api/a-share/valuations-snapshot.md)。
