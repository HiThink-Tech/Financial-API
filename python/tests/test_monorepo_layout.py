from __future__ import annotations

import importlib.util
from pathlib import Path

import pytest


MONOREPO_ROOT = Path(__file__).resolve().parents[2]
PYTHON_ROOT = MONOREPO_ROOT / "python"


def _load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_python_is_the_only_python_project_root() -> None:
    assert (PYTHON_ROOT / "pyproject.toml").is_file()
    assert (PYTHON_ROOT / "marketdb" / "__init__.py").is_file()
    assert (PYTHON_ROOT / "toolkit" / "README.md").is_file()
    assert not (MONOREPO_ROOT / "pyproject.toml").exists()
    assert not (MONOREPO_ROOT / "marketdb").exists()
    assert not (MONOREPO_ROOT / "toolkit").exists()


def test_bootstrap_resolves_monorepo_assets_from_python_subproject() -> None:
    bootstrap = _load_module("bootstrap_monorepo_contract", PYTHON_ROOT / "bootstrap.py")

    assert bootstrap.PYTHON_ROOT == PYTHON_ROOT
    assert bootstrap.REPO_ROOT == MONOREPO_ROOT
    assert bootstrap.PARQUET_DIR == MONOREPO_ROOT / "refer-to" / "data"
    assert bootstrap.ENV_PATH == MONOREPO_ROOT / ".env"


def test_fuyao_cli_uses_script_directory_for_sibling_imports() -> None:
    fuyao = _load_module(
        "fuyao_monorepo_contract",
        PYTHON_ROOT / "toolkit" / "fuyao" / "scripts" / "fuyao.py",
    )

    assert fuyao._SCRIPT_DIR == PYTHON_ROOT / "toolkit" / "fuyao" / "scripts"


def test_inspiration_builder_is_python_tool_for_root_gallery() -> None:
    builder_path = PYTHON_ROOT / "tools" / "inspirations" / "build_index.py"
    builder = _load_module("inspirations_monorepo_contract", builder_path)

    assert builder.default_inspirations_root() == MONOREPO_ROOT / "examples" / "inspirations"


def test_node_cli_directory_contains_implemented_subproject() -> None:
    node_root = MONOREPO_ROOT / "hithink-finance-cli"

    assert (node_root / "README.md").is_file()
    assert (node_root / "package.json").is_file()
    assert (node_root / "src" / "cli" / "main.ts").is_file()


def test_public_migration_guide_covers_old_checkout_upgrade() -> None:
    guide_path = MONOREPO_ROOT / "docs" / "monorepo-migration.md"
    assert guide_path.is_file()
    guide = guide_path.read_text(encoding="utf-8")

    for required in (
        "python -m pip uninstall marketdb",
        "python -m pip install -e ./python",
        "python python/bootstrap.py",
        "python python/toolkit/fuyao/scripts/fuyao.py",
        "python -m pytest python/tests/",
        "data/market.duckdb",
        "refer-to/data/",
        ".env",
        "python/toolkit/README.md",
    ):
        assert required in guide

    assert "不需要迁移" in guide
    assert "docs/monorepo-migration.md" in (MONOREPO_ROOT / "README.md").read_text(
        encoding="utf-8"
    )
    assert "docs/monorepo-migration.md" in (MONOREPO_ROOT / "AGENTS.md").read_text(
        encoding="utf-8"
    )


def test_public_snapshot_defaults_to_tracked_files_with_narrow_exclusions() -> None:
    skill_root = MONOREPO_ROOT / "internal" / "skills" / "export-snapshot"
    if not skill_root.exists():
        pytest.skip("internal export policy is intentionally absent from public snapshots")

    sync_script = (skill_root / "scripts" / "sync_snapshot.py").read_text(
        encoding="utf-8"
    )
    policy = (skill_root / "references" / "public-policy.yml").read_text(
        encoding="utf-8"
    )

    assert "PUBLIC_INCLUDE" not in sync_script
    assert "not matches_any(path, PUBLIC_EXCLUDE)" in sync_script
    assert '"sdd-docs/**"' in sync_script
    assert "source: git-tracked-files" in policy
    assert "default: include" in policy
    assert "- sdd-docs/**" in policy
