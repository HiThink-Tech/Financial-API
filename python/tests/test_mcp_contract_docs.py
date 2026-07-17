"""Development-only semantic guards for the canonical MCP contract."""

from __future__ import annotations

import re
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
MCP_ROOT = REPO_ROOT / "docs" / "mcp"


def read(relative_path: str) -> str:
    return (REPO_ROOT / relative_path).read_text(encoding="utf-8")


def test_mcp_contract_preserves_four_service_intent_routing() -> None:
    entry = read("docs/mcp.md")
    capability_map = read("docs/mcp/capability-map.md")

    for service in (
        "hithink-finance-a-share",
        "hithink-finance-a-share-index",
        "hithink-finance-meta",
        "hithink-finance-fund",
    ):
        assert service in entry
        assert service in capability_map
    assert "29" in capability_map
    for behavior in ("意图", "按需", "消歧", "code=2003", "tools/list"):
        assert behavior in entry + capability_map


def test_mcp_examples_use_the_canonical_api_key_environment_variable() -> None:
    entry = read("docs/mcp.md")

    assert entry.count("${HITHINK_FINANCE_API_KEY}") == 4
    assert "${API_KEY}" not in entry


def test_mcp_service_snapshots_preserve_all_tools_and_agent_guidance() -> None:
    expected_counts = {
        "hithink-finance-a-share.md": 16,
        "hithink-finance-a-share-index.md": 4,
        "hithink-finance-meta.md": 2,
        "hithink-finance-fund.md": 7,
    }

    for filename, expected_count in expected_counts.items():
        text = (MCP_ROOT / filename).read_text(encoding="utf-8")
        tools = set(re.findall(r"^\| `(get_[^`]+)` \|", text, re.M))
        assert len(tools) == expected_count, filename
        assert "适用场景" in text or "用途" in text
        assert "参数" in text


def test_mcp_contract_is_mirrored_into_standalone_skill() -> None:
    skill_root = REPO_ROOT / "skills" / "hithink-finance" / "references"
    assert read("docs/mcp.md") == read("skills/hithink-finance/references/mcp.md")
    for source in MCP_ROOT.glob("*.md"):
        target = skill_root / "mcp" / source.name
        assert target.is_file()
        assert source.read_bytes() == target.read_bytes()
