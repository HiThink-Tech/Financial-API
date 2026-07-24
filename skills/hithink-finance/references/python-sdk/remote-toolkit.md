# Python 远端取数 toolkit

在 Financial-API monorepo 根目录安装：

```bash
python -m pip install -e ./python
python python/toolkit/fuyao/scripts/fuyao.py --help
```

推荐设置用户级环境变量 `HITHINK_FINANCE_API_KEY`。toolkit 也会读取本 Skill 配置的用户级 `hithink-finance/credentials.env`；`FUYAO_TOKEN` 和 `API_KEY` 仅作为旧版本兼容来源。不要把 Key 写入脚本：

```bash
python python/toolkit/fuyao/scripts/fuyao.py tickers-search --q "贵州茅台"
python python/toolkit/fuyao/scripts/fuyao.py prices-snapshot --thscodes 600519.SH
python python/toolkit/fuyao/scripts/fuyao.py financials-income --thscode 600519.SH --limit 4
python python/toolkit/fuyao/scripts/fuyao.py valuations-snapshot --thscodes 600519.SH,000001.SZ
python python/toolkit/fuyao/scripts/fuyao.py fund-history --thscode 510300.SH --start-ms 1704038400000 --end-ms 1735660799000
```

Python 函数调用：

```python
import sys
from pathlib import Path

sys.path.insert(0, str(Path("python/toolkit/fuyao/scripts").resolve()))

from fuyao_client import (
    a_share_valuations_snapshot,
    fund_market_historical,
    prices_snapshot,
    tickers_search,
)

hit = tickers_search("贵州茅台", limit=1)[0]
snapshot = prices_snapshot([hit["thscode"]])
valuations = a_share_valuations_snapshot(["600519.SH", "000001.SZ"])
fund_bars = fund_market_historical("510300.SH", 1704038400000, 1735660799000)
```

函数签名与脚本 `--help` 是 Python 适配层的运行契约；上游请求与响应字段按本 Skill 的 [REST API 入口](../api.md) 继续路由。真实调用先检查 `code=0`，大结果必须重定向或由程序写入文件。
