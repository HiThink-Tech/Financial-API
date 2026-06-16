from __future__ import annotations

from datetime import date

import pytest

from marketdb.calculations.adjustment import rebuild_adjustment_factors


def _seed_kline(con, rows):
    con.executemany(
        "INSERT OR REPLACE INTO raw_kline_daily "
        "(thscode, date, open, high, low, close, volume, turnover, "
        " currency, interval, adjusted, source_batch_id) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'CNY', '1d', 'none', 'seed')",
        rows,
    )


def _seed_event(con, thscode, ex_date, d=0.0, s=0.0, r=0.0, p=0.0):
    con.execute(
        "INSERT OR REPLACE INTO raw_adjustment_events "
        "(thscode, ticker, ex_date, dividend_per_share, per_share_bonus, "
        " allotment_ratio, allotment_price, currency, source_batch_id) "
        "VALUES (?, '000001', ?, ?, ?, ?, ?, 'CNY', 'seed')",
        [thscode, ex_date, d, s, r, p],
    )


def test_no_events_yields_unit_factors(fresh_db):
    _seed_kline(
        fresh_db,
        [
            ("000001.SZ", date(2025, 1, 2), 10.0, 10.6, 9.8, 10.4, 1e6, 1e7),
            ("000001.SZ", date(2025, 1, 3), 10.5, 10.8, 10.2, 10.7, 1e6, 1e7),
        ],
    )
    rebuild_adjustment_factors(fresh_db)
    factors = fresh_db.execute(
        "SELECT date, forward_factor, backward_factor "
        "FROM calc_adjust_factor_daily WHERE thscode = '000001.SZ' ORDER BY date"
    ).fetchall()
    assert factors[0][1] == pytest.approx(1.0)
    assert factors[0][2] == pytest.approx(1.0)
    assert factors[1][1] == pytest.approx(1.0)
    assert factors[1][2] == pytest.approx(1.0)


def test_cash_dividend_event_adjusts_history(fresh_db):
    _seed_kline(
        fresh_db,
        [
            ("000001.SZ", date(2025, 1, 2), 10.0, 10.6, 9.8, 10.0, 1e6, 1e7),
            ("000001.SZ", date(2025, 1, 3), 9.5, 9.8, 9.0, 9.5, 1e6, 1e7),
            ("000001.SZ", date(2025, 1, 6), 9.6, 9.9, 9.4, 9.7, 1e6, 1e7),
        ],
    )
    _seed_event(fresh_db, "000001.SZ", date(2025, 1, 3), d=0.5)

    rebuild_adjustment_factors(fresh_db)

    factors = fresh_db.execute(
        "SELECT date, forward_factor, backward_factor "
        "FROM calc_adjust_factor_daily "
        "WHERE thscode = '000001.SZ' ORDER BY date"
    ).fetchall()

    # ratio_on_ex_date = (close_pre * (1)) / (close_pre - d) = 10 / 9.5 ≈ 1.05263
    expected_ratio = 10.0 / 9.5
    backward = {row[0]: row[2] for row in factors}
    assert backward[date(2025, 1, 2)] == pytest.approx(1.0)
    assert backward[date(2025, 1, 3)] == pytest.approx(expected_ratio, rel=1e-9)
    assert backward[date(2025, 1, 6)] == pytest.approx(expected_ratio, rel=1e-9)
    # forward_factor at last date is always 1
    forward = {row[0]: row[1] for row in factors}
    assert forward[date(2025, 1, 6)] == pytest.approx(1.0)
    assert forward[date(2025, 1, 2)] == pytest.approx(1.0 / expected_ratio, rel=1e-9)


def test_adjusted_views_apply_factors(fresh_db):
    _seed_kline(
        fresh_db,
        [
            ("000001.SZ", date(2025, 1, 2), 10.0, 10.6, 9.8, 10.0, 1e6, 1e7),
            ("000001.SZ", date(2025, 1, 3), 9.5, 9.8, 9.0, 9.5, 1e6, 1e7),
        ],
    )
    _seed_event(fresh_db, "000001.SZ", date(2025, 1, 3), d=0.5)
    rebuild_adjustment_factors(fresh_db)

    hfq = fresh_db.execute(
        "SELECT date, close FROM v_daily_hfq WHERE thscode = '000001.SZ' ORDER BY date"
    ).fetchall()
    qfq = fresh_db.execute(
        "SELECT date, close FROM v_daily_qfq WHERE thscode = '000001.SZ' ORDER BY date"
    ).fetchall()
    expected_ratio = 10.0 / 9.5
    # hfq: pre-event raw=10 stays at 10; post-event raw=9.5 * ratio ≈ 10.0
    assert hfq[0][1] == pytest.approx(10.0)
    assert hfq[1][1] == pytest.approx(9.5 * expected_ratio, rel=1e-9)
    # qfq: post-event raw=9.5 (unchanged); pre-event raw=10 * (1/ratio) ≈ 9.5
    assert qfq[1][1] == pytest.approx(9.5)
    assert qfq[0][1] == pytest.approx(10.0 / expected_ratio, rel=1e-9)
