from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Callable

import duckdb

from marketdb.calculations.adjustment import rebuild_adjustment_factors
from marketdb.importers.parquet import (
    import_adjustment_events_parquet,
    import_kline_daily_parquet,
)
from marketdb.providers.dump import (
    DownloadKind,
    DownloadedDump,
    DumpDownloader,
)
from marketdb.providers.rest import RestProvider
from marketdb.schema import get_meta, rebuild_views, set_meta_many


# Hardcoded by product decision (2026-06-23): the daily-k-10d dump covers ~10
# trading days; we leave a 3-day overlap so any lag >7 means we should refresh
# from the full snapshot instead.
MAX_INCREMENTAL_LAG = 7


# ---- decision model --------------------------------------------------------


@dataclass(frozen=True)
class SyncDecision:
    mode: str  # "full" | "incremental" | "skip"
    lag_trading_days: int
    local_max_date: date | None
    target_date: date


def _local_max_date(con: duckdb.DuckDBPyConnection) -> date | None:
    row = con.execute("SELECT MAX(date) FROM raw_kline_daily").fetchone()
    return row[0] if row and row[0] else None


def _ms_to_date(ms: int) -> date:
    # Server already aligned trading days to Asia/Shanghai 00:00:00, so plain
    # UTC conversion plus the +08:00 offset recovers the calendar date.
    return datetime.fromtimestamp(ms / 1000, tz=timezone.utc).astimezone().date()


def decide(
    con: duckdb.DuckDBPyConnection,
    trading_days: list[date],
    *,
    target: date | None = None,
) -> SyncDecision:
    if not trading_days:
        raise RuntimeError("trading-day calendar is empty")
    end = target or trading_days[-1]
    local_max = _local_max_date(con)
    if local_max is None:
        return SyncDecision(
            mode="full",
            lag_trading_days=len(trading_days),
            local_max_date=None,
            target_date=end,
        )
    lag = sum(1 for d in trading_days if local_max < d <= end)
    if lag == 0:
        mode = "skip"
    elif lag <= MAX_INCREMENTAL_LAG:
        mode = "incremental"
    else:
        mode = "full"
    return SyncDecision(
        mode=mode,
        lag_trading_days=lag,
        local_max_date=local_max,
        target_date=end,
    )


# ---- orchestration ---------------------------------------------------------


Logger = Callable[[str], None]


def _noop(_msg: str) -> None:
    return None


def _apply_dump(
    con: duckdb.DuckDBPyConnection,
    dump: DownloadedDump,
    *,
    keep_cache: bool,
    log: Logger,
) -> int:
    """Apply a downloaded dump to DuckDB, then delete the parquet on success."""
    path = dump.path
    if dump.kind is DownloadKind.ADJUSTMENT_FACTORS:
        rows = import_adjustment_events_parquet(con, path)
    elif dump.kind is DownloadKind.DAILY_K:
        rows = import_kline_daily_parquet(con, path, overwrite=True)
    elif dump.kind is DownloadKind.DAILY_K_10D:
        rows = import_kline_daily_parquet(con, path, overwrite=False)
    else:
        raise RuntimeError(f"unknown dump kind: {dump.kind!r}")
    log(f"  applied {dump.kind.value}: rows={rows} release_tag={dump.release_tag}")
    if not keep_cache:
        try:
            path.unlink(missing_ok=True)
            log(f"  cleaned cache file {path}")
        except OSError as exc:
            log(f"  warn: failed to remove cache file {path}: {exc}")
    return rows


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def auto_sync(
    con: duckdb.DuckDBPyConnection,
    *,
    downloader: DumpDownloader,
    provider: RestProvider,
    keep_cache: bool = False,
    force: bool = False,
    target: date | None = None,
    log: Logger | None = None,
) -> dict:
    """Decide FULL/INCREMENTAL/SKIP, download the right dumps, apply, clean up.

    Adjustment events are refreshed on every run by design — they ride alongside
    every K-line change so v_daily_qfq stays in sync.

    Release tags are recorded in _meta so a second run on an unchanged release
    short-circuits the corresponding download/import. ``force=True`` bypasses
    that short-circuit (operator escape hatch).
    """
    log = log or _noop
    trading_days = [_ms_to_date(d["date_ms"]) for d in provider.trading_days()]
    decision = decide(con, trading_days, target=target)
    log(f"decision: mode={decision.mode} lag={decision.lag_trading_days} "
        f"local_max={decision.local_max_date} target={decision.target_date}")

    meta_writes: list[tuple[str, str]] = [
        ("last_auto_sync_mode", decision.mode),
        ("last_auto_sync_at", _now_iso()),
    ]
    result: dict = {
        "mode": decision.mode,
        "lag_trading_days": decision.lag_trading_days,
        "local_max_date": decision.local_max_date.isoformat() if decision.local_max_date else None,
        "target_date": decision.target_date.isoformat(),
        "kline_applied": False,
        "kline_release_tag": None,
        "adjustment_applied": False,
        "adjustment_release_tag": None,
        "skipped_by_release_tag": [],
    }

    # 1. K-line branch -------------------------------------------------------
    # FULL and INCREMENTAL mean "local data is behind", so always re-apply.
    # release_tag is recorded for observability but does NOT gate the apply:
    # local rows may have been pruned manually even when the tag matches.
    # ``force=True`` escalates a SKIP decision to a FULL re-apply.
    effective_mode = decision.mode
    if effective_mode == "skip" and force:
        effective_mode = "full"
        log("  force: SKIP escalated to FULL — re-applying full K-line dump")
        result["mode"] = "full"

    if effective_mode == "full":
        dump = downloader.fetch(DownloadKind.DAILY_K)
        _apply_dump(con, dump, keep_cache=keep_cache, log=log)
        meta_writes.extend([
            ("last_full_kline_release_tag", dump.release_tag),
            ("last_full_kline_applied_at", _now_iso()),
        ])
        result["kline_applied"] = True
        result["kline_release_tag"] = dump.release_tag

    elif effective_mode == "incremental":
        dump = downloader.fetch(DownloadKind.DAILY_K_10D)
        _apply_dump(con, dump, keep_cache=keep_cache, log=log)
        meta_writes.extend([
            ("last_incremental_kline_release_tag", dump.release_tag),
            ("last_incremental_kline_applied_at", _now_iso()),
            ("last_incremental_window_end", decision.target_date.isoformat()),
        ])
        result["kline_applied"] = True
        result["kline_release_tag"] = dump.release_tag

    else:
        log("  K-line already up to date; still refreshing adjustment events")

    # 2. Adjustment branch — always runs, no release_tag short-circuit.
    # The released filename only carries a date (e.g. *_20260623.parquet), so
    # an intraday content update would reuse the same tag. Re-applying every
    # run is the only way to avoid silent drift in v_daily_qfq.
    adj_dump = downloader.fetch(DownloadKind.ADJUSTMENT_FACTORS)
    result["adjustment_release_tag"] = adj_dump.release_tag
    _apply_dump(con, adj_dump, keep_cache=keep_cache, log=log)
    rebuild_adjustment_factors(con)
    meta_writes.extend([
        ("last_adjustment_release_tag", adj_dump.release_tag),
        ("last_adjustment_applied_at", _now_iso()),
    ])
    result["adjustment_applied"] = True

    # views always rebuilt: cheap, tolerates drift from manual SQL edits.
    rebuild_views(con)
    set_meta_many(con, meta_writes)
    return result


# ---- helpers for bootstrap-style local fallback ----------------------------


def apply_local_full(
    con: duckdb.DuckDBPyConnection,
    *,
    daily_path: Path,
    events_path: Path,
    log: Logger | None = None,
) -> dict:
    """Apply a pair of local parquet files as a FULL snapshot.

    Used by bootstrap.py when API download is skipped or fails. The release tag
    is derived from each file's YYYYMMDD marker so a subsequent API auto-sync
    can recognise this snapshot and short-circuit if appropriate.
    """
    from marketdb.providers.dump import derive_release_tag_from_local

    log = log or _noop
    rows_k = import_kline_daily_parquet(con, daily_path, overwrite=True)
    rows_e = import_adjustment_events_parquet(con, events_path)
    rebuild_adjustment_factors(con)
    rebuild_views(con)
    daily_tag = derive_release_tag_from_local(Path(daily_path))
    adj_tag = derive_release_tag_from_local(Path(events_path))
    set_meta_many(con, [
        ("last_auto_sync_mode", "full-local"),
        ("last_auto_sync_at", _now_iso()),
        ("last_full_kline_release_tag", daily_tag),
        ("last_full_kline_applied_at", _now_iso()),
        ("last_adjustment_release_tag", adj_tag),
        ("last_adjustment_applied_at", _now_iso()),
    ])
    log(f"local FULL applied: kline rows={rows_k}, events rows={rows_e}, "
        f"tags=({daily_tag}, {adj_tag})")
    return {
        "mode": "full-local",
        "kline_rows": rows_k,
        "event_rows": rows_e,
        "kline_release_tag": daily_tag,
        "adjustment_release_tag": adj_tag,
    }
