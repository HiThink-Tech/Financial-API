from __future__ import annotations

import json
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path


def _git(repo: Path, *args: str) -> str:
    proc = subprocess.run(
        ["git", "-C", str(repo), *args],
        check=True,
        capture_output=True,
        text=True,
    )
    return proc.stdout.strip()


def _make_git_repo(tmp_path: Path) -> tuple[Path, str]:
    repo = tmp_path / "repo"
    repo.mkdir()
    _git(repo, "init")
    _git(repo, "config", "user.email", "test@example.com")
    _git(repo, "config", "user.name", "Test User")
    (repo / "README.md").write_text("hello\n", encoding="utf-8")
    _git(repo, "add", "README.md")
    _git(repo, "commit", "-m", "init")
    return repo, _git(repo, "rev-parse", "HEAD")


def test_check_for_update_returns_none_when_disabled(tmp_path, monkeypatch) -> None:
    from marketdb.update_notice import check_for_update

    repo, _sha = _make_git_repo(tmp_path)
    monkeypatch.setenv("FINANCIAL_API_NO_VERSION_CHECK", "1")

    notice = check_for_update(
        repo_path=repo,
        cache_path=tmp_path / "cache.json",
    )

    assert notice is None


def test_check_for_update_returns_none_for_non_git_directory(tmp_path) -> None:
    from marketdb.update_notice import check_for_update

    notice = check_for_update(
        repo_path=tmp_path,
        cache_path=tmp_path / "cache.json",
    )

    assert notice is None


def test_get_local_version_uses_single_git_call(tmp_path, monkeypatch) -> None:
    from marketdb import update_notice

    calls = []

    def fake_run_git(repo_path, *args):
        calls.append(args)
        return "a" * 40 + "\x00" + "2026-06-25T10:00:00+00:00"

    monkeypatch.setattr(update_notice, "_run_git", fake_run_git)

    local = update_notice.get_local_version(tmp_path)

    assert local is not None
    assert local.sha == "a" * 40
    assert local.commit_time == "2026-06-25T10:00:00+00:00"
    assert calls == [("show", "-s", "--format=%H%x00%cI", "HEAD")]


def test_check_for_update_uses_fresh_cache_without_remote_fetch(tmp_path) -> None:
    from marketdb.update_notice import check_for_update

    repo, local_sha = _make_git_repo(tmp_path)
    cache_path = tmp_path / "cache.json"
    now = datetime(2026, 6, 25, 12, 0, tzinfo=timezone.utc)
    cache_path.write_text(
        json.dumps(
            {
                "checked_at": now.isoformat(),
                "remote_sha": "f" * 40,
                "remote_short_sha": "fffffff",
                "remote_time": "2026-06-25T10:00:00+00:00",
                "repo_url": "https://github.com/HiThink-Tech/Financial-API",
            }
        ),
        encoding="utf-8",
    )

    notice = check_for_update(
        repo_path=repo,
        cache_path=cache_path,
        now=now + timedelta(minutes=5),
        ttl_seconds=86400,
    )

    assert notice is not None
    assert notice.local_sha == local_sha
    assert notice.remote_sha == "f" * 40
    assert notice.remote_short_sha == "fffffff"


def test_check_for_update_starts_background_refresh_when_cache_expired(tmp_path, monkeypatch) -> None:
    from marketdb import update_notice

    repo, _local_sha = _make_git_repo(tmp_path)
    cache_path = tmp_path / "cache.json"
    now = datetime(2026, 6, 25, 12, 0, tzinfo=timezone.utc)
    cache_path.write_text(
        json.dumps(
            {
                "checked_at": (now - timedelta(days=2)).isoformat(),
                "remote_sha": "e" * 40,
                "remote_short_sha": "eeeeeee",
                "remote_time": "2026-06-23T10:00:00+00:00",
                "repo_url": "https://github.com/HiThink-Tech/Financial-API",
            }
        ),
        encoding="utf-8",
    )

    started: list[Path] = []
    monkeypatch.setattr(
        update_notice,
        "start_background_refresh",
        lambda *, cache_path=None: started.append(cache_path) or True,
    )

    notice = update_notice.check_for_update(
        repo_path=repo,
        cache_path=cache_path,
        now=now,
        ttl_seconds=86400,
    )

    assert notice is None
    assert started == [cache_path]
    cached = json.loads(cache_path.read_text(encoding="utf-8"))
    assert cached["remote_sha"] == "e" * 40


def test_check_for_update_returns_none_and_refreshes_when_cache_missing(tmp_path, monkeypatch) -> None:
    from marketdb import update_notice

    repo, _sha = _make_git_repo(tmp_path)
    started: list[Path] = []
    monkeypatch.setattr(
        update_notice,
        "start_background_refresh",
        lambda *, cache_path=None: started.append(cache_path) or True,
    )

    cache_path = tmp_path / "cache.json"
    assert update_notice.check_for_update(repo_path=repo, cache_path=cache_path) is None
    assert started == [cache_path]


def test_failed_refresh_enters_failure_cooldown(tmp_path) -> None:
    from marketdb import update_notice

    cache_path = tmp_path / "cache.json"
    now = datetime(2026, 6, 25, 10, 0, tzinfo=timezone.utc)

    update_notice.record_refresh_failure(cache_path, now, "timeout")

    assert not update_notice.should_start_background_refresh(
        cache_path=cache_path,
        now=now + timedelta(hours=1),
        ttl_seconds=0,
        failure_ttl_seconds=21600,
        refresh_ttl_seconds=300,
    )


def test_refresh_started_recently_prevents_duplicate_background_refresh(tmp_path) -> None:
    from marketdb import update_notice

    cache_path = tmp_path / "cache.json"
    now = datetime(2026, 6, 25, 10, 0, tzinfo=timezone.utc)

    update_notice.mark_refresh_started(cache_path, now)

    assert not update_notice.should_start_background_refresh(
        cache_path=cache_path,
        now=now + timedelta(seconds=30),
        ttl_seconds=0,
        failure_ttl_seconds=21600,
        refresh_ttl_seconds=300,
    )


def test_refresh_cache_success_writes_remote_and_clears_failure(tmp_path) -> None:
    from marketdb import update_notice

    cache_path = tmp_path / "cache.json"
    now = datetime(2026, 6, 25, 10, 0, tzinfo=timezone.utc)
    update_notice.record_refresh_failure(cache_path, now - timedelta(minutes=10), "timeout")
    remote = update_notice.RemoteVersion(
        sha="f" * 40,
        short_sha="fffffff",
        commit_time="2026-06-25T01:00:00Z",
    )

    exit_code = update_notice.refresh_cache_once(
        cache_path=cache_path,
        now=now,
        timeout_seconds=3.0,
        fetcher=lambda timeout: remote,
    )

    payload = json.loads(cache_path.read_text(encoding="utf-8"))
    assert exit_code == 0
    assert payload["remote_sha"] == "f" * 40
    assert payload["failed_at"] is None
    assert payload["failure_reason"] is None


def test_refresh_cache_failure_writes_failure_without_erasing_remote(tmp_path) -> None:
    from marketdb import update_notice

    cache_path = tmp_path / "cache.json"
    now = datetime(2026, 6, 25, 10, 0, tzinfo=timezone.utc)
    update_notice._write_cached_remote(
        cache_path,
        update_notice.RemoteVersion(
            sha="a" * 40,
            short_sha="aaaaaaa",
            commit_time="2026-06-24T01:00:00Z",
        ),
        now,
    )

    def fail(_timeout: float):
        raise TimeoutError("timeout")

    exit_code = update_notice.refresh_cache_once(
        cache_path=cache_path,
        now=now + timedelta(hours=25),
        timeout_seconds=3.0,
        fetcher=fail,
    )

    payload = json.loads(cache_path.read_text(encoding="utf-8"))
    assert exit_code == 1
    assert payload["remote_sha"] == "a" * 40
    assert payload["failed_at"] is not None
    assert payload["failure_reason"] == "TimeoutError"


def test_start_background_refresh_uses_current_python_module_and_marks_started(tmp_path, monkeypatch) -> None:
    from marketdb import update_notice

    cache_path = tmp_path / "cache.json"
    commands = []

    class FakePopen:
        def __init__(self, cmd, **kwargs):
            commands.append((cmd, kwargs))

    monkeypatch.setattr(update_notice.subprocess, "Popen", FakePopen)

    assert update_notice.start_background_refresh(cache_path=cache_path)

    cmd, kwargs = commands[0]
    assert cmd[:3] == [sys.executable, "-m", "marketdb.update_notice"]
    assert "--refresh-cache" in cmd
    assert str(cache_path) in cmd
    assert kwargs["stdin"] is subprocess.DEVNULL

    payload = json.loads(cache_path.read_text(encoding="utf-8"))
    assert payload["refresh_started_at"] is not None


def test_render_notice_writes_to_stderr_style_stream() -> None:
    from io import StringIO

    from marketdb.update_notice import UpdateNotice, render_notice

    stream = StringIO()
    render_notice(
        UpdateNotice(
            local_sha="1" * 40,
            local_short_sha="1111111",
            remote_sha="2" * 40,
            remote_short_sha="2222222",
            remote_time="2026-06-25T11:00:00+00:00",
            repo_url="https://github.com/HiThink-Tech/Financial-API",
        ),
        stream=stream,
    )

    text = stream.getvalue()
    assert "2222222" in text
    assert "1111111" in text
    assert "git pull origin main" in text


def test_maybe_emit_update_notice_records_notice_and_suppresses_repeat(tmp_path) -> None:
    from io import StringIO

    from marketdb import update_notice

    repo, _local_sha = _make_git_repo(tmp_path)
    cache_path = tmp_path / "cache.json"
    now = datetime(2026, 6, 25, 10, 0, tzinfo=timezone.utc)
    update_notice._write_cached_remote(
        cache_path,
        update_notice.RemoteVersion(
            sha="f" * 40,
            short_sha="fffffff",
            commit_time="2026-06-25T01:00:00Z",
        ),
        now,
    )

    first = StringIO()
    update_notice.maybe_emit_update_notice(
        repo_path=repo,
        cache_path=cache_path,
        now=now,
        stream=first,
    )

    second = StringIO()
    update_notice.maybe_emit_update_notice(
        repo_path=repo,
        cache_path=cache_path,
        now=now + timedelta(minutes=1),
        stream=second,
    )

    assert "[update]" in first.getvalue()
    assert second.getvalue() == ""
    payload = json.loads(cache_path.read_text(encoding="utf-8"))
    assert payload["notice_shown_at"] == now.isoformat()
    assert payload["notice_remote_sha"] == "f" * 40


def test_notice_ttl_expired_allows_repeat_notice(tmp_path) -> None:
    from io import StringIO

    from marketdb import update_notice

    repo, _local_sha = _make_git_repo(tmp_path)
    cache_path = tmp_path / "cache.json"
    now = datetime(2026, 6, 25, 10, 0, tzinfo=timezone.utc)
    update_notice._write_cached_remote(
        cache_path,
        update_notice.RemoteVersion(
            sha="f" * 40,
            short_sha="fffffff",
            commit_time="2026-06-25T01:00:00Z",
        ),
        now,
    )

    update_notice.maybe_emit_update_notice(
        repo_path=repo,
        cache_path=cache_path,
        now=now,
        notice_ttl_seconds=60,
        stream=StringIO(),
    )
    repeated = StringIO()
    update_notice.maybe_emit_update_notice(
        repo_path=repo,
        cache_path=cache_path,
        now=now + timedelta(seconds=61),
        notice_ttl_seconds=60,
        stream=repeated,
    )

    assert "[update]" in repeated.getvalue()


def test_remote_sha_change_allows_repeat_notice_within_ttl(tmp_path) -> None:
    from io import StringIO

    from marketdb import update_notice

    repo, _local_sha = _make_git_repo(tmp_path)
    cache_path = tmp_path / "cache.json"
    now = datetime(2026, 6, 25, 10, 0, tzinfo=timezone.utc)
    update_notice._write_cached_remote(
        cache_path,
        update_notice.RemoteVersion(
            sha="f" * 40,
            short_sha="fffffff",
            commit_time="2026-06-25T01:00:00Z",
        ),
        now,
    )
    update_notice.maybe_emit_update_notice(
        repo_path=repo,
        cache_path=cache_path,
        now=now,
        stream=StringIO(),
    )

    update_notice._write_cached_remote(
        cache_path,
        update_notice.RemoteVersion(
            sha="e" * 40,
            short_sha="eeeeeee",
            commit_time="2026-06-25T02:00:00Z",
        ),
        now + timedelta(minutes=1),
    )
    repeated = StringIO()
    update_notice.maybe_emit_update_notice(
        repo_path=repo,
        cache_path=cache_path,
        now=now + timedelta(minutes=2),
        stream=repeated,
    )

    assert "eeeeeee" in repeated.getvalue()


def test_local_sha_change_allows_repeat_notice_within_ttl(tmp_path) -> None:
    from io import StringIO

    from marketdb import update_notice

    repo, _local_sha = _make_git_repo(tmp_path)
    cache_path = tmp_path / "cache.json"
    now = datetime(2026, 6, 25, 10, 0, tzinfo=timezone.utc)
    update_notice._write_cached_remote(
        cache_path,
        update_notice.RemoteVersion(
            sha="f" * 40,
            short_sha="fffffff",
            commit_time="2026-06-25T01:00:00Z",
        ),
        now,
    )
    update_notice.maybe_emit_update_notice(
        repo_path=repo,
        cache_path=cache_path,
        now=now,
        stream=StringIO(),
    )

    (repo / "README.md").write_text("hello again\n", encoding="utf-8")
    _git(repo, "add", "README.md")
    _git(repo, "commit", "-m", "second")
    repeated = StringIO()
    update_notice.maybe_emit_update_notice(
        repo_path=repo,
        cache_path=cache_path,
        now=now + timedelta(minutes=1),
        stream=repeated,
    )

    assert "[update]" in repeated.getvalue()
