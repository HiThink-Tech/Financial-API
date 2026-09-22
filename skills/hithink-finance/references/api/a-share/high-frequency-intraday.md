# 单日高频分时

[业务导航](README.md) · **端内专用** · **同花顺AI客户端可用** · [使用说明](../README.md#端内能力说明)

高频动向模块提供单只 A 股个股或指数的日线、分钟线与单日分时序列。

- 本页接口结构用于说明同花顺AI客户端内的数据契约，当前不作为端外接入入口。
- 标的使用单个完整 `thscode`，支持 A 股个股与指数，例如 `600519.SH`、`000001.SZ` 或 `886042.TI`。
- 查询范围限定为当前最近 30 个 A 股交易日；指标保留原始数值与精度，不作单位或比例换算。数据缺失时返回 `null`，无数据时 `item` 为空数组。

## 单日高频分时

```text
GET /api/a-share/high-frequency/intraday
```

查询单只 A 股个股或指数在一个交易日内已经产生的高频动向点。省略日期时使用当前窗口中的最近交易日。

### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 单只 A 股个股或指数的完整代码；不支持批量、纯代码或其他资产类型。 |
| `date` | string | 否 | 最近交易日 | 指定交易日，格式为 `YYYY-MM-DD`，且必须位于当前最近 30 个 A 股交易日内。 |

### 请求示例

以下命令仅展示接口路径与参数格式，当前不可用于外部调用。

```bash
curl 'https://fuyao.aicubes.cn/api/a-share/high-frequency/intraday?thscode=886042.TI&date=2026-09-09'
```

### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "7db85bfddf5146f49034f42db6282188",
  "data": {
    "timestamp": 1788917400000,
    "thscode": "886042.TI",
    "interval": "trend",
    "item": [
      {
        "date_ms": 1788917400000,
        "hf_direction": -0.03125
      }
    ]
  }
}
```

### 返回字段

`data` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` | long \| null | 返回序列最后一个数据点的时间；无数据时为 `null`。 |
| `thscode` | string | 请求的完整 A 股个股或指数代码。 |
| `interval` | string | 固定为 `trend`。 |
| `item` | array | 按 `date_ms` 升序排列的当日高频动向点；无数据时为空数组。 |

`data.item[]` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `date_ms` | long | 当前数据点的毫秒级 Unix 时间戳。 |
| `hf_direction` | number \| null | 高频动向原值；保留原始精度，可能为 `null`。 |

单次请求只返回一个交易日的数据，多日分时需要按日期分别查询。合法交易日没有数据时，接口返回 `code=0`、`timestamp=null` 和空 `item`。
