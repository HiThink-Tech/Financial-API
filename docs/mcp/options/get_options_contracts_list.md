# 期权合约基础信息列表

[业务导航](README.md)

> **info**
> 工具名：`get_options_contracts_list`
>
> 对应 REST 端点：[`GET /api/options/contracts/list`](../../api/options/options-reference.md#contracts-list--contracts-list)


## 工具描述

> 从完整目录快照分页查询期权合约基础信息。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `limit` | integer | 否 | `100` | 单页条数，范围 1-1000。 |
| `offset` | integer | 否 | `0` | 分页偏移。 |

## 调用示例

```text
工具：get_options_contracts_list
参数：
  - limit: 100
  - offset: 0
```

## 返回

返回期权合约基础信息分页列表，字段详见 [期权合约基础资料](../../api/options/options-reference.md#contracts-list--contracts-list)。
