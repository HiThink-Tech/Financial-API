# 基金基本资料

[业务导航](README.md)

> **info**
> 工具名：`get_fund_profile_detail`
>
> 对应 REST 端点：[`GET /api/fund/profile/detail`](../../api/fund/profile-detail.md)


## 工具描述

> 查询单只基金的基础资料，返回代码、名称、成立日期、公司、基金经理、规模、单位净值、交易规则与费率。
> 基金工具使用完整 `thscode` 唯一定位基金。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode，必须保留市场后缀，如 `025480.OF` / `510300.SH`。 |

## 调用示例

```text
工具：get_fund_profile_detail
参数：
  - thscode: "025480.OF"
```

## 返回

返回 `{ timestamp, item: [FundProfileItem, ...] }`。字段含义见 REST 端点
[基金基本资料](../../api/fund/profile-detail.md#返回字段)。
