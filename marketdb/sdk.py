from __future__ import annotations

from contextlib import contextmanager
from pathlib import Path
from typing import Iterable, Iterator

import duckdb
import pandas as pd

from marketdb.db import connect
from marketdb.schema import check_compatibility


class MarketDB:
    """Thin facade over a DuckDB connection for notebook / backtest consumers."""

    def __init__(self, db_path: str | Path, *, check_schema: bool = True):
        self.db_path = Path(db_path)
        self._con = connect(self.db_path)
        if check_schema:
            check_compatibility(self._con)

    @classmethod
    @contextmanager
    def open(cls, db_path: str | Path) -> Iterator["MarketDB"]:
        db = cls(db_path)
        try:
            yield db
        finally:
            db.close()

    @property
    def connection(self) -> duckdb.DuckDBPyConnection:
        return self._con

    def close(self) -> None:
        self._con.close()

    def query_sql(self, sql: str, params: list | None = None) -> pd.DataFrame:
        return self._con.execute(sql, params or []).df()

    def get_symbols(
        self,
        *,
        exchange: str | None = None,
        asset_type: str | None = None,
    ) -> pd.DataFrame:
        clauses, params = [], []
        if exchange:
            clauses.append("exchange = ?")
            params.append(exchange)
        if asset_type:
            clauses.append("asset_type = ?")
            params.append(asset_type)
        where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
        return self.query_sql(f"SELECT * FROM v_symbol {where} ORDER BY thscode", params)

    def get_daily(
        self,
        thscode: str | Iterable[str],
        *,
        start: str | None = None,
        end: str | None = None,
        adjust: str = "none",
    ) -> pd.DataFrame:
        """Fetch daily K-line for one symbol or a batch.

        Pass a single thscode (e.g. "300033.SZ") or any iterable of them. Batch
        mode runs a single SQL `IN (...)` query — far cheaper than calling this
        N times. The returned frame is sorted by (thscode, date).
        """
        view = {
            "none": "v_daily",
            "forward": "v_daily_qfq",
            "backward": "v_daily_hfq",
        }.get(adjust)
        if view is None:
            raise ValueError(f"adjust must be one of none/forward/backward, got {adjust!r}")
        codes = [thscode] if isinstance(thscode, str) else list(dict.fromkeys(thscode))
        if not codes:
            return self.query_sql(f"SELECT * EXCLUDE (currency, interval) FROM {view} WHERE 1=0")
        placeholders = ",".join(["?"] * len(codes))
        clauses = [f"thscode IN ({placeholders})"]
        params: list = [*codes]
        if start:
            clauses.append("date >= ?")
            params.append(start)
        if end:
            clauses.append("date <= ?")
            params.append(end)
        sql = (
            f"SELECT * EXCLUDE (currency, interval) FROM {view} WHERE "
            + " AND ".join(clauses)
            + " ORDER BY thscode, date"
        )
        return self.query_sql(sql, params)

    def get_panel(
        self,
        *,
        start: str | None = None,
        end: str | None = None,
        adjust: str = "none",
        exchange: str | None = None,
    ) -> pd.DataFrame:
        """Fetch the full-market daily panel for a date range.

        Skips per-symbol filtering entirely — DuckDB does one sequential scan of
        the view over the date window, which is the fastest path for whole-market
        cross-sections (factor research, ranking, regime detection). For a small
        basket use `get_daily(codes, ...)` instead.

        `exchange` optionally restricts to "SH" / "SZ" / "BJ" by thscode suffix.
        """
        view = {
            "none": "v_daily",
            "forward": "v_daily_qfq",
            "backward": "v_daily_hfq",
        }.get(adjust)
        if view is None:
            raise ValueError(f"adjust must be one of none/forward/backward, got {adjust!r}")
        clauses: list[str] = []
        params: list = []
        if start:
            clauses.append("date >= ?")
            params.append(start)
        if end:
            clauses.append("date <= ?")
            params.append(end)
        if exchange:
            clauses.append("thscode LIKE ?")
            params.append(f"%.{exchange.upper()}")
        where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
        sql = (
            f"SELECT * EXCLUDE (currency, interval) FROM {view} {where} "
            "ORDER BY date, thscode"
        )
        return self.query_sql(sql, params)

    def get_adjustment_events(self, thscode: str) -> pd.DataFrame:
        return self.query_sql(
            "SELECT * FROM raw_adjustment_events WHERE thscode = ? ORDER BY ex_date",
            [thscode],
        )

    def get_adjustment_factors(self, thscode: str) -> pd.DataFrame:
        return self.query_sql(
            "SELECT * FROM calc_adjust_factor_daily WHERE thscode = ? ORDER BY date",
            [thscode],
        )

    def export_csv(self, thscode: str, out_path: str | Path, *, adjust: str = "none") -> Path:
        df = self.get_daily(thscode, adjust=adjust)
        out = Path(out_path)
        out.parent.mkdir(parents=True, exist_ok=True)
        df.to_csv(out, index=False)
        return out
