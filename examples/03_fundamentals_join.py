"""跨 toolkit 组合：用远端 API 拉财报 + 用 marketdb 拉行情，做一个基本面 + 价格的简单视图。

演示要点：
- 两份 toolkit 怎么串：远端 API 解决"本地没有的数据"，marketdb 解决"本地已经有的数据"
- 错误处理：远端 API 没 token / 网络挂时不要让 marketdb 这一侧也跟着崩
- 不靠 pandas import 远端 client —— 直接调 CLI（与 toolkit 设计一致：CLI 只产 JSON）

跑这个脚本前确保：
- `python bootstrap.py` 已经跑过
- `export FUYAO_TOKEN=<token>`（在 https://fuyao.aicubes.cn/admin 签发）

如果没 token，脚本会跳过远端 API 部分，仍打印行情走势。
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import pandas as pd

from marketdb import MarketDB

DB_PATH = Path("data/market.duckdb")
FUYAO_CLI = Path("toolkit/fuyao/scripts/fuyao.py")
THSCODE = "300033.SZ"


def fetch_remote_income(thscode: str, limit: int = 4) -> pd.DataFrame | None:
    """通过远端 API CLI 拉最近 N 期年报利润表。"""
    if not (os.environ.get("FUYAO_TOKEN") or os.environ.get("API_KEY")):
        print("[fundamentals] no FUYAO_TOKEN/API_KEY set, skipping remote part", file=sys.stderr)
        return None
    if not FUYAO_CLI.exists():
        print(f"[fundamentals] {FUYAO_CLI} missing, skipping remote part", file=sys.stderr)
        return None
    try:
        out = subprocess.check_output(
            [
                sys.executable, str(FUYAO_CLI),
                "financials-income",
                "--thscode", thscode,
                "--period", "annual",
                "--limit", str(limit),
            ],
            text=True,
        )
    except subprocess.CalledProcessError as e:
        print(f"[fundamentals] remote CLI failed (exit {e.returncode}); skipping", file=sys.stderr)
        return None
    rows = json.loads(out)
    if not rows:
        print("[fundamentals] remote API returned 0 rows; skipping", file=sys.stderr)
        return None
    return pd.DataFrame(rows)


def fetch_marketdb_close(thscode: str) -> pd.DataFrame:
    with MarketDB.open(DB_PATH) as db:
        return db.get_daily(thscode, start="2020-01-01", adjust="forward")


def main() -> None:
    if not DB_PATH.exists():
        raise SystemExit(f"DB not found at {DB_PATH}. Run `python bootstrap.py` first.")

    print(f"[fundamentals] target: {THSCODE}")
    income = fetch_remote_income(THSCODE, limit=4)
    px = fetch_marketdb_close(THSCODE)

    print()
    print(f"price history (qfq, marketdb): {len(px)} trading days, "
          f"{px['date'].iloc[0]} → {px['date'].iloc[-1]}")
    print(px[["date", "close"]].tail(3).to_string(index=False))
    print()

    if income is None:
        print("(remote part skipped — set FUYAO_TOKEN and re-run for the full demo)")
        return

    cols = [c for c in ("report_date", "operating_revenue", "net_profit") if c in income.columns]
    print(f"recent annual income statements (remote API, last {len(income)}):")
    print(income[cols].to_string(index=False))
    print()

    # 简单 join：把财报日期附近的收盘价拼上来
    if "report_date" in income.columns:
        income["report_date"] = pd.to_datetime(income["report_date"])
        px["date"] = pd.to_datetime(px["date"])
        joined = pd.merge_asof(
            income.sort_values("report_date"),
            px[["date", "close"]].sort_values("date").rename(columns={"date": "report_date"}),
            on="report_date",
            direction="backward",
        )
        keep = [c for c in ("report_date", "operating_revenue", "net_profit", "close") if c in joined.columns]
        print("joined (财报日附近的最近一个交易日收盘价):")
        print(joined[keep].to_string(index=False))


if __name__ == "__main__":
    main()
