from __future__ import annotations

from datetime import date

import duckdb


class FreshnessError(RuntimeError):
    """Raised when local data lags the trading-day calendar past the safety threshold."""


def _max_local_date(con: duckdb.DuckDBPyConnection) -> date | None:
    row = con.execute("SELECT MAX(date) FROM raw_kline_daily").fetchone()
    return row[0] if row and row[0] else None


def compute_lag_trading_days(
    con: duckdb.DuckDBPyConnection,
    *,
    trading_days: list[date],
    target: date,
) -> int:
    """Count trading days strictly between local_max and target (inclusive of target)."""
    local_max = _max_local_date(con)
    if local_max is None:
        return len(trading_days)
    return sum(1 for d in trading_days if local_max < d <= target)


def freshness_or_raise(
    con: duckdb.DuckDBPyConnection,
    *,
    trading_days: list[date],
    threshold: int,
    target: date,
) -> None:
    lag = compute_lag_trading_days(con, trading_days=trading_days, target=target)
    if lag > threshold:
        raise FreshnessError(
            f"local data lags by {lag} trading days (threshold={threshold}). "
            "Refusing incremental update — re-download the full parquet dump and "
            "re-run `marketdb import-parquet` before retrying."
        )
