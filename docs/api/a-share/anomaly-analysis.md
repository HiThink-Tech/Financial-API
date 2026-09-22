# 个股异动原因

[业务导航](README.md)

- [个股异动原因列表](#special-data-anomaly-analysis-list)：`GET /api/a-share/special-data/anomaly-analysis-list`
- [按股票查询个股异动原因](#special-data-anomaly-analysis-stock)：`GET /api/a-share/special-data/anomaly-analysis-stock`

个股异动原因提供当日 A 股异动解读查询能力，支持按异动标签过滤，也支持按股票代码批量查询。
返回统一响应信封 `ApiResponse`，业务错误经 `code` 字段表达，HTTP 状态码恒为 200。

<a id="special-data-anomaly-analysis-list--接口列表"></a>

**接口列表**

| API | 方法与路径 | 说明 |
|---|---|---|
| 个股异动原因列表 | `GET /api/a-share/special-data/anomaly-analysis-list` | 查询当日个股异动原因，可选按异动标签过滤。 |
| 按股票查询个股异动原因 | `GET /api/a-share/special-data/anomaly-analysis-stock` | 按同花顺代码批量查询当日个股异动原因。 |

<a id="special-data-anomaly-analysis-list"></a>
<a id="special-data-anomaly-analysis-list--个股异动原因列表"></a>
## 个股异动原因列表

```text
GET /api/a-share/special-data/anomaly-analysis-list
```

查询当日个股异动原因，可选按异动标签过滤；不传 `tag_codes` 时返回全部当日记录。
该接口仅提供 REST API，不同步为 MCP 工具。

<a id="special-data-anomaly-analysis-list--请求参数"></a>
### 请求参数

| 参数 | 位置 | 类型 | 必需 | 说明 | 默认值 |
|---|---|---|---|---|---|
| `tag_codes` | query | string | 否 | 异动标签，逗号分隔，多个值为 OR 关系；大小写不敏感，重复值自动去重。合法值见下方标签表。 | - |

`tag_codes` 合法值：

| 值 | 含义 |
|---|---|
| `LIMIT_UP` | 涨停 |
| `LIMIT_DOWN` | 跌停 |
| `SHARP_RISE` | 大涨 |
| `SHARP_FALL` | 大跌 |
| `RAPID_RALLY` | 快速拉升 |
| `RAPID_DECLINE` | 快速下挫 |

<a id="special-data-anomaly-analysis-list--请求示例"></a>
### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/a-share/special-data/anomaly-analysis-list?tag_codes=LIMIT_UP,SHARP_FALL' \
  -H 'X-api-key: <your-api-key>'
```

<a id="special-data-anomaly-analysis-list--响应示例"></a>
### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "a1b2c3d4e5f6789012345678abcdef01",
  "data": {
    "timestamp": 1751260800000,
    "item": [
      {
        "stock_name": "贵州茅台",
        "analysis_content": "公司股价出现异动，相关解读内容以服务端快照为准。",
        "keyword_list": [
          "白酒",
          "消费"
        ],
        "thscode": "600519.SH",
        "tag_name": "大涨"
      }
    ]
  }
}
```

<a id="special-data-anomaly-analysis-list--响应字段"></a>
### 响应字段

`data` 为 `AnomalyAnalysisData`：

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` | long | 数据时间戳，毫秒级 Unix 时间戳。 |
| `item` | array | 个股异动原因列表。 |

`item[]` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `stock_name` | string | 股票名称。 |
| `analysis_content` | string | 异动解读内容。 |
| `keyword_list` | string[] | 关键词列表；无关键词时返回空数组。 |
| `thscode` | string | 带交易所后缀的同花顺代码，例如 `600519.SH`。 |
| `tag_name` | string | 异动标签展示名。 |

<a id="special-data-anomaly-analysis-list--约束与错误"></a>
### 约束与错误

- `tag_codes` 中出现未知值、连续逗号或尾逗号导致的空 token 时返回 `code=1002`。
- 当日数据暂不可用时返回 `code=3002`。
- 有快照但查询无匹配时返回 `code=0`，且 `item=[]`。

<a id="special-data-anomaly-analysis-stock"></a>
<a id="special-data-anomaly-analysis-stock--接口列表"></a>
<a id="special-data-anomaly-analysis-stock--按股票查询个股异动原因"></a>
## 按股票查询个股异动原因

```text
GET /api/a-share/special-data/anomaly-analysis-stock
```

按同花顺代码批量查询当日个股异动原因，按请求代码首次出现顺序返回匹配记录；格式合法但当日无异动的代码会被忽略。

<a id="special-data-anomaly-analysis-stock--请求参数"></a>
### 请求参数

| 参数 | 位置 | 类型 | 必需 | 说明 | 默认值 |
|---|---|---|---|---|---|
| `thscodes` | query | string | 是 | 逗号分隔的同花顺代码列表，支持 `SH` / `SZ` / `BJ` 后缀，大小写不敏感；去重前最多 50 个 token。 | - |

<a id="special-data-anomaly-analysis-stock--请求示例"></a>
### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/a-share/special-data/anomaly-analysis-stock?thscodes=600519.SH,000001.SZ' \
  -H 'X-api-key: <your-api-key>'
```

<a id="special-data-anomaly-analysis-stock--响应示例"></a>
### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "a1b2c3d4e5f6789012345678abcdef01",
  "data": {
    "timestamp": 1751260800000,
    "item": [
      {
        "stock_name": "贵州茅台",
        "analysis_content": "公司股价出现异动，相关解读内容以服务端快照为准。",
        "keyword_list": [
          "白酒",
          "消费"
        ],
        "thscode": "600519.SH",
        "tag_name": "大涨"
      }
    ]
  }
}
```

<a id="special-data-anomaly-analysis-stock--响应字段"></a>
### 响应字段

响应字段与 [个股异动原因列表](#special-data-anomaly-analysis-list--个股异动原因列表) 一致。

<a id="special-data-anomaly-analysis-stock--约束与错误"></a>
### 约束与错误

- 缺失或空白 `thscodes` 返回 `code=1001`。
- `thscodes` 出现空 token 或不符合 `000001.SZ` / `600519.SH` / `430001.BJ` 这类格式时返回 `code=1002`。
- 去重前 token 数超过 50 时返回 `code=1003`。
- 当日数据暂不可用时返回 `code=3002`。
- 有快照但查询无匹配时返回 `code=0`，且 `item=[]`。
