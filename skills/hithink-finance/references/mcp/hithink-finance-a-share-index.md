# hithink-finance-a-share-index 工具契约

用于指数和板块的工具选型。实际调用参数以当前连接的 schema 校验结果为准。

## 工具全览

| 工具 | 适用场景 | 关键参数与边界 | 常见错误 |
| --- | --- | --- | --- |
| `get_a_share_index_catalog_ths_index_list` | 按类别列出同花顺概念、区域、特色或行业指数 | `tag` 为 `cn_concept`/`region`/`tszs`/`industry`；单个 tag 全量返回、无分页 | 把标准指数名称搜索完全依赖此目录；忽略返回可能较大 |
| `get_a_share_index_constituents_ths_stock_list` | 查询单个 THS 板块或标准指数的当前成分股 | 单次一个 `thscode`；支持如 `886042.TI`、`000300.SH` | 逗号分隔多个指数，或把结果当历史成分 |
| `get_a_share_index_prices_snapshot` | 批量查询有限数量指数/板块最新行情 | `thscodes` 必填；支持 `.SH/.SZ/.TI`；不支持省略代码枚举全集 | 误以为 `limit/offset` 可拉全量指数，或把股票代码交给指数工具 |
| `get_a_share_index_prices_historical` | 单只指数/板块历史日 K 线 | `start/end` 为毫秒时间戳；窗口最长 10 年；`interval` 固定 `1d`；指数无复权 | 传 `adjust`，或一次传多个指数 |

## 典型流程

### 找概念板块并查询成分

1. 按正确 `tag` 获取目录并把完整目录落盘。
2. 根据名称选择唯一板块 `thscode`，不要仅靠模糊字符串猜代码。
3. 查询当前成分；需要行情时，将有限股票代码交给 A 股快照工具。

### 标准指数查询

已知沪深 300 等标准 `thscode` 时可直接查成分或行情；名称不确定时先使用元数据搜索交叉确认。

## 能力边界

- 成分工具返回当前成分，不提供历史调入调出序列。
- 指数历史 K 线没有复权概念，响应中的 adjust 为空不代表数据缺失。
- 目录工具单 tag 全量返回，应落盘或只保留目标匹配项，不要把完整目录写入会话。
