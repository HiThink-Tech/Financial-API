# 资金流向历史

[业务导航](README.md) · **端内专用** · [使用说明](../README.md#端内能力说明) · **待上线，当前不可调用**

主力资金模块提供单只 A 股的最新资金流向快照与分钟、日级历史序列。

- A 股标的使用单个完整 `thscode`，格式为 `6 位代码.交易所后缀`，例如 `600519.SH`、`000001.SZ` 或 `920002.BJ`。
- 资金金额单位为元。数据缺失时返回 `null`，不转换为 `0`。

## 资金流向历史

```text
GET /api/a-share/capital-flow/historical
```

查询单只 A 股的 1 分钟或日级资金流向历史。结果按 `date_ms` 升序排列。

### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 单只 A 股完整代码；不支持批量、纯代码或非 A 股标的。 |
| `interval` | enum | 是 | — | `1m`（1 分钟）或 `1d`（日）。 |
| `start` | long | 是 | — | 起始时间，毫秒级 Unix 时间戳，必须大于等于 `0`。 |
| `end` | long | 是 | — | 结束时间，毫秒级 Unix 时间戳，必须大于等于 `start`。`1m` 窗口最多 7 个自然日；`1d` 的结束日期不得晚于开始日期加 1 年。 |

### 请求示例

以下命令仅展示接口路径与参数格式，当前不可用于外部调用。

```bash
curl 'https://fuyao.aicubes.cn/api/a-share/capital-flow/historical?thscode=600519.SH&interval=1d&start=1725148800000&end=1756684800000'
```

### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "d3a7750a0e6b4176a0f9ae66a8010a43",
  "data": {
    "timestamp": 1756684800000,
    "thscode": "600519.SH",
    "interval": "1d",
    "item": [
      {
        "date_ms": 1756684800000,
        "super_large": {
          "inflow_amount": 123456789.12,
          "outflow_amount": 100000000.00
        },
        "large": {
          "inflow_amount": 86543210.50,
          "outflow_amount": 81234567.89
        },
        "medium": {
          "inflow_amount": 45678901.23,
          "outflow_amount": 47890123.45
        },
        "small": {
          "inflow_amount": 23456789.01,
          "outflow_amount": 26789012.34
        }
      }
    ]
  }
}
```

### 返回字段

`data` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` | long \| null | 返回序列中的最新有效时间点；无数据时为 `null`。 |
| `thscode` | string | 请求的 A 股完整代码。 |
| `interval` | string | 请求周期，值为 `1m` 或 `1d`。 |
| `item` | array | 按 `date_ms` 升序排列的历史点；无数据时为空数组。 |

`data.item[]` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `date_ms` | long | 当前历史点时间，毫秒级 Unix 时间戳。 |
| `super_large` | object | 超大单资金对象。 |
| `large` | object | 大单资金对象。 |
| `medium` | object | 中单资金对象。 |
| `small` | object | 小单资金对象。 |

四类历史资金对象字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `inflow_amount` | number \| null | 流入金额，单位为元。 |
| `outflow_amount` | number \| null | 流出金额，单位为元。 |

历史接口不返回 `net_amount`。合法时间窗内没有数据时，接口返回 `code=0`、`timestamp=null` 和空 `item`。
