# 连板天梯

[业务导航](README.md)

涨跌停与炸板数据提供 A 股涨停、跌停、炸板股票池与连板天梯能力，适合盘面复盘、短线情绪分析和连板梯队观察。
返回统一响应信封 `ApiResponse`，业务错误经 `code` 字段表达，HTTP 状态码恒为 200。

<a id="接口列表"></a>

**接口列表**

| API | 方法与路径 | 说明 |
|---|---|---|
| 涨停股票池 | `GET /api/a-share/special-data/limit-up-pool` | 按交易日返回 A 股涨停 / 连板股票池。 |
| 跌停股票池 | `GET /api/a-share/special-data/limit-down-pool` | 按交易日返回 A 股跌停股票池。 |
| 炸板股票池 | `GET /api/a-share/special-data/limit-break-pool` | 按交易日返回 A 股涨停炸板股票池。 |
| 连板天梯 | `GET /api/a-share/special-data/limit-up-ladder` | 返回近 30 个交易日的连板梯队矩阵。 |

## 连板天梯

```text
GET /api/a-share/special-data/limit-up-ladder
```

返回 A 股近 30 个交易日的连板梯队矩阵（按日期 -> 6 个板 -> 股票列表），用于近期连板分布、次日晋级追踪等分析。
无入参；上游当前固定返回 30 日，每个板位最多 4 只。

### 请求参数

| 参数 | 位置 | 类型 | 必需 | 说明 | 默认值 |
|---|---|---|---|---|---|
| - | - | - | - | 无入参。 | - |

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/a-share/special-data/limit-up-ladder' \
  -H 'X-api-key: <your-api-key>'
```

### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "a1b2c3d4e5f6789012345678abcdef01",
  "data": {
    "timestamp": 1748102400000,
    "window": {
      "length": 30,
      "date_list": [
        "20250620",
        "20250619"
      ],
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
}
```

### 响应字段

`data` 为 `LimitUpLadderData`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` | long | 数据就绪时间（毫秒）。 |
| `window` | object | 窗口元信息。 |
| `item` | array | 按交易日组织的连板矩阵。 |

`window` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `length` | integer | 交易日窗口长度。 |
| `date_list` | string[] | 窗口内交易日列表，按后端返回顺序排列。 |
| `board_caps` | object | 每个板位的最大列表长度。 |

`item[].boards` 固定包含 `two_board`、`three_board`、`four_board`、`five_board`、`six_board`、`seven_over` 六个数组；上游缺失的板位会补为 `[]`。

`boards.*[]` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `thscode` | string | 带交易所后缀的标准代码。 |
| `ticker` | string | 6 位股票代码。 |
| `name` | string | 股票简称。 |
| `board_num` | integer | 连板数。 |
| `seal_nextday` | boolean \| null | 次一交易日是否继续封板；最近交易日没有次日参考，固定为 `null`。 |
| `sign_level` | integer | 上游标记等级。 |
