# 期货合约基础信息列表

[业务导航](README.md)

> **info**
> 工具名：`get_futures_contracts_list`
>
> 对应 REST 端点：[`GET /api/futures/contracts/list`](../../api/futures/contracts-list.md#contracts-list)


## 工具描述

> 从完整目录快照分页查询期货合约基础信息。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `limit` | integer | 否 | `100` | 单页条数，范围 1-1000。 |
| `offset` | integer | 否 | `0` | 分页偏移。 |

## 调用示例

```text
工具：get_futures_contracts_list
参数：
  - limit: 100
  - offset: 0
```

## 返回

返回期货合约基础信息分页列表，字段详见 [期货合约基础资料](../../api/futures/contracts-list.md#contracts-list)。
