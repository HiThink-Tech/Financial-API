from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

_DEFAULT_ENV_FILES = (".env", ".env.local")


def _load_dotenv_once() -> None:
    for name in _DEFAULT_ENV_FILES:
        path = Path.cwd() / name
        if path.is_file():
            load_dotenv(path, override=False)


@dataclass(frozen=True)
class Settings:
    api_key: str | None
    base_url: str
    mcp_base_url: str
    mcp_meta_base_url: str
    db_path: Path
    data_root: Path
    max_lag_trading_days: int
    rest_min_interval_seconds: float
    # Dump (Parquet) download channel — see docs/api-market-dumps-download-url.md.
    api_base_url: str
    dump_cache_dir: Path
    dump_keep_cache: bool
    dump_download_retries: int

    @classmethod
    def load(
        cls,
        *,
        db_path: str | os.PathLike[str] | None = None,
        data_root: str | os.PathLike[str] | None = None,
    ) -> "Settings":
        _load_dotenv_once()
        resolved_db = Path(
            db_path
            or os.getenv("MARKETDB_DB_PATH")
            or "./data/market.duckdb"
        ).expanduser()
        resolved_data_root = Path(
            data_root
            or os.getenv("MARKETDB_DATA_ROOT")
            or "./refer-to/data"
        ).expanduser()
        cache_override = os.getenv("MARKETDB_DUMP_CACHE_DIR")
        # Cache lives under the project data root (./data/.cache/dumps by default)
        # so it stays close to the DB and is easy to clean.
        resolved_cache = (
            Path(cache_override).expanduser()
            if cache_override
            else resolved_db.parent / ".cache" / "dumps"
        )
        return cls(
            api_key=os.getenv("API_KEY") or None,
            base_url=os.getenv("BASE_URL", "https://fuyao.aicubes.cn").rstrip("/"),
            mcp_base_url=os.getenv(
                "MCP_BASE_URL", "https://fuyao.aicubes.cn/mcp/a-share"
            ).rstrip("/"),
            mcp_meta_base_url=os.getenv(
                "MCP_META_BASE_URL", "https://fuyao.aicubes.cn/mcp/meta"
            ).rstrip("/"),
            db_path=resolved_db,
            data_root=resolved_data_root,
            max_lag_trading_days=int(os.getenv("MARKETDB_MAX_LAG_TRADING_DAYS", "7")),
            rest_min_interval_seconds=float(
                os.getenv("MARKETDB_REST_MIN_INTERVAL_SECONDS", "0.2")
            ),
            api_base_url=os.getenv(
                "MARKETDB_API_BASE_URL", "https://fuyao.aicubes.cn"
            ).rstrip("/"),
            dump_cache_dir=resolved_cache,
            dump_keep_cache=os.getenv("MARKETDB_DUMP_KEEP_CACHE", "0") not in ("", "0", "false", "False"),
            dump_download_retries=int(os.getenv("MARKETDB_DUMP_DOWNLOAD_RETRIES", "1")),
        )
