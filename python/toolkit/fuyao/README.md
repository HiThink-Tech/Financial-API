# 远端数据 Python toolkit

本目录提供同花顺金融数据服务的 Python 适配层，用于从 Python、Shell、CI 或 Notebook 获取最新行情、集合竞价、财报、估值、指数、基金、标的目录和特色数据。历史全市场研究与本地 SQL 请使用 [`../marketdb/`](../marketdb/README.md)。

这里维护的是 **Python 函数和脚本运行方式**。上游 REST 端点参数、响应字段和错误码统一在 [`docs/api/`](../../../docs/api/README.md) 维护，本目录不保存 `llms.txt`、`llms-full.txt` 或重复契约。

## 目录内容

```text
python/toolkit/fuyao/
└── scripts/
    ├── fuyao_client.py   Python 函数、输入校验、分页/窗口辅助和重试
    └── fuyao.py          argparse CLI，业务结果只写 JSON stdout
```

`fuyao` 是现有域名、脚本名和 MCP 服务 ID 的兼容技术标识；项目品牌统一使用“同花顺金融数据服务（hithink finance）”。

## 什么时候使用

- 最新或当天 A 股行情
- 历史 K 线按标的补缺
- 公司行动、财务报表、财务指标和交易日历
- A 股当前估值快照
- A 股集合竞价快照与短期基准
- 股票/指数名称、ticker、`thscode` 检索与消歧
- 指数/板块目录、成分股和行情
- 基金档案、公司、经理、持仓、财务、净值、收益、公开资讯和场内基金行情
- 涨停、跌停、炸板、连板、当日异动、热榜和龙虎榜
- 全市场 Market Dumps 的远端签出流程

分钟 K、tick、海外行情、宏观数据、新闻公告原文和研报不在当前公开能力内。

## 安装与认证

从 monorepo 根安装 Python 项目：

```bash
python -m pip install -e ./python
```

在 <https://fuyao.aicubes.cn/admin> 获取统一 API Key，并设置当前进程环境变量：

```bash
export HITHINK_FINANCE_API_KEY="<API_KEY>"
```

PowerShell：

```powershell
$env:HITHINK_FINANCE_API_KEY = "<API_KEY>"
```

toolkit 还会读取 Skill 配置的用户级 `hithink-finance/credentials.env`；`FUYAO_TOKEN` 和 `API_KEY` 仅保留为旧版本兼容来源。不得把 API Key 写入脚本、Prompt、日志、输出文件或 Git。

## JSON CLI

查看当前命令：

```bash
python python/toolkit/fuyao/scripts/fuyao.py --help
python python/toolkit/fuyao/scripts/fuyao.py <command> --help
```

常见调用：

```bash
# 标的消歧
python python/toolkit/fuyao/scripts/fuyao.py tickers-search --q "贵州茅台"

# 行情
python python/toolkit/fuyao/scripts/fuyao.py prices-snapshot --thscodes 600519.SH
python python/toolkit/fuyao/scripts/fuyao.py prices-historical \
  --thscode 600519.SH --start-ms 1704038400000 --end-ms 1735660800000

# 财务
python python/toolkit/fuyao/scripts/fuyao.py financials-income --thscode 600519.SH --limit 4
python python/toolkit/fuyao/scripts/fuyao.py financials-indicators --thscode 600519.SH --report 2025-4

# 估值
python python/toolkit/fuyao/scripts/fuyao.py valuations-snapshot --thscodes 600519.SH,000001.SZ

# 集合竞价
python python/toolkit/fuyao/scripts/fuyao.py auction-snapshot --thscodes 600519.SH --stage final

# 指数与板块
python python/toolkit/fuyao/scripts/fuyao.py index-catalog --tag cn_concept
python python/toolkit/fuyao/scripts/fuyao.py index-constituents --thscode 000300.SH

# 基金
python python/toolkit/fuyao/scripts/fuyao.py fund-nav --fund-type otc --thscode 025480.OF --range year
python python/toolkit/fuyao/scripts/fuyao.py fund-holders --fund-type otc --thscode 161725.SZ --merge-scope all
python python/toolkit/fuyao/scripts/fuyao.py fund-historical --thscode 510300.SH \
  --start-ms 1704038400000 --end-ms 1735660800000
python python/toolkit/fuyao/scripts/fuyao.py fund-manager-detail --manager-id <manager-id>

# 特色数据
python python/toolkit/fuyao/scripts/fuyao.py limit-up-pool --size 50
python python/toolkit/fuyao/scripts/fuyao.py limit-break-pool --size 50
python python/toolkit/fuyao/scripts/fuyao.py hot-stock-list --period day
python python/toolkit/fuyao/scripts/fuyao.py dragon-tiger-list --board-type all
```

### 命令分组

| 领域 | 命令 |
| --- | --- |
| 标的 | `tickers-search`, `tickers-list` |
| 个股行情与公司行动 | `prices-snapshot`, `prices-historical`, `corp-actions` |
| 财务 | `financials-income`, `financials-balance`, `financials-cashflow`, `financials-indicators` |
| 估值 | `valuations-snapshot` |
| 集合竞价 | `auction-snapshot`, `auction-benchmark` |
| 日历 | `calendar-trading-days` |
| 指数 | `index-catalog`, `index-constituents`, `index-snapshot`, `index-historical` |
| 基金 | `fund-*`：资料、公司、经理、持仓、财务、净值、收益、资讯、发行状态和场内行情 |
| 特色数据 | `limit-up-pool`, `limit-down-pool`, `limit-break-pool`, `limit-up-ladder`, `anomaly-analysis-*`, 热榜和龙虎榜命令 |

具体参数始终以当前 `--help` 和函数签名为准；上游字段解释见 [REST API 契约](../../../docs/api/README.md)。

响应分页和时间语义也以 REST 契约为准：基金资讯按 `has_more` 结束游标分页；集合竞价 `timestamp` 是响应组装时间，短期基准省略日期时使用上海时区当日。Python helper 会保留 REST 原始字段；其中 `special_data_dragon_tiger_list()` 额外提供 `item` 兼容别名，指向 `stock_items`，便于和其他特色数据函数统一取主股票列表。

## Python 函数

`fuyao_client.py` 是轻量适配模块。在仓库内可显式加入脚本目录：

```python
import sys
from pathlib import Path

sys.path.insert(0, str(Path("python/toolkit/fuyao/scripts").resolve()))

from fuyao_client import (
    a_share_valuations_snapshot,
    financials_income_statements,
    prices_snapshot,
    tickers_search,
)

hit = tickers_search("贵州茅台", limit=1)[0]
snapshot = prices_snapshot([hit["thscode"]])
income = financials_income_statements(hit["thscode"], period="annual", limit=4)
valuations = a_share_valuations_snapshot([hit["thscode"]])
```

调用前从名称消歧为唯一 `thscode`，不要猜交易所后缀。Python 函数会处理其明确支持的输入校验、重试、分页或时间窗口辅助；不要从旧文档推断当前签名。

## 输出与错误

- CLI 业务数据只写 JSON stdout；诊断写 stderr。
- CLI 退出码：`0` 成功，`2` 上游业务错误，`3` 本地参数错误，`4` 环境或运行错误。
- Python 调用通过 `FuyaoApiError` 暴露上游 `code`、`message` 和 `request_id`。
- 网络错误、限流和服务端错误的重试行为以当前 client 实现为准；输入或认证错误先修复再调用。

完整错误语义见 [API 总契约](../../../docs/api/README.md)。

## 大结果落盘

全市场、分页全集、多标的或长时间窗口不得进入 Agent 对话：

```bash
python python/toolkit/fuyao/scripts/fuyao.py tickers-list --all > /tmp/tickers.json
python python/toolkit/fuyao/scripts/fuyao.py prices-snapshot --all-market > /tmp/snapshot.json
```

只报告文件路径、行数、窗口和摘要。需要 CSV/Parquet 时由 pandas、pyarrow 或下游工具读取 JSON 后转换；长期全市场研究优先构建 marketdb。

## 与其他入口的关系

- Chat 场景：使用 [托管 MCP](../../../docs/mcp.md)。
- 人类/Agent 统一终端：使用 [`hithink-finance` CLI](../../../hithink-finance-cli/README.md)。
- 本地历史、复权、面板和 SQL：使用 [`marketdb`](../marketdb/README.md)。
- Agent 自动选型：安装 [`hithink-finance` Skill](../../../skills/hithink-finance/SKILL.md)。

## 维护

- Python 参数或行为变化：更新本 README、函数签名、`--help` 和对应测试。
- 上游端点或字段变化：只更新 `docs/api/`，再运行 `python scripts/sync_skill_contracts.py`。
- 不在本目录新增上游契约副本或 Agent 专用 Skill。
