"""轻量、静默的提交级更新提醒。

这个模块刻意保持自包含：CLI、bootstrap、fuyao.py 和后台刷新都只依赖
`marketdb.update_notice`，避免额外公开入口和跨模块跳转。
"""

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


@dataclass(frozen=True)
class CheckOptions:
    now: datetime
    cache_path: Path
    ttl_seconds: int
    failure_ttl_seconds: int
    refresh_ttl_seconds: int
    notice_ttl_seconds: int


Fetcher = Callable[[float], RemoteVersion | None]


def _truthy(value: str | None) -> bool:
    return value is not None and value.strip().lower() in {"1", "true", "yes", "on"}


def _read_text(path: Path) -> str | None:
    try:
        return path.read_text(encoding="utf-8").strip()
    except Exception:
        return None


def _default_repo_path() -> Path:
    return Path(__file__).resolve().parents[1]


def _is_full_sha(value: str) -> bool:
    return len(value) == 40 and all(ch in "0123456789abcdefABCDEF" for ch in value)


def _resolve_git_dir(repo_path: Path) -> Path | None:
    git_path = repo_path / ".git"
    if git_path.is_dir():
        return git_path

    text = _read_text(git_path)
    if not text or not text.startswith("gitdir:"):
        return None

    git_dir = Path(text.split(":", 1)[1].strip())
    return (git_dir if git_dir.is_absolute() else repo_path / git_dir).resolve()


def _common_git_dir(git_dir: Path) -> Path:
    text = _read_text(git_dir / "commondir")
    if not text:
        return git_dir
    common_dir = Path(text)
    return (common_dir if common_dir.is_absolute() else git_dir / common_dir).resolve()


def _read_ref_file(base_dir: Path, ref_name: str) -> str | None:
    sha = _read_text(base_dir.joinpath(*ref_name.split("/")))
    return sha if sha is not None and _is_full_sha(sha) else None


def _read_packed_ref(common_git_dir: Path, ref_name: str) -> str | None:
    try:
        lines = (common_git_dir / "packed-refs").read_text(encoding="utf-8").splitlines()
    except Exception:
        return None

    suffix = f" {ref_name}"
    for line in lines:
        if line and not line.startswith(("#", "^")) and line.endswith(suffix):
            sha = line.split(" ", 1)[0]
            return sha if _is_full_sha(sha) else None
    return None


def _read_head_sha(git_dir: Path) -> str | None:
    head = _read_text(git_dir / "HEAD")
    if not head:
        return None
    if _is_full_sha(head):
        return head
    if not head.startswith("ref:"):
        return None

    ref_name = head.split(":", 1)[1].strip()
    common_git_dir = _common_git_dir(git_dir)
    return (
        _read_ref_file(git_dir, ref_name)
        or _read_ref_file(common_git_dir, ref_name)
        or _read_packed_ref(common_git_dir, ref_name)
    )


def get_local_version(repo_path: Path | None = None) -> LocalVersion | None:
    """直接读取 Git 元数据，避免在频繁检查路径上启动 git 子进程。"""
    git_dir = _resolve_git_dir((repo_path or _default_repo_path()).resolve())
    if git_dir is None:
        return None

    sha = _read_head_sha(git_dir)
    if sha is None:
        return None
    return LocalVersion(sha=sha, short_sha=sha[:7], commit_time=None)


def _parse_timeout_seconds(value: str | None) -> float:
    try:
        return max(0.1, float(value)) if value is not None else DEFAULT_TIMEOUT_SECONDS
    except ValueError:
        return DEFAULT_TIMEOUT_SECONDS


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


def _check_options(
    *,
    cache_path: Path | None,
    now: datetime | None,
    ttl_seconds: int | None,
    notice_ttl_seconds: int | None,
) -> CheckOptions:
    return CheckOptions(
        now=now or datetime.now(timezone.utc),
        cache_path=cache_path or default_cache_path(),
        ttl_seconds=(
            _parse_int_seconds(os.environ.get("FINANCIAL_API_VERSION_CHECK_TTL_SECONDS"), DEFAULT_TTL_SECONDS)
            if ttl_seconds is None
            else ttl_seconds
        ),
        failure_ttl_seconds=_parse_int_seconds(
            os.environ.get("FINANCIAL_API_VERSION_CHECK_FAILURE_TTL_SECONDS"),
            DEFAULT_FAILURE_TTL_SECONDS,
        ),
        refresh_ttl_seconds=_parse_int_seconds(
            os.environ.get("FINANCIAL_API_VERSION_CHECK_REFRESH_TTL_SECONDS"),
            DEFAULT_REFRESH_TTL_SECONDS,
        ),
        notice_ttl_seconds=(
            _parse_int_seconds(
                os.environ.get("FINANCIAL_API_VERSION_NOTICE_TTL_SECONDS"),
                DEFAULT_NOTICE_TTL_SECONDS,
            )
            if notice_ttl_seconds is None
            else notice_ttl_seconds
        ),
    )


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
    commit_time = payload.get("commit", {}).get("committer", {}).get("date")
    if not isinstance(sha, str) or not isinstance(commit_time, str):
        return None
    return RemoteVersion(sha=sha, short_sha=sha[:7], commit_time=commit_time)


def _load_cache_payload(cache_path: Path) -> dict[str, object]:
    # 缓存损坏、权限异常、路径不存在都按“没有缓存”处理，不能影响主命令。
    try:
        payload = json.loads(cache_path.read_text(encoding="utf-8"))
    except Exception:
        return {}
    return payload if isinstance(payload, dict) else {}


def _write_cache_payload(cache_path: Path, payload: dict[str, object]) -> None:
    try:
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        cache_path.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
    except Exception:
        return


def _update_cache_payload(cache_path: Path, updates: dict[str, object]) -> None:
    payload = _load_cache_payload(cache_path)
    payload.update(updates)
    _write_cache_payload(cache_path, payload)


def _parse_cached_datetime(value: object) -> datetime | None:
    if not isinstance(value, str) or not value:
        return None
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError:
        return None
    return parsed if parsed.tzinfo is not None else parsed.replace(tzinfo=timezone.utc)


def _within_ttl(value: object, now: datetime, ttl_seconds: int) -> bool:
    parsed = _parse_cached_datetime(value)
    return parsed is not None and (now - parsed).total_seconds() <= ttl_seconds


def _load_cached_remote(cache_path: Path, now: datetime, ttl_seconds: int) -> RemoteVersion | None:
    try:
        payload = _load_cache_payload(cache_path)
        checked_at = _parse_cached_datetime(payload.get("checked_at"))
        if checked_at is None or (now - checked_at).total_seconds() > ttl_seconds:
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
    _update_cache_payload(
        cache_path,
        {
            "checked_at": now.isoformat(),
            "remote_sha": remote.sha,
            "remote_short_sha": remote.short_sha,
            "remote_time": remote.commit_time,
            "repo_url": remote.repo_url,
            "refresh_started_at": None,
            "failed_at": None,
            "failure_reason": None,
        },
    )


def _record_local_sha_change(cache_path: Path, local_sha: str) -> bool:
    cached_local_sha = _load_cache_payload(cache_path).get("local_sha")
    if cached_local_sha == local_sha:
        return False

    _update_cache_payload(cache_path, {"local_sha": local_sha})
    return isinstance(cached_local_sha, str)


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
    if payload.get("notice_local_sha") != notice.local_sha:
        return False
    if payload.get("notice_remote_sha") != notice.remote_sha:
        return False
    return _within_ttl(payload.get("notice_shown_at"), now, notice_ttl_seconds)


def record_notice_shown(cache_path: Path, notice: UpdateNotice, now: datetime | None = None) -> None:
    _update_cache_payload(
        cache_path,
        {
            "notice_shown_at": (now or datetime.now(timezone.utc)).isoformat(),
            "notice_local_sha": notice.local_sha,
            "notice_remote_sha": notice.remote_sha,
        },
    )


def mark_refresh_started(cache_path: Path, now: datetime | None = None) -> None:
    _update_cache_payload(cache_path, {"refresh_started_at": (now or datetime.now(timezone.utc)).isoformat()})


def record_refresh_failure(cache_path: Path, now: datetime | None = None, reason: str | None = None) -> None:
    _update_cache_payload(
        cache_path,
        {
            "refresh_started_at": None,
            "failed_at": (now or datetime.now(timezone.utc)).isoformat(),
            "failure_reason": reason or "unknown",
        },
    )


def _refresh_cooldown_active(
    payload: dict[str, object],
    *,
    now: datetime,
    failure_ttl_seconds: int,
    refresh_ttl_seconds: int,
) -> bool:
    return _within_ttl(payload.get("failed_at"), now, failure_ttl_seconds) or _within_ttl(
        payload.get("refresh_started_at"),
        now,
        refresh_ttl_seconds,
    )


def _should_start_refresh(
    *,
    cache_path: Path,
    now: datetime,
    failure_ttl_seconds: int,
    refresh_ttl_seconds: int,
    ttl_seconds: int | None = None,
) -> bool:
    if ttl_seconds is not None and _load_cached_remote(cache_path, now, ttl_seconds) is not None:
        return False

    return not _refresh_cooldown_active(
        _load_cache_payload(cache_path),
        now=now,
        failure_ttl_seconds=failure_ttl_seconds,
        refresh_ttl_seconds=refresh_ttl_seconds,
    )


def should_start_background_refresh(
    *,
    cache_path: Path,
    now: datetime,
    ttl_seconds: int,
    failure_ttl_seconds: int,
    refresh_ttl_seconds: int,
) -> bool:
    return _should_start_refresh(
        cache_path=cache_path,
        now=now,
        ttl_seconds=ttl_seconds,
        failure_ttl_seconds=failure_ttl_seconds,
        refresh_ttl_seconds=refresh_ttl_seconds,
    )


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
    # 解析为绝对路径：后台子进程的 cwd 被锚定到 repo_root（见下），若 cache_path
    # 是相对路径，父进程（按调用方 cwd 解析）与子进程（按 repo_root 解析）会写到
    # 两个不同文件，导致刷新结果前台永远读不到。提前定死绝对路径即可父子一致。
    target_cache_path = (cache_path or default_cache_path()).resolve()
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

        # 后台刷新是独立子进程，不继承父进程运行时修改过的 sys.path。
        # 显式锚定本仓库根（本文件位于 marketdb/ 下），让 `-m marketdb.update_notice`
        # 无论从哪个工作目录、用哪个解释器触发，都能导入到本仓库的 marketdb，
        # 而不是环境里可能指向其它克隆的 editable 安装。
        repo_root = _default_repo_path()
        env = os.environ.copy()
        existing_pythonpath = env.get("PYTHONPATH", "")
        env["PYTHONPATH"] = (
            f"{repo_root}{os.pathsep}{existing_pythonpath}" if existing_pythonpath else str(repo_root)
        )
        kwargs["cwd"] = str(repo_root)
        kwargs["env"] = env

        # 远端访问只发生在后台进程；前台命令最多读取本地 Git 元数据和缓存文件。
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


def _start_refresh_if_allowed(cache_path: Path, options: CheckOptions, *, ttl_seconds: int | None = None) -> None:
    if _should_start_refresh(
        cache_path=cache_path,
        now=options.now,
        failure_ttl_seconds=options.failure_ttl_seconds,
        refresh_ttl_seconds=options.refresh_ttl_seconds,
        ttl_seconds=ttl_seconds,
    ):
        start_background_refresh(cache_path=cache_path)


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

    options = _check_options(
        cache_path=cache_path,
        now=now,
        ttl_seconds=ttl_seconds,
        notice_ttl_seconds=notice_ttl_seconds,
    )

    # 本地 HEAD 变化时，旧远端缓存可能已经过期于真实状态；本次静默，只触发后台刷新。
    if _record_local_sha_change(options.cache_path, local.sha):
        _start_refresh_if_allowed(options.cache_path, options)
        return None

    remote = _load_cached_remote(options.cache_path, options.now, options.ttl_seconds)
    if remote is None:
        _start_refresh_if_allowed(options.cache_path, options)
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
        cache_path=options.cache_path,
        notice=notice,
        now=options.now,
        notice_ttl_seconds=options.notice_ttl_seconds,
    ):
        return None
    return notice


def render_notice(notice: UpdateNotice, *, stream: TextIO | None = None) -> None:
    target = stream or sys.stderr
    print(
        f"[update] Financial-API 本地版本与公开版本存在差异: "
        f"公开版本 {notice.remote_short_sha} ({notice.remote_time}).",
        file=target,
    )
    print(f"本地版本: {notice.local_short_sha}.", file=target)
    print("建议确认后再更新，避免覆盖本地分支或未提交改动:", file=target)
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
        # 更新提醒是辅助信息，任何异常都必须对业务命令静默。
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
