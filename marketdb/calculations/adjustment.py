from __future__ import annotations

import duckdb

from marketdb.batch import new_batch_id, record_batch_finish, record_batch_start
from marketdb.schema import set_meta

# Per-event price multiplier (applied at the event's effective trading day):
#   ratio = ((1 + s + r) * close_pre) / (close_pre - d + r * p)
# where d=cash dividend per share, s=stock bonus ratio, r=rights ratio,
# p=rights price, close_pre=close of the previous trading day.
# backward_factor[t] = cumulative product of daily ratios up to t (=1 otherwise).
# forward_factor[t] = backward_factor[t] / backward_factor[last_date].
# Net effect: hfq_close[t] = raw_close[t] * backward_factor[t];
#             qfq_close[last] = raw_close[last] and qfq scales history down.


def rebuild_adjustment_factors(con: duckdb.DuckDBPyConnection) -> int:
    """Recompute calc_adjust_factor_daily from raw events + raw daily K-line."""
    batch_id = new_batch_id("calc-adj-factor")
    record_batch_start(
        con,
        batch_id=batch_id,
        source="calc",
        kind="adjustment_factor_daily",
        notes="rebuild from raw_adjustment_events + raw_kline_daily",
    )

    con.execute("DELETE FROM calc_adjust_factor_daily")

    con.execute(
        """
        INSERT INTO calc_adjust_factor_daily
            (thscode, date, forward_factor, backward_factor,
             factor_version, source_event_batch_id, calculated_at)
        WITH events AS (
            SELECT
                thscode,
                ex_date,
                COALESCE(dividend_per_share, 0.0) AS d,
                COALESCE(per_share_bonus,    0.0) AS s,
                COALESCE(allotment_ratio,    0.0) AS r,
                COALESCE(allotment_price,    0.0) AS p
            FROM raw_adjustment_events
        ),
        effective_event AS (
            SELECT
                e.thscode,
                e.d, e.s, e.r, e.p,
                (
                    SELECT MIN(k.date)
                    FROM raw_kline_daily k
                    WHERE k.thscode = e.thscode AND k.date >= e.ex_date
                ) AS eff_date
            FROM events e
        ),
        kline_with_prev AS (
            SELECT
                thscode, date, close,
                LAG(close) OVER (PARTITION BY thscode ORDER BY date) AS prev_close
            FROM raw_kline_daily
        ),
        event_ratios AS (
            SELECT
                e.thscode,
                e.eff_date AS date,
                (kp.prev_close * (1.0 + e.s + e.r))
                    / NULLIF(kp.prev_close - e.d + e.r * e.p, 0) AS ratio
            FROM effective_event e
            JOIN kline_with_prev kp
              ON kp.thscode = e.thscode AND kp.date = e.eff_date
            WHERE e.eff_date IS NOT NULL
              AND kp.prev_close IS NOT NULL
        ),
        ratio_per_day AS (
            SELECT
                thscode, date,
                EXP(SUM(LN(ratio))) AS day_ratio
            FROM event_ratios
            WHERE ratio IS NOT NULL AND ratio > 0
            GROUP BY thscode, date
        ),
        kline_ratio AS (
            SELECT
                k.thscode, k.date,
                COALESCE(rp.day_ratio, 1.0) AS day_ratio
            FROM raw_kline_daily k
            LEFT JOIN ratio_per_day rp
              ON rp.thscode = k.thscode AND rp.date = k.date
        ),
        backward AS (
            SELECT
                thscode, date,
                EXP(SUM(LN(day_ratio)) OVER (
                    PARTITION BY thscode ORDER BY date
                    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
                )) AS backward_factor
            FROM kline_ratio
        ),
        backward_norm AS (
            SELECT
                thscode, date, backward_factor,
                LAST_VALUE(backward_factor) OVER (
                    PARTITION BY thscode ORDER BY date
                    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
                ) AS last_backward
            FROM backward
        )
        SELECT
            thscode,
            date,
            backward_factor / NULLIF(last_backward, 0) AS forward_factor,
            backward_factor,
            '1.0' AS factor_version,
            ? AS source_event_batch_id,
            CURRENT_TIMESTAMP AS calculated_at
        FROM backward_norm
        """,
        [batch_id],
    )

    row_count = con.execute("SELECT COUNT(*) FROM calc_adjust_factor_daily").fetchone()[0]
    record_batch_finish(con, batch_id=batch_id, row_count=row_count)
    set_meta(con, "last_adjust_factor_batch_id", batch_id)
    return row_count
