from __future__ import annotations

import enum
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

import requests


# ---- enums & dataclasses ---------------------------------------------------


class DownloadKind(str, enum.Enum):
    DAILY_K = "daily-k"
    DAILY_K_10D = "daily-k-10d"
    ADJUSTMENT_FACTORS = "adjustment-factors"

    @property
    def path_segment(self) -> str:
        return self.value

    @property
    def cache_filename(self) -> str:
        # Stable name per kind so subsequent runs reuse the in-flight `.part`.
        return f"{self.value}.parquet"


@dataclass(frozen=True)
class DownloadedDump:
    path: Path
    kind: DownloadKind
    release_tag: str
    release_key: str
    expires_at: datetime | None


# ---- errors ----------------------------------------------------------------


class DumpDownloadError(RuntimeError):
    """Base class for all dump download failures."""


class DumpAuthError(DumpDownloadError):
    """API rejected the X-api-key (codes 2002 / 2004)."""

    def __init__(self, code: int, message: str):
        super().__init__(f"auth failed: code={code} message={message}")
        self.code = code
        self.message = message


class DumpNotReadyError(DumpDownloadError):
    """Server hasn't published the dump yet (code 4040)."""


class DumpInternalError(DumpDownloadError):
    """Retryable: 5xxx envelope, HTTP 5xx, or transport error."""


# ---- release-tag derivation ------------------------------------------------


# presigned URL example:
#   https://o.thsi.cn/fuyao-market-dump/.../daily_k/a_share_daily_k_1d_none_10y/
#       2026-06-23T03-15-00Z.parquet?X-Amz-Algorithm=...
# We strip query string, then split the path. `release_tag` is the leaf
# filename; `release_key` is the parent path segment (dump id).
def derive_release_tag(presigned_url: str) -> tuple[str, str]:
    parts = urlsplit(presigned_url)
    segments = [s for s in parts.path.split("/") if s]
    if not segments:
        raise ValueError(f"unexpected presigned URL path: {presigned_url!r}")
    release_tag = segments[-1]
    release_key = "/".join(segments[:-1])
    return release_tag, release_key


_LOCAL_TAG_RE = re.compile(r"(\d{8})")


def derive_release_tag_from_local(parquet_path: Path) -> str:
    """Use the trailing YYYYMMDD chunk in the filename as a stable release tag."""
    m = _LOCAL_TAG_RE.findall(parquet_path.name)
    if not m:
        return parquet_path.name
    return f"local-{m[-1]}"


# ---- downloader ------------------------------------------------------------


@dataclass
class DumpDownloader:
    api_base_url: str
    api_key: str
    cache_dir: Path
    retries: int = 1
    timeout: float = 30.0
    session: requests.Session | None = None

    def __post_init__(self) -> None:
        # pathlib.Path is the only path representation we accept; this keeps
        # Windows / macOS / Linux behaviour identical (no manual "/" splicing).
        self.cache_dir = Path(self.cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.session = self.session or requests.Session()

    # -- public API ----------------------------------------------------------

    def fetch(self, kind: DownloadKind) -> DownloadedDump:
        """Sign a presigned URL and download it, with one transparent retry.

        Auth errors and "not ready" are not retried — they require user action.
        Network / 5xx / presigned expiry are retried up to `self.retries` times,
        each retry re-signing a fresh URL.
        """
        last_internal: Exception | None = None
        attempt_budget = max(0, self.retries) + 1
        for attempt in range(1, attempt_budget + 1):
            try:
                envelope = self._sign(kind)
                presigned_url = envelope["presigned_url"]
                expires_at = self._parse_expires_at(envelope.get("presigned_url_expires_at"))
                release_tag, release_key = derive_release_tag(presigned_url)
                final_path = self._download_with_resume(presigned_url, kind)
                return DownloadedDump(
                    path=final_path,
                    kind=kind,
                    release_tag=release_tag,
                    release_key=release_key,
                    expires_at=expires_at,
                )
            except (DumpAuthError, DumpNotReadyError):
                raise
            except DumpInternalError as exc:
                last_internal = exc
                if attempt >= attempt_budget:
                    raise
                continue
        # unreachable; the loop either returns or raises.
        raise DumpInternalError(f"download failed after {attempt_budget} attempts: {last_internal!r}")

    # -- signing -------------------------------------------------------------

    def _sign(self, kind: DownloadKind) -> dict[str, Any]:
        url = (
            f"{self.api_base_url.rstrip('/')}/api/dump/market-dumps/"
            f"{kind.path_segment}/download-url"
        )
        headers = {"X-api-key": self.api_key, "Accept": "application/json"}
        try:
            resp = self.session.get(url, headers=headers, timeout=self.timeout)
        except requests.RequestException as exc:
            raise DumpInternalError(f"sign request failed: {exc!r}") from exc
        if resp.status_code >= 500:
            raise DumpInternalError(f"sign HTTP {resp.status_code}: {resp.text[:200]}")
        try:
            body = resp.json()
        except ValueError as exc:
            raise DumpInternalError(f"sign returned non-JSON ({resp.status_code})") from exc
        code = body.get("code")
        if code == 0:
            data = body.get("data") or {}
            if not data.get("presigned_url"):
                raise DumpInternalError(f"envelope missing presigned_url: {body!r}")
            return data
        message = body.get("message", "")
        if code in (2002, 2004):
            raise DumpAuthError(code, message)
        if code == 4040:
            raise DumpNotReadyError(f"DATA_NOT_READY: {message}")
        # 5xxx or unknown — treat as transient.
        raise DumpInternalError(f"envelope code={code} message={message}")

    @staticmethod
    def _parse_expires_at(raw: str | None) -> datetime | None:
        if not raw:
            return None
        try:
            normalized = raw.replace("Z", "+00:00")
            return datetime.fromisoformat(normalized).astimezone(timezone.utc)
        except ValueError:
            return None

    # -- download with Range resume -----------------------------------------

    def _download_with_resume(self, url: str, kind: DownloadKind) -> Path:
        final_path = self.cache_dir / kind.cache_filename
        part_path = final_path.with_suffix(final_path.suffix + ".part")

        # Probe Content-Length so we can skip when the cache already has a
        # complete copy from a previous run (the file is deleted on successful
        # apply; if it's still here, the prior run aborted mid-flight).
        try:
            head = self.session.head(url, timeout=self.timeout, allow_redirects=True)
            content_length = int(head.headers.get("Content-Length", "0")) if head.ok else 0
        except (requests.RequestException, ValueError):
            content_length = 0

        if final_path.is_file() and content_length and final_path.stat().st_size == content_length:
            return final_path

        existing = part_path.stat().st_size if part_path.is_file() else 0
        headers: dict[str, str] = {}
        mode = "wb"
        if existing > 0 and content_length and existing < content_length:
            headers["Range"] = f"bytes={existing}-"
            mode = "ab"
        elif existing > 0 and content_length and existing >= content_length:
            # Looks like a stale `.part` from an earlier run; start clean.
            part_path.unlink(missing_ok=True)
            existing = 0

        try:
            with self.session.get(url, headers=headers, stream=True, timeout=self.timeout) as resp:
                if resp.status_code >= 500:
                    raise DumpInternalError(f"download HTTP {resp.status_code}")
                if resp.status_code not in (200, 206):
                    raise DumpInternalError(
                        f"download HTTP {resp.status_code}: {resp.text[:200] if resp.content else ''}"
                    )
                with open(part_path, mode) as fh:
                    for chunk in resp.iter_content(chunk_size=1024 * 1024):
                        if chunk:
                            fh.write(chunk)
        except requests.RequestException as exc:
            raise DumpInternalError(f"download transport error: {exc!r}") from exc

        # Atomic rename so the caller never observes a half-written final file.
        part_path.replace(final_path)
        return final_path


# ---- _meta helpers for release-tag tracking --------------------------------


META_KEYS_FULL_KLINE = ("last_full_kline_release_tag", "last_full_kline_applied_at")
META_KEYS_INCREMENTAL = (
    "last_incremental_kline_release_tag",
    "last_incremental_kline_applied_at",
    "last_incremental_window_end",
)
META_KEYS_ADJUSTMENT = ("last_adjustment_release_tag", "last_adjustment_applied_at")
META_KEYS_AUTO_SYNC = ("last_auto_sync_mode", "last_auto_sync_at")
