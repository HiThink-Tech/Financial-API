# 按股票查询个股异动原因

[业务导航](README.md)

个股异动原因提供当日 A 股异动解读查询能力，支持按异动标签过滤，也支持按股票代码批量查询。
返回统一响应信封 `ApiResponse`，业务错误经 `code` 字段表达，HTTP 状态码恒为 200。

<a id="接口列表"></a>

**接口列表**

| API | 方法与路径 | 说明 |
|---|---|---|
| 个股异动原因列表 | `GET /api/a-share/special-data/anomaly-analysis-list` | 查询当日个股异动原因，可选按异动标签过滤。 |
| 按股票查询个股异动原因 | `GET /api/a-share/special-data/anomaly-analysis-stock` | 按同花顺代码批量查询当日个股异动原因。 |

## 按股票查询个股异动原因

```text
GET /api/a-share/special-data/anomaly-analysis-stock
```

按同花顺代码批量查询当日个股异动原因，按请求代码首次出现顺序返回匹配记录；格式合法但当日无异动的代码会被忽略。

### 请求参数

| 参数 | 位置 | 类型 | 必需 | 说明 | 默认值 |
|---|---|---|---|---|---|
| `thscodes` | query | string | 是 | 逗号分隔的同花顺代码列表，支持 `SH` / `SZ` / `BJ` 后缀，大小写不敏感；去重前最多 50 个 token。 | - |

### 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/a-share/special-data/anomaly-analysis-stock?thscodes=600519.SH,000001.SZ' \
  -H 'X-api-key: <your-api-key>'
```

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

### 响应字段

响应字段与 [个股异动原因列表](special-data-anomaly-analysis-list.md#个股异动原因列表) 一致。

### 约束与错误

- 缺失或空白 `thscodes` 返回 `code=1001`。
- `thscodes` 出现空 token 或不符合 `000001.SZ` / `600519.SH` / `430001.BJ` 这类格式时返回 `code=1002`。
- 去重前 token 数超过 50 时返回 `code=1003`。
- 当日数据暂不可用时返回 `code=3002`。
- 有快照但查询无匹配时返回 `code=0`，且 `item=[]`。
