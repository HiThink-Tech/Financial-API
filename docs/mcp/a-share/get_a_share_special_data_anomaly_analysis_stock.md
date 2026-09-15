# A股个股异动原因

[业务导航](README.md)

> **info**
> 工具名：`get_a_share_special_data_anomaly_analysis_stock`
>
> 对应 REST 端点：[`GET /api/a-share/special-data/anomaly-analysis-stock`](../../api/a-share/special-data-anomaly-analysis-stock.md#按股票查询个股异动原因)


## 工具描述

> 按同花顺代码批量查询当日个股异动原因，按请求代码首次出现顺序返回匹配记录；
> 格式合法但当日无异动的代码会被忽略。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscodes` | string | 是 | — | 逗号分隔的同花顺代码列表，例如 `600519.SH,000001.SZ`；支持 `SH` / `SZ` / `BJ` 后缀，大小写不敏感，去重前最多 50 个 token。 |

## 调用示例

```text
工具：get_a_share_special_data_anomaly_analysis_stock
参数：
  - thscodes: "600519.SH,000001.SZ"
```

## 返回

返回 `{ timestamp, item: [AnomalyAnalysisItem, ...] }`。
字段含义见 REST 端点 [按股票查询个股异动原因](../../api/a-share/special-data-anomaly-analysis-stock.md#按股票查询个股异动原因)。

```json
{
  "timestamp": 1751260800000,
  "item": [
    {
      "stock_name": "贵州茅台",
      "analysis_content": "公司股价出现异动，相关解读内容以服务端快照为准。",
      "keyword_list": ["白酒", "消费"],
      "thscode": "600519.SH",
      "tag_name": "大涨"
    }
  ]
}
```
