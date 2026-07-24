from __future__ import annotations

import sys
from pathlib import Path

import pytest


SCRIPTS_DIR = Path(__file__).resolve().parents[1] / "toolkit" / "fuyao" / "scripts"
sys.path.insert(0, str(SCRIPTS_DIR))

import fuyao as fuyao_cli  # noqa: E402
import fuyao_client  # noqa: E402


def test_a_share_valuations_snapshot_maps_and_normalizes_the_contract(monkeypatch):
    calls = []
    expected = {"timestamp": 1, "total": 2, "item": []}
    endpoint = "/api/a-share/valuations/snapshot"
    monkeypatch.setattr(
        fuyao_client,
        "_get",
        lambda actual_path, actual_params: calls.append((actual_path, actual_params))
        or expected,
    )

    assert fuyao_client.a_share_valuations_snapshot(
        [" 600519.sh", "000001.SZ", "600519.SH "]
    ) == expected
    assert calls == [
        (endpoint, {"thscodes": "600519.SH,000001.SZ"}),
    ]


@pytest.mark.parametrize(
    "thscodes,message",
    [
        ([], "non-empty"),
        (["600519.SH", ""], "A-share"),
        (["000300.TI"], "A-share"),
        (["600519.SH"] * 101, "at most 100 raw tokens"),
    ],
)
def test_a_share_valuations_snapshot_rejects_invalid_raw_tokens(
    monkeypatch, thscodes, message
):
    monkeypatch.setattr(
        fuyao_client,
        "_get",
        lambda *_args, **_kwargs: pytest.fail("HTTP must not be called"),
    )

    with pytest.raises(ValueError, match=message):
        fuyao_client.a_share_valuations_snapshot(thscodes)


def test_valuations_snapshot_cli_requires_and_forwards_thscodes(monkeypatch):
    calls = []
    monkeypatch.setattr(
        fuyao_cli,
        "a_share_valuations_snapshot",
        lambda thscodes: calls.append(thscodes) or {"item": []},
    )
    parser = fuyao_cli.build_parser()

    args = parser.parse_args(
        ["valuations-snapshot", "--thscodes", "600519.sh,000001.SZ"]
    )

    assert args.func(args) == {"item": []}
    assert calls == [["600519.sh", "000001.SZ"]]
    with pytest.raises(SystemExit):
        parser.parse_args(["valuations-snapshot"])
