"""Cross-section ranking: 全市场截面，按近 20 日平均成交额选 top-50，输出近 5 日涨跌幅。

演示要点：
- 用 get_panel 一次顺序扫拉到全市场 1 个月的数据（而不是按 thscode 循环）
- 用 pandas 做窗口聚合 + 排名
- 大查询结果写文件，stdout 只打印精简表格

跑这个脚本前确保：
- `./bootstrap.sh` 已经跑过，本地至少有近一个月的数据
"""
from __future__ import annotations

from datetime import date, timedelta
from pathlib import Path

import pandas as pd

from marketdb import MarketDB

DB_PATH = Path("data/market.duckdb")
OUT_DIR = Path("out")
LOOKBACK_DAYS = 35      # 抓 5 周左右 → 大约 20 个交易日
TOP_N = 50


def main() -> None:
    if not DB_PATH.exists():
        raise SystemExit(f"DB not found at {DB_PATH}. Run ./bootstrap.sh first.")

    end = date.today()
    start = end - timedelta(days=LOOKBACK_DAYS)
    print(f"[cross-section] loading full-market panel {start} → {end} (qfq) ...")

    with MarketDB.open(DB_PATH) as db:
        panel = db.get_panel(start=str(start), end=str(end), adjust="forward")

    if panel.empty:
        raise SystemExit("Empty panel. Is the DB up to date?")

    print(f"[cross-section] panel: {len(panel):,} rows, {panel['thscode'].nunique():,} symbols")

    # 落盘整个 panel —— AI agent 不要把它塞回上下文，自己读文件
    OUT_DIR.mkdir(exist_ok=True)
    panel_path = OUT_DIR / f"panel_{start}_{end}.parquet"
    panel.to_parquet(panel_path, index=False)
    print(f"[cross-section] full panel persisted → {panel_path}")

    # 按 thscode 排好序后，做 trailing-20d ADV 和 trailing-5d return
    panel = panel.sort_values(["thscode", "date"]).reset_index(drop=True)

    def per_symbol(g: pd.DataFrame) -> pd.Series:
        if len(g) < 5:
            return pd.Series({"adv20": float("nan"), "ret5d": float("nan"), "last_close": float("nan")})
        last20 = g.tail(20)
        last5 = g.tail(5)
        return pd.Series({
            "adv20": last20["turnover"].mean(),
            "ret5d": last5["close"].iloc[-1] / last5["close"].iloc[0] - 1,
            "last_close": last5["close"].iloc[-1],
        })

    metrics = (
        panel.groupby("thscode", group_keys=False)
        .apply(per_symbol)
        .dropna()
        .sort_values("adv20", ascending=False)
    )

    print()
    print(f"top {TOP_N} by 20-day ADV (sorted desc), with 5-day return:")
    print(metrics.head(TOP_N).to_string(
        formatters={
            "adv20": "{:>14,.0f}".format,
            "ret5d": "{:>+7.2%}".format,
            "last_close": "{:>8.2f}".format,
        }
    ))

    out_csv = OUT_DIR / f"top_adv_{end}.csv"
    metrics.head(TOP_N).to_csv(out_csv)
    print()
    print(f"[cross-section] top-{TOP_N} persisted → {out_csv}")


if __name__ == "__main__":
    main()
