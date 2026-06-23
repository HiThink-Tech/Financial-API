#!/usr/bin/env python3
"""Cross-platform bootstrap for the marketdb project.

Default flow:
    1. install marketdb (editable)
    2. ensure .env exists
    3. initialise DuckDB
    4. sync data via the API auto-sync channel (FULL on empty / lagging db,
       INCREMENTAL within 7 trading days). If the API channel fails for any
       reason, fall back to applying parquet files in refer-to/data/.
    5. run status + validate

Mode flags (mutually exclusive shortcuts; default is "api with local fallback"):
    --api-only       Only use the API channel. Skip local parquet entirely.
    --prefer-local   Try local parquet first; fall back to the API channel.
    --local-only     Skip the API channel; require parquet under refer-to/data/.
    --no-sync        Skip the data sync step (install/init only).
    --force          Pass --force to auto-sync (ignore release-tag short-circuit)
                     or re-import local parquet even when DB already has rows.

Works on Windows, macOS and Linux. All filesystem paths go through pathlib so
the same script works without modification on any platform.
"""

from __future__ import annotations

import argparse
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DB_PATH = Path(os.environ.get("MARKETDB_DB_PATH", "data/market.duckdb"))
PARQUET_DIR = ROOT / "refer-to" / "data"
DAILY_GLOB = "a_share_daily_k_1d_none_10y_*.parquet"
EVENTS_GLOB = "a_share_adjustment_factors_event_none_all_*.parquet"
ADMIN_URL = "https://fuyao.aicubes.cn/admin/"
DOCS_URL = "https://fuyao.aicubes.cn/docs/api-reference/market-dumps/"

USE_COLOR = sys.stdout.isatty() and os.environ.get("NO_COLOR") is None


def say(msg: str) -> None:
    if USE_COLOR:
        print(f"\033[1;34m==>\033[0m {msg}")
    else:
        print(f"==> {msg}")


def warn(msg: str) -> None:
    print(msg, file=sys.stderr)


def latest_match(pattern: str) -> Path | None:
    matches = sorted(PARQUET_DIR.glob(pattern))
    return matches[-1] if matches else None


def run(cmd: list[str], check: bool = True) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, check=check, text=True)


def marketdb_cmd() -> list[str]:
    exe = shutil.which("marketdb")
    if exe:
        return [exe]
    return [sys.executable, "-m", "marketdb.cli"]


def step_check_python() -> None:
    say("checking python version")
    if sys.version_info < (3, 11):
        warn(f"marketdb requires Python >= 3.11; got {sys.version.split()[0]}")
        sys.exit(1)


def step_install_marketdb() -> None:
    say("installing marketdb (editable)")
    try:
        __import__("marketdb")
        print("    marketdb already importable, skipping pip install")
        return
    except ImportError:
        pass
    run([sys.executable, "-m", "pip", "install", "-e", str(ROOT)])


def step_env_file() -> None:
    env_path = ROOT / ".env"
    example = ROOT / ".env.example"
    if env_path.exists():
        print("==> .env already exists, leaving untouched")
        return
    if not example.exists():
        warn("    [warn] .env.example missing; skipping .env creation")
        return
    say("creating .env from .env.example")
    shutil.copyfile(example, env_path)
    print(f"    edit .env to set API_KEY (get one at {ADMIN_URL}) before syncing")


def step_init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    say(f"initializing DuckDB at {DB_PATH}")
    run(marketdb_cmd() + ["init", "--db", str(DB_PATH)])


def _try_api_sync(force: bool) -> bool:
    """Run `marketdb auto-sync`; return True on success."""
    say("syncing via API (auto-sync)")
    cmd = marketdb_cmd() + ["auto-sync", "--db", str(DB_PATH)]
    if force:
        cmd.append("--force")
    res = subprocess.run(cmd, check=False)
    return res.returncode == 0


def _try_local_apply(force: bool) -> bool:
    """Apply parquet files from refer-to/data/ via the legacy import-parquet
    command. Returns True if both files were found and applied.
    """
    daily = latest_match(DAILY_GLOB)
    events = latest_match(EVENTS_GLOB)
    if not daily or not events:
        warn(
            "    [warn] local parquet not found under refer-to/data/:\n"
            f"      expected: {DAILY_GLOB}\n"
            f"      expected: {EVENTS_GLOB}\n"
            f"      download from {DOCS_URL} or run `marketdb auto-sync`."
        )
        return False
    say(f"applying local parquet (daily={daily.name}, events={events.name})")
    cmd = marketdb_cmd() + [
        "import-parquet",
        "--db", str(DB_PATH),
        "--daily", str(daily),
        "--events", str(events),
    ]
    if force:
        # import-parquet is already overwriting; --force is forwarded so future
        # versions that gate on row-count behave consistently.
        pass
    res = subprocess.run(cmd, check=False)
    if res.returncode != 0:
        warn(f"    [warn] local import failed (exit {res.returncode})")
        return False
    return True


def step_sync(mode: str, force: bool) -> None:
    if mode == "skip":
        say("skipping sync (--no-sync)")
        return
    if mode == "local-only":
        if not _try_local_apply(force):
            warn("    local-only mode but no parquet applied; bootstrap incomplete")
            sys.exit(1)
        return
    if mode == "api-only":
        if not _try_api_sync(force):
            warn(f"    API sync failed; configure API_KEY ({ADMIN_URL}) and retry,")
            warn(f"    or rerun with --prefer-local / --local-only.")
            sys.exit(1)
        return
    if mode == "prefer-local":
        if _try_local_apply(force):
            return
        say("local apply skipped; trying API auto-sync next")
        if not _try_api_sync(force):
            sys.exit(1)
        return
    # default: api with local fallback
    if _try_api_sync(force):
        return
    warn("    API sync failed; trying local parquet fallback")
    if not _try_local_apply(force):
        warn(
            "    Neither API nor local parquet succeeded.\n"
            f"    Set API_KEY (get one at {ADMIN_URL}) and rerun,\n"
            f"    or download parquet from {DOCS_URL} into {PARQUET_DIR}/."
        )
        sys.exit(1)


def step_status_validate() -> None:
    say("status")
    subprocess.run(marketdb_cmd() + ["status", "--db", str(DB_PATH)], check=False)
    say("validate")
    subprocess.run(marketdb_cmd() + ["validate", "--db", str(DB_PATH)], check=False)


def parse_mode(args: argparse.Namespace) -> str:
    chosen = [
        name for name, val in (
            ("api-only", args.api_only),
            ("local-only", args.local_only),
            ("prefer-local", args.prefer_local),
            ("skip", args.no_sync),
        ) if val
    ]
    if len(chosen) > 1:
        warn(f"    [error] conflicting flags: {', '.join(chosen)}")
        sys.exit(2)
    return chosen[0] if chosen else "default"


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Bootstrap the marketdb project (cross-platform).",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--no-sync", action="store_true",
                       help="skip the data sync step")
    parser.add_argument("--api-only", action="store_true",
                       help="only use the API auto-sync channel")
    parser.add_argument("--local-only", action="store_true",
                       help="only use parquet files in refer-to/data/")
    parser.add_argument("--prefer-local", action="store_true",
                       help="try local parquet first, then API")
    parser.add_argument("--force", action="store_true",
                       help="forward --force to auto-sync / re-import locally")
    args = parser.parse_args()

    os.chdir(ROOT)
    mode = parse_mode(args)

    step_check_python()
    step_install_marketdb()
    step_env_file()
    step_init_db()
    step_sync(mode, args.force)
    step_status_validate()

    db_rel = DB_PATH.as_posix()
    say(
        f'done. try:  marketdb query --db {db_rel} '
        f'--sql "SELECT date, close FROM v_daily_qfq '
        f"WHERE thscode='600519.SH' ORDER BY date DESC LIMIT 5\""
    )
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except subprocess.CalledProcessError as e:
        warn(f"command failed (exit {e.returncode}): {' '.join(e.cmd)}")
        sys.exit(e.returncode)
    except KeyboardInterrupt:
        warn("\ninterrupted")
        sys.exit(130)
