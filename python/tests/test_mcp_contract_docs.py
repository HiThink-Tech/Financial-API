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
    assert "55" in capability_map
    for behavior in ("意图", "按需", "消歧", "code=2003", "tools/list"):
        assert behavior in entry + capability_map


def test_mcp_examples_use_the_canonical_api_key_environment_variable() -> None:
    entry = read("docs/mcp.md")

    assert entry.count("${HITHINK_FINANCE_API_KEY}") == 4
    assert "${API_KEY}" not in entry


def test_mcp_service_snapshots_preserve_all_tools_and_agent_guidance() -> None:
    expected_counts = {
        "hithink-finance-a-share.md": 21,
        "hithink-finance-a-share-index.md": 4,
        "hithink-finance-meta.md": 2,
        "hithink-finance-fund.md": 28,
    }

    for filename, expected_count in expected_counts.items():
        text = (MCP_ROOT / filename).read_text(encoding="utf-8")
        tools = set(re.findall(r"^\| `(get_[^`]+)` \|", text, re.M))
        assert len(tools) == expected_count, filename
        assert "适用场景" in text or "用途" in text
        assert "参数" in text


def test_mcp_valuation_snapshot_matches_the_rest_contract() -> None:
    a_share = read("docs/mcp/hithink-finance-a-share.md")

    for required in (
        "get_a_share_valuations_snapshot",
        "thscodes",
        "pe_ttm",
        "pe_mrq",
        "pb_mrq",
        "ps_ttm",
        "pcf_ttm",
    ):
        assert required in a_share
    assert not re.search(r"^\| `roe_ttm` \|", a_share, re.M)


def test_mcp_auction_and_limit_pool_tools_match_rest_contracts() -> None:
    a_share = read("docs/mcp/hithink-finance-a-share.md")

    for required in (
        "get_a_share_auction_snapshot",
        "get_a_share_auction_short_term_benchmark",
        "get_a_share_special_data_limit_down_pool",
        "get_a_share_special_data_limit_break_pool",
        "stage=live/final",
        "size=1..200",
        "last_limit_time",
        "open_times",
    ):
        assert required in a_share
    for required in (
        "Asia/Shanghai",
        "date/date_ms",
        "响应组装时间",
        "上游行情时间仅用于判断新鲜度",
    ):
        assert required in a_share


def test_mcp_fund_snapshot_lists_all_extended_tools_and_boundaries() -> None:
    fund = read("docs/mcp/hithink-finance-fund.md")

    for required in (
        "get_fund_companies_detail",
        "get_fund_performance_indicators_historical",
        "get_fund_managers_detail",
        "get_fund_news_article_list",
        "get_fund_offerings_list",
        "get_fund_portfolio_bond_report_dates",
        "manager_id",
        "company_id",
        "active/upcoming",
        "最多 5 年",
    ):
        assert required in fund
    for required in (
        "has_more=false",
        "不返回 total",
        "data 仅含 timestamp/item",
        "不返回顶层 thscode/interval",
    ):
        assert required in fund

    indicators_row = next(
        line
        for line in fund.splitlines()
        if "get_fund_performance_indicators_historical" in line
    )
    assert "`start`/`end`" in indicators_row
    assert "start_date/end_date" not in indicators_row
