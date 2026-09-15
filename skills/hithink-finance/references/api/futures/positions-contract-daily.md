# 期货公司合约日持仓

[业务导航](README.md)

期货持仓提供品种、公司和合约维度的日持仓与历史持仓数据。

- 期货合约使用完整 `thscode`，品种代码使用大写形式；接口返回统一 `ApiResponse` 信封。
- ISO 日期按 `Asia/Shanghai` 解释，Unix 时间戳为毫秒。金融数值与日期来源缺失时可为 `null`，合法无数据时返回 `[]`。

<a id="positions-contract-daily"></a>
## 期货公司合约日持仓

```text
GET /api/futures/positions/contract-daily
```

### 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 期货合约完整同花顺代码。 |
| `variety` | string | 是 | — | 大写品种代码，须与 `thscode` 所属品种一致。 |
| `date` | string | 是 | — | 交易日期，格式 `yyyy-MM-dd`。 |

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/futures/positions/contract-daily?thscode=CU2601.SHF&variety=CU&date=2026-09-10' \
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
    "date": "2026-09-10",
    "position_item": [],
    "average_item": []
  }
}
```

### 返回字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` / `date` | long / string \| null | 数据时间与查询交易日。 |
| `position_item[]` | array | 公司持仓；每项含 `date`、`thscode`、`ticker`、`company_name`、成交量、多空与净持仓及其变化。 |
| `average_item[]` | array | 独立均价序列；每项含 `date`、`company_long_avg`、`company_short_avg`，不得与持仓数组按位置关联。 |
