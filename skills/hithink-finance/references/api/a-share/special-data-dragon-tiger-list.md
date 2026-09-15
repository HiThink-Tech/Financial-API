# 龙虎榜数据

[业务导航](README.md)

龙虎榜数据按交易日返回 A 股龙虎榜首页整体榜单。一个接口覆盖“全部 / 机构榜 / 游资榜”，通过 `board_type` 区分。
接口固定返回全量数据，不分页。

返回统一响应信封 `ApiResponse`，业务错误经 `code` 字段表达，HTTP 状态码恒为 200。

<a id="接口列表"></a>

**接口列表**

| API | 方法与路径 | 说明 |
|---|---|---|
| 龙虎榜榜单 | `GET /api/a-share/special-data/dragon-tiger-list` | 按交易日返回全部、机构榜或游资榜。 |

<a id="龙虎榜榜单"></a>

```text
GET /api/a-share/special-data/dragon-tiger-list
```

按交易日返回龙虎榜首页整体榜单。省略 `date` 时，若今天是交易日则默认取上一个交易日；若今天不是交易日，则默认取今天之前最近一个交易日。
显式传入非交易日会返回参数错误，不自动回退。

## 请求参数

| 参数 | 位置 | 类型 | 必需 | 说明 | 默认值 |
|---|---|---|---|---|---|
| `board_type` | query | enum | 否 | 榜单类型：`all` 全部 / `org` 机构榜 / `hot_money` 游资榜。 | `all` |
| `date` | query | string | 否 | 目标交易日，格式 `yyyy-MM-dd`；只支持一年内数据。显式传入非交易日返回 `code=1002`。 | 最近可用交易日 |

## 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/a-share/special-data/dragon-tiger-list' \
  -H 'X-api-key: <your-api-key>'
```

```bash
curl 'https://fuyao.aicubes.cn/api/a-share/special-data/dragon-tiger-list?board_type=org&date=2026-07-01' \
  -H 'X-api-key: <your-api-key>'
```

```bash
curl 'https://fuyao.aicubes.cn/api/a-share/special-data/dragon-tiger-list?board_type=hot_money&date=2026-07-01' \
  -H 'X-api-key: <your-api-key>'
```

## 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "a1b2c3d4e5f6789012345678abcdef01",
  "data": {
    "timestamp": 1782921600000,
    "board_type": "all",
    "trade_date": "2026-07-01",
    "count": 80,
    "stock_count": 75,
    "stock_items": [
      {
        "thscode": "002407.SZ",
        "ticker": "002407",
        "name": "多氟多",
        "change": 0.09994,
        "net_value": 1786253128.23,
        "net_rate": 0.11901893,
        "hot_rank": 2,
        "buy_value": 2674755016.05,
        "sell_value": 888501887.82,
        "limit_reason": "半导体级氢氟酸涨价+六氟磷酸锂+大圆柱电池",
        "range_days": 3
      }
    ],
    "hot_money_items": []
  }
}
```

## 响应字段

`data` 为龙虎榜榜单容器：

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` | long | 目标交易日 `Asia/Shanghai` 00:00 毫秒时间戳。 |
| `board_type` | string | 实际榜单类型：`all` / `org` / `hot_money`。 |
| `trade_date` | string | 实际查询交易日，格式 `yyyy-MM-dd`。 |
| `count` | integer | 上游记录数；同一股票可能同时出现当日榜和 3 日榜。 |
| `stock_count` | integer | 股票去重数量。 |
| `stock_items` | array | 股票维度榜单；`board_type=all/org` 时填充，`hot_money` 时为空数组。 |
| `hot_money_items` | array | 游资维度聚合榜单；`board_type=hot_money` 时填充，普通榜单时为空数组。 |

`stock_items[]` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `thscode` | string | 带交易所后缀的标准代码，例如 `002407.SZ`。 |
| `ticker` | string | 6 位股票代码。 |
| `name` | string | 股票简称。 |
| `concept_list` | array | 所属概念列表，元素包含 `name`。 |
| `change` | number | 当日涨跌幅，小数形式。 |
| `net_value` | number | 龙虎榜净买入金额，单位元。 |
| `net_rate` | number | 龙虎榜净买入占比，小数形式。 |
| `hot_rank` | integer | 同花顺人气排名，数值越小越靠前。 |
| `buy_value` | number | 买方金额，单位元。 |
| `sell_value` | number | 卖方金额，单位元。 |
| `limit_reason` | string | 涨跌停原因。 |
| `range_days` | integer | 上榜区间天数，`1` 为当日榜，`3` 为 3 日榜。 |
| `org_net_value` | number | 机构净买入金额，单位元。 |
| `org_net_rate` | number | 机构净买入占比，小数形式。 |
| `org_buy_num` | integer | 买入机构数。 |
| `org_sell_num` | integer | 卖出机构数。 |
| `amount` | number | 成交金额，单位元。 |
| `hot_money_net_value` | number | 股票维度游资合计净买入金额，单位元。 |
| `hot_money_net_rate` | number | 股票维度游资合计净买入占比，小数形式。 |
| `hot_money_item_net_value` | number | 该游资在该股上的净买入金额，单位元。 |
| `hot_money_item_net_rate` | number | 该游资在该股上的净买入占比，小数形式。 |

`hot_money_items[]` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `name` | string | 游资名称。 |
| `buying` | number | 聚合净买入金额，单位元。 |
| `rows` | array | 该游资关联股票列表，字段同 `stock_items[]`。 |

## 约束与错误

- `board_type` 仅接受 `all` / `org` / `hot_money`，否则返回 `code=1002`。
- `date` 必须为 `yyyy-MM-dd`，否则返回 `code=1002`。
- 显式传入的 `date` 必须是 A 股交易日，否则返回 `code=1002`。
- `date` 不在一年内，或日期晚于今天时返回 `code=1003`。
