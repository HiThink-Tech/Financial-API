# Python SDK 入口

Python 路径适合 Notebook、Python 应用、研究脚本和已经使用 `marketdb` 的项目。先按需求二选一，只加载一份子契约：

| 需求 | 路径 | 详细契约 |
| --- | --- | --- |
| 最新行情、财报、估值、指数、公募基金、特色数据和自定义远端取数 | Fuyao Python toolkit | [remote-toolkit.md](python-sdk/remote-toolkit.md) |
| 本地历史 OHLCV、复权、面板、SQL 和研究数据集 | marketdb CLI/Python SDK | [marketdb.md](python-sdk/marketdb.md) |

两者都属于 monorepo 的 `python/` 项目。旧版根级 Python checkout 必须先按项目文档中的 monorepo 迁移指南更新路径。全市场、多年或多标的结果写入文件，只返回行数、路径和摘要。
