#!/usr/bin/env bash
# Quick bootstrap for the marketdb project.
#
# Usage:
#   ./bootstrap.sh              # full setup: install + .env + init db + import parquet + validate
#   ./bootstrap.sh --no-import  # skip the parquet import step (fast)
#   ./bootstrap.sh --force      # re-import even if data/market.duckdb already has rows
#
# The script is idempotent: re-running it on an already-initialized project
# only fills in what's missing. If a newer parquet snapshot is found under
# refer-to/data/ than what's currently in the DB, the script will ask before
# re-importing (non-interactive shells skip and print a hint to use --force).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

PY="${PYTHON:-python3}"
DB_PATH="${MARKETDB_DB_PATH:-data/market.duckdb}"
PARQUET_DIR="refer-to/data"
DAILY_GLOB="$PARQUET_DIR/a_share_daily_k_1d_none_10y_*.parquet"
EVENTS_GLOB="$PARQUET_DIR/a_share_adjustment_factors_event_none_all_*.parquet"
PARQUET_SOURCE_URL="https://fuyao.aicubes.cn/docs/api-reference/market-dumps/"

# Pick the lexicographically latest matching parquet (filenames carry a YYYYMMDD suffix).
shopt -s nullglob
DAILY_MATCHES=( $DAILY_GLOB )
EVENTS_MATCHES=( $EVENTS_GLOB )
shopt -u nullglob
DAILY_PARQUET="${DAILY_MATCHES[${#DAILY_MATCHES[@]}-1]:-}"
EVENTS_PARQUET="${EVENTS_MATCHES[${#EVENTS_MATCHES[@]}-1]:-}"

SKIP_IMPORT=0
FORCE=0
for arg in "$@"; do
  case "$arg" in
    --no-import) SKIP_IMPORT=1 ;;
    --force)     FORCE=1 ;;
    -h|--help)
      sed -n '2,11p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) echo "unknown arg: $arg" >&2; exit 2 ;;
  esac
done

say() { printf "\033[1;34m==>\033[0m %s\n" "$*"; }

warn_missing_parquet() {
  cat >&2 <<EOF
    [warn] parquet dump not found under $PARQUET_DIR/
      expected (glob): $DAILY_GLOB
      expected (glob): $EVENTS_GLOB
      download from:   $PARQUET_SOURCE_URL
      (run again with --no-import to skip this step, or after dropping the files into $PARQUET_DIR/)
EOF
}

# 0. Pre-flight: check that parquet dumps are present (only matters if we'll import).
if [[ "$SKIP_IMPORT" -ne 1 ]]; then
  say "checking parquet dumps"
  if [[ -z "$DAILY_PARQUET" || -z "$EVENTS_PARQUET" ]]; then
    warn_missing_parquet
    echo "    proceeding with install/init; the import step will be skipped." >&2
  else
    echo "    daily:  $DAILY_PARQUET"
    echo "    events: $EVENTS_PARQUET"
  fi
fi

# 1. Python version sanity check (pyproject requires >=3.11)
say "checking python version"
"$PY" -c 'import sys; sys.exit(0 if sys.version_info >= (3,11) else 1)' || {
  echo "marketdb requires Python >= 3.11; got $($PY -V)" >&2
  exit 1
}

# 2. Install the package in editable mode if not already importable
say "installing marketdb (editable)"
if ! "$PY" -c 'import marketdb' >/dev/null 2>&1; then
  "$PY" -m pip install -e .
else
  echo "    marketdb already importable, skipping pip install"
fi

# 3. .env
if [[ ! -f .env ]]; then
  say "creating .env from .env.example"
  cp .env.example .env
  echo "    edit .env to set API_KEY / BASE_URL before running sync-symbols or update-daily"
else
  echo "==> .env already exists, leaving untouched"
fi

# 4. Init DuckDB schema
mkdir -p "$(dirname "$DB_PATH")"
say "initializing DuckDB at $DB_PATH"
marketdb init --db "$DB_PATH"

# 5. Import parquet (optional / idempotent)
if [[ "$SKIP_IMPORT" -eq 1 ]]; then
  say "skipping parquet import (--no-import)"
elif [[ -z "$DAILY_PARQUET" || -z "$EVENTS_PARQUET" || ! -f "$DAILY_PARQUET" || ! -f "$EVENTS_PARQUET" ]]; then
  warn_missing_parquet
  echo "    skipping import." >&2
else
  ROWS=$(marketdb query --db "$DB_PATH" --sql "SELECT COUNT(*) FROM raw_kline_daily" 2>/dev/null | tail -1 | tr -dc '0-9' || echo 0)
  DO_IMPORT=0
  if [[ "${ROWS:-0}" -eq 0 ]]; then
    DO_IMPORT=1
  elif [[ "$FORCE" -eq 1 ]]; then
    DO_IMPORT=1
    echo "    --force given: will re-import parquet"
  else
    # Compare snapshot date in parquet filename (YYYYMMDD) vs MAX(date) in raw_kline_daily.
    SNAP=$(basename "$DAILY_PARQUET" | grep -oE '[0-9]{8}' | tail -1)
    DB_MAX=$(marketdb query --db "$DB_PATH" --sql "SELECT MAX(date) FROM raw_kline_daily" 2>/dev/null | tail -1 | tr -dc '0-9')
    DB_MAX="${DB_MAX:0:8}"
    if [[ -n "$SNAP" && -n "$DB_MAX" && "$SNAP" > "$DB_MAX" ]]; then
      echo "    newer parquet snapshot detected: $SNAP (DB latest date: ${DB_MAX:0:4}-${DB_MAX:4:2}-${DB_MAX:6:2})"
      if [[ -t 0 ]]; then
        read -r -p "    re-import now? [Y/n] " ANS
        ANS="${ANS:-Y}"
        if [[ "$ANS" =~ ^[Yy]$ ]]; then
          DO_IMPORT=1
        else
          echo "    skipping import (re-run with --force to import later)"
        fi
      else
        echo "    non-interactive shell; skipping (re-run with --force to import)"
      fi
    else
      echo "    raw_kline_daily already has $ROWS rows; parquet snapshot (${SNAP:-?}) is not newer than DB (${DB_MAX:-?}), skipping (use --force to re-import)"
    fi
  fi

  if [[ "$DO_IMPORT" -eq 1 ]]; then
    say "importing parquet (this may take a minute)"
    marketdb import-parquet \
      --db "$DB_PATH" \
      --daily  "$DAILY_PARQUET" \
      --events "$EVENTS_PARQUET"
  fi
fi

# 6. Status + validation
say "status"
marketdb status --db "$DB_PATH" || true

say "validate"
marketdb validate --db "$DB_PATH" || true

say "done. try:  marketdb query --db $DB_PATH --sql \"SELECT date, close FROM v_daily_qfq WHERE thscode='600519.SH' ORDER BY date DESC LIMIT 5\""
