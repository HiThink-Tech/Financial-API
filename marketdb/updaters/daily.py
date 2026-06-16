from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

import duckdb

from marketdb.batch import new_batch_id, record_batch_finish, record_batch_start
from marketdb.calculations.adjustment import rebuild_adjustment_factors
from marketdb.checks.freshness import compute_lag_trading_days, freshness_or_raise
from marketdb.providers.rest import RestProvider
from marketdb.schema import rebuild_views, set_meta

_SHANGHAI = ZoneInfo("Asia/Shanghai")


def _ms_to_date(ms: int) -> date:
    return datetime.fromtimestamp(ms / 1000, tz=_SHANGHAI).date()


def _date_to_ms(d: date, *, end_of_day: bool = False) -> int:
    base = datetime.combine(d, time.min, tzinfo=_SHANGHAI)
    if end_of_day:
        base = datetime.combine(d, time(23, 59, 59), tzinfo=_SHANGHAI)
    return int(base.timestamp() * 1000)


def sync_symbols(con: duckdb.DuckDBPyConnection, provider: RestProvider) -> int:
    """Refresh dim_symbol from the REST tickers list endpoint."""
    batch_id = new_batch_id("rest-symbols")
    record_batch_start(con, batch_id=batch_id, source="rest", kind="symbols")
    con.execute("DELETE FROM stg_symbols")
    rows = []
    for item in provider.list_symbols():
        rows.append((
            item.get("thscode"),
            item.get("ticker"),
            item.get("name"),
            item.get("exchange"),
            item.get("asset_type"),
            item.get("currency"),
            batch_id,
        ))
    if rows:
        con.executemany(
            "INSERT INTO stg_symbols VALUES (?, ?, ?, ?, ?, ?, ?)",
            rows,
        )
    con.execute(
        """
        INSERT OR REPLACE INTO dim_symbol
            (thscode, ticker, name, exchange, asset_type, currency,
             source_batch_id, updated_at)
        SELECT thscode, ticker, name, exchange, asset_type, currency,
               source_batch_id, CURRENT_TIMESTAMP
        FROM stg_symbols
        WHERE thscode IS NOT NULL
        """
    )
    inserted = con.execute("SELECT COUNT(*) FROM stg_symbols").fetchone()[0]
    record_batch_finish(con, batch_id=batch_id, row_count=inserted)
    set_meta(con, "last_symbol_sync_batch_id", batch_id)
    return inserted


def update_daily(
    con: duckdb.DuckDBPyConnection,
    provider: RestProvider,
    *,
    max_lag_trading_days: int,
    target_date: date | None = None,
) -> dict:
    """Pull a small incremental window of daily K-line and merge into raw_kline_daily.

    Stops with an error if local data lags the target by more than the
    configured threshold — the operator must then re-download the full parquet.
    """
    trading_days = [_ms_to_date(d["date_ms"]) for d in provider.trading_days()]
    if not trading_days:
        raise RuntimeError("REST returned an empty trading-days calendar")
    end = target_date or trading_days[-1]
    freshness_or_raise(
        con, trading_days=trading_days, threshold=max_lag_trading_days, target=end
    )
    lag = compute_lag_trading_days(con, trading_days=trading_days, target=end)
    window_days = trading_days[max(0, len(trading_days) - lag - 1):]
    start = window_days[0]

    batch_id = new_batch_id("rest-kline")
    record_batch_start(
        con,
        batch_id=batch_id,
        source="rest",
        kind="kline_daily",
        notes=f"window {start}..{end}",
    )
    con.execute("DELETE FROM stg_kline_daily")
    symbols = [r[0] for r in con.execute(
        "SELECT thscode FROM dim_symbol ORDER BY thscode"
    ).fetchall()]
    if not symbols:
        raise RuntimeError("dim_symbol is empty — run `marketdb sync-symbols` first")

    start_ms = _date_to_ms(start)
    end_ms = _date_to_ms(end, end_of_day=True)
    total_rows = 0
    for thscode in symbols:
        rows = provider.historical(
            thscode=thscode,
            start_ms=start_ms,
            end_ms=end_ms,
            interval="1d",
            adjust="none",
        )
        if not rows:
            continue
        payload = [
            (
                r.get("thscode") or thscode,
                _ms_to_date(r["date_ms"]),
                r.get("open_price"),
                r.get("high_price"),
                r.get("low_price"),
                r.get("close_price"),
                r.get("volume"),
                r.get("turnover"),
                r.get("currency", "CNY"),
                r.get("interval", "1d"),
                r.get("adjusted", "none"),
                batch_id,
            )
            for r in rows
            if r.get("date_ms") is not None
        ]
        if payload:
            con.executemany(
                "INSERT INTO stg_kline_daily VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                payload,
            )
            total_rows += len(payload)

    merged = con.execute(
        """
        INSERT OR REPLACE INTO raw_kline_daily
        SELECT thscode, date, open, high, low, close, volume, turnover,
               currency, interval, adjusted, source_batch_id
        FROM stg_kline_daily
        WHERE thscode IS NOT NULL AND date IS NOT NULL
        """
    ).fetchall()
    record_batch_finish(con, batch_id=batch_id, row_count=total_rows)
    set_meta(con, "last_daily_update_batch_id", batch_id)

    rebuild_adjustment_factors(con)
    rebuild_views(con)
    return {
        "batch_id": batch_id,
        "window_start": start.isoformat(),
        "window_end": end.isoformat(),
        "rows_pulled": total_rows,
    }
