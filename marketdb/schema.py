from __future__ import annotations

from datetime import datetime, timezone
from importlib import resources
from typing import Iterable

import duckdb

from marketdb._version import SCHEMA_VERSION, __version__
from marketdb.db import execute_script


def _read_sql(name: str) -> str:
    return resources.files("marketdb.sql").joinpath(name).read_text(encoding="utf-8")


def init_schema(con: duckdb.DuckDBPyConnection, *, data_root: str | None = None) -> None:
    """Create all tables, refresh views, and seed _meta."""
    execute_script(con, _read_sql("schema.sql"))
    execute_script(con, _read_sql("views.sql"))
    _seed_meta(con, data_root=data_root)


def rebuild_views(con: duckdb.DuckDBPyConnection) -> None:
    execute_script(con, _read_sql("views.sql"))


def _seed_meta(con: duckdb.DuckDBPyConnection, *, data_root: str | None) -> None:
    entries = [
        ("schema_version", SCHEMA_VERSION),
        ("project_version", __version__),
        ("initialized_at", datetime.now(timezone.utc).isoformat()),
    ]
    if data_root:
        entries.append(("data_root", data_root))
    set_meta_many(con, entries)


def set_meta(con: duckdb.DuckDBPyConnection, key: str, value: str) -> None:
    set_meta_many(con, [(key, value)])


def set_meta_many(
    con: duckdb.DuckDBPyConnection,
    entries: Iterable[tuple[str, str]],
) -> None:
    payload = list(entries)
    if not payload:
        return
    now = datetime.now(timezone.utc)
    con.executemany(
        "INSERT INTO _meta (key, value, updated_at) VALUES (?, ?, ?) "
        "ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, "
        "updated_at = EXCLUDED.updated_at",
        [(k, v, now) for k, v in payload],
    )


def get_meta(con: duckdb.DuckDBPyConnection, key: str) -> str | None:
    row = con.execute("SELECT value FROM _meta WHERE key = ?", [key]).fetchone()
    return row[0] if row else None


def check_compatibility(con: duckdb.DuckDBPyConnection) -> None:
    """Fail fast if the on-disk schema major version is incompatible."""
    try:
        found = get_meta(con, "schema_version")
    except duckdb.CatalogException as exc:
        raise RuntimeError(
            "_meta table missing — run `marketdb init` first."
        ) from exc
    if found is None:
        raise RuntimeError(
            "schema_version missing in _meta — run `marketdb init` first."
        )
    found_major = found.split(".", 1)[0]
    expected_major = SCHEMA_VERSION.split(".", 1)[0]
    if found_major != expected_major:
        raise RuntimeError(
            f"incompatible schema_version: on-disk={found}, code={SCHEMA_VERSION}"
        )
