from __future__ import annotations

from datetime import date, datetime, time, timedelta
from pathlib import Path
from unittest.mock import MagicMock
from zoneinfo import ZoneInfo

import pyarrow as pa
import pyarrow.parquet as pq
import pytest

from marketdb.providers.dump import DownloadKind, DownloadedDump
from marketdb.schema import get_meta
from marketdb.updaters.auto import (
    MAX_INCREMENTAL_LAG,
    apply_local_full,
    auto_sync,
    decide,
)


SHANGHAI = ZoneInfo("Asia/Shanghai")


def _day_ms(year: int, month: int, day: int) -> int:
    return int(datetime(year, month, day, 0, 0, 0, tzinfo=SHANGHAI).timestamp() * 1000)


def _calendar(start: date, *, days: int) -> list[date]:
    return [start + timedelta(days=i) for i in range(days)]


def _daily_parquet(path: Path, dates: list[date]) -> Path:
    table = pa.table({
        "thscode":     ["000001.SZ"] * len(dates),
        "currency":    ["CNY"] * len(dates),
        "interval":    ["1d"] * len(dates),
        "adjusted":    ["none"] * len(dates),
        "date_ms":     [_day_ms(d.year, d.month, d.day) for d in dates],
        "open_price":  [10.0] * len(dates),
        "high_price":  [10.5] * len(dates),
        "low_price":   [9.8] * len(dates),
        "close_price": [10.2] * len(dates),
        "volume":      [1_000_000.0] * len(dates),
        "turnover":    [10_200_000.0] * len(dates),
    })
    pq.write_table(table, path)
    return path


def _events_parquet(path: Path, dates: list[date]) -> Path:
    table = pa.table({
        "thscode":            ["000001.SZ"] * len(dates),
        "ticker":             ["000001"] * len(dates),
        "ex_date_ms":         [_day_ms(d.year, d.month, d.day) for d in dates],
        "dividend_per_share": [0.5] * len(dates),
        "per_share_bonus":    [0.0] * len(dates),
        "allotment_ratio":    [0.0] * len(dates),
        "allotment_price":    [0.0] * len(dates),
        "currency":           ["CNY"] * len(dates),
    })
    pq.write_table(table, path)
    return path


# ---- decide() --------------------------------------------------------------


def test_decide_full_when_empty(fresh_db) -> None:
    cal = _calendar(date(2026, 6, 1), days=20)
    d = decide(fresh_db, cal)
    assert d.mode == "full"
    assert d.local_max_date is None


def test_decide_incremental_within_threshold(fresh_db, tmp_path) -> None:
    cal = _calendar(date(2026, 6, 1), days=20)
    # Populate up to cal[-MAX_INCREMENTAL_LAG-1] so lag == MAX_INCREMENTAL_LAG.
    _daily_parquet(tmp_path / "x.parquet", cal[: -MAX_INCREMENTAL_LAG])
    from marketdb.importers.parquet import import_kline_daily_parquet
    import_kline_daily_parquet(fresh_db, tmp_path / "x.parquet", overwrite=True)
    d = decide(fresh_db, cal)
    assert d.mode == "incremental"
    assert d.lag_trading_days == MAX_INCREMENTAL_LAG


def test_decide_full_when_over_threshold(fresh_db, tmp_path) -> None:
    cal = _calendar(date(2026, 6, 1), days=20)
    _daily_parquet(tmp_path / "x.parquet", cal[: -MAX_INCREMENTAL_LAG - 2])
    from marketdb.importers.parquet import import_kline_daily_parquet
    import_kline_daily_parquet(fresh_db, tmp_path / "x.parquet", overwrite=True)
    d = decide(fresh_db, cal)
    assert d.mode == "full"
    assert d.lag_trading_days > MAX_INCREMENTAL_LAG


def test_decide_skip_when_up_to_date(fresh_db, tmp_path) -> None:
    cal = _calendar(date(2026, 6, 1), days=10)
    _daily_parquet(tmp_path / "x.parquet", cal)
    from marketdb.importers.parquet import import_kline_daily_parquet
    import_kline_daily_parquet(fresh_db, tmp_path / "x.parquet", overwrite=True)
    d = decide(fresh_db, cal)
    assert d.mode == "skip"
    assert d.lag_trading_days == 0


# ---- auto_sync() end-to-end with mocked downloader -------------------------


@pytest.fixture
def cal_days():
    return _calendar(date(2026, 6, 1), days=15)


def _fake_provider(cal_days: list[date]) -> MagicMock:
    provider = MagicMock()
    provider.trading_days.return_value = [
        {"date_ms": _day_ms(d.year, d.month, d.day)} for d in cal_days
    ]
    return provider


def _fake_downloader(tmp_path: Path, cal_days: list[date]) -> MagicMock:
    """Returns parquet files for each requested DownloadKind, with stable tags."""
    daily_full = _daily_parquet(tmp_path / "daily-k.parquet", cal_days)
    daily_incr = _daily_parquet(tmp_path / "daily-k-10d.parquet", cal_days[-10:])
    events = _events_parquet(tmp_path / "events.parquet", cal_days[:3])

    def _fetch(kind: DownloadKind) -> DownloadedDump:
        mapping = {
            DownloadKind.DAILY_K: (daily_full, "tag-full-1"),
            DownloadKind.DAILY_K_10D: (daily_incr, "tag-incr-1"),
            DownloadKind.ADJUSTMENT_FACTORS: (events, "tag-adj-1"),
        }
        path, tag = mapping[kind]
        # auto_sync deletes the file after applying; re-copy each fetch to
        # simulate a fresh download.
        if not path.is_file():
            if kind is DownloadKind.DAILY_K:
                _daily_parquet(path, cal_days)
            elif kind is DownloadKind.DAILY_K_10D:
                _daily_parquet(path, cal_days[-10:])
            else:
                _events_parquet(path, cal_days[:3])
        return DownloadedDump(
            path=path, kind=kind, release_tag=tag, release_key="key/" + kind.value,
            expires_at=None,
        )

    downloader = MagicMock()
    downloader.fetch.side_effect = _fetch
    return downloader


def test_auto_sync_full_on_empty_db(fresh_db, tmp_path, cal_days) -> None:
    downloader = _fake_downloader(tmp_path, cal_days)
    provider = _fake_provider(cal_days)
    res = auto_sync(fresh_db, downloader=downloader, provider=provider)
    assert res["mode"] == "full"
    assert res["kline_applied"] is True
    assert res["adjustment_applied"] is True
    assert get_meta(fresh_db, "last_full_kline_release_tag") == "tag-full-1"
    assert get_meta(fresh_db, "last_adjustment_release_tag") == "tag-adj-1"


def test_auto_sync_skip_still_refreshes_adjustment(fresh_db, tmp_path, cal_days) -> None:
    """At SKIP we don't re-apply K-line, but adjustment is still re-applied —
    upstream may have edited adjustment events in-place under the same dated
    filename, so trusting the release_tag would silently miss the change."""
    downloader = _fake_downloader(tmp_path, cal_days)
    provider = _fake_provider(cal_days)
    auto_sync(fresh_db, downloader=downloader, provider=provider)
    res2 = auto_sync(fresh_db, downloader=downloader, provider=provider)
    assert res2["mode"] == "skip"
    assert res2["kline_applied"] is False
    assert res2["adjustment_applied"] is True
    assert res2["skipped_by_release_tag"] == []


def test_auto_sync_full_reapplies_even_when_release_tag_matches(fresh_db, tmp_path, cal_days) -> None:
    """Regression: a FULL decision must re-apply the dump even if release_tag
    matches the last-applied tag — local rows may be missing (e.g. user pruned
    them), so the release_tag short-circuit only belongs on the SKIP path."""
    downloader = _fake_downloader(tmp_path, cal_days)
    provider = _fake_provider(cal_days)
    auto_sync(fresh_db, downloader=downloader, provider=provider)
    # Simulate a user-side prune that puts us back into FULL mode.
    fresh_db.execute("DELETE FROM raw_kline_daily WHERE date > ?", [cal_days[3]])
    res = auto_sync(fresh_db, downloader=downloader, provider=provider)
    assert res["mode"] == "full"
    assert res["kline_applied"] is True
    assert "daily-k" not in res["skipped_by_release_tag"]


def test_auto_sync_force_escalates_skip_to_full(fresh_db, tmp_path, cal_days) -> None:
    """--force on an up-to-date DB still triggers a full K-line re-apply."""
    downloader = _fake_downloader(tmp_path, cal_days)
    provider = _fake_provider(cal_days)
    auto_sync(fresh_db, downloader=downloader, provider=provider)
    res = auto_sync(fresh_db, downloader=downloader, provider=provider, force=True)
    assert res["mode"] == "full"
    assert res["kline_applied"] is True
    assert res["adjustment_applied"] is True


def test_auto_sync_cleans_cache_files_on_success(fresh_db, tmp_path, cal_days) -> None:
    downloader = _fake_downloader(tmp_path, cal_days)
    provider = _fake_provider(cal_days)
    auto_sync(fresh_db, downloader=downloader, provider=provider)
    assert not (tmp_path / "daily-k.parquet").exists()
    assert not (tmp_path / "events.parquet").exists()


def test_auto_sync_keep_cache_preserves_files(fresh_db, tmp_path, cal_days) -> None:
    downloader = _fake_downloader(tmp_path, cal_days)
    provider = _fake_provider(cal_days)
    auto_sync(fresh_db, downloader=downloader, provider=provider, keep_cache=True)
    assert (tmp_path / "daily-k.parquet").exists()
    assert (tmp_path / "events.parquet").exists()


# ---- local fallback ---------------------------------------------------------


def test_apply_local_full_writes_release_tag(fresh_db, tmp_path) -> None:
    cal = _calendar(date(2026, 6, 1), days=5)
    daily = _daily_parquet(tmp_path / "a_share_daily_k_1d_none_10y_20260605.parquet", cal)
    events = _events_parquet(tmp_path / "a_share_adjustment_factors_event_none_all_20260605.parquet", cal[:2])
    res = apply_local_full(fresh_db, daily_path=daily, events_path=events)
    assert res["mode"] == "full-local"
    assert get_meta(fresh_db, "last_full_kline_release_tag") == "local-20260605"
    assert get_meta(fresh_db, "last_adjustment_release_tag") == "local-20260605"
