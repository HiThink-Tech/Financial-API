from __future__ import annotations

import uuid
from datetime import datetime, timezone

import duckdb


def new_batch_id(prefix: str) -> str:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    return f"{prefix}-{stamp}-{uuid.uuid4().hex[:8]}"


def record_batch_start(
    con: duckdb.DuckDBPyConnection,
    *,
    batch_id: str,
    source: str,
    kind: str,
    notes: str | None = None,
) -> None:
    con.execute(
        "INSERT INTO _import_batches (batch_id, source, kind, started_at, notes) "
        "VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?)",
        [batch_id, source, kind, notes],
    )


def record_batch_finish(
    con: duckdb.DuckDBPyConnection,
    *,
    batch_id: str,
    row_count: int,
) -> None:
    con.execute(
        "UPDATE _import_batches SET finished_at = CURRENT_TIMESTAMP, row_count = ? "
        "WHERE batch_id = ?",
        [row_count, batch_id],
    )
