from __future__ import annotations

import sys
from pathlib import Path

import pytest


SCRIPTS_DIR = Path(__file__).resolve().parents[1] / "toolkit" / "fuyao" / "scripts"
sys.path.insert(0, str(SCRIPTS_DIR))

import fuyao as fuyao_cli  # noqa: E402
import fuyao_client  # noqa: E402


@pytest.mark.parametrize(
    "function_name,path",
    [
        ("special_data_skyrocket_list", "/api/a-share/special-data/skyrocket-list"),
        ("special_data_hot_stock_list", "/api/a-share/special-data/hot-stock-list"),
    ],
)
def test_current_hot_lists_map_period_and_return_full_data(
    monkeypatch, function_name, path
):
    calls = []
    expected = {"timestamp": 1, "item": []}
    monkeypatch.setattr(
        fuyao_client,
        "_get",
        lambda actual_path, params: calls.append((actual_path, params)) or expected,
    )

    function = getattr(fuyao_client, function_name)

    assert function("hour") == expected
    assert calls == [(path, {"period": "hour"})]


def test_current_hot_lists_default_to_day(monkeypatch):
    calls = []
    monkeypatch.setattr(
        fuyao_client,
        "_get",
        lambda path, params: calls.append((path, params)) or {},
    )

    fuyao_client.special_data_skyrocket_list()
    fuyao_client.special_data_hot_stock_list()

    assert calls == [
        ("/api/a-share/special-data/skyrocket-list", {"period": "day"}),
        ("/api/a-share/special-data/hot-stock-list", {"period": "day"}),
    ]


@pytest.mark.parametrize("period", ["week", "", None, 1])
def test_current_hot_lists_reject_invalid_period_before_http(monkeypatch, period):
    monkeypatch.setattr(
        fuyao_client,
        "_get",
        lambda *_args, **_kwargs: pytest.fail("HTTP must not be called"),
    )

    with pytest.raises(ValueError, match="period"):
        fuyao_client.special_data_hot_stock_list(period)


def test_hot_stock_history_maps_iso_date(monkeypatch):
    calls = []
    expected = {"date": "2026-07-01", "date_ms": 1, "item": []}
    monkeypatch.setattr(
        fuyao_client,
        "_get",
        lambda path, params: calls.append((path, params)) or expected,
    )

    result = fuyao_client.special_data_hot_stock_list_history("2026-07-01")

    assert result == expected
    assert calls == [
        (
            "/api/a-share/special-data/hot-stock-list-history",
            {"date": "2026-07-01"},
        )
    ]


def test_hot_stock_rank_trend_maps_contract(monkeypatch):
    calls = []
    expected = {"timestamp": 1, "item": []}
    monkeypatch.setattr(
        fuyao_client,
        "_get",
        lambda path, params: calls.append((path, params)) or expected,
    )

    result = fuyao_client.special_data_hot_stock_rank_trend(
        "300033.sz", "2026-06-01", "2026-07-01"
    )

    assert result == expected
    assert calls == [
        (
            "/api/a-share/special-data/hot-stock-rank-trend",
            {
                "thscode": "300033.SZ",
                "start_date": "2026-06-01",
                "end_date": "2026-07-01",
            },
        )
    ]


@pytest.mark.parametrize(
    "args,message",
    [
        (("20260701",), "date"),
        (("2026-02-30",), "date"),
    ],
)
def test_hot_stock_history_rejects_invalid_date_before_http(monkeypatch, args, message):
    monkeypatch.setattr(
        fuyao_client,
        "_get",
        lambda *_args, **_kwargs: pytest.fail("HTTP must not be called"),
    )

    with pytest.raises(ValueError, match=message):
        fuyao_client.special_data_hot_stock_list_history(*args)


@pytest.mark.parametrize(
    "thscode,start_date,end_date,message",
    [
        ("300033.HK", "2026-06-01", "2026-07-01", "thscode"),
        ("300033.SZ", "2026-07-02", "2026-07-01", "start_date"),
        ("300033.SZ", "2025-06-30", "2026-07-01", "one year"),
    ],
)
def test_hot_stock_rank_trend_rejects_invalid_input_before_http(
    monkeypatch, thscode, start_date, end_date, message
):
    monkeypatch.setattr(
        fuyao_client,
        "_get",
        lambda *_args, **_kwargs: pytest.fail("HTTP must not be called"),
    )

    with pytest.raises(ValueError, match=message):
        fuyao_client.special_data_hot_stock_rank_trend(
            thscode, start_date, end_date
        )


def test_dragon_tiger_list_maps_optional_filters(monkeypatch):
    calls = []
    stock_items = [{"thscode": "300033.SZ"}]
    expected = {"board_type": "hot_money", "stock_items": stock_items}
    monkeypatch.setattr(
        fuyao_client,
        "_get",
        lambda path, params: calls.append((path, params)) or expected,
    )

    result = fuyao_client.special_data_dragon_tiger_list(
        board_type="hot_money", date="2026-07-01"
    )

    assert result == {**expected, "item": stock_items}
    assert calls == [
        (
            "/api/a-share/special-data/dragon-tiger-list",
            {"board_type": "hot_money", "date": "2026-07-01"},
        )
    ]


def test_dragon_tiger_list_keeps_upstream_item_when_present(monkeypatch):
    stock_items = [{"thscode": "300033.SZ"}]
    upstream_item = [{"thscode": "600519.SH"}]
    monkeypatch.setattr(
        fuyao_client,
        "_get",
        lambda _path, _params: {"stock_items": stock_items, "item": upstream_item},
    )

    result = fuyao_client.special_data_dragon_tiger_list()

    assert result["stock_items"] == stock_items
    assert result["item"] == upstream_item


def test_dragon_tiger_list_defaults_to_all_and_server_date(monkeypatch):
    calls = []
    monkeypatch.setattr(
        fuyao_client,
        "_get",
        lambda path, params: calls.append((path, params)) or {},
    )

    fuyao_client.special_data_dragon_tiger_list()

    assert calls == [
        (
            "/api/a-share/special-data/dragon-tiger-list",
            {"board_type": "all", "date": None},
        )
    ]


@pytest.mark.parametrize(
    "kwargs,message",
    [
        ({"board_type": "seats"}, "board_type"),
        ({"date": "20260701"}, "date"),
    ],
)
def test_dragon_tiger_list_rejects_invalid_input_before_http(
    monkeypatch, kwargs, message
):
    monkeypatch.setattr(
        fuyao_client,
        "_get",
        lambda *_args, **_kwargs: pytest.fail("HTTP must not be called"),
    )

    with pytest.raises(ValueError, match=message):
        fuyao_client.special_data_dragon_tiger_list(**kwargs)


def test_hot_list_cli_commands_map_arguments(monkeypatch):
    calls = []
    monkeypatch.setattr(
        fuyao_cli,
        "special_data_skyrocket_list",
        lambda period: calls.append(("skyrocket", period)) or {},
    )
    monkeypatch.setattr(
        fuyao_cli,
        "special_data_hot_stock_list",
        lambda period: calls.append(("hot", period)) or {},
    )
    monkeypatch.setattr(
        fuyao_cli,
        "special_data_hot_stock_list_history",
        lambda date: calls.append(("history", date)) or {},
    )
    monkeypatch.setattr(
        fuyao_cli,
        "special_data_hot_stock_rank_trend",
        lambda thscode, start, end: calls.append(("trend", thscode, start, end))
        or {},
    )
    monkeypatch.setattr(
        fuyao_cli,
        "special_data_dragon_tiger_list",
        lambda **kwargs: calls.append(("dragon", kwargs)) or {},
    )
    parser = fuyao_cli.build_parser()

    argv_sets = [
        ["skyrocket-list", "--period", "hour"],
        ["hot-stock-list"],
        ["hot-stock-list-history", "--date", "2026-07-01"],
        [
            "hot-stock-rank-trend",
            "--thscode",
            "300033.SZ",
            "--start-date",
            "2026-06-01",
            "--end-date",
            "2026-07-01",
        ],
        [
            "dragon-tiger-list",
            "--board-type",
            "org",
            "--date",
            "2026-07-01",
        ],
    ]
    for argv in argv_sets:
        args = parser.parse_args(argv)
        args.func(args)

    assert calls == [
        ("skyrocket", "hour"),
        ("hot", "day"),
        ("history", "2026-07-01"),
        ("trend", "300033.SZ", "2026-06-01", "2026-07-01"),
        ("dragon", {"board_type": "org", "date": "2026-07-01"}),
    ]
