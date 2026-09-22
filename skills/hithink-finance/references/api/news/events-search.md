# 资讯事件库

[业务导航](README.md) · **端内专用** · **同花顺AI客户端可用** · [使用说明](../README.md#端内能力说明)

通过受控筛选条件检索资讯事件库，返回事件标题、正文摘要、标准时间、评级及关联行业和概念。

- 本页接口结构用于说明同花顺AI客户端内的数据契约，当前不作为端外接入入口。
- 返回统一 `ApiResponse` 信封；超出单实例每秒 5 次的请求返回 `code=4001`。
- 仅支持下表参数；事件主体、关联个股、新闻来源和任意字段透传不开放。

```text
GET /api/news/events/search
```

## 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `query` | string | 否 | — | 标题或正文关键词，最多 200 个字符。 |
| `search_param` | enum | 否 | `event_name` | 检索域：`event_name`（标题）或 `event_summary`（正文摘要）。 |
| `standard_start_time` | string | 否 | — | 标准时间下界，格式 `yyyy-MM-dd`。 |
| `standard_end_time` | string | 否 | — | 标准时间上界，格式 `yyyy-MM-dd`。 |
| `event_grading_score` | string | 否 | — | 逗号分隔的评级，如 `A,B`。 |
| `related_industry_code` | string | 否 | — | 逗号分隔的关联行业代码。 |
| `related_concept_code` | string | 否 | — | 逗号分隔的关联概念代码。 |
| `size` | integer | 否 | `20` | 返回条数，范围 `1-100`。 |

## 请求示例

以下命令仅展示接口路径与参数格式，当前不可用于外部调用；AI 客户端会自动携带已登录身份。

```bash
curl 'https://fuyao.aicubes.cn/api/news/events/search?query=%E6%B5%99%E6%B1%9F&search_param=event_name&size=1'
```

以下响应由上述参数在 2026-09-21 通过 dev API Server 实际请求事件库获得；事件数据会随上游更新。

## 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "87de1ef65b134998ac8ee2a4adbec7da",
  "data": {
    "total": 1,
    "items": [
      {
        "event_id": "cbbe5a1911bde5ea11d933ecf133d718",
        "event_name": "浙江全省大范围高温天气登场",
        "event_summary": "浙江省自7月3日起受副热带高压控制，全省大部地区出现大范围高温天气，最高气温达38℃至39℃，杭州主城区最高36.4℃，迎来今年首个高温日。预计本周末多午后雷阵雨，6日至9日多云有分散性雷阵雨，防暑降温工作需加强。",
        "standard_time": "2026-07-03",
        "event_grading": {
          "score": "C",
          "score_reason": "{\"1.主体层级\": {\"理由\": \"浙江省作为经济大省，属于经济大省市政府范畴，但非国家最高决策层或全球锚点机构。\", \"得分\": 1}, \"2.事件冲击力\": {\"理由\": \"高温天气是季节性常规现象，无超预期元素或政策拐点，冲击力弱。\", \"得分\": 0}, \"3.影响范围\": {\"理由\": \"影响限于浙江省内城市群，无跨行业或全国性外溢。\", \"得分\": 1}, \"4.影响期限\": {\"理由\": \"高温天气预计持续数天至数周，属短期影响。\", \"得分\": 0}, \"5.市场与叙事强度\": {\"理由\": \"事件为气象报告，未提及市场反应或重定价，不影响金融主线。\", \"得分\": 0}, \"6.事件信息量\": {\"理由\": \"常规天气更新，无新政策或重大数据，信息量低。\", \"得分\": 0}}"
        },
        "related_industry": [],
        "related_concept": [
          {
            "code": "884073",
            "name": "制冷空调设备"
          },
          {
            "code": "884113",
            "name": "空调"
          },
          {
            "code": "882033",
            "name": "浙江"
          },
          {
            "code": "885999",
            "name": "汽车热管理"
          },
          {
            "code": "886044",
            "name": "液冷服务器"
          },
          {
            "code": "885425",
            "name": "特高压"
          }
        ]
      }
    ]
  }
}
```

## 返回字段

| 字段 | 类型 | 说明 |
|---|---|---|
| `data.total` | integer | 命中事件总数。 |
| `data.items[]` | array | 事件列表。 |
| `items[].event_id` / `event_name` / `event_summary` / `standard_time` | string \| null | 事件标识、标题、正文摘要和标准时间。 |
| `items[].event_grading` | object \| null | 评级对象，包含 `score` 与 `score_reason`。 |
| `items[].related_industry[]` / `related_concept[]` | array | 关联行业或概念；每项包含 `code`、`name`。 |
