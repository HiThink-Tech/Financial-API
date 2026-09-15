# 基金募集列表

[业务导航](README.md)

> **info**
> 工具名：`get_fund_offerings_list`
>
> 对应 REST 端点：[`GET /api/fund/offerings/list`](../../api/fund/offerings-list.md)


## 工具描述

> 查询当前募集或即将募集的新发基金。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `subscribe` | enum | 是 | — | `active` / `upcoming`。 |

## 调用示例

```text
工具：get_fund_offerings_list
参数：
  - subscribe: "active"
```

## 返回

返回基金代码与募集起止时间；字段见 [基金募集列表](../../api/fund/offerings-list.md)。
