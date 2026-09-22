# 指数与板块

[全部业务域](../README.md)

指数和板块目录、成分股、行情。先目录或搜索，再查成分与价格。


## 资料与标识

查询目录、搜索、合约或基本资料，取得后续请求所需标识。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [同花顺指数列表](a-share-index.md#catalog-ths-index-list) | `GET /api/a-share-index/catalog/ths-index-list` | 公开 |
| [同花顺指数成分股](a-share-index.md#constituents-ths-stock-list) | `GET /api/a-share-index/constituents/ths-stock-list` | 公开 |

## 行情

按所需时间范围选择行情快照或历史价格序列。

| 需求 / 文档 | 接口或工具 | 使用范围 |
| --- | --- | --- |
| [指数行情快照](a-share-index.md#prices-snapshot) | `GET /api/a-share-index/prices/snapshot` | 公开 |
| [指数历史 K 线](a-share-index.md#prices-historical) | `GET /api/a-share-index/prices/historical` | 公开 |
