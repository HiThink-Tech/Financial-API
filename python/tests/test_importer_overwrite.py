from __future__ import annotations

from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import pyarrow as pa
import pyarrow.parquet as pq
import pytest

from marketdb.importers.parquet import (
    import_adjustment_events_parquet,
    import_kline_daily_parquet,
)


SHANGHAI = ZoneInfo("Asia/Shanghai")


def _day_ms(d: date) -> int:
    return int(datetime(d.year, d.month, d.day, 0, 0, 0, tzinfo=SHANGHAI).timestamp() * 1000)


def _daily(path: Path, dates: list[date], close: float) -> Path:
    table = pa.table({
        "thscode":     ["000001.SZ"] * len(dates),
        "currency":    ["CNY"] * len(dates),
        "interval":    ["1d"] * len(dates),
        "adjusted":    ["none"] * len(dates),
        "date_ms":     [_day_ms(d) for d in dates],
        "open_price":  [close] * len(dates),
        "high_price":  [close + 0.5] * len(dates),
        "low_price":   [close - 0.5] * len(dates),
        "close_price": [close] * len(dates),
        "volume":      [1.0] * len(dates),
        "turnover":    [1.0] * len(dates),
    })
    pq.write_table(table, path)
    return path


def _events(path: Path, dates: list[date], div: float) -> Path:
    table = pa.table({
        "thscode":            ["000001.SZ"] * len(dates),
        "ticker":             ["000001"] * len(dates),
        "ex_date_ms":         [_day_ms(d) for d in dates],
        "dividend_per_share": [div] * len(dates),
        "per_share_bonus":    [0.0] * len(dates),
        "allotment_ratio":    [0.0] * len(dates),
        "allotment_price":    [0.0] * len(dates),
        "currency":           ["CNY"] * len(dates),
    })
    pq.write_table(table, path)
    return path


def test_incremental_overwrite_replaces_window(fresh_db, tmp_path: Path) -> None:
    base = [date(2026, 6, 1) + timedelta(days=i) for i in range(5)]
    # Initial FULL: close=10.0
    import_kline_daily_parquet(fresh_db, _daily(tmp_path / "full.parquet", base, 10.0), overwrite=True)
    rows = fresh_db.execute(
        "SELECT close FROM raw_kline_daily ORDER BY date"
    ).fetchall()
    assert [r[0] for r in rows] == [10.0] * 5

    # Incremental covering days 3..7 with close=11.0 — should replace overlap days.
    incr_window = [date(2026, 6, 3) + timedelta(days=i) for i in range(5)]
    import_kline_daily_parquet(
        fresh_db, _daily(tmp_path / "incr.parquet", incr_window, 11.0),
        overwrite=False,
    )
    rows = fresh_db.execute(
        "SELECT date, close FROM raw_kline_daily ORDER BY date"
    ).fetchall()
    # Days 1..2 keep 10.0; days 3..7 now 11.0.
    assert rows[0][1] == 10.0
    assert rows[1][1] == 10.0
    for r in rows[2:]:
        assert r[1] == 11.0
    # No duplicates introduced (PK enforced).
    assert len(rows) == 7


def test_incremental_overwrite_is_idempotent(fresh_db, tmp_path: Path) -> None:
    base = [date(2026, 6, 1) + timedelta(days=i) for i in range(3)]
    parquet = _daily(tmp_path / "incr.parquet", base, 12.0)
    import_kline_daily_parquet(fresh_db, parquet, overwrite=False)
    import_kline_daily_parquet(fresh_db, parquet, overwrite=False)
    n = fresh_db.execute("SELECT COUNT(*) FROM raw_kline_daily").fetchone()[0]
    assert n == 3


def test_adjustment_events_full_replace(fresh_db, tmp_path: Path) -> None:
    p1 = _events(tmp_path / "e1.parquet", [date(2026, 6, 1), date(2026, 6, 2)], 0.5)
    n1 = import_adjustment_events_parquet(fresh_db, p1)
    assert n1 == 2

    # Second snapshot has one event on a different date — old rows must vanish.
    p2 = _events(tmp_path / "e2.parquet", [date(2026, 7, 1)], 0.7)
    n2 = import_adjustment_events_parquet(fresh_db, p2)
    assert n2 == 1
    rows = fresh_db.execute(
        "SELECT ex_date, dividend_per_share FROM raw_adjustment_events"
    ).fetchall()
    assert len(rows) == 1
    assert rows[0][0].isoformat() == "2026-07-01"
    assert rows[0][1] == 0.7
