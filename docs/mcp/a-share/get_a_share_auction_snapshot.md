# A股集合竞价快照

[业务导航](README.md)

> **info**
> 工具名：`get_a_share_auction_snapshot`
>
> 对应 REST 端点：[`GET /api/a-share/auction/snapshot`](../../api/a-share/auction.md#auction-snapshot--a股集合竞价快照)


## 工具描述

> 查询一个或多个 A 股标的的集合竞价快照。
> `timestamp` 是接口响应组装时间，实时、终态、停牌及 `not_ready` 场景均会返回；上游行情时间仅用于判断数据新鲜度。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscodes` | string | 是 | — | 多个 A 股 thscode 使用英文逗号分隔；单次调用当前最多 100 个，按分隔后的原始 token 数在去重前校验。 |
| `stage` | enum | 否 | `final` | `live` / `final`。 |

## 调用示例

```text
工具：get_a_share_auction_snapshot
参数：
  - thscodes: "600519.SH,000001.SZ"
  - stage: "final"
```

## 返回

返回接口响应组装时间、集合竞价阶段、数据状态、总数及竞价明细；字段见 [A股集合竞价快照](../../api/a-share/auction.md#auction-snapshot--a股集合竞价快照)。
