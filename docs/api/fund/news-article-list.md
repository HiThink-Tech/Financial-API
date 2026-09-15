# 基金资讯列表

[业务导航](README.md)

- `thscode` 是基金唯一标识，必须保留市场后缀。`offset` 是不透明游标，翻页时必须原样回传。

```text
GET /api/fund/news/article-list
```

## 请求参数

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode。 |
| `limit` | integer | 否 | 服务端默认 | 返回条数。 |
| `offset` | string | 否 | — | 不透明翻页游标；下一页应原样回传上一页的 `data.offset`。 |

## 请求示例

```bash
curl 'https://fuyao.aicubes.cn/api/fund/news/article-list?thscode=510300.SH&limit=20' \
  -H 'X-api-key: <your-api-key>'
```

## 响应示例

```json
{
  "code": 0,
  "message": "success",
  "request_id": "4132cc25f7be4c70aa490ef02b8a66bf",
  "data": {
    "timestamp": 1786690800000,
    "limit": 20,
    "offset": "next-page-cursor",
    "has_more": false,
    "item": [
      {
        "id": "article-001",
        "content_type": "news",
        "title": "基金资讯标题",
        "summary": "基金资讯摘要",
        "source": "公开资讯",
        "url": "https://example.com/article-001",
        "image_url": null,
        "author": "编辑部",
        "publish_time_ms": 1786687200000,
        "top": false
      }
    ]
  }
}
```

## 返回字段

`data` 分页字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `timestamp` | long | 接口响应时间戳。 |
| `limit` | integer | 本页返回条数上限。 |
| `offset` | string \| null | 下一页游标；继续翻页时原样回传。 |
| `has_more` | boolean | 是否还有下一页；分页结束统一以该字段为准。 |
| `item` | array | 资讯明细列表。 |

该接口使用游标/窗口分页，上游不提供可靠的总记录数，因此 `data` 不返回 `total`。

`data.item[]` 字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | 资讯 ID。 |
| `content_type` | string | 内容类型。 |
| `title` / `summary` | string | 标题与摘要。 |
| `source` / `author` | string | 来源与作者。 |
| `url` / `image_url` | string \| null | 正文链接与图片链接。 |
| `publish_time_ms` | long | 发布时间，毫秒 Unix 时间戳。 |
| `top` | boolean | 是否置顶。 |

通用鉴权与错误码参见[基金 API 总览](README.md)。
