from __future__ import annotations

import sys
from pathlib import Path

import pytest


SCRIPTS_DIR = Path(__file__).resolve().parents[1] / "toolkit" / "fuyao" / "scripts"
sys.path.insert(0, str(SCRIPTS_DIR))

import fuyao as fuyao_cli  # noqa: E402
import fuyao_client  # noqa: E402


@pytest.mark.parametrize(
    "function_name,args,kwargs,path,params",
    [
        (
            "fund_profile_detail",
            ("025480.OF",),
            {"fund_type": "otc"},
            "/api/fund/profile/detail",
            {"fund_type": "otc", "thscode": "025480.OF"},
        ),
        (
            "fund_portfolio_holdings",
            ("025480.OF",),
            {"fund_type": "otc"},
            "/api/fund/portfolio/holdings",
            {"fund_type": "otc", "thscode": "025480.OF"},
        ),
        (
            "fund_performance_nav",
            ("025480.OF",),
            {"fund_type": "otc", "range": "year", "nav_type": "unit,adj"},
            "/api/fund/performance/nav",
            {
                "fund_type": "otc",
                "thscode": "025480.OF",
                "range": "year",
                "nav_type": "unit,adj",
            },
        ),
        (
            "fund_performance_returns",
            ("025480.OF",),
            {"fund_type": "otc"},
            "/api/fund/performance/returns",
            {"fund_type": "otc", "thscode": "025480.OF"},
        ),
        (
            "fund_holders_detail",
            ("025480.OF",),
            {"fund_type": "otc"},
            "/api/fund/holders/detail",
            {"fund_type": "otc", "thscode": "025480.OF"},
        ),
        (
            "fund_market_snapshot",
            ("510300.sh",),
            {},
            "/api/fund/market/snapshot",
            {"thscode": "510300.SH"},
        ),
        (
            "fund_market_historical",
            ("510300.SH", 1_700_000_000_000, 1_710_000_000_000),
            {},
            "/api/fund/market/historical",
            {
                "thscode": "510300.SH",
                "interval": "1d",
                "start": 1_700_000_000_000,
                "end": 1_710_000_000_000,
            },
        ),
    ],
)
def test_fund_functions_map_the_published_contract(
    monkeypatch, function_name, args, kwargs, path, params
):
    calls = []
    expected = {"timestamp": 1, "item": []}
    monkeypatch.setattr(
        fuyao_client,
        "_get",
        lambda actual_path, actual_params: calls.append((actual_path, actual_params))
        or expected,
    )

    assert getattr(fuyao_client, function_name)(*args, **kwargs) == expected
    assert calls == [(path, params)]


@pytest.mark.parametrize(
    "call,message",
    [
        (lambda: fuyao_client.fund_profile_detail("025480.OF", fund_type="all"), "fund_type"),
        (
            lambda: fuyao_client.fund_performance_nav(
                "025480.OF", fund_type="otc", range="fiveyear"
            ),
            "range",
        ),
        (
            lambda: fuyao_client.fund_performance_nav(
                "025480.OF", fund_type="otc", nav_type="all"
            ),
            "nav_type",
        ),
        (lambda: fuyao_client.fund_market_snapshot("025480.OF"), "exchange-traded"),
        (lambda: fuyao_client.fund_market_snapshot("510300.SH,159915.SZ"), "single-thscode"),
        (
            lambda: fuyao_client.fund_market_historical(
                "510300.SH", 1_700_000_000_000, 1_700_000_000_000 - 1
            ),
            "end_ms",
        ),
        (
            lambda: fuyao_client.fund_market_historical(
                "510300.SH", 1_700_000_000_000, 1_900_000_000_000
            ),
            "five years",
        ),
    ],
)
def test_fund_functions_reject_invalid_input_before_http(monkeypatch, call, message):
    monkeypatch.setattr(
        fuyao_client,
        "_get",
        lambda *_args, **_kwargs: pytest.fail("HTTP must not be called"),
    )

    with pytest.raises(ValueError, match=message):
        call()


def test_ticker_asset_types_accept_normalized_multi_values(monkeypatch):
    calls = []
    monkeypatch.setattr(
        fuyao_client,
        "_get",
        lambda path, params: calls.append((path, params)) or {"item": []},
    )

    fuyao_client.tickers_search(
        "基金", asset_type=["fund-otc", "fund-etf", "fund-otc"], remote=True
    )
    fuyao_client.tickers_list(asset_type="fund-lof,fund-reits")

    assert calls[0][1]["asset_type"] == "fund-otc,fund-etf"
    assert calls[1][1]["asset_type"] == "fund-lof,fund-reits"


def test_ticker_asset_types_reject_unknown_value_before_http(monkeypatch):
    monkeypatch.setattr(
        fuyao_client,
        "_get",
        lambda *_args, **_kwargs: pytest.fail("HTTP must not be called"),
    )

    with pytest.raises(ValueError, match="asset_type"):
        fuyao_client.tickers_search("基金", asset_type="fund", remote=True)


def test_fund_cli_commands_are_registered_and_map_arguments(monkeypatch):
    calls = []
    monkeypatch.setattr(
        fuyao_cli,
        "fund_performance_nav",
        lambda thscode, **kwargs: calls.append((thscode, kwargs)) or {},
    )
    parser = fuyao_cli.build_parser()

    args = parser.parse_args(
        [
            "fund-nav",
            "--fund-type",
            "otc",
            "--thscode",
            "025480.OF",
            "--range",
            "year",
            "--nav-type",
            "unit,adj",
        ]
    )
    args.func(args)

    assert calls == [
        (
            "025480.OF",
            {"fund_type": "otc", "range": "year", "nav_type": "unit,adj"},
        )
    ]
