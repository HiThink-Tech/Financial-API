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
        return cls(
            api_key=os.getenv("API_KEY") or None,
            base_url=os.getenv("BASE_URL", "https://api.example.com").rstrip("/"),
            mcp_base_url=os.getenv(
                "MCP_BASE_URL", "https://fuyao.aicubes.cn/mcp/a-share"
            ).rstrip("/"),
            mcp_meta_base_url=os.getenv(
                "MCP_META_BASE_URL", "https://fuyao.aicubes.cn/mcp/meta"
            ).rstrip("/"),
            db_path=resolved_db,
            data_root=resolved_data_root,
            max_lag_trading_days=int(os.getenv("MARKETDB_MAX_LAG_TRADING_DAYS", "7")),
        )
