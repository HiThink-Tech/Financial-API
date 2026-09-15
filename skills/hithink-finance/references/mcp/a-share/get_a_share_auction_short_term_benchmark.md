# 短线风向标竞价基准

[业务导航](README.md)

> **info**
> 工具名：`get_a_share_auction_short_term_benchmark`
>
> 对应 REST 端点：[`GET /api/a-share/auction/short-term-benchmark`](../../api/a-share/auction-short-term-benchmark.md#短线风向标竞价基准)


## 工具描述

> 查询短线风向标集合竞价基准数据。未指定日期或传入空字符串时，默认查询 `Asia/Shanghai` 当日；显式指定非交易日时不自动回退。
> 返回的 `date` / `date_ms` 是最终查询日期，`timestamp` 是接口响应组装时间。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `date` | string | 否 | 上海时区当日 | `yyyy-MM-dd` 格式；缺失或空字符串时使用 `Asia/Shanghai` 当日。 |

## 调用示例

```text
工具：get_a_share_auction_short_term_benchmark
参数：
  - date: "2026-08-14"
```

## 返回

返回 `{ timestamp, date, date_ms, item[] }`。`timestamp` 是接口响应组装时间，`date` / `date_ms` 是最终查询日期；明细包含标准代码、名称、竞价涨跌幅和标签。字段见 [短线风向标竞价基准](../../api/a-share/auction-short-term-benchmark.md#短线风向标竞价基准)。
