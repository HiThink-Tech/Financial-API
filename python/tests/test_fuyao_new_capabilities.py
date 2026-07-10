from __future__ import annotations

import sys
from pathlib import Path

import pytest


SCRIPTS_DIR = Path(__file__).resolve().parents[1] / "toolkit" / "fuyao" / "scripts"
sys.path.insert(0, str(SCRIPTS_DIR))

import fuyao as fuyao_cli  # noqa: E402
import fuyao_client  # noqa: E402


def test_financials_indicators_maps_contract_and_returns_full_data(monkeypatch):
    calls = []
    expected = {
        "thscode": "300033.SZ",
        "report": "2025-1",
        "abilities": [{"ability": "growth", "indicators": []}],
    }

    def fake_get(path, params):
        calls.append((path, params))
        return expected

    monkeypatch.setattr(fuyao_client, "_get", fake_get)

    assert fuyao_client.financials_indicators("300033.SZ", "2025-1") == expected
    assert calls == [
        (
            "/api/a-share/financials/indicators",
            {"thscode": "300033.SZ", "report": "2025-1"},
        )
    ]


@pytest.mark.parametrize(
    "report", ["2025-Q1", "2025-0", "2025-5", "25-1", "２０２５-1", ""]
)
def test_financials_indicators_rejects_invalid_report_before_http(monkeypatch, report):
    monkeypatch.setattr(
        fuyao_client,
        "_get",
        lambda *_args, **_kwargs: pytest.fail("HTTP must not be called"),
    )

    with pytest.raises(ValueError, match="report"):
        fuyao_client.financials_indicators("300033.SZ", report)


def test_anomaly_list_normalizes_tags_and_returns_full_data(monkeypatch):
    calls = []
    expected = {"timestamp": 1, "item": []}

    def fake_get(path, params):
        calls.append((path, params))
        return expected

    monkeypatch.setattr(fuyao_client, "_get", fake_get)

    result = fuyao_client.special_data_anomaly_analysis_list(
        ["limit_up", " SHARP_FALL ", "limit_up"]
    )

    assert result == expected
    assert calls == [
        (
            "/api/a-share/special-data/anomaly-analysis-list",
            {"tag_codes": "LIMIT_UP,SHARP_FALL"},
        )
    ]


@pytest.mark.parametrize("tag_codes", [["LIMIT_UP", ""], ["UNKNOWN"]])
def test_anomaly_list_rejects_invalid_tags_before_http(monkeypatch, tag_codes):
    monkeypatch.setattr(
        fuyao_client,
        "_get",
        lambda *_args, **_kwargs: pytest.fail("HTTP must not be called"),
    )

    with pytest.raises(ValueError, match="tag_codes"):
        fuyao_client.special_data_anomaly_analysis_list(tag_codes)


def test_anomaly_stock_normalizes_deduplicates_and_returns_full_data(monkeypatch):
    calls = []
    expected = {"timestamp": 1, "item": [{"thscode": "600519.SH"}]}

    def fake_get(path, params):
        calls.append((path, params))
        return expected

    monkeypatch.setattr(fuyao_client, "_get", fake_get)

    result = fuyao_client.special_data_anomaly_analysis_stock(
        ["600519.sh", " 000001.SZ ", "600519.SH"]
    )

    assert result == expected
    assert calls == [
        (
            "/api/a-share/special-data/anomaly-analysis-stock",
            {"thscodes": "600519.SH,000001.SZ"},
        )
    ]


@pytest.mark.parametrize(
    "thscodes, message",
    [
        ([], "at least one"),
        (["600519.HK"], "Invalid thscode"),
        (["600519.SH", ""], "empty token"),
        (["600519.SH"] * 51, "must not exceed 50"),
    ],
)
def test_anomaly_stock_rejects_invalid_input_before_http(
    monkeypatch, thscodes, message
):
    monkeypatch.setattr(
        fuyao_client,
        "_get",
        lambda *_args, **_kwargs: pytest.fail("HTTP must not be called"),
    )

    with pytest.raises(ValueError, match=message):
        fuyao_client.special_data_anomaly_analysis_stock(thscodes)


def test_new_cli_commands_map_arguments(monkeypatch, tmp_path):
    calls = []
    monkeypatch.setattr(
        fuyao_cli,
        "financials_indicators",
        lambda thscode, report: calls.append(("indicators", thscode, report)) or {},
    )
    monkeypatch.setattr(
        fuyao_cli,
        "special_data_anomaly_analysis_list",
        lambda tags: calls.append(("list", tags)) or {},
    )
    monkeypatch.setattr(
        fuyao_cli,
        "special_data_anomaly_analysis_stock",
        lambda codes: calls.append(("stock", codes)) or {},
    )
    codes_file = tmp_path / "codes.txt"
    codes_file.write_text("600519.SH\n# comment\n000001.SZ\n", encoding="utf-8")
    parser = fuyao_cli.build_parser()

    for argv in (
        [
            "financials-indicators",
            "--thscode",
            "300033.SZ",
            "--report",
            "2025-1",
        ],
        ["anomaly-analysis-list", "--tag-codes", "LIMIT_UP,SHARP_FALL"],
        ["anomaly-analysis-list", "--tag-codes", "   "],
        ["anomaly-analysis-stock", "--thscodes", "600519.SH,000001.SZ"],
        ["anomaly-analysis-stock", "--thscodes-file", str(codes_file)],
    ):
        args = parser.parse_args(argv)
        args.func(args)

    assert calls == [
        ("indicators", "300033.SZ", "2025-1"),
        ("list", ["LIMIT_UP", "SHARP_FALL"]),
        ("list", None),
        ("stock", ["600519.SH", "000001.SZ"]),
        ("stock", ["600519.SH", "000001.SZ"]),
    ]


def test_anomaly_stock_cli_requires_exactly_one_code_source():
    parser = fuyao_cli.build_parser()

    with pytest.raises(SystemExit):
        parser.parse_args(["anomaly-analysis-stock"])
    with pytest.raises(SystemExit):
        parser.parse_args(
            [
                "anomaly-analysis-stock",
                "--thscodes",
                "600519.SH",
                "--thscodes-file",
                "codes.txt",
            ]
        )
