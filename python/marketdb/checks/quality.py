from __future__ import annotations

from dataclasses import dataclass

import duckdb


@dataclass
class QualityIssue:
    check: str
    severity: str  # "error" | "warn"
    detail: str
    sample: list


_CHECKS: list[tuple[str, str, str]] = [
    (
        "raw_kline_daily.rowcount_positive",
        "error",
        "SELECT 'raw_kline_daily empty' AS detail FROM (SELECT 1) WHERE NOT EXISTS "
        "(SELECT 1 FROM raw_kline_daily LIMIT 1)",
    ),
    (
        "raw_kline_daily.thscode_not_null",
        "error",
        "SELECT 'rows missing thscode' AS detail, COUNT(*) AS n "
        "FROM raw_kline_daily WHERE thscode IS NULL HAVING n > 0",
    ),
    (
        "raw_kline_daily.date_not_null",
        "error",
        "SELECT 'rows missing date' AS detail, COUNT(*) AS n "
        "FROM raw_kline_daily WHERE date IS NULL HAVING n > 0",
    ),
    (
        "raw_kline_daily.pk_unique",
        "error",
        "SELECT thscode, date, COUNT(*) AS n FROM raw_kline_daily "
        "GROUP BY thscode, date HAVING n > 1 LIMIT 10",
    ),
    (
        "raw_kline_daily.high_ge_low",
        "error",
        "SELECT thscode, date, high, low FROM raw_kline_daily "
        "WHERE high < low LIMIT 10",
    ),
    (
        "raw_kline_daily.ohlc_non_negative",
        "error",
        "SELECT thscode, date, open, high, low, close FROM raw_kline_daily "
        "WHERE open < 0 OR high < 0 OR low < 0 OR close < 0 LIMIT 10",
    ),
    (
        "raw_kline_daily.volume_non_negative",
        "warn",
        "SELECT thscode, date, volume, turnover FROM raw_kline_daily "
        "WHERE volume < 0 OR turnover < 0 LIMIT 10",
    ),
    (
        "raw_adjustment_events.pk_unique",
        "error",
        "SELECT thscode, ex_date, COUNT(*) AS n FROM raw_adjustment_events "
        "GROUP BY thscode, ex_date HAVING n > 1 LIMIT 10",
    ),
]


def run_quality_checks(con: duckdb.DuckDBPyConnection) -> list[QualityIssue]:
    issues: list[QualityIssue] = []
    for name, severity, sql in _CHECKS:
        rows = con.execute(sql).fetchall()
        if rows:
            issues.append(
                QualityIssue(
                    check=name,
                    severity=severity,
                    detail=str(rows[0][0]) if isinstance(rows[0][0], str) else "violations found",
                    sample=[list(r) for r in rows],
                )
            )
    return issues
