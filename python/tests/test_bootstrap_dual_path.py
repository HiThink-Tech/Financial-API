"""Smoke tests for bootstrap.py's mode-selection logic.

Full subprocess-level integration is intentionally out of scope; we test the
pure decision helpers (parse_mode + step_sync wiring) by importing the module
directly. End-to-end "fall back from API to local" is covered indirectly by
``test_auto_sync.test_apply_local_full_writes_release_tag``.
"""
from __future__ import annotations

import argparse
import importlib.util
import sys
from pathlib import Path

import pytest


@pytest.fixture(scope="module")
def bootstrap_module():
    project_root = Path(__file__).resolve().parents[1]
    spec = importlib.util.spec_from_file_location("bootstrap", project_root / "bootstrap.py")
    module = importlib.util.module_from_spec(spec)
    sys.modules["bootstrap"] = module
    spec.loader.exec_module(module)  # type: ignore[union-attr]
    return module


def _args(**kwargs) -> argparse.Namespace:
    defaults = {"api_only": False, "local_only": False, "prefer_local": False,
                "no_sync": False, "force": False}
    defaults.update(kwargs)
    return argparse.Namespace(**defaults)


def test_default_mode(bootstrap_module) -> None:
    assert bootstrap_module.parse_mode(_args()) == "default"


def test_api_only(bootstrap_module) -> None:
    assert bootstrap_module.parse_mode(_args(api_only=True)) == "api-only"


def test_local_only(bootstrap_module) -> None:
    assert bootstrap_module.parse_mode(_args(local_only=True)) == "local-only"


def test_prefer_local(bootstrap_module) -> None:
    assert bootstrap_module.parse_mode(_args(prefer_local=True)) == "prefer-local"


def test_conflicting_flags_exit(bootstrap_module) -> None:
    with pytest.raises(SystemExit) as exc:
        bootstrap_module.parse_mode(_args(api_only=True, local_only=True))
    assert exc.value.code == 2
