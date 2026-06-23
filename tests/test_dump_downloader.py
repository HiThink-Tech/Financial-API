from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock

import pytest
import requests

from marketdb.providers.dump import (
    DownloadKind,
    DumpAuthError,
    DumpDownloader,
    DumpDownloadError,
    DumpInternalError,
    DumpNotReadyError,
    derive_release_tag,
    derive_release_tag_from_local,
)


_PRESIGNED = (
    "https://o.thsi.cn/fuyao-market-dump/dev/release/daily_k/"
    "a_share_daily_k_1d_none_10y/2026-06-23T03-15-00Z.parquet?X-Amz-Algorithm=foo"
)


def _ok_envelope(url: str = _PRESIGNED) -> dict:
    return {
        "code": 0,
        "message": "success",
        "data": {
            "presigned_url": url,
            "presigned_url_expires_at": "2026-06-23T03:30:00Z",
            "expires_in_seconds": 900,
        },
    }


def _err_envelope(code: int, msg: str = "boom") -> dict:
    return {"code": code, "message": msg, "data": None}


class _FakeResponse:
    def __init__(self, *, status_code: int = 200, json_body: dict | None = None,
                 content: bytes = b"", headers: dict | None = None,
                 raise_on: bool = False):
        self.status_code = status_code
        self._json = json_body
        self.content = content
        self.text = content.decode("utf-8", errors="ignore")
        self.headers = headers or {}
        self._raise = raise_on
        self.ok = 200 <= status_code < 400

    def json(self):
        if self._json is None:
            raise ValueError("no json body")
        return self._json

    def iter_content(self, chunk_size: int = 1):
        if self._raise:
            raise requests.ConnectionError("boom")
        yield self.content

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


def _make_downloader(tmp_path: Path, session: MagicMock) -> DumpDownloader:
    return DumpDownloader(
        api_base_url="https://example.test",
        api_key="key",
        cache_dir=tmp_path / "cache",
        retries=1,
        session=session,
    )


def test_derive_release_tag_splits_url() -> None:
    tag, key = derive_release_tag(_PRESIGNED)
    assert tag == "2026-06-23T03-15-00Z.parquet"
    assert key.endswith("a_share_daily_k_1d_none_10y")


def test_derive_release_tag_from_local() -> None:
    assert derive_release_tag_from_local(
        Path("a_share_daily_k_1d_none_10y_20260620.parquet")
    ) == "local-20260620"
    assert derive_release_tag_from_local(Path("unknown.parquet")) == "unknown.parquet"


def test_fetch_success(tmp_path: Path) -> None:
    payload = b"PARQUET\x00" * 64
    session = MagicMock()
    session.get.side_effect = [
        _FakeResponse(json_body=_ok_envelope()),
        _FakeResponse(content=payload),
    ]
    session.head.return_value = _FakeResponse(headers={"Content-Length": str(len(payload))})
    downloader = _make_downloader(tmp_path, session)
    dump = downloader.fetch(DownloadKind.DAILY_K)
    assert dump.path.is_file()
    assert dump.path.read_bytes() == payload
    assert dump.release_tag == "2026-06-23T03-15-00Z.parquet"


def test_fetch_auth_error_is_not_retried(tmp_path: Path) -> None:
    session = MagicMock()
    session.get.return_value = _FakeResponse(json_body=_err_envelope(2002, "no key"))
    downloader = _make_downloader(tmp_path, session)
    with pytest.raises(DumpAuthError) as exc:
        downloader.fetch(DownloadKind.DAILY_K)
    assert exc.value.code == 2002
    # Auth errors short-circuit before any download attempt.
    assert session.get.call_count == 1


def test_fetch_not_ready(tmp_path: Path) -> None:
    session = MagicMock()
    session.get.return_value = _FakeResponse(json_body=_err_envelope(4040, "no dump"))
    downloader = _make_downloader(tmp_path, session)
    with pytest.raises(DumpNotReadyError):
        downloader.fetch(DownloadKind.DAILY_K)


def test_fetch_retry_on_transient_failure(tmp_path: Path) -> None:
    payload = b"PARQUET\x00" * 32
    session = MagicMock()
    # Attempt 1: sign returns 5xxx; attempt 2: success.
    session.get.side_effect = [
        _FakeResponse(json_body=_err_envelope(5001, "upstream")),
        _FakeResponse(json_body=_ok_envelope()),
        _FakeResponse(content=payload),
    ]
    session.head.return_value = _FakeResponse(headers={"Content-Length": str(len(payload))})
    downloader = _make_downloader(tmp_path, session)
    dump = downloader.fetch(DownloadKind.DAILY_K)
    assert dump.path.read_bytes() == payload
    # Two sign + one download = 3 GET calls total.
    assert session.get.call_count == 3


def test_fetch_exhausts_retries(tmp_path: Path) -> None:
    session = MagicMock()
    session.get.return_value = _FakeResponse(json_body=_err_envelope(5001, "upstream"))
    downloader = _make_downloader(tmp_path, session)
    with pytest.raises(DumpInternalError):
        downloader.fetch(DownloadKind.DAILY_K)
    # retries=1 → at most 2 attempts → 2 sign GETs.
    assert session.get.call_count == 2


def test_skips_when_cache_full(tmp_path: Path) -> None:
    payload = b"PARQUET\x00" * 8
    cache = tmp_path / "cache"
    cache.mkdir(parents=True)
    (cache / "daily-k.parquet").write_bytes(payload)
    session = MagicMock()
    session.get.return_value = _FakeResponse(json_body=_ok_envelope())
    session.head.return_value = _FakeResponse(headers={"Content-Length": str(len(payload))})
    downloader = _make_downloader(tmp_path, session)
    dump = downloader.fetch(DownloadKind.DAILY_K)
    # Only the sign call should have run; no streamed download.
    assert session.get.call_count == 1
    assert dump.path.read_bytes() == payload


def test_resumes_partial_with_range(tmp_path: Path) -> None:
    payload = b"PARQUET\x00" * 32
    cache = tmp_path / "cache"
    cache.mkdir(parents=True)
    half = len(payload) // 2
    (cache / "daily-k.parquet.part").write_bytes(payload[:half])
    session = MagicMock()
    session.head.return_value = _FakeResponse(headers={"Content-Length": str(len(payload))})
    session.get.side_effect = [
        _FakeResponse(json_body=_ok_envelope()),
        _FakeResponse(status_code=206, content=payload[half:]),
    ]
    downloader = _make_downloader(tmp_path, session)
    dump = downloader.fetch(DownloadKind.DAILY_K)
    assert dump.path.read_bytes() == payload
    # Verify the Range header was sent on the download GET.
    _, kwargs = session.get.call_args_list[1]
    assert kwargs.get("headers", {}).get("Range") == f"bytes={half}-"
