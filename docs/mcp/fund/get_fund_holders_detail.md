# 基金持有人结构

[业务导航](README.md)

> **info**
> 工具名：`get_fund_holders_detail`
>
> 对应 REST 端点：[`GET /api/fund/holders/detail`](../../api/fund/fund-holders.md#holders-detail)


## 工具描述

> 查询基金持有人结构，支持合并份额、独立份额或全部披露口径，返回实际口径、报告日、机构占比、持有人户数、户均持有份额、个人投资者占比和管理人员工持有比例。暂无可用数据时返回 `code=3002`。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode，必须保留市场后缀。 |
| `merge_scope` | enum | 否 | `all` | `all` / `merged` / `separate`；`all` 分别返回合并与独立份额的最新记录。 |

## 调用示例

```text
工具：get_fund_holders_detail
参数：
  - thscode: "161725.SZ"
  - merge_scope: "all"
```

## 返回

返回 `{ timestamp, item: [FundHoldersItem, ...] }`。`all` 时 `item` 最多包含 `merged` 和 `separate` 两条最新记录；单一口径最多一条。字段含义见 REST 端点
[基金持有人结构](../../api/fund/fund-holders.md#holders-detail--返回字段)。
