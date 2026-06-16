from __future__ import annotations

from pathlib import Path

import duckdb

from marketdb.batch import new_batch_id, record_batch_finish, record_batch_start
from marketdb.schema import set_meta

# DuckDB read_parquet returns date_ms / ex_date_ms as BIGINT (epoch ms). We cast
# to DATE using Asia/Shanghai semantics: the dump generator already aligned
# 00:00:00 of each trading day to +08:00, so dividing by 86_400_000 after the
# +8h shift recovers the calendar date without timezone helpers.
_MS_PER_DAY = 86_400_000
_SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000


def _shanghai_date_expr(column: str) -> str:
    return f"CAST(epoch_ms({column} + {_SHANGHAI_OFFSET_MS}) AS DATE)"


def import_kline_daily_parquet(
    con: duckdb.DuckDBPyConnection,
    parquet_path: str | Path,
) -> int:
    """Load full daily-K parquet into raw_kline_daily via DuckDB read_parquet."""
    path = str(Path(parquet_path))
    batch_id = new_batch_id("parquet-kline")
    record_batch_start(con, batch_id=batch_id, source="parquet", kind="kline_daily", notes=path)

    con.execute(
        f"""
        INSERT OR REPLACE INTO raw_kline_daily
        SELECT
            thscode,
            {_shanghai_date_expr('date_ms')} AS date,
            open_price  AS open,
            high_price  AS high,
            low_price   AS low,
            close_price AS close,
            volume,
            turnover,
            currency,
            interval,
            adjusted,
            ? AS source_batch_id
        FROM read_parquet(?)
        WHERE adjusted = 'none'
        """,
        [batch_id, path],
    )

    row_count = con.execute(
        "SELECT COUNT(*) FROM raw_kline_daily WHERE source_batch_id = ?",
        [batch_id],
    ).fetchone()[0]
    record_batch_finish(con, batch_id=batch_id, row_count=row_count)
    set_meta(con, "last_kline_daily_batch_id", batch_id)
    return row_count


def import_adjustment_events_parquet(
    con: duckdb.DuckDBPyConnection,
    parquet_path: str | Path,
) -> int:
    """Load full adjustment-factors parquet into raw_adjustment_events."""
    path = str(Path(parquet_path))
    batch_id = new_batch_id("parquet-adj")
    record_batch_start(
        con,
        batch_id=batch_id,
        source="parquet",
        kind="adjustment_events",
        notes=path,
    )

    con.execute(
        f"""
        INSERT OR REPLACE INTO raw_adjustment_events
        SELECT
            thscode,
            ticker,
            {_shanghai_date_expr('ex_date_ms')} AS ex_date,
            dividend_per_share,
            per_share_bonus,
            allotment_ratio,
            allotment_price,
            currency,
            ? AS source_batch_id
        FROM read_parquet(?)
        """,
        [batch_id, path],
    )

    row_count = con.execute(
        "SELECT COUNT(*) FROM raw_adjustment_events WHERE source_batch_id = ?",
        [batch_id],
    ).fetchone()[0]
    record_batch_finish(con, batch_id=batch_id, row_count=row_count)
    set_meta(con, "last_adjustment_events_batch_id", batch_id)
    return row_count
