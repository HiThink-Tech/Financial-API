# THS 指数目录

[业务导航](README.md)

> **info**
> 工具名：`get_a_share_index_catalog_ths_index_list`
>
> 对应 REST 端点：[`GET /api/a-share-index/catalog/ths-index-list`](../../api/index/catalog-ths-index-list.md#同花顺指数列表)


## 工具描述

> 按 `tag`（概念 / 区域 / 特色 / 行业）列出同花顺指数清单。当用户提到「板块」「概念」
> 或某类指数（如「白酒概念」「锂电池」「半导体行业」）时，**先用本工具拿到目标指数的
> `thscode`**，再交给
> [`get_a_share_index_constituents_ths_stock_list`](get_a_share_index_constituents_ths_stock_list.md)
> 取成分股。单 `tag` 一次性全量返回，无需分页。

## 参数

| 参数 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `tag` | enum | 否 | `cn_concept` | 标签白名单：`cn_concept`(A 股概念) / `region`(区域指数) / `tszs`(特色指数) / `industry`(行业指数)。大小写不敏感。 |

## 调用示例

```text
工具：get_a_share_index_catalog_ths_index_list
参数：
  - tag: "cn_concept"
```

## 返回

返回 `{ timestamp, item: [{ thscode, name }, ...] }`。字段含义见 REST 端点
[同花顺指数列表和成分股 · 同花顺指数列表](../../api/index/catalog-ths-index-list.md#响应字段)。

```json
{
  "timestamp": 1748102400000,
  "item": [
    { "thscode": "886042.TI", "name": "白酒概念" },
    { "thscode": "886041.TI", "name": "新能源车" }
  ]
}
```

## 为什么是前置工具

LLM 无法从「白酒概念」「半导体行业」这类口语化标签直接推断到同花顺指数的
`thscode`（如 `886042.TI`）。先用本工具按 `tag` 全量取一次，再按 `name` 匹配出目标
`thscode`，可避免编造代码。
