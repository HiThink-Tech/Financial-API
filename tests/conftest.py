from __future__ import annotations

from pathlib import Path

import pytest

from marketdb.db import connect
from marketdb.schema import init_schema


@pytest.fixture
def db_path(tmp_path: Path) -> Path:
    return tmp_path / "test.duckdb"


@pytest.fixture
def fresh_db(db_path: Path):
    con = connect(db_path)
    init_schema(con, data_root=str(db_path.parent))
    try:
        yield con
    finally:
        con.close()
