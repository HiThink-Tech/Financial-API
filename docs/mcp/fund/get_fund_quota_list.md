# QDII额度列表

[业务导航](README.md)

> **info**
> 工具名：`get_fund_quota_list`
>
> 对应 REST 端点：[`GET /api/fund/quota/list`](../../api/fund/fund-quota.md#quota-list--qdii额度列表)


## 工具描述

> 返回分类、子分类和基金列表，保留可空额度、收益率与共享基金额度类别列表。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `tab` | string | 是 | — | 分类字符串数组的 JSON，例如 `["remen"]`。 |
| `buy` | boolean | 否 | — | 可购状态过滤；省略时不设置该过滤。 |

## 调用示例

```text
工具：get_fund_quota_list
参数：
  - tab: "[\"remen\"]"
  - buy: true
```

## 返回

返回分类下的完整基金 `thscode`、名称、额度、近一年收益率和可空 `classify` 类别列表；详见[QDII额度列表](../../api/fund/fund-quota.md#quota-list--qdii额度列表)。
