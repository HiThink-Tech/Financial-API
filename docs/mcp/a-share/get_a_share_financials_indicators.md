# 财务指标数据

[业务导航](README.md)

> **info**
> 工具名：`get_a_share_financials_indicators`
>
> 对应 REST 端点：[`GET /api/a-share/financials/indicators`](../../api/a-share/financials-indicators.md)


## 工具描述

获取单只 A 股在指定报告期的财务指标数据，一次返回成长、盈利、偿债、营运、现金流五类能力下的指标 ID 与本期值。

`report` 格式为 `yyyy-1`、`yyyy-2`、`yyyy-3`、`yyyy-4`，其中 `1` 一季报、`2` 中报、`3` 三季报、`4` 年报。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | `300033.SZ` | 单只标的 thscode，含交易所后缀。 |
| `report` | string | 是 | `2025-1` | 报告期，格式见上方说明。 |

## 调用示例

```text
工具：get_a_share_financials_indicators
参数：
  - thscode: "300033.SZ"
  - report: "2025-1"
```

## 返回

返回 `{ thscode, report, abilities }`。`abilities[]` 按 `growth`、`profitability`、`solvency`、`operation`、`cash-flow` 顺序排列；每个能力块的 `indicators[]` 仅含 `index_id` / `value`。

`index_id` 使用 REST 文档列出的接口契约字段名；`value` 为 `string | null`。服务端保留数据源原始数值字符串，不承诺固定小数位；上游空值或缺失值标准化为 `null`。百分比类指标按百分数值表达，周转率、比率、倍数类指标按指标名称对应单位解释。

字段含义见 REST 端点 [财务指标数据](../../api/a-share/financials-indicators.md)。
