from __future__ import annotations

import sys
from pathlib import Path

import pytest


SCRIPTS_DIR = Path(__file__).resolve().parents[1] / "toolkit" / "fuyao" / "scripts"
sys.path.insert(0, str(SCRIPTS_DIR))

import fuyao_client  # noqa: E402
import fuyao  # noqa: E402


@pytest.mark.parametrize(
    "function_name,args,kwargs,path,params",
    [
        ("a_share_auction_snapshot", (["600519.SH"],), {"stage": "live"}, "/api/a-share/auction/snapshot", {"thscodes": "600519.SH", "stage": "live"}),
        ("a_share_auction_short_term_benchmark", (), {"date": "2026-08-14"}, "/api/a-share/auction/short-term-benchmark", {"date": "2026-08-14"}),
        ("special_data_limit_down_pool", (), {"page": 1, "size": 50, "sort_field": "last_limit_time", "sort_dir": "desc"}, "/api/a-share/special-data/limit-down-pool", {"date_ms": None, "page": 1, "size": 50, "sort_field": "last_limit_time", "sort_dir": "desc"}),
        ("special_data_limit_down_pool", (), {}, "/api/a-share/special-data/limit-down-pool", {"date_ms": None, "page": 1, "size": 50, "sort_field": "last_limit_time", "sort_dir": "desc"}),
        ("special_data_limit_down_pool", (), {"sort_field": "price_change_ratio_pct"}, "/api/a-share/special-data/limit-down-pool", {"date_ms": None, "page": 1, "size": 50, "sort_field": "price_change_ratio_pct", "sort_dir": "desc"}),
        ("special_data_limit_break_pool", (), {"page": 1, "size": 50, "sort_field": "open_times", "sort_dir": "desc"}, "/api/a-share/special-data/limit-break-pool", {"date_ms": None, "page": 1, "size": 50, "sort_field": "open_times", "sort_dir": "desc"}),
        ("special_data_limit_break_pool", (), {}, "/api/a-share/special-data/limit-break-pool", {"date_ms": None, "page": 1, "size": 50, "sort_field": "price_change_ratio_pct", "sort_dir": "desc"}),
        ("special_data_limit_break_pool", (), {"sort_field": "price_change_ratio_pct"}, "/api/a-share/special-data/limit-break-pool", {"date_ms": None, "page": 1, "size": 50, "sort_field": "price_change_ratio_pct", "sort_dir": "desc"}),
    ],
)
def test_auction_and_pool_functions_map_the_published_contract(
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
        (lambda: fuyao_client.a_share_auction_snapshot(["600519.SH"], stage="open"), "stage"),
        (lambda: fuyao_client.a_share_auction_short_term_benchmark(date="20260814"), "date"),
        (lambda: fuyao_client.special_data_limit_down_pool(size=201), "size"),
        (lambda: fuyao_client.special_data_limit_break_pool(sort_field="seal_money"), "sort_field"),
    ],
)
def test_auction_and_pool_functions_reject_invalid_input_before_http(monkeypatch, call, message):
    monkeypatch.setattr(
        fuyao_client,
        "_get",
        lambda *_args, **_kwargs: pytest.fail("HTTP must not be called"),
    )
    with pytest.raises(ValueError, match=message):
        call()


def test_auction_function_docs_explain_response_time_and_default_date() -> None:
    snapshot_doc = fuyao_client.a_share_auction_snapshot.__doc__ or ""
    benchmark_doc = fuyao_client.a_share_auction_short_term_benchmark.__doc__ or ""

    assert "response assembly timestamp" in snapshot_doc
    assert "Asia/Shanghai current date" in benchmark_doc
    assert "date/date_ms" in benchmark_doc


@pytest.mark.parametrize(
    "command,default_sort_field",
    [
        ("limit-down-pool", "last_limit_time"),
        ("limit-break-pool", "price_change_ratio_pct"),
    ],
)
def test_pool_cli_preserves_published_sort_defaults_and_choices(
    command, default_sort_field
) -> None:
    parser = fuyao.build_parser()

    assert parser.parse_args([command]).sort_field == default_sort_field
    assert (
        parser.parse_args(
            [command, "--sort-field", "price_change_ratio_pct"]
        ).sort_field
        == "price_change_ratio_pct"
    )
