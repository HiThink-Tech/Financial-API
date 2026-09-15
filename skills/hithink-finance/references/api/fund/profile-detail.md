# 基金基本资料

[业务导航](README.md)

- `thscode` 是基金唯一标识，必须保留市场后缀。

```text
GET /api/fund/profile/detail
```

## 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode，必须保留市场后缀，如 `025480.OF` / `510300.SH`。 |

## 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/profile/detail?thscode=025480.OF' \
  -H 'X-api-key: <your-api-key>'
```

## 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "353e202c28494f8f98bef62d83dbfcaf",
  "data": {
    "timestamp": 1784210313786,
    "item": [
      {
        "thscode": "025480.OF",
        "ticker": "025480",
        "fund_name": "沪深300A",
        "estab_date": 1767024000000,
        "company_id": "80000222",
        "mgmt_name": "华夏基金管理有限公司",
        "manager_name": "靖博灵",
        "fund_scale": 1234567890.12,
        "unit_nav": 1.2345,
        "manager_info": [],
        "trade_rule": [],
        "rate_info": []
      }
    ]
  }
}
```

## 返回字段

`data.item[]` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `thscode` | string | 带市场后缀的同花顺代码。 |
| `ticker` | string | 纯基金代码，仅用于展示。 |
| `fund_name` | string \| null | 基金名称。 |
| `estab_date` | long \| null | 成立日期，毫秒时间戳。 |
| `company_id` | string \| null | 基金公司 ID，可用于查询基金公司详情。 |
| `mgmt_name` | string \| null | 基金管理人名称。 |
| `manager_name` | string \| null | 基金经理姓名。 |
| `fund_scale` | number \| null | 基金规模。 |
| `unit_nav` | number \| null | 单位净值。 |
| `manager_info` | array | 基金经理引用，包含经理 ID、姓名、任职收益、任职天数与起止时间。 |
| `trade_rule` | array | 交易规则，包含标题、展示时间与毫秒时间戳。 |
| `rate_info` | array | 费率信息，包含费率类型、收费模式、条件、标准费率与优惠费率。 |

通用参数与错误码参见[基金 API 总览](README.md)。
