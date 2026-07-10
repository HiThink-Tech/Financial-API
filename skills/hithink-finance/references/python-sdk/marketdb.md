# marketdb CLI 与 Python SDK

在 Financial-API monorepo 根目录安装并初始化：

```bash
python -m pip install -e ./python
python python/bootstrap.py
marketdb status --json --db data/market.duckdb
marketdb describe --db data/market.duckdb
```

查询示例：

```bash
marketdb query --json --db data/market.duckdb \
  --sql "SELECT date, close FROM v_daily_qfq WHERE thscode='600519.SH' ORDER BY date DESC LIMIT 10"
```

SDK 示例：

```python
from marketdb import MarketDB

with MarketDB.open("data/market.duckdb") as db:
    daily = db.get_daily("600519.SH", start="2025-01-01", adjust="forward")
```

历史行情、前后复权、全市场面板和 SQL 优先使用本地库。执行研究前检查数据库最新日期、视图和复权口径；数据不存在或过旧时明确提示初始化/同步，不静默改用全市场逐股远端请求。
