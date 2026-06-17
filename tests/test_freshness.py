from __future__ import annotations

from datetime import date

import pytest

from marketdb.checks.freshness import (
    FreshnessError,
    compute_lag_trading_days,
    freshness_or_raise,
)


def _seed_max_date(con, d: date) -> None:
    con.execute(
        "INSERT OR REPLACE INTO raw_kline_daily "
        "(thscode, date, open, high, low, close, volume, turnover, "
        " currency, interval, adjusted, source_batch_id) "
        "VALUES ('000001.SZ', ?, 1, 1, 1, 1, 1, 1, 'CNY', '1d', 'none', 'seed')",
        [d],
    )


def test_no_local_data_treats_full_calendar_as_lag(fresh_db):
    calendar = [date(2025, 1, 2), date(2025, 1, 3), date(2025, 1, 6)]
    assert compute_lag_trading_days(
        fresh_db, trading_days=calendar, target=date(2025, 1, 6)
    ) == 3


def test_lag_within_threshold_passes(fresh_db):
    _seed_max_date(fresh_db, date(2025, 1, 6))
    calendar = [date(2025, 1, 2), date(2025, 1, 3), date(2025, 1, 6), date(2025, 1, 7)]
    freshness_or_raise(
        fresh_db, trading_days=calendar, threshold=5, target=date(2025, 1, 7)
    )


def test_lag_above_threshold_raises(fresh_db):
    _seed_max_date(fresh_db, date(2025, 1, 2))
    calendar = [
        date(2025, 1, 2), date(2025, 1, 3), date(2025, 1, 6),
        date(2025, 1, 7), date(2025, 1, 8), date(2025, 1, 9),
    ]
    with pytest.raises(FreshnessError):
        freshness_or_raise(
            fresh_db, trading_days=calendar, threshold=2, target=date(2025, 1, 9)
        )
