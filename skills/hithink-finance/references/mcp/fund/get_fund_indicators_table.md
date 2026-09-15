# 基金表格指标

[业务导航](README.md)

> **info**
> 工具名：`get_fund_indicators_table`
>
> 对应 REST 端点：[`GET /api/fund/indicators/table`](../../api/fund/indicators-table.md#基金表格指标)


## 工具描述

> 查询可选代码选择器、指标、分页和排序条件对应的表格结果。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `code_selectors` | string | 否 | — | JSON 对象；`stock_code`、`fund_code` 类型使用完整 `thscodes`，其它实体类型使用 `values`。 |
| `indexes` | string | 否 | — | JSON 数组；`index_id` 必填，`timestamp` 可选，正数为 Unix 毫秒、`0` 为最新位置、负数为位置偏移。 |
| `page_info` | string | 否 | — | JSON 对象；`page_begin`、`page_size`、`code_begin`、`code_page_size` 为可选整数，起点为 `0`。 |
| `sort` | string | 否 | — | JSON 数组；每项包含整数指标下标 `idx` 和排序方向字符串 `type`。 |

## 调用示例

```text
工具：get_fund_indicators_table
参数：
  - code_selectors: "{\"include\":[{\"type\":\"fund_code\",\"thscodes\":[\"000001.OF\"]}]}"
  - indexes: "[{\"index_id\":\"maxDrawDownWeek\"},{\"index_id\":\"maxDrawDownNow\"}]"
```

## 返回

返回总数、指标元信息、完整 `thscode`、指标值及 `part_order_thscodes`；详见[基金表格指标](../../api/fund/indicators-table.md#基金表格指标)。
