"""Quickstart: 拉一只票近一年的前复权走势，打几个汇总指标。

跑这个脚本前确保：
1. `./bootstrap.sh` 已经跑过（`data/market.duckdb` 存在并且有数据）
2. 当前目录是仓库根：`cd /path/to/Financial-API && python3 examples/01_quickstart.py`

它演示的是最常见的一种用法 —— 单股 + SDK + 前复权。
"""
from __future__ import annotations

from datetime import date, timedelta
from pathlib import Path

from marketdb import MarketDB

DB_PATH = Path("data/market.duckdb")
THSCODE = "300033.SZ"   # 同花顺 - 创业板
WINDOW_DAYS = 365


def main() -> None:
    if not DB_PATH.exists():
        raise SystemExit(
            f"DB not found at {DB_PATH}. Run ./bootstrap.sh first."
        )

    end = date.today()
    start = end - timedelta(days=WINDOW_DAYS)
    print(f"[quickstart] fetching {THSCODE} from {start} to {end} (qfq) ...")

    with MarketDB.open(DB_PATH) as db:
        df = db.get_daily(
            THSCODE,
            start=str(start),
            end=str(end),
            adjust="forward",
        )

    if df.empty:
        raise SystemExit(
            f"No rows returned. Check that {THSCODE} exists and the window has data."
        )

    print(f"[quickstart] got {len(df)} trading days")
    print()
    print("first 3 rows:")
    print(df.head(3).to_string(index=False))
    print()
    print("last 3 rows:")
    print(df.tail(3).to_string(index=False))
    print()

    # 几个最基础的统计
    daily_ret = df["close"].pct_change().dropna()
    print("summary stats (qfq close):")
    print(f"  trading days   : {len(df)}")
    print(f"  period          : {df['date'].iloc[0]} → {df['date'].iloc[-1]}")
    print(f"  start close     : {df['close'].iloc[0]:.2f}")
    print(f"  end close       : {df['close'].iloc[-1]:.2f}")
    print(f"  total return    : {(df['close'].iloc[-1] / df['close'].iloc[0] - 1):.2%}")
    print(f"  max drawdown    : {((df['close'] / df['close'].cummax()) - 1).min():.2%}")
    print(f"  annualised vol  : {daily_ret.std() * (252 ** 0.5):.2%}")


if __name__ == "__main__":
    main()
