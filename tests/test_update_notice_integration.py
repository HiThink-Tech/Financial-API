from __future__ import annotations

import argparse
import importlib.util
import json
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path


def test_marketdb_main_emits_update_notice_after_app(monkeypatch) -> None:
    import marketdb.cli as cli

    calls: list[str] = []
    monkeypatch.setattr(cli, "app", lambda: calls.append("app"))
    monkeypatch.setattr(cli, "maybe_emit_update_notice", lambda: calls.append("notice"))

    cli.main()

    assert calls == ["app", "notice"]


def test_update_notice_import_does_not_load_pandas() -> None:
    proc = subprocess.run(
        [
            sys.executable,
            "-c",
            "import sys; import marketdb.update_notice; print('pandas' in sys.modules)",
        ],
        check=True,
        capture_output=True,
        text=True,
    )

    assert proc.stdout.strip() == "False"


def test_fuyao_main_keeps_stdout_json_and_notice_on_stderr(monkeypatch, capsys) -> None:
    project_root = Path(__file__).resolve().parents[1]
    script = project_root / "toolkit" / "fuyao" / "scripts" / "fuyao.py"
    spec = importlib.util.spec_from_file_location("fuyao_script_for_test", script)
    module = importlib.util.module_from_spec(spec)
    sys.modules["fuyao_script_for_test"] = module
    assert spec.loader is not None
    spec.loader.exec_module(module)

    def fake_parser():
        parser = argparse.ArgumentParser()
        parser.add_argument("--compact", action="store_true")
        parser.set_defaults(command="fake", func=lambda args: {"ok": True})
        return parser

    monkeypatch.setattr(module, "build_parser", fake_parser)
    monkeypatch.setattr(module, "_emit_update_notice", lambda: print("[update] newer", file=sys.stderr))

    code = module.main([])

    captured = capsys.readouterr()
    assert code == 0
    assert json.loads(captured.out) == {"ok": True}
    assert "[update] newer" in captured.err


def test_bootstrap_marketdb_subprocesses_are_marked_as_child(monkeypatch) -> None:
    project_root = Path(__file__).resolve().parents[1]
    spec = importlib.util.spec_from_file_location("bootstrap_for_update_notice_test", project_root / "bootstrap.py")
    module = importlib.util.module_from_spec(spec)
    sys.modules["bootstrap_for_update_notice_test"] = module
    assert spec.loader is not None
    spec.loader.exec_module(module)

    calls: list[dict[str, str]] = []

    class Result:
        returncode = 0

    def fake_run(cmd, check=False, text=False, env=None):
        calls.append(env or {})
        return Result()

    monkeypatch.setattr(module, "marketdb_cmd", lambda: ["marketdb"])
    monkeypatch.setattr(module.subprocess, "run", fake_run)

    assert module._try_api_sync(force=False) is True
    assert calls
    assert calls[-1]["FINANCIAL_API_CHILD_PROCESS"] == "1"


def test_check_for_update_starts_background_refresh_without_fetching(tmp_path, monkeypatch) -> None:
    from marketdb import update_notice

    cache_path = tmp_path / "cache.json"
    now = datetime(2026, 6, 25, 10, 0, tzinfo=timezone.utc)
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
        "get_local_version",
        lambda repo_path=None: update_notice.LocalVersion("a" * 40, "aaaaaaa", None),
    )
    monkeypatch.setattr(
        update_notice,
        "start_background_refresh",
        lambda *, cache_path=None: started.append(cache_path) or True,
    )

    notice = update_notice.check_for_update(
        repo_path=tmp_path,
        cache_path=cache_path,
        now=now,
        ttl_seconds=86400,
    )

    assert notice is None
    assert started == [cache_path]
