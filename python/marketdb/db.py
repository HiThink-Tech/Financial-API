from __future__ import annotations

from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

import duckdb


def connect(db_path: str | Path) -> duckdb.DuckDBPyConnection:
    """Open a DuckDB connection, creating parent directories on demand."""
    path = Path(db_path)
    if str(path) != ":memory:":
        path.parent.mkdir(parents=True, exist_ok=True)
    return duckdb.connect(str(path))


@contextmanager
def connection(db_path: str | Path) -> Iterator[duckdb.DuckDBPyConnection]:
    con = connect(db_path)
    try:
        yield con
    finally:
        con.close()


def execute_script(con: duckdb.DuckDBPyConnection, sql_text: str) -> None:
    """Execute a multi-statement SQL script. DuckDB accepts ';'-separated batches."""
    statements = [stmt.strip() for stmt in sql_text.split(";") if stmt.strip()]
    for stmt in statements:
        con.execute(stmt)
