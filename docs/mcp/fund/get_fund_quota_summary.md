# QDII额度汇总

[业务导航](README.md)

> **info**
> 工具名：`get_fund_quota_summary`
>
> 对应 REST 端点：[`GET /api/fund/quota/summary`](../../api/fund/quota-summary.md#qdii额度汇总)


## 工具描述

> 返回指定分类的无限额、限额、基金与可购数量。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `tab` | string | 是 | — | 分类字符串数组的 JSON，例如 `["nazhi100"]`。 |

## 调用示例

```text
工具：get_fund_quota_summary
参数：
  - tab: "[\"nazhi100\"]"
```

## 返回

返回分类额度汇总；详见[QDII额度汇总](../../api/fund/quota-summary.md#qdii额度汇总)。
