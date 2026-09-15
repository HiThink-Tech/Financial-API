# A股历史K线

[业务导航](README.md)

> **info**
> 工具名：`get_a_share_prices_historical`
>
> 对应 REST 端点：[`GET /api/a-share/prices/historical`](../../api/a-share/prices-historical.md#历史-k-线)


## 工具描述

> 获取单只 A 股标的的历史 K 线数据，窗口最长 10 年。支持前复权 / 后复权 / 不复权。
> 每次只能传一个 `thscode`，多标的请分多次调用。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 单只标的 thscode，不接受逗号。 |
| `interval` | enum | 是 | `1d` | K 线周期，**当前仅支持** `1d`(日线)。 |
| `start` | long | 是 | — | 起始时间，毫秒 Unix 时间戳。 |
| `end` | long | 是 | — | 结束时间，毫秒 Unix 时间戳。`end - start` 不超过 10 年。 |
| `adjust` | enum | 否 | `forward` | 复权方式：`none` / `forward` / `backward`。 |

## 调用示例

```text
工具：get_a_share_prices_historical
参数：
  - thscode: "600519.SH"
  - interval: "1d"
  - start: 1716105600000
  - end: 1747641600000
  - adjust: "forward"
```

## 返回

返回 `{ timestamp, item: [PriceBarItem, ...] }`。字段含义见 REST 端点
[历史 K 线](../../api/a-share/prices-historical.md#响应字段)。

```json
{
  "timestamp": 1747584000000,
  "item": [
    {
      "date_ms": 1716134400000,
      "open_price": 1611.602,
      "high_price": 1626.602,
      "low_price": 1601.722,
      "close_price": 1602.612,
      "volume": 3142572.0,
      "turnover": 5401389334.87
    }
  ]
}
```
