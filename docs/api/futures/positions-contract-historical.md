# 期货公司合约历史持仓

[业务导航](README.md)

期货持仓提供品种、公司和合约维度的日持仓与历史持仓数据。

- 期货合约使用完整 `thscode`，品种代码使用大写形式；接口返回统一 `ApiResponse` 信封。
- ISO 日期按 `Asia/Shanghai` 解释，Unix 时间戳为毫秒。金融数值与日期来源缺失时可为 `null`，合法无数据时返回 `[]`。

<a id="positions-contract-historical"></a>
## 期货公司合约历史持仓

```text
GET /api/futures/positions/contract-historical
```

### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 期货合约完整同花顺代码。 |
| `variety` | string | 是 | — | 大写品种代码，须与合约一致。 |
| `company` | string | 是 | — | 期货公司名称。 |
| `start_date` | string | 是 | — | 开始日期；须位于调用日前一年内，结束日固定为调用日。 |

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/futures/positions/contract-historical?thscode=CU2601.SHF&variety=CU&company=示例期货&start_date=2026-01-01' \
  -H 'X-api-key: <your-api-key>'
```

### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "request-id",
  "data": {
    "timestamp": 1789036800000,
    "start_date": "2026-01-01",
    "end_date": "2026-09-10",
    "position_item": [],
    "average_item": []
  }
}
```

### 返回字段

字段与[期货公司合约日持仓](positions-contract-daily.md#positions-contract-daily)一致；`position_item[]` 与 `average_item[]` 是独立序列。
