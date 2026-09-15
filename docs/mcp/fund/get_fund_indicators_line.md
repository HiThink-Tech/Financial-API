# 基金画线指标

[业务导航](README.md)

> **info**
> 工具名：`get_fund_indicators_line`
>
> 对应 REST 端点：[`GET /api/fund/indicators/line`](../../api/fund/indicators-line.md#基金画线指标)


## 工具描述

> 查询按时间轴和 idx 关联的基金指标数值。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `indexes` | string | 是 | — | 分组 JSON 数组；每组 `thscodes` 为完整代码数组，`index_info` 包含 `index_id` 及可选 `attribute`。 |
| `time_range` | string | 是 | — | JSON 对象；`time_type` 必填，`start`、`end` 为 Unix 毫秒整数，`offset` 为整数周期偏移。 |

## 调用示例

```text
工具：get_fund_indicators_line
参数：
  - indexes: "[{\"thscodes\":[\"000001.OF\"],\"index_info\":[{\"index_id\":\"rsi_pct\"}]}]"
  - time_range: "{\"time_type\":\"DAY_1\",\"start\":1788192000000,\"end\":1788796800000}"
```

## 返回

返回 Unix 毫秒时间轴、指标元信息、完整 `thscode` 和数值数组；详见[基金画线指标](../../api/fund/indicators-line.md#基金画线指标)。
