# 资金流向实时快照

[业务导航](README.md) · **端内专用** · [使用说明](../README.md#端内能力说明) · **待上线，当前不可调用**

主力资金模块提供单只 A 股的最新资金流向快照与分钟、日级历史序列。

- A 股标的使用单个完整 `thscode`，格式为 `6 位代码.交易所后缀`，例如 `600519.SH`、`000001.SZ` 或 `920002.BJ`。
- 资金金额单位为元。数据缺失时返回 `null`，不转换为 `0`。

## 资金流向实时快照

```text
GET /api/a-share/capital-flow/snapshot
```

查询单只 A 股最新的超大单、大单、中单和小单资金流入、流出及净额。

### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 单只 A 股完整代码；不支持批量、纯代码或非 A 股标的。 |

### 请求示例

以下命令仅展示接口路径与参数格式，当前不可用于外部调用。

```bash
curl 'https://fuyao.aicubes.cn/api/a-share/capital-flow/snapshot?thscode=600519.SH'
```

### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "6f6642eafac44c9489f1280bb2f16e1c",
  "data": {
    "timestamp": 1756742400000,
    "super_large": {
      "inflow_amount": 123456789.12,
      "outflow_amount": 100000000.00,
      "net_amount": 23456789.12
    },
    "large": {
      "inflow_amount": 86543210.50,
      "outflow_amount": 81234567.89,
      "net_amount": 5308642.61
    },
    "medium": {
      "inflow_amount": 45678901.23,
      "outflow_amount": 47890123.45,
      "net_amount": -2211222.22
    },
    "small": {
      "inflow_amount": 23456789.01,
      "outflow_amount": 26789012.34,
      "net_amount": -3332223.33
    }
  }
}
```

### 返回字段

`data` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` | long \| null | 最新有效数据时间；没有可用时间时为 `null`。 |
| `super_large` | object | 超大单资金对象。 |
| `large` | object | 大单资金对象。 |
| `medium` | object | 中单资金对象。 |
| `small` | object | 小单资金对象。 |

四类资金对象字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `inflow_amount` | number \| null | 流入金额，单位为元。 |
| `outflow_amount` | number \| null | 流出金额，单位为元。 |
| `net_amount` | number \| null | 净额，单位为元。 |

没有可用资金流向值时，接口仍返回 `code=0` 和四类资金对象，其中各金额字段为 `null`。
