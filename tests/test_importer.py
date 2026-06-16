from __future__ import annotations

from datetime import datetime, time, timedelta
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


def _day_ms(year, month, day) -> int:
    dt = datetime(year, month, day, 0, 0, 0, tzinfo=SHANGHAI)
    return int(dt.timestamp() * 1000)


@pytest.fixture
def daily_parquet(tmp_path: Path) -> Path:
    path = tmp_path / "daily.parquet"
    table = pa.table(
        {
            "thscode":     ["000001.SZ", "000001.SZ", "600519.SH"],
            "currency":    ["CNY", "CNY", "CNY"],
            "interval":    ["1d", "1d", "1d"],
            "adjusted":    ["none", "none", "none"],
            "date_ms":     [_day_ms(2025, 1, 2), _day_ms(2025, 1, 3), _day_ms(2025, 1, 2)],
            "open_price":  [10.0, 10.5, 1700.0],
            "high_price":  [10.6, 10.8, 1720.0],
            "low_price":   [9.8, 10.2, 1690.0],
            "close_price": [10.4, 10.7, 1710.0],
            "volume":      [1_000_000.0, 1_200_000.0, 500_000.0],
            "turnover":    [10_400_000.0, 12_840_000.0, 855_000_000.0],
        }
    )
    pq.write_table(table, path)
    return path


@pytest.fixture
def events_parquet(tmp_path: Path) -> Path:
    path = tmp_path / "events.parquet"
    table = pa.table(
        {
            "thscode":            ["000001.SZ"],
            "ticker":             ["000001"],
            "ex_date_ms":         [_day_ms(2025, 1, 3)],
            "dividend_per_share": [0.5],
            "per_share_bonus":    [0.0],
            "allotment_ratio":    [0.0],
            "allotment_price":    [0.0],
            "currency":           ["CNY"],
        }
    )
    pq.write_table(table, path)
    return path


def test_import_kline_daily_parquet_round_trips_dates(fresh_db, daily_parquet):
    n = import_kline_daily_parquet(fresh_db, daily_parquet)
    assert n == 3
    rows = fresh_db.execute(
        "SELECT date, close FROM raw_kline_daily "
        "WHERE thscode = '000001.SZ' ORDER BY date"
    ).fetchall()
    assert [r[0].isoformat() for r in rows] == ["2025-01-02", "2025-01-03"]
    assert [r[1] for r in rows] == [10.4, 10.7]


def test_import_is_idempotent(fresh_db, daily_parquet):
    import_kline_daily_parquet(fresh_db, daily_parquet)
    import_kline_daily_parquet(fresh_db, daily_parquet)
    n = fresh_db.execute("SELECT COUNT(*) FROM raw_kline_daily").fetchone()[0]
    assert n == 3


def test_import_adjustment_events_parquet(fresh_db, events_parquet):
    n = import_adjustment_events_parquet(fresh_db, events_parquet)
    assert n == 1
    row = fresh_db.execute(
        "SELECT thscode, ex_date, dividend_per_share FROM raw_adjustment_events"
    ).fetchone()
    assert row[0] == "000001.SZ"
    assert row[1].isoformat() == "2025-01-03"
    assert row[2] == 0.5


def test_import_records_batch(fresh_db, daily_parquet):
    import_kline_daily_parquet(fresh_db, daily_parquet)
    batches = fresh_db.execute(
        "SELECT source, kind, row_count FROM _import_batches "
        "WHERE kind = 'kline_daily'"
    ).fetchall()
    assert batches == [("parquet", "kline_daily", 3)]
