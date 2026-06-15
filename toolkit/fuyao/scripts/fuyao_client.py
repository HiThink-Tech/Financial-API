"""Fuyao (fuyao.aicubes.cn) API client — 9 capabilities as typed functions.

Design contract (so AI tools can use this without re-reading llms-full.txt):
- Every capability is a top-level function with full type annotations.
- Parameter constraints (mutual exclusion, enum ranges, window limits) are enforced
  client-side and raise ValueError before any HTTP call.
- Long historical windows (>10 years) are auto-sliced and concatenated.
- Local ticker cache (TTL 12h) backs tickers_search to avoid network round-trips.
- Returns plain list[dict] / dict — no DataFrame dependency.
- Token comes from FUYAO_TOKEN env var only; never accepted as a parameter.
- Business errors (code != 0) raise FuyaoApiError(code, message, request_id).

Field semantics (thscode, period_end_ms, basic_eps unit, etc.) live in
docs/llms-full.txt — do not reproduce them in docstrings here.
"""

from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable, Literal, Optional

import requests

BASE_URL = "https://fuyao.aicubes.cn"
SKILL_ROOT = Path(__file__).resolve().parent.parent
TICKERS_CACHE_PATH = SKILL_ROOT / "docs" / "tickers-cache.json"
TICKERS_CACHE_TTL_SECONDS = 12 * 3600  # 12 hours — intraday, avoids overnight skew
TEN_YEARS_MS = int(10 * 365.25 * 86400 * 1000)
RETRY_CODES = {4001, 5001, 5002, 5003}
MAX_RETRIES = 3
RETRY_BASE_SECONDS = 1.0
DEFAULT_TIMEOUT_SECONDS = 30


# ---------------------------------------------------------------------------
# Errors / session
# ---------------------------------------------------------------------------


class FuyaoApiError(RuntimeError):
    """Raised when the Fuyao API returns a non-zero business code."""

    def __init__(self, code: int, message: str, request_id: str | None = None):
        super().__init__(f"[fuyao code={code}] {message} (request_id={request_id})")
        self.code = code
        self.message = message
        self.request_id = request_id


@dataclass
class _ClientConfig:
    base_url: str = BASE_URL
    timeout: int = DEFAULT_TIMEOUT_SECONDS
    session: Optional[requests.Session] = None


_default_config = _ClientConfig()


def _session() -> requests.Session:
    if _default_config.session is None:
        _default_config.session = requests.Session()
    return _default_config.session


def _token() -> str:
    tok = os.environ.get("FUYAO_TOKEN") or os.environ.get("API_KEY")
    if not tok:
        raise RuntimeError(
            "FUYAO_TOKEN (or API_KEY) env var is required. "
            "Issue a token at https://fuyao.aicubes.cn/admin and export it."
        )
    return tok


def _get(path: str, params: dict[str, Any]) -> dict[str, Any]:
    """Low-level GET with retry on RETRY_CODES / network errors. Returns the
    response envelope `data` payload; raises FuyaoApiError on business failure.
    """
    url = f"{_default_config.base_url}{path}"
    clean_params = {k: v for k, v in params.items() if v is not None}
    headers = {"X-api-key": _token()}
    last_exc: Optional[Exception] = None
    for attempt in range(MAX_RETRIES):
        try:
            resp = _session().get(
                url,
                params=clean_params,
                headers=headers,
                timeout=_default_config.timeout,
            )
            resp.raise_for_status()
            payload = resp.json()
        except (requests.ConnectionError, requests.Timeout) as exc:
            last_exc = exc
            time.sleep(RETRY_BASE_SECONDS * (2**attempt))
            continue
        code = payload.get("code", -1)
        if code == 0:
            return payload.get("data") or {}
        if code in RETRY_CODES and attempt < MAX_RETRIES - 1:
            time.sleep(RETRY_BASE_SECONDS * (2**attempt))
            continue
        raise FuyaoApiError(
            code=code,
            message=payload.get("message", ""),
            request_id=payload.get("request_id"),
        )
    if last_exc:
        raise last_exc
    raise RuntimeError("unreachable")


# ---------------------------------------------------------------------------
# Validation helpers
# ---------------------------------------------------------------------------


def _validate_thscode(thscode: str) -> None:
    if not isinstance(thscode, str) or "." not in thscode:
        raise ValueError(
            f"thscode must include exchange suffix (e.g. '600519.SH'); got {thscode!r}"
        )
    if "," in thscode:
        raise ValueError("single-thscode endpoint does not accept comma-separated input")


def _validate_period(period: str) -> None:
    if period not in ("annual", "quarterly"):
        raise ValueError(f"period must be 'annual' or 'quarterly'; got {period!r}")


def _validate_adjust(adjust: str) -> None:
    if adjust not in ("none", "forward", "backward"):
        raise ValueError(f"adjust must be one of none/forward/backward; got {adjust!r}")


def _validate_recent_or_range(
    limit: int | None, start_ms: int | None, end_ms: int | None
) -> tuple[str, dict[str, Any]]:
    """Returns ('recent', {'limit': N}) or ('range', {'start': ms, 'end': ms})."""
    has_range = (start_ms is not None) or (end_ms is not None)
    has_limit = limit is not None
    if has_range and has_limit:
        raise ValueError(
            "financials: limit and (start_ms, end_ms) are mutually exclusive"
        )
    if has_range and (start_ms is None or end_ms is None):
        raise ValueError("financials: start_ms and end_ms must be provided together")
    if has_range:
        if end_ms < start_ms:  # type: ignore[operator]
            raise ValueError("financials: end_ms must be >= start_ms")
        if end_ms - start_ms > TEN_YEARS_MS:  # type: ignore[operator]
            raise ValueError("financials: window must be <= 10 years")
        return "range", {"start": start_ms, "end": end_ms}
    if has_limit:
        if not (1 <= limit <= 20):  # type: ignore[operator]
            raise ValueError("financials: limit must be in [1, 20]")
        return "recent", {"limit": limit}
    return "recent", {}


# ---------------------------------------------------------------------------
# 1. Tickers search (with local cache)
# ---------------------------------------------------------------------------


def _load_cache() -> tuple[list[dict] | None, float | None]:
    if not TICKERS_CACHE_PATH.exists():
        return None, None
    try:
        blob = json.loads(TICKERS_CACHE_PATH.read_text(encoding="utf-8"))
        return blob.get("item", []), float(blob.get("cached_at", 0))
    except (json.JSONDecodeError, OSError):
        return None, None


def _write_cache(items: list[dict]) -> None:
    TICKERS_CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    blob = {"cached_at": time.time(), "item": items}
    TICKERS_CACHE_PATH.write_text(
        json.dumps(blob, ensure_ascii=False), encoding="utf-8"
    )


def _cache_is_fresh(cached_at: float | None) -> bool:
    if not cached_at:
        return False
    return (time.time() - cached_at) < TICKERS_CACHE_TTL_SECONDS


def _local_search(
    items: list[dict],
    q: str,
    exchange: str | None,
    asset_type: str | None,
    limit: int,
) -> list[dict]:
    q_lower = q.lower()
    out: list[dict] = []
    for it in items:
        if exchange and it.get("exchange") != exchange:
            continue
        if asset_type and it.get("asset_type") != asset_type:
            continue
        haystack = " ".join(
            str(it.get(k) or "") for k in ("thscode", "ticker", "name")
        ).lower()
        if q_lower in haystack:
            out.append(it)
            if len(out) >= limit:
                break
    return out


def tickers_search(
    q: str,
    *,
    exchange: Literal["SH", "SZ", "BJ"] | None = None,
    asset_type: Literal["a-share", "a-share-index"] | None = None,
    limit: int = 10,
    use_cache: bool = True,
    remote: bool = False,
) -> list[dict]:
    """Resolve a name/ticker/thscode fragment into TickerItem list.

    Defaults to local cache (TTL 12h, written by tickers_list(refresh_cache=True)).
    If cache is missing/stale or `remote=True`, queries the upstream search endpoint.
    """
    if not q:
        raise ValueError("q is required")
    if limit < 1 or limit > 50:
        raise ValueError("limit must be in [1, 50]")
    if not remote and use_cache:
        items, cached_at = _load_cache()
        if items is not None:
            if not _cache_is_fresh(cached_at):
                import sys

                print(
                    f"[fuyao] warn: tickers cache stale (>{TICKERS_CACHE_TTL_SECONDS//3600}h); "
                    "run `fuyao.py tickers-list --refresh-cache` to refresh",
                    file=sys.stderr,
                )
            hits = _local_search(items, q, exchange, asset_type, limit)
            if hits:
                return hits
            # Fall through to remote when cache misses on this query.
    data = _get(
        "/api/meta/tickers/search",
        {"q": q, "exchange": exchange, "asset_type": asset_type, "limit": limit},
    )
    return data.get("item", [])


# ---------------------------------------------------------------------------
# 2. Tickers list (with paging + cache refresh)
# ---------------------------------------------------------------------------


def tickers_list(
    *,
    exchange: str = "SH,SZ",
    asset_type: Literal["a-share", "a-share-index"] = "a-share",
    limit: int = 1000,
    offset: int = 0,
    fetch_all: bool = False,
    refresh_cache: bool = False,
) -> list[dict]:
    """List tickers. With `fetch_all=True`, loops offset until exhausted.

    When `refresh_cache=True`, implies `fetch_all=True` and writes
    docs/tickers-cache.json for tickers_search to consume.
    """
    if limit < 1 or limit > 10000:
        raise ValueError("limit must be in [1, 10000]")
    if refresh_cache:
        fetch_all = True

    if not fetch_all:
        data = _get(
            "/api/meta/tickers/list",
            {"exchange": exchange, "asset_type": asset_type, "limit": limit, "offset": offset},
        )
        return data.get("item", [])

    all_items: list[dict] = []
    cur_offset = offset
    while True:
        data = _get(
            "/api/meta/tickers/list",
            {
                "exchange": exchange,
                "asset_type": asset_type,
                "limit": limit,
                "offset": cur_offset,
            },
        )
        items = data.get("item", [])
        all_items.extend(items)
        if len(items) < limit:
            break
        cur_offset += limit

    if refresh_cache:
        _write_cache(all_items)
    return all_items


# ---------------------------------------------------------------------------
# 3. Prices snapshot
# ---------------------------------------------------------------------------


def prices_snapshot(
    thscodes: Iterable[str] | None = None,
    *,
    fetch_all_market: bool = False,
    limit: int = 100,
    offset: int = 0,
) -> list[dict]:
    """Snapshot prices. Three modes:

    - thscodes given: batch by codes (no paging).
    - fetch_all_market=True: page through entire A-share universe until exhausted.
    - neither: single page (default limit=100).
    """
    if thscodes is not None and fetch_all_market:
        raise ValueError("pass either thscodes or fetch_all_market, not both")

    if thscodes is not None:
        joined = ",".join(thscodes)
        data = _get("/api/a-share/prices/snapshot", {"thscodes": joined})
        return data.get("item", [])

    if not fetch_all_market:
        data = _get(
            "/api/a-share/prices/snapshot", {"limit": limit, "offset": offset}
        )
        return data.get("item", [])

    if limit < 1 or limit > 10000:
        raise ValueError("limit must be in [1, 10000]")
    all_items: list[dict] = []
    cur = offset
    while True:
        data = _get(
            "/api/a-share/prices/snapshot", {"limit": limit, "offset": cur}
        )
        items = data.get("item", [])
        all_items.extend(items)
        if len(items) < limit:
            break
        cur += limit
    return all_items


# ---------------------------------------------------------------------------
# 4. Prices historical (with auto-slicing for >10y windows)
# ---------------------------------------------------------------------------


def prices_historical(
    thscode: str,
    start_ms: int,
    end_ms: int,
    *,
    interval: Literal["1d"] = "1d",
    adjust: Literal["none", "forward", "backward"] = "forward",
) -> list[dict]:
    """Daily K-line for a single thscode. Windows > 10 years are auto-sliced
    and concatenated in chronological order, transparently to the caller.
    """
    _validate_thscode(thscode)
    _validate_adjust(adjust)
    if interval != "1d":
        raise ValueError("interval: only '1d' is supported currently")
    if not isinstance(start_ms, int) or not isinstance(end_ms, int):
        raise ValueError("start_ms / end_ms must be int milliseconds")
    if end_ms < start_ms:
        raise ValueError("end_ms must be >= start_ms")

    slices: list[tuple[int, int]] = []
    cur_start = start_ms
    while cur_start < end_ms:
        cur_end = min(cur_start + TEN_YEARS_MS, end_ms)
        slices.append((cur_start, cur_end))
        cur_start = cur_end + 1

    all_bars: list[dict] = []
    seen_dates: set[int] = set()
    for s, e in slices:
        data = _get(
            "/api/a-share/prices/historical",
            {
                "thscode": thscode,
                "interval": interval,
                "start": s,
                "end": e,
                "adjust": adjust,
            },
        )
        for bar in data.get("item", []):
            d = bar.get("date_ms")
            if d in seen_dates:
                continue
            seen_dates.add(d)
            all_bars.append(bar)
    all_bars.sort(key=lambda b: b.get("date_ms", 0))
    return all_bars


# ---------------------------------------------------------------------------
# 5. Corporate actions (adjustment factors)
# ---------------------------------------------------------------------------


def corp_actions_adjustment_factors(
    thscode: str,
    *,
    from_date: str | None = None,
    to_date: str | None = None,
) -> dict[str, Any]:
    """Returns the full envelope {thscode, ticker, item: [...]}."""
    _validate_thscode(thscode)
    return _get(
        "/api/a-share/corporate-actions/adjustment-factors",
        {"thscode": thscode, "from": from_date, "to": to_date},
    )


# ---------------------------------------------------------------------------
# 6/7/8. Financials (income / balance / cash-flow)
# ---------------------------------------------------------------------------


def _financials(
    endpoint: str,
    thscode: str,
    period: str,
    limit: int | None,
    start_ms: int | None,
    end_ms: int | None,
) -> list[dict]:
    _validate_thscode(thscode)
    _validate_period(period)
    _, mode_params = _validate_recent_or_range(limit, start_ms, end_ms)
    data = _get(
        endpoint,
        {"thscode": thscode, "period": period, **mode_params},
    )
    return data.get("item", [])


def financials_income_statements(
    thscode: str,
    *,
    period: Literal["annual", "quarterly"] = "annual",
    limit: int | None = None,
    start_ms: int | None = None,
    end_ms: int | None = None,
) -> list[dict]:
    """Modes are mutually exclusive: (limit) XOR (start_ms+end_ms)."""
    return _financials(
        "/api/a-share/financials/income-statements",
        thscode,
        period,
        limit,
        start_ms,
        end_ms,
    )


def financials_balance_sheets(
    thscode: str,
    *,
    period: Literal["annual", "quarterly"] = "annual",
    limit: int | None = None,
    start_ms: int | None = None,
    end_ms: int | None = None,
) -> list[dict]:
    return _financials(
        "/api/a-share/financials/balance-sheets",
        thscode,
        period,
        limit,
        start_ms,
        end_ms,
    )


def financials_cash_flow_statements(
    thscode: str,
    *,
    period: Literal["annual", "quarterly"] = "annual",
    limit: int | None = None,
    start_ms: int | None = None,
    end_ms: int | None = None,
) -> list[dict]:
    return _financials(
        "/api/a-share/financials/cash-flow-statements",
        thscode,
        period,
        limit,
        start_ms,
        end_ms,
    )


# ---------------------------------------------------------------------------
# 9. Calendar
# ---------------------------------------------------------------------------


def calendar_trading_days() -> list[dict]:
    data = _get("/api/a-share/calendar/trading-days", {})
    return data.get("item", [])


__all__ = [
    "FuyaoApiError",
    "tickers_search",
    "tickers_list",
    "prices_snapshot",
    "prices_historical",
    "corp_actions_adjustment_factors",
    "financials_income_statements",
    "financials_balance_sheets",
    "financials_cash_flow_statements",
    "calendar_trading_days",
]
