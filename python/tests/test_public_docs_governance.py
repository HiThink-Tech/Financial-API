"""Development-only contracts for the public documentation and root Skill."""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
PUBLIC_MARKDOWN = tuple(
    path
    for path in REPO_ROOT.rglob("*.md")
    if not {
        ".agents",
        ".codex",
        ".git",
        ".venv",
        ".workbuddy",
        "dist",
        "internal",
        "node_modules",
        "out",
        "sdd-docs",
    }.intersection(path.parts)
)


def read(relative_path: str) -> str:
    return (REPO_ROOT / relative_path).read_text(encoding="utf-8")


def test_root_readme_has_current_brand_positioning_and_quick_start() -> None:
    readme = read("README.md")

    assert readme.startswith("# 同花顺金融数据服务")
    assert "## 最新变化" in readme
    assert "skills/hithink-finance" in readme
    assert "docs/monorepo-migration.md" in readme
    for access_mode in ("CLI", "REST API", "MCP", "Python SDK"):
        assert access_mode in readme
    assert "一站式" in readme and "AI Agent" in readme
    assert readme.index("npm install -g @hithink-tech/hithink-finance-cli") < readme.index(
        "cd hithink-finance-cli"
    )
    for server_name in (
        "hithink-finance-a-share",
        "hithink-finance-a-share-index",
        "hithink-finance-meta",
        "hithink-finance-fund",
    ):
        assert server_name in readme
    assert "examples/inspirations/01-stock-overview/preview.jpg" in readme


def test_root_changelog_preserves_history_and_documents_this_release() -> None:
    changelog = read("CHANGELOG.md")

    assert changelog.startswith("# 更新日志")
    for release_date in ("2026-07-10", "2026-07-06", "2026-07-02", "2026-07-01", "2026-06-23"):
        assert release_date in changelog
    for change in ("monorepo", "hithink-finance", "CLI", "MCP"):
        assert change in changelog


def test_root_skills_are_consolidated_to_hithink_finance() -> None:
    skills_root = REPO_ROOT / "skills"
    skill_directories = {
        path.name
        for path in skills_root.iterdir()
        if path.is_dir() and not path.name.startswith(".")
    }

    assert skill_directories == {"hithink-finance"}
    skill = read("skills/hithink-finance/SKILL.md")
    assert "name: hithink-finance" in skill
    for access_mode in ("REST API", "MCP", "CLI", "Python SDK"):
        assert access_mode in skill
    assert "渐进" in skill or "按需" in skill

    references = REPO_ROOT / "skills" / "hithink-finance" / "references"
    assert {path.name for path in references.glob("*.md")} == {
        "api.md",
        "cli.md",
        "mcp.md",
        "python-sdk.md",
    }
    assert {path.name for path in references.iterdir() if path.is_dir()} == {
        "api",
        "cli",
        "mcp",
        "python-sdk",
    }


def test_upstream_api_contract_has_one_canonical_source_and_skill_mirror() -> None:
    canonical_root = REPO_ROOT / "docs" / "api"
    mirror_root = REPO_ROOT / "skills" / "hithink-finance" / "references" / "api"
    contract_files = {
        "capability-map.md",
        "endpoints-calendar.md",
            "endpoints-financials.md",
            "endpoints-fund.md",
        "endpoints-index.md",
        "endpoints-market-dumps.md",
        "endpoints-meta.md",
        "endpoints-prices.md",
        "endpoints-special-data.md",
        "endpoints-valuations.md",
    }

    assert {path.name for path in canonical_root.glob("*.md")} == contract_files | {
        "README.md"
    }
    assert {path.name for path in mirror_root.glob("*.md")} == contract_files
    for filename in contract_files:
        assert (canonical_root / filename).read_bytes() == (mirror_root / filename).read_bytes()
    assert read("skills/hithink-finance/references/api.md").startswith("# REST API 契约")

    result = subprocess.run(
        [sys.executable, "scripts/sync_skill_contracts.py", "--check"],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stdout + result.stderr


def test_temporary_special_data_capabilities_are_not_public() -> None:
    combined = "\n".join(path.read_text(encoding="utf-8") for path in PUBLIC_MARKDOWN)

    assert "/api/a-share/special-data/temporary-" not in combined
    assert "get_a_share_special_data_temporary_" not in combined


def test_obsolete_local_llms_contracts_and_legacy_skill_names_are_absent() -> None:
    obsolete_contracts = [
        path
        for path in REPO_ROOT.rglob("*")
        if path.is_file()
        and path.name.lower().replace("_", "-")
        in {"llm.txt", "llms.txt", "llm-full.txt", "llms-full.txt"}
        and ".git" not in path.parts
        and "internal" not in path.parts
        and "sdd-docs" not in path.parts
        and "node_modules" not in path.parts
    ]
    assert obsolete_contracts == []

    combined = "\n".join(path.read_text(encoding="utf-8") for path in PUBLIC_MARKDOWN)
    for legacy_skill in (
        "skills/financial-api",
        "skills/fuyao-financial-api",
        "skills/fuyao-financial-mcp",
        "skills/hithink-finance-cli-setup",
    ):
        assert legacy_skill not in combined

    assert "https://fuyao.aicubes.cn/llms-full.txt" in combined
    skill_files = [
        path
        for path in (REPO_ROOT / "skills" / "hithink-finance").rglob("*")
        if path.is_file()
    ]
    skill_text = "\n".join(path.read_text(encoding="utf-8") for path in skill_files)
    assert "llms-full" not in skill_text


def test_python_docs_describe_python_usage_not_duplicate_upstream_contracts() -> None:
    fuyao_docs = REPO_ROOT / "python" / "toolkit" / "fuyao" / "docs"
    assert not fuyao_docs.exists()

    python_readme = read("python/toolkit/fuyao/README.md")
    assert "fuyao_client.py" in python_readme
    assert "fuyao.py" in python_readme
    assert "docs/api/" in python_readme
    assert "## 响应字段" not in python_readme


def test_public_entry_docs_recommend_one_cross_mode_api_key_contract() -> None:
    canonical = "HITHINK_FINANCE_API_KEY"
    entry_docs = (
        "README.md",
        "docs/mcp.md",
        "hithink-finance-cli/README.md",
        "python/README.md",
        "python/toolkit/README.md",
        "python/toolkit/fuyao/README.md",
        "python/examples/README.md",
        "skills/hithink-finance/references/python-sdk/remote-toolkit.md",
    )

    for document in entry_docs:
        assert canonical in read(document), document

    assert "${API_KEY}" not in read("README.md")


def test_public_markdown_relative_links_resolve() -> None:
    link_pattern = re.compile(r"(?<!!)\[[^\]]+\]\(([^)]+)\)")
    missing: list[str] = []

    for document in PUBLIC_MARKDOWN:
        for raw_target in link_pattern.findall(document.read_text(encoding="utf-8")):
            target = raw_target.strip().split("#", 1)[0]
            if not target or "://" in target or target.startswith("mailto:"):
                continue
            target = target.strip("<>").replace("%20", " ")
            if not (document.parent / target).resolve().exists():
                missing.append(f"{document.relative_to(REPO_ROOT)} -> {raw_target}")

    assert missing == []
