from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from pathlib import Path


def test_marketdb_main_does_not_emit_update_check_after_app(monkeypatch) -> None:
    import marketdb.cli as cli

    calls: list[str] = []
    monkeypatch.setattr(cli, "app", lambda: calls.append("app"))

    cli.main()

    assert calls == ["app"]
    assert not hasattr(cli, "maybe_emit_update_notice")


def test_fuyao_main_keeps_stdout_json_without_update_check(monkeypatch, capsys) -> None:
    project_root = Path(__file__).resolve().parents[1]
    script = project_root / "toolkit" / "fuyao" / "scripts" / "fuyao.py"
    spec = importlib.util.spec_from_file_location("fuyao_script_for_test", script)
    module = importlib.util.module_from_spec(spec)
    sys.modules["fuyao_script_for_test"] = module
    assert spec.loader is not None
    spec.loader.exec_module(module)
    assert not hasattr(module, "_emit_update_notice")

    def fake_parser():
        parser = argparse.ArgumentParser()
        parser.add_argument("--compact", action="store_true")
        parser.set_defaults(command="fake", func=lambda args: {"ok": True})
        return parser

    monkeypatch.setattr(module, "build_parser", fake_parser)

    code = module.main([])

    captured = capsys.readouterr()
    assert code == 0
    assert json.loads(captured.out) == {"ok": True}
    assert captured.err == ""
