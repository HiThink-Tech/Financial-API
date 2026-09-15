# 基金资讯列表

[业务导航](README.md)

> **info**
> 工具名：`get_fund_news_article_list`
>
> 对应 REST 端点：[`GET /api/fund/news/article-list`](../../api/fund/news-article-list.md)


## 工具描述

> 游标分页查询单只基金的资讯文章。上游不提供可靠的总记录数，因此响应不返回 `total`；是否翻页结束以 `has_more` 为准。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `thscode` | string | 是 | — | 完整基金 thscode。 |
| `limit` | integer | 否 | — | 返回条数。 |
| `offset` | string | 否 | — | 不透明翻页游标。 |

## 调用示例

```text
工具：get_fund_news_article_list
参数：
  - thscode: "510300.SH"
  - limit: 20
```

## 返回

返回 `{ timestamp, limit, offset, has_more, item[] }`，不包含 `total`；是否继续翻页以 `has_more` 为准。字段见 [基金资讯列表](../../api/fund/news-article-list.md)。
