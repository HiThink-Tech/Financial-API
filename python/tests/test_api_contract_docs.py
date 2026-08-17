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
    "endpoints-valuations.md": {
        "GET /api/a-share/valuations/snapshot",
    },
    "endpoints-calendar.md": {"GET /api/a-share/calendar/trading-days"},
    "endpoints-auction.md": {
        "GET /api/a-share/auction/snapshot",
        "GET /api/a-share/auction/short-term-benchmark",
    },
    "endpoints-index.md": {
        "GET /api/a-share-index/catalog/ths-index-list",
        "GET /api/a-share-index/constituents/ths-stock-list",
        "GET /api/a-share-index/prices/snapshot",
        "GET /api/a-share-index/prices/historical",
    },
    "endpoints-special-data.md": {
        "GET /api/a-share/special-data/limit-up-pool",
        "GET /api/a-share/special-data/limit-down-pool",
        "GET /api/a-share/special-data/limit-break-pool",
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
        "GET /api/fund/companies/detail",
        "GET /api/fund/portfolio/industry-allocation",
        "GET /api/fund/performance/indicators-historical",
        "GET /api/fund/performance/drawdowns",
        "GET /api/fund/holders/top",
        "GET /api/fund/corporate-actions/dividends",
        "GET /api/fund/diagnostics/detail",
        "GET /api/fund/financials/indicators",
        "GET /api/fund/financials/income-statements",
        "GET /api/fund/financials/balance-sheets",
        "GET /api/fund/managers/investment-style",
        "GET /api/fund/managers/performance",
        "GET /api/fund/managers/experience",
        "GET /api/fund/managers/detail",
        "GET /api/fund/news/article-list",
        "GET /api/fund/offerings/list",
        "GET /api/fund/portfolio/stock-history",
        "GET /api/fund/portfolio/stock-report-dates",
        "GET /api/fund/portfolio/bond-history",
        "GET /api/fund/portfolio/bond-report-dates",
        "GET /api/fund/portfolio/asset-allocation",
    },
    "endpoints-market-dumps.md": {
        "GET /api/dump/market-dumps/daily-k/download-url",
        "GET /api/dump/market-dumps/daily-k-10d/download-url",
        "GET /api/dump/market-dumps/adjustment-factors/download-url",
    },
}


def read(filename: str) -> str:
    return (API_ROOT / filename).read_text(encoding="utf-8")


def test_all_59_endpoints_are_documented_once() -> None:
    assert sum(map(len, EXPECTED_ENDPOINTS.values())) == 59
    for filename in EXPECTED_ENDPOINTS:
        assert (API_ROOT / filename).is_file(), filename
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

    for required in (
        "limit-down-pool",
        "limit-break-pool",
        "last_limit_time",
        "first_limit_time",
        "open_times",
        "turnover_ratio_pct",
        "1–200",
    ):
        assert required in special

    assert "1d" in index
    assert "固定" in index or "fixed" in index.lower()
    assert "5003" not in index


def test_fund_and_meta_contracts_preserve_backend_boundaries() -> None:
    fund = read("endpoints-fund.md")
    meta = read("endpoints-meta.md")
    entry = read("README.md")
    holders = fund.split("## 5. 基金持有人结构", maxsplit=1)[1].split(
        "## 6. 场内基金行情快照", maxsplit=1
    )[0]

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
        "merge_scope",
        "report_date_ms",
        "all",
        "merged",
        "separate",
        "turnover_ratio_pct",
        "3001",
        "3002",
        "3004",
        "5 年",
        "company_id",
        "manager_info",
        "trade_rule",
        "rate_info",
        "total_stock_ratio_pct",
        "total_bond_ratio_pct",
        "total_fund_ratio_pct",
        "peer_average_week",
        "rank_total_fyear",
        "manager_id",
        "radar_comparison",
        "subscribe",
        "active",
        "upcoming",
        "report_type",
        "end_date",
        "dividend_count",
        "dividend_total",
    ):
        assert value in fund
    assert "| `merge_scope` | string | 否 |" in holders
    assert "`all`（默认" in holders
    assert "`report_date_ms`" in holders
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


def test_auction_contract_preserves_batch_stage_and_timestamp_semantics() -> None:
    auction = read("endpoints-auction.md")

    for required in (
        "get_a_share_auction_snapshot",
        "get_a_share_auction_short_term_benchmark",
        "thscodes",
        "live",
        "final",
        "auction_unmatched",
        "auction_turnover_pct",
        "float_market_cap",
        "auction_pct",
        "tags",
        "YYYY-MM-DD",
        "timestamp",
    ):
        assert required in auction

    snapshot = auction.split("## 1. 个股/多股集合竞价快照", maxsplit=1)[1].split(
        "## 2. 短线风向标竞价基准", maxsplit=1
    )[0]
    benchmark = auction.split("## 2. 短线风向标竞价基准", maxsplit=1)[1]
    assert "接口响应组装时间" in snapshot
    assert "上游行情时间仅用于判断数据新鲜度" in snapshot
    assert "可信的竞价数据时间" not in snapshot
    for required in ("Asia/Shanghai", "date_ms", "非交易日不自动回退"):
        assert required in benchmark


def test_fund_news_and_historical_indicators_use_the_runtime_payload_shape() -> None:
    fund = read("endpoints-fund.md")
    indicators = fund.split("## 10. 历史业绩指标", maxsplit=1)[1].split(
        "## 11. 最大回撤", maxsplit=1
    )[0]
    news = fund.split("## 22. 基金资讯列表", maxsplit=1)[1].split(
        "## 23. 基金募集列表", maxsplit=1
    )[0]

    assert "`data` 仅包含 `timestamp` 和 `item[]`" in indicators
    assert "不返回顶层 `thscode`、`interval`" in indicators
    response_shape = next(line for line in news.splitlines() if line.startswith("`data` 含"))
    assert "`total`" not in response_shape
    assert "`has_more=false`" in news


def test_valuation_snapshot_contract_preserves_fixed_metrics_and_batch_boundaries() -> None:
    path = API_ROOT / "endpoints-valuations.md"
    assert path.is_file()
    valuations = path.read_text(encoding="utf-8")

    for required in (
        "get_a_share_valuations_snapshot",
        "GET /api/a-share/valuations/snapshot",
        "thscodes",
        "100",
        "去重",
        "timestamp",
        "total",
        "item",
        "pe_ttm",
        "pe_mrq",
        "pb_mrq",
        "ps_ttm",
        "pcf_ttm",
        "null",
        "负数",
    ):
        assert required in valuations
    assert not re.search(r"^\| `roe_ttm` \|", valuations, re.M)


def test_error_envelope_always_keeps_null_data() -> None:
    entry = read("README.md")
    assert "`data` 字段始终存在" in entry
    assert "业务错误时为 `null`" in entry
