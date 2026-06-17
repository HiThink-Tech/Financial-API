#!/usr/bin/env python3
"""Cross-platform bootstrap for the marketdb project.

Usage:
    python bootstrap.py              # full setup: install + .env + init db + import parquet + validate
    python bootstrap.py --no-import  # skip the parquet import step (fast)
    python bootstrap.py --force      # re-import even if data/market.duckdb already has rows

Idempotent: re-running on an already-initialized project only fills in what's
missing. If a newer parquet snapshot is found under refer-to/data/ than what's
currently in the DB, the script will ask before re-importing (non-interactive
shells skip and print a hint to use --force).

Works on Windows, macOS and Linux.
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
PARQUET_SOURCE_URL = "https://fuyao.aicubes.cn/docs/api-reference/market-dumps/"

USE_COLOR = sys.stdout.isatty() and os.environ.get("NO_COLOR") is None


def say(msg: str) -> None:
    if USE_COLOR:
        print(f"\033[1;34m==>\033[0m {msg}")
    else:
        print(f"==> {msg}")


def warn(msg: str) -> None:
    print(msg, file=sys.stderr)


def warn_missing_parquet() -> None:
    warn(
        f"    [warn] parquet dump not found under {PARQUET_DIR}/\n"
        f"      expected (glob): {DAILY_GLOB}\n"
        f"      expected (glob): {EVENTS_GLOB}\n"
        f"      download from:   {PARQUET_SOURCE_URL}\n"
        f"      (run again with --no-import to skip, or after dropping the files into "
        f"{PARQUET_DIR}/)"
    )


def latest_match(pattern: str) -> Path | None:
    """Return the lexicographically latest file matching pattern (None if none)."""
    matches = sorted(PARQUET_DIR.glob(pattern))
    return matches[-1] if matches else None


def run(cmd: list[str], check: bool = True, capture: bool = False) -> subprocess.CompletedProcess:
    """Run a command; on Windows resolve console scripts to .exe if needed."""
    return subprocess.run(
        cmd,
        check=check,
        text=True,
        capture_output=capture,
    )


def marketdb_cmd() -> list[str]:
    """Resolve the marketdb entry point.

    Prefer the installed console script (shutil.which finds `marketdb.exe` on
    Windows). Fall back to `python -m marketdb.cli`, which works whenever the
    package is importable, even if the console script isn't on PATH.
    """
    exe = shutil.which("marketdb")
    if exe:
        return [exe]
    return [sys.executable, "-m", "marketdb.cli"]


def marketdb_query(sql: str) -> str:
    """Run a marketdb query and return stdout (empty string on failure)."""
    try:
        res = subprocess.run(
            marketdb_cmd() + ["query", "--db", str(DB_PATH), "--sql", sql],
            text=True,
            capture_output=True,
            check=False,
        )
        return res.stdout or ""
    except FileNotFoundError:
        return ""


def extract_int(s: str) -> int:
    digits = re.sub(r"\D", "", s.splitlines()[-1] if s.strip() else "")
    return int(digits) if digits else 0


def snapshot_date(parquet_path: Path) -> str:
    m = re.findall(r"\d{8}", parquet_path.name)
    return m[-1] if m else ""


def prompt_yes(question: str) -> bool:
    if not sys.stdin.isatty():
        return False
    try:
        ans = input(f"    {question} [Y/n] ").strip() or "Y"
    except EOFError:
        return False
    return ans[:1] in ("Y", "y")


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
    print("    edit .env to set API_KEY / BASE_URL before running sync-symbols or update-daily")


def step_init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    say(f"initializing DuckDB at {DB_PATH}")
    run(marketdb_cmd() + ["init", "--db", str(DB_PATH)])


def step_import_parquet(skip_import: bool, force: bool,
                       daily: Path | None, events: Path | None) -> None:
    if skip_import:
        say("skipping parquet import (--no-import)")
        return
    if not daily or not events or not daily.is_file() or not events.is_file():
        warn_missing_parquet()
        warn("    skipping import.")
        return

    rows = extract_int(marketdb_query("SELECT COUNT(*) FROM raw_kline_daily"))
    do_import = False

    if rows == 0:
        do_import = True
    elif force:
        do_import = True
        print("    --force given: will re-import parquet")
    else:
        snap = snapshot_date(daily)
        max_out = marketdb_query("SELECT MAX(date) FROM raw_kline_daily")
        last_line = max_out.splitlines()[-1] if max_out.strip() else ""
        db_max = re.sub(r"\D", "", last_line)[:8]
        if snap and db_max and snap > db_max:
            pretty = f"{db_max[:4]}-{db_max[4:6]}-{db_max[6:8]}"
            print(f"    newer parquet snapshot detected: {snap} (DB latest date: {pretty})")
            if prompt_yes("re-import now?"):
                do_import = True
            else:
                if sys.stdin.isatty():
                    print("    skipping import (re-run with --force to import later)")
                else:
                    print("    non-interactive shell; skipping (re-run with --force to import)")
        else:
            print(
                f"    raw_kline_daily already has {rows} rows; parquet snapshot "
                f"({snap or '?'}) is not newer than DB ({db_max or '?'}), "
                f"skipping (use --force to re-import)"
            )

    if do_import:
        say("importing parquet (this may take a minute)")
        run(marketdb_cmd() + [
            "import-parquet",
            "--db", str(DB_PATH),
            "--daily", str(daily),
            "--events", str(events),
        ])


def step_status_validate() -> None:
    say("status")
    subprocess.run(marketdb_cmd() + ["status", "--db", str(DB_PATH)], check=False)
    say("validate")
    subprocess.run(marketdb_cmd() + ["validate", "--db", str(DB_PATH)], check=False)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Bootstrap the marketdb project (cross-platform).",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--no-import", dest="skip_import", action="store_true",
                       help="skip the parquet import step")
    parser.add_argument("--force", action="store_true",
                       help="re-import even if the DB already has rows")
    args = parser.parse_args()

    os.chdir(ROOT)

    # 0. Pre-flight: scan parquet dumps (only matters if we'll import).
    daily = latest_match(DAILY_GLOB)
    events = latest_match(EVENTS_GLOB)
    if not args.skip_import:
        say("checking parquet dumps")
        if not daily or not events:
            warn_missing_parquet()
            warn("    proceeding with install/init; the import step will be skipped.")
        else:
            print(f"    daily:  {daily}")
            print(f"    events: {events}")

    step_check_python()
    step_install_marketdb()
    step_env_file()
    step_init_db()
    step_import_parquet(args.skip_import, args.force, daily, events)
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
