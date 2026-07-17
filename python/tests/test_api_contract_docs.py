"""Development-only semantic guards for the canonical REST API contract."""

from __future__ import annotations

import re
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
API_ROOT = REPO_ROOT / "docs" / "api"

EXPECTED_ENDPOINTS = {
    "endpoints-meta.md": {
        "GET /api/meta/tickers/search",
        "GET /api/meta/tickers/list",
    },
    "endpoints-prices.md": {
        "GET /api/a-share/prices/snapshot",
        "GET /api/a-share/prices/historical",
        "GET /api/a-share/corporate-actions/adjustment-factors",
    },
    "endpoints-financials.md": {
        "GET /api/a-share/financials/income-statements",
        "GET /api/a-share/financials/balance-sheets",
        "GET /api/a-share/financials/cash-flow-statements",
        "GET /api/a-share/financials/indicators",
    },
    "endpoints-calendar.md": {"GET /api/a-share/calendar/trading-days"},
    "endpoints-index.md": {
        "GET /api/a-share-index/catalog/ths-index-list",
        "GET /api/a-share-index/constituents/ths-stock-list",
        "GET /api/a-share-index/prices/snapshot",
        "GET /api/a-share-index/prices/historical",
    },
    "endpoints-special-data.md": {
        "GET /api/a-share/special-data/limit-up-pool",
        "GET /api/a-share/special-data/limit-up-ladder",
        "GET /api/a-share/special-data/anomaly-analysis-list",
        "GET /api/a-share/special-data/anomaly-analysis-stock",
        "GET /api/a-share/special-data/skyrocket-list",
        "GET /api/a-share/special-data/hot-stock-list",
        "GET /api/a-share/special-data/hot-stock-list-history",
        "GET /api/a-share/special-data/hot-stock-rank-trend",
        "GET /api/a-share/special-data/dragon-tiger-list",
    },
    "endpoints-fund.md": {
        "GET /api/fund/profile/detail",
        "GET /api/fund/portfolio/holdings",
        "GET /api/fund/performance/nav",
        "GET /api/fund/performance/returns",
        "GET /api/fund/holders/detail",
        "GET /api/fund/market/snapshot",
        "GET /api/fund/market/historical",
    },
    "endpoints-market-dumps.md": {
        "GET /api/dump/market-dumps/daily-k/download-url",
        "GET /api/dump/market-dumps/daily-k-10d/download-url",
        "GET /api/dump/market-dumps/adjustment-factors/download-url",
    },
}


def read(filename: str) -> str:
    return (API_ROOT / filename).read_text(encoding="utf-8")


def test_all_33_endpoints_are_documented_once() -> None:
    assert sum(map(len, EXPECTED_ENDPOINTS.values())) == 33
    combined = "\n".join(read(filename) for filename in EXPECTED_ENDPOINTS)

    for filename, endpoints in EXPECTED_ENDPOINTS.items():
        text = read(filename)
        for endpoint in endpoints:
            assert re.search(rf"```\w*\s*\n\s*{re.escape(endpoint)}", text)
            assert len(re.findall(rf"^{re.escape(endpoint)}$", combined, re.M)) == 1


def test_every_endpoint_group_has_examples_and_avoidance_guidance() -> None:
    for filename in EXPECTED_ENDPOINTS:
        text = read(filename)
        assert "curl" in text, filename
        assert "X-api-key" in text, filename
        assert "避错要点" in text, filename


def test_financial_fields_match_the_validated_contract() -> None:
    financials = read("endpoints-financials.md")

    for field in (
        "operating_income",
        "parent_holder_net_profit",
        "operating_profit",
        "net_profit",
        "basic_eps",
        "research_and_development_expenses",
        "assets_total",
        "total_debt",
        "holder_equity_total",
        "accounts_receivable",
        "act_cash_flow_net",
        "financing_cash_flow_net",
        "invest_cash_flow_net",
    ):
        assert field in financials

    for fictional in ("total_operate_income", "np_parent_company_owners"):
        assert fictional not in financials

    assert "array" in financials.lower() or "list" in financials.lower()
    assert "ability" in financials and "indicators" in financials
    assert 'abilities["growth"]' in financials


def test_special_data_and_index_edge_contracts_are_preserved() -> None:
    special = read("endpoints-special-data.md")
    index = read("endpoints-index.md")

    for field in (
        "rank_trend",
        "rank_change",
        "heat",
        "buy_value",
        "sell_value",
        "net_value",
        "net_rate",
        "org_net_value",
        "hot_money_net_value",
        "hot_rank",
        "range_days",
        "limit_reason",
        "concept_list",
        "change",
        "board_num",
        "sign_level",
        "seal_nextday",
    ):
        assert field in special

    for fictional in ("analyse_title", "`analyse`", "`tags`", "`topic`"):
        assert fictional not in special

    assert "1d" in index
    assert "固定" in index or "fixed" in index.lower()
    assert "5003" not in index


def test_fund_and_meta_contracts_preserve_backend_boundaries() -> None:
    fund = read("endpoints-fund.md")
    meta = read("endpoints-meta.md")
    entry = read("README.md")

    for value in (
        "otc",
        "exchange",
        "reits",
        "unit,adj",
        "twoyear",
        "fund_name",
        "hold_ratio",
        "nav_date",
        "return_now",
        "ins_position",
        "turnover_ratio_pct",
        "3001",
        "3002",
        "3004",
        "5 年",
    ):
        assert value in fund
    for asset_type in (
        "a-share",
        "a-share-index",
        "forex",
        "fund-otc",
        "fund-etf",
        "fund-lof",
        "fund-reits",
    ):
        assert asset_type in meta
    assert "逗号" in meta and "多个" in meta
    assert "3004" in entry


def test_error_envelope_always_keeps_null_data() -> None:
    entry = read("README.md")
    assert "`data` 字段始终存在" in entry
    assert "业务错误时为 `null`" in entry
