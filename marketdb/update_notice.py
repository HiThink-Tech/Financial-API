from __future__ import annotations

import json
import os
import subprocess
import sys
import urllib.request
from argparse import ArgumentParser
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, TextIO

GITHUB_COMMIT_API = "https://api.github.com/repos/HiThink-Tech/Financial-API/commits/main"
PUBLIC_REPO_URL = "https://github.com/HiThink-Tech/Financial-API"
DEFAULT_TTL_SECONDS = 86400
DEFAULT_FAILURE_TTL_SECONDS = 21600
DEFAULT_REFRESH_TTL_SECONDS = 300
DEFAULT_TIMEOUT_SECONDS = 3.0
DEFAULT_NOTICE_TTL_SECONDS = 86400


@dataclass(frozen=True)
class LocalVersion:
    sha: str
    short_sha: str
    commit_time: str | None


@dataclass(frozen=True)
class RemoteVersion:
    sha: str
    short_sha: str
    commit_time: str
    repo_url: str = PUBLIC_REPO_URL


@dataclass(frozen=True)
class UpdateNotice:
    local_sha: str
    local_short_sha: str
    remote_sha: str
    remote_short_sha: str
    remote_time: str
    repo_url: str = PUBLIC_REPO_URL


Fetcher = Callable[[float], RemoteVersion | None]


def _truthy(value: str | None) -> bool:
    return value is not None and value.strip().lower() in {"1", "true", "yes", "on"}


def _run_git(repo_path: Path, *args: str) -> str | None:
    try:
        proc = subprocess.run(
            ["git", "-C", str(repo_path), *args],
            check=False,
            capture_output=True,
            text=True,
            timeout=1.0,
        )
    except Exception:
        return None
    if proc.returncode != 0:
        return None
    return proc.stdout.strip() or None


def _default_repo_path() -> Path:
    return Path(__file__).resolve().parents[1]


def get_local_version(repo_path: Path | None = None) -> LocalVersion | None:
    repo = (repo_path or _default_repo_path()).resolve()
    output = _run_git(repo, "show", "-s", "--format=%H%x00%cI", "HEAD")
    if not output:
        return None
    parts = output.split("\x00", 1)
    sha = parts[0]
    if len(parts) != 2 or not sha:
        return None
    commit_time = parts[1] or None
    return LocalVersion(sha=sha, short_sha=sha[:7], commit_time=commit_time)


def _parse_timeout_seconds(value: str | None) -> float:
    try:
        return max(0.1, float(value)) if value is not None else DEFAULT_TIMEOUT_SECONDS
    except ValueError:
        return DEFAULT_TIMEOUT_SECONDS


def _parse_ttl_seconds(value: str | None) -> int:
    return _parse_int_seconds(value, DEFAULT_TTL_SECONDS)


def _parse_int_seconds(value: str | None, default: int) -> int:
    try:
        return max(0, int(value)) if value is not None else default
    except ValueError:
        return default


def default_cache_path() -> Path:
    if os.name == "nt":
        base = os.environ.get("LOCALAPPDATA")
        if base:
            return Path(base) / "FinancialAPI" / "update-check.json"
    return Path.home() / ".cache" / "financial-api" / "update-check.json"


def fetch_github_remote_version(timeout_seconds: float) -> RemoteVersion | None:
    request = urllib.request.Request(
        GITHUB_COMMIT_API,
        headers={
            "Accept": "application/vnd.github+json",
            "User-Agent": "financial-api-update-check",
        },
    )
    with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
        payload = json.loads(response.read().decode("utf-8"))
    sha = payload.get("sha")
    commit_time = (
        payload.get("commit", {})
        .get("committer", {})
        .get("date")
    )
    if not isinstance(sha, str) or not isinstance(commit_time, str):
        return None
    return RemoteVersion(sha=sha, short_sha=sha[:7], commit_time=commit_time)


def _load_cache_payload(cache_path: Path) -> dict[str, object]:
    try:
        payload = json.loads(cache_path.read_text(encoding="utf-8"))
    except Exception:
        return {}
    return payload if isinstance(payload, dict) else {}


def _parse_cached_datetime(value: object) -> datetime | None:
    if not isinstance(value, str) or not value:
        return None
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


def _write_cache_payload(cache_path: Path, payload: dict[str, object]) -> None:
    try:
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        cache_path.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
    except Exception:
        return


def _load_cached_remote(cache_path: Path, now: datetime, ttl_seconds: int) -> RemoteVersion | None:
    try:
        payload = _load_cache_payload(cache_path)
        checked_at = _parse_cached_datetime(payload.get("checked_at"))
        if checked_at is None:
            return None
        if (now - checked_at).total_seconds() > ttl_seconds:
            return None
        sha = payload["remote_sha"]
        short_sha = payload.get("remote_short_sha") or sha[:7]
        commit_time = payload["remote_time"]
        repo_url = payload.get("repo_url") or PUBLIC_REPO_URL
    except Exception:
        return None
    if not isinstance(sha, str) or not isinstance(short_sha, str) or not isinstance(commit_time, str):
        return None
    return RemoteVersion(sha=sha, short_sha=short_sha, commit_time=commit_time, repo_url=repo_url)


def _write_cached_remote(cache_path: Path, remote: RemoteVersion, now: datetime) -> None:
    payload = _load_cache_payload(cache_path)
    payload.update(
        {
            "checked_at": now.isoformat(),
            "remote_sha": remote.sha,
            "remote_short_sha": remote.short_sha,
            "remote_time": remote.commit_time,
            "repo_url": remote.repo_url,
            "refresh_started_at": None,
            "failed_at": None,
            "failure_reason": None,
        }
    )
    _write_cache_payload(cache_path, payload)


def _notice_recently_shown(
    *,
    cache_path: Path,
    notice: UpdateNotice,
    now: datetime,
    notice_ttl_seconds: int,
) -> bool:
    if notice_ttl_seconds <= 0:
        return False
    payload = _load_cache_payload(cache_path)
    shown_at = _parse_cached_datetime(payload.get("notice_shown_at"))
    if shown_at is None:
        return False
    if payload.get("notice_local_sha") != notice.local_sha:
        return False
    if payload.get("notice_remote_sha") != notice.remote_sha:
        return False
    return (now - shown_at).total_seconds() <= notice_ttl_seconds


def record_notice_shown(cache_path: Path, notice: UpdateNotice, now: datetime | None = None) -> None:
    payload = _load_cache_payload(cache_path)
    payload.update(
        {
            "notice_shown_at": (now or datetime.now(timezone.utc)).isoformat(),
            "notice_local_sha": notice.local_sha,
            "notice_remote_sha": notice.remote_sha,
        }
    )
    _write_cache_payload(cache_path, payload)


def mark_refresh_started(cache_path: Path, now: datetime | None = None) -> None:
    payload = _load_cache_payload(cache_path)
    payload["refresh_started_at"] = (now or datetime.now(timezone.utc)).isoformat()
    _write_cache_payload(cache_path, payload)


def record_refresh_failure(cache_path: Path, now: datetime | None = None, reason: str | None = None) -> None:
    payload = _load_cache_payload(cache_path)
    payload["refresh_started_at"] = None
    payload["failed_at"] = (now or datetime.now(timezone.utc)).isoformat()
    payload["failure_reason"] = reason or "unknown"
    _write_cache_payload(cache_path, payload)


def should_start_background_refresh(
    *,
    cache_path: Path,
    now: datetime,
    ttl_seconds: int,
    failure_ttl_seconds: int,
    refresh_ttl_seconds: int,
) -> bool:
    if _load_cached_remote(cache_path, now, ttl_seconds) is not None:
        return False

    payload = _load_cache_payload(cache_path)
    failed_at = _parse_cached_datetime(payload.get("failed_at"))
    if failed_at is not None and (now - failed_at).total_seconds() <= failure_ttl_seconds:
        return False

    refresh_started_at = _parse_cached_datetime(payload.get("refresh_started_at"))
    if refresh_started_at is not None and (now - refresh_started_at).total_seconds() <= refresh_ttl_seconds:
        return False

    return True


def refresh_cache_once(
    *,
    cache_path: Path,
    now: datetime | None = None,
    timeout_seconds: float | None = None,
    fetcher: Fetcher = fetch_github_remote_version,
) -> int:
    effective_now = now or datetime.now(timezone.utc)
    effective_timeout = DEFAULT_TIMEOUT_SECONDS if timeout_seconds is None else timeout_seconds
    try:
        remote = fetcher(effective_timeout)
    except Exception as exc:
        record_refresh_failure(cache_path, effective_now, type(exc).__name__)
        return 1
    if remote is None:
        record_refresh_failure(cache_path, effective_now, "empty-response")
        return 1
    _write_cached_remote(cache_path, remote, effective_now)
    return 0


def start_background_refresh(*, cache_path: Path | None = None) -> bool:
    target_cache_path = cache_path or default_cache_path()
    try:
        mark_refresh_started(target_cache_path)
        kwargs: dict[str, object] = {
            "stdin": subprocess.DEVNULL,
            "stdout": subprocess.DEVNULL,
            "stderr": subprocess.DEVNULL,
            "close_fds": True,
        }
        creationflags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
        if creationflags:
            kwargs["creationflags"] = creationflags
        subprocess.Popen(
            [
                sys.executable,
                "-m",
                "marketdb.update_notice",
                "--refresh-cache",
                "--cache-path",
                str(target_cache_path),
            ],
            **kwargs,
        )
    except Exception:
        return False
    return True


def check_for_update(
    *,
    repo_path: Path | None = None,
    cache_path: Path | None = None,
    now: datetime | None = None,
    ttl_seconds: int | None = None,
    notice_ttl_seconds: int | None = None,
) -> UpdateNotice | None:
    if _truthy(os.environ.get("FINANCIAL_API_NO_VERSION_CHECK")):
        return None
    if _truthy(os.environ.get("FINANCIAL_API_CHILD_PROCESS")):
        return None

    local = get_local_version(repo_path)
    if local is None:
        return None

    effective_now = now or datetime.now(timezone.utc)
    effective_ttl = (
        _parse_ttl_seconds(os.environ.get("FINANCIAL_API_VERSION_CHECK_TTL_SECONDS"))
        if ttl_seconds is None
        else ttl_seconds
    )
    effective_failure_ttl = _parse_int_seconds(
        os.environ.get("FINANCIAL_API_VERSION_CHECK_FAILURE_TTL_SECONDS"),
        DEFAULT_FAILURE_TTL_SECONDS,
    )
    effective_refresh_ttl = _parse_int_seconds(
        os.environ.get("FINANCIAL_API_VERSION_CHECK_REFRESH_TTL_SECONDS"),
        DEFAULT_REFRESH_TTL_SECONDS,
    )
    effective_notice_ttl = (
        _parse_int_seconds(
            os.environ.get("FINANCIAL_API_VERSION_NOTICE_TTL_SECONDS"),
            DEFAULT_NOTICE_TTL_SECONDS,
        )
        if notice_ttl_seconds is None
        else notice_ttl_seconds
    )
    effective_cache_path = cache_path or default_cache_path()

    remote = _load_cached_remote(
        cache_path=effective_cache_path,
        now=effective_now,
        ttl_seconds=effective_ttl,
    )
    if remote is None:
        if should_start_background_refresh(
            cache_path=effective_cache_path,
            now=effective_now,
            ttl_seconds=effective_ttl,
            failure_ttl_seconds=effective_failure_ttl,
            refresh_ttl_seconds=effective_refresh_ttl,
        ):
            start_background_refresh(cache_path=effective_cache_path)
        return None
    if remote.sha == local.sha:
        return None
    notice = UpdateNotice(
        local_sha=local.sha,
        local_short_sha=local.short_sha,
        remote_sha=remote.sha,
        remote_short_sha=remote.short_sha,
        remote_time=remote.commit_time,
        repo_url=remote.repo_url,
    )
    if _notice_recently_shown(
        cache_path=effective_cache_path,
        notice=notice,
        now=effective_now,
        notice_ttl_seconds=effective_notice_ttl,
    ):
        return None
    return notice


def render_notice(notice: UpdateNotice, *, stream: TextIO | None = None) -> None:
    target = stream or sys.stderr
    print(
        f"[update] Financial-API has a newer public snapshot: "
        f"{notice.remote_short_sha} at {notice.remote_time}.",
        file=target,
    )
    print(f"Current local snapshot: {notice.local_short_sha}.", file=target)
    print("Update when convenient:", file=target)
    print("  git pull origin main", file=target)


def maybe_emit_update_notice(
    *,
    repo_path: Path | None = None,
    cache_path: Path | None = None,
    now: datetime | None = None,
    ttl_seconds: int | None = None,
    notice_ttl_seconds: int | None = None,
    stream: TextIO | None = None,
) -> None:
    try:
        effective_now = now or datetime.now(timezone.utc)
        effective_cache_path = cache_path or default_cache_path()
        notice = check_for_update(
            repo_path=repo_path,
            cache_path=effective_cache_path,
            now=effective_now,
            ttl_seconds=ttl_seconds,
            notice_ttl_seconds=notice_ttl_seconds,
        )
        if notice is not None:
            render_notice(notice, stream=stream)
            record_notice_shown(effective_cache_path, notice, effective_now)
    except Exception:
        return


def main(argv: list[str] | None = None) -> int:
    parser = ArgumentParser(description="Financial-API update notice helper")
    parser.add_argument("--refresh-cache", action="store_true")
    parser.add_argument("--cache-path")
    parser.add_argument("--timeout", type=float)
    args = parser.parse_args(argv)

    if not args.refresh_cache:
        return 0

    cache_path = Path(args.cache_path) if args.cache_path else default_cache_path()
    timeout_seconds = (
        args.timeout
        if args.timeout is not None
        else _parse_timeout_seconds(os.environ.get("FINANCIAL_API_VERSION_CHECK_TIMEOUT_SECONDS"))
    )
    return refresh_cache_once(cache_path=cache_path, timeout_seconds=timeout_seconds)


if __name__ == "__main__":
    sys.exit(main())
