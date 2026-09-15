# 财务指标数据

[业务导航](README.md)

财务指标数据模块返回单只 A 股在指定报告期下的五类指标数据。接口返回统一响应信封
`ApiResponse`，业务错误经 `code` 字段表达，HTTP 状态码恒为 200。

- `report` 格式为 `yyyy-1`、`yyyy-2`、`yyyy-3`、`yyyy-4`，其中 `1` 一季报、`2` 中报、`3` 三季报、`4` 年报。
- 指标项包含 `index_id` / `value`。`index_id` 使用下方表格列出的接口契约字段名，`value` 为数据源原始数值字符串；上游缺失时返回 `null`。

<a id="接口"></a>

**接口**

| REST 端点 | 说明 |
|---|---|
| `GET /api/a-share/financials/indicators` | 财务指标数据 |

<a id="财务指标数据"></a>

`GET /api/a-share/financials/indicators`

## 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 单只标的 thscode，含交易所后缀，如 `300033.SZ`。 |
| `report` | string | 是 | — | 报告期，示例 `2025-1`；格式见上方通用约定。 |

## 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/a-share/financials/indicators?thscode=300033.SZ&report=2025-1' \
  -H 'X-api-key: <your-api-key>'
```

## 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "a1b2c3d4e5f6789012345678abcdef01",
  "data": {
    "thscode": "300033.SZ",
    "report": "2025-1",
    "abilities": [
      {
        "ability": "growth",
        "indicators": [
          {
            "index_id": "total_assets_growth_ratio",
            "value": "-16.0031"
          }
        ]
      },
      {
        "ability": "profitability",
        "indicators": [
          {
            "index_id": "sale_gross_margin",
            "value": "89.12000000"
          },
          {
            "index_id": "earned_interest_multiple",
            "value": null
          }
        ]
      }
    ]
  }
}
```

## 响应字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `code` | integer | 业务状态码，`0` 表示成功。 |
| `message` | string | 业务状态说明。 |
| `request_id` | string | 请求追踪 ID。 |
| `data.thscode` | string | 入参 thscode 回显。 |
| `data.report` | string | 入参 report 回显。 |
| `data.abilities[]` | array | 五类能力块，固定顺序为 `growth`、`profitability`、`solvency`、`operation`、`cash-flow`。 |
| `data.abilities[].ability` | string | 能力标识。 |
| `data.abilities[].indicators[]` | array | 当前能力下的指标列表。 |
| `data.abilities[].indicators[].index_id` | string | 指标 ID，取值见下方表格。 |
| `data.abilities[].indicators[].value` | string \| null | 本期指标值。服务端保留数据源原始数值字符串，不承诺固定小数位；上游空值或缺失值标准化为 `null`。百分比类指标按百分数值表达，例如 `89.12000000` 表示 `89.12%`；周转率、比率、倍数类指标按指标名称对应单位解释。 |

> **note 数值口径**
> `value` 暂不转为 JSON number，是为了保留数据源精度和尾随小数位。调用方展示时应按 `index_id` 识别单位：名称含“增长率”“毛利率”“净利率”“收益率”“资产负债率”“现金比率”等的指标按百分比展示；“周转率”通常按次展示；“已获利息倍数”按倍展示；缺失值展示为 `--` 或空值。

## 指标字段

### 成长能力 `growth`

| `index_id` | 指标名称 |
|---|---|
| `total_assets_growth_ratio` | 总资产增长率 |
| `net_profit_yoy_growth_ratio` | 净利润同比增长率 |
| `operating_income_yoy_growth_ratio` | 营业收入同比增长率 |
| `operating_profit_yoy_growth_ratio` | 营业利润同比增长率 |

### 盈利能力 `profitability`

| `index_id` | 指标名称 |
|---|---|
| `sale_gross_margin` | 销售毛利率 |
| `sale_net_interest_ratio` | 销售净利率 |
| `total_assets_net_ratio` | 总资产收益率 |
| `index_deduct_weighted_avg_roe` | 扣非加权净资产收益率 |
| `index_weighted_avg_roe` | 净资产收益率 |

### 偿债能力 `solvency`

| `index_id` | 指标名称 |
|---|---|
| `current_ratio` | 流动比率 |
| `quick_ratio` | 速动比率 |
| `assets_debt_ratio` | 资产负债率 |
| `cash_ratio` | 现金比率 |
| `earned_interest_multiple` | 已获利息倍数 |

### 营运能力 `operation`

| `index_id` | 指标名称 |
|---|---|
| `long_term_debt_equity_ratio` | 长期负债权益比率 |
| `total_assets_turnover_ratio` | 总资产周转率 |
| `inventory_turnover_ratio` | 存货周转率 |
| `current_assets_turnover_ratio` | 流动资产周转率 |
| `receive_account_turnover_ratio` | 应收账款周转率 |

### 现金流 `cash-flow`

| `index_id` | 指标名称 |
|---|---|
| `cash_operating_index` | 现金营运指数 |
| `operating_cash_flow_net_divide_income` | 销售现金比率 |
| `net_profit_cash_content` | 净利润现金含量 |
| `operating_cash_net_yoy_growth_ratio` | 现金流量净额增长率 |
| `cash_meet_invest_ratio` | 现金满足投资比率 |

## 错误与约束

| 场景 | `code` | 说明 |
|---|---|---|
| 缺少 `thscode` 或 `report` | `1001` | 必填参数缺失。 |
| `report` 格式非法 | `1002` | 必须匹配 `yyyy-1`、`yyyy-2`、`yyyy-3`、`yyyy-4`。 |
| 上游服务超时 | `5002` | Arsenal 财务指标数据源超时。 |
| 上游服务不可用 | `5003` | Arsenal 财务指标数据源返回异常或非 0 状态码。 |
