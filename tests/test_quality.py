from __future__ import annotations

from marketdb.checks.quality import run_quality_checks


def _insert_row(con, **overrides):
    row = dict(
        thscode="000001.SZ",
        date="2025-01-02",
        open=10.0,
        high=10.6,
        low=9.8,
        close=10.4,
        volume=1_000_000.0,
        turnover=10_400_000.0,
        currency="CNY",
        interval="1d",
        adjusted="none",
        source_batch_id="manual",
    )
    row.update(overrides)
    cols = ", ".join(row.keys())
    placeholders = ", ".join(["?"] * len(row))
    con.execute(
        f"INSERT OR REPLACE INTO raw_kline_daily ({cols}) VALUES ({placeholders})",
        list(row.values()),
    )


def test_empty_table_reports_error(fresh_db):
    issues = run_quality_checks(fresh_db)
    names = [i.check for i in issues]
    assert "raw_kline_daily.rowcount_positive" in names


def test_clean_table_passes(fresh_db):
    _insert_row(fresh_db)
    issues = [i for i in run_quality_checks(fresh_db) if i.severity == "error"]
    assert issues == []


def test_high_lt_low_flagged(fresh_db):
    _insert_row(fresh_db, high=9.0, low=10.0)
    names = {i.check for i in run_quality_checks(fresh_db)}
    assert "raw_kline_daily.high_ge_low" in names


def test_negative_ohlc_flagged(fresh_db):
    _insert_row(fresh_db, close=-1.0)
    names = {i.check for i in run_quality_checks(fresh_db)}
    assert "raw_kline_daily.ohlc_non_negative" in names
