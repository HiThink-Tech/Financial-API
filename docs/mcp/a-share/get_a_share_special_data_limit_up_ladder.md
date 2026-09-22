# A股涨停天梯

[业务导航](README.md)

> **info**
> 工具名：`get_a_share_special_data_limit_up_ladder`
>
> 对应 REST 端点：[`GET /api/a-share/special-data/limit-up-ladder`](../../api/a-share/limit-up-data.md#special-data-limit-up-ladder--连板天梯)


## 工具描述

> 返回 A 股近 30 个交易日的连板梯队矩阵（按日期 -> 6 个板 -> 股票列表），
> 用于近期连板分布、次日晋级追踪等分析。无入参；上游当前固定返回 30 日，每个板位最多 4 只。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| — | — | — | — | 无入参。 |

## 调用示例

```text
工具：get_a_share_special_data_limit_up_ladder
参数：（无）
```

## 返回

返回 `{ timestamp, window, item: [LimitUpLadderItem, ...] }`。
字段含义见 REST 端点 [连板天梯](../../api/a-share/limit-up-data.md#special-data-limit-down-pool--响应字段)。

```json
{
  "timestamp": 1748102400000,
  "window": {
    "length": 30,
    "date_list": ["20250620", "20250619"],
    "board_caps": {
      "two_board": 4,
      "three_board": 4,
      "four_board": 4,
      "five_board": 4,
      "six_board": 4,
      "seven_over": 4
    }
  },
  "item": [
    {
      "date": "20250620",
      "boards": {
        "two_board": [
          {
            "thscode": "603986.SH",
            "ticker": "603986",
            "name": "兆易创新",
            "board_num": 2,
            "seal_nextday": null,
            "sign_level": 1
          }
        ],
        "three_board": [],
        "four_board": [],
        "five_board": [],
        "six_board": [],
        "seven_over": []
      }
    }
  ]
}
```
