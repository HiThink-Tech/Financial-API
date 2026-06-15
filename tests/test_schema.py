from __future__ import annotations

import pytest

from marketdb._version import SCHEMA_VERSION
from marketdb.db import connect
from marketdb.schema import check_compatibility, get_meta, init_schema


EXPECTED_TABLES = {
    "_meta",
    "_import_batches",
    "raw_kline_daily",
    "raw_adjustment_events",
    "dim_symbol",
    "calc_adjust_factor_daily",
    "stg_kline_daily",
    "stg_adjustment_events",
    "stg_symbols",
}
EXPECTED_VIEWS = {"v_symbol", "v_daily", "v_daily_qfq", "v_daily_hfq"}


def test_init_creates_tables_and_views(db_path):
    con = connect(db_path)
    init_schema(con, data_root=str(db_path.parent))
    tables = {
        r[0]
        for r in con.execute(
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_schema = 'main' AND table_type = 'BASE TABLE'"
        ).fetchall()
    }
    views = {
        r[0]
        for r in con.execute(
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_schema = 'main' AND table_type = 'VIEW'"
        ).fetchall()
    }
    assert EXPECTED_TABLES.issubset(tables)
    assert EXPECTED_VIEWS.issubset(views)
    assert get_meta(con, "schema_version") == SCHEMA_VERSION
    con.close()


def test_check_compatibility_fails_before_init(db_path):
    con = connect(db_path)
    with pytest.raises(RuntimeError):
        check_compatibility(con)
    con.close()


def test_check_compatibility_passes_after_init(fresh_db):
    check_compatibility(fresh_db)


def test_init_is_idempotent(db_path):
    con = connect(db_path)
    init_schema(con, data_root=str(db_path.parent))
    init_schema(con, data_root=str(db_path.parent))
    rows = con.execute(
        "SELECT COUNT(*) FROM _meta WHERE key = 'schema_version'"
    ).fetchone()[0]
    assert rows == 1
    con.close()
