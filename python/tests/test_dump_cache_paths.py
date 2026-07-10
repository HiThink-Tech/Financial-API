from __future__ import annotations

from pathlib import Path, PureWindowsPath
from unittest.mock import MagicMock

import pytest

from marketdb.providers.dump import DownloadKind, DumpDownloader


class _Resp:
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)
        self.ok = kwargs.get("status_code", 200) < 400

    def json(self):
        return self._json  # type: ignore[attr-defined]

    def iter_content(self, chunk_size: int = 1):
        yield self._content  # type: ignore[attr-defined]

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


def test_cache_dir_uses_pathlib_and_is_created(tmp_path: Path) -> None:
    nested = tmp_path / "deep" / "data" / ".cache" / "dumps"
    session = MagicMock()
    DumpDownloader(
        api_base_url="https://example.test",
        api_key="x",
        cache_dir=nested,
        session=session,
    )
    assert nested.is_dir()


def test_cache_filenames_are_kind_stable() -> None:
    # The cache filename is derived from the enum value alone, so the same name
    # is used on every OS — no path-separator surprises.
    assert DownloadKind.DAILY_K.cache_filename == "daily-k.parquet"
    assert DownloadKind.DAILY_K_10D.cache_filename == "daily-k-10d.parquet"
    assert DownloadKind.ADJUSTMENT_FACTORS.cache_filename == "adjustment-factors.parquet"


def test_purewindows_path_compatible(tmp_path: Path) -> None:
    # Just confirms that PureWindowsPath joining matches our expectation on
    # the receiving end; we never construct paths with raw "/" in the codebase.
    base = PureWindowsPath("C:/Users/x/.cache/dumps")
    target = base / "daily-k.parquet"
    assert str(target).endswith("daily-k.parquet")
