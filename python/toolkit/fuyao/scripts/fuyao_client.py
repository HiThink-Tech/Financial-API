"""hithink finance (fuyao.aicubes.cn) API client as typed functions.

Python adapter contract:
- Every capability is a top-level function with full type annotations.
- Parameter constraints (mutual exclusion, enum ranges, window limits) are enforced
  client-side and raise ValueError before any HTTP call.
- Long historical windows (>10 years) are auto-sliced and concatenated.
- Local ticker cache (TTL 12h) backs tickers_search to avoid network round-trips.
- Returns plain list[dict] / dict — no DataFrame dependency.
- API Key comes from the unified credential resolver; never accepted as a parameter.
- Business errors (code != 0) raise FuyaoApiError(code, message, request_id).

Upstream field semantics live in the repository's ``docs/api/`` contract and at
https://fuyao.aicubes.cn/llms-full.txt; do not reproduce them in docstrings here.
"""

from __future__ import annotations

import json
import re
import time
from dataclasses import dataclass
from datetime import date as Date, datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Literal, Optional

import requests

from marketdb.credentials import resolve_api_key

BASE_URL = "https://fuyao.aicubes.cn"
SKILL_ROOT = Path(__file__).resolve().parent.parent
TICKERS_CACHE_PATH = SKILL_ROOT / "docs" / "tickers-cache.json"
TICKERS_CACHE_TTL_SECONDS = 12 * 3600  # 12 hours — intraday, avoids overnight skew
TEN_YEARS_MS = int(10 * 365.25 * 86400 * 1000)
RETRY_CODES = {4001, 5001, 5002, 5003}
MAX_RETRIES = 3
RETRY_BASE_SECONDS = 1.0
DEFAULT_TIMEOUT_SECONDS = 30

AssetType = Literal[
    "a-share",
    "a-share-index",
    "forex",
    "fund-otc",
    "fund-etf",
    "fund-lof",
    "fund-reits",
]
FundType = Literal["otc", "exchange", "reits"]
FundRange = Literal[
    "week", "month", "tmonth", "hyear", "year", "twoyear", "tyear", "fyear"
]
FundNavType = Literal["unit", "adj", "unit,adj"]
FundHolderMergeScope = Literal["all", "merged", "separate"]

_ASSET_TYPES = {
    "a-share",
    "a-share-index",
    "forex",
    "fund-otc",
    "fund-etf",
    "fund-lof",
    "fund-reits",
}
_FUND_TYPES = {"otc", "exchange", "reits"}
_FUND_RANGES = {
    "week", "month", "tmonth", "hyear", "year", "twoyear", "tyear", "fyear"
}
_FUND_NAV_TYPES = {"unit", "adj", "unit,adj"}
_FUND_HOLDER_MERGE_SCOPES = {"all", "merged", "separate"}


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
    tok = resolve_api_key()
    if not tok:
        raise RuntimeError(
            "HITHINK_FINANCE_API_KEY or the user credential file is required. "
            "Create an API key at https://fuyao.aicubes.cn/admin. "
            "FUYAO_TOKEN and API_KEY remain legacy compatibility sources."
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


def _normalize_asset_type(
    asset_type: AssetType | str | Iterable[AssetType | str] | None,
) -> str | None:
    if asset_type is None:
        return None
    raw = asset_type.split(",") if isinstance(asset_type, str) else list(asset_type)
    normalized: list[str] = []
    for value in raw:
        token = value.strip().lower() if isinstance(value, str) else ""
        if not token or token not in _ASSET_TYPES:
            raise ValueError(f"asset_type contains unsupported value: {value!r}")
        if token not in normalized:
            normalized.append(token)
    return ",".join(normalized)


def _validate_fund_target(fund_type: str, thscode: str) -> tuple[str, str]:
    normalized_type = fund_type.strip().lower() if isinstance(fund_type, str) else ""
    if normalized_type not in _FUND_TYPES:
        raise ValueError(f"fund_type must be one of otc/exchange/reits; got {fund_type!r}")
    _validate_thscode(thscode)
    return normalized_type, thscode.strip().upper()


def _validate_exchange_fund_code(thscode: str) -> str:
    _validate_thscode(thscode)
    normalized = thscode.strip().upper()
    if not re.fullmatch(r"[0-9]{6}\.(SH|SZ)", normalized):
        raise ValueError("exchange-traded fund thscode must end in .SH or .SZ")
    return normalized


def _five_year_limit_ms(start_ms: int) -> int:
    start = datetime.fromtimestamp(start_ms / 1000, tz=timezone.utc)
    try:
        limit = start.replace(year=start.year + 5)
    except ValueError:
        limit = start.replace(year=start.year + 5, day=28)
    return int(limit.timestamp() * 1000)


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
        if asset_type and it.get("asset_type") not in asset_type.split(","):
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
    asset_type: AssetType | str | Iterable[AssetType | str] | None = None,
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
    normalized_asset_type = _normalize_asset_type(asset_type)
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
            hits = _local_search(items, q, exchange, normalized_asset_type, limit)
            if hits:
                return hits
            # Fall through to remote when cache misses on this query.
    data = _get(
        "/api/meta/tickers/search",
        {
            "q": q,
            "exchange": exchange,
            "asset_type": normalized_asset_type,
            "limit": limit,
        },
    )
    return data.get("item", [])


# ---------------------------------------------------------------------------
# 2. Tickers list (with paging + cache refresh)
# ---------------------------------------------------------------------------


def tickers_list(
    *,
    exchange: str = "SH,SZ",
    asset_type: AssetType | str | Iterable[AssetType | str] = "a-share",
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
    if offset < 0:
        raise ValueError("offset must be >= 0")
    normalized_asset_type = _normalize_asset_type(asset_type)
    if refresh_cache:
        fetch_all = True

    if not fetch_all:
        data = _get(
            "/api/meta/tickers/list",
            {
                "exchange": exchange,
                "asset_type": normalized_asset_type,
                "limit": limit,
                "offset": offset,
            },
        )
        return data.get("item", [])

    all_items: list[dict] = []
    cur_offset = offset
    while True:
        data = _get(
            "/api/meta/tickers/list",
            {
                "exchange": exchange,
                "asset_type": normalized_asset_type,
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
# 9. Financial indicators
# ---------------------------------------------------------------------------


_FINANCIAL_REPORT_PATTERN = re.compile(r"^[0-9]{4}-[1-4]$")


def financials_indicators(thscode: str, report: str) -> dict[str, Any]:
    """Aggregated financial indicators for one stock and report quarter."""
    _validate_thscode(thscode)
    if not isinstance(report, str) or not _FINANCIAL_REPORT_PATTERN.fullmatch(report):
        raise ValueError("report must match YYYY-[1-4] (e.g. '2025-1')")
    return _get(
        "/api/a-share/financials/indicators",
        {"thscode": thscode, "report": report},
    )


# ---------------------------------------------------------------------------
# 10. A-share valuation snapshot
# ---------------------------------------------------------------------------


_VALUATION_MAX_RAW_THSCODES = 100


def a_share_valuations_snapshot(
    thscodes: Iterable[str] | str,
) -> dict[str, Any]:
    """Return the current valuation snapshot for 1..100 raw A-share code tokens."""
    raw_codes = (
        thscodes.split(",") if isinstance(thscodes, str) else list(thscodes or [])
    )
    if not raw_codes:
        raise ValueError("thscodes must be non-empty")
    if len(raw_codes) > _VALUATION_MAX_RAW_THSCODES:
        raise ValueError("thscodes accepts at most 100 raw tokens")

    normalized: list[str] = []
    seen: set[str] = set()
    for raw in raw_codes:
        code = raw.strip().upper() if isinstance(raw, str) else ""
        if not _A_SHARE_THSCODE_PATTERN.fullmatch(code):
            raise ValueError(f"thscodes must contain valid A-share codes; got {raw!r}")
        if code not in seen:
            seen.add(code)
            normalized.append(code)

    return _get(
        "/api/a-share/valuations/snapshot",
        {"thscodes": ",".join(normalized)},
    )


# ---------------------------------------------------------------------------
# 11. Calendar
# ---------------------------------------------------------------------------


def calendar_trading_days() -> list[dict]:
    data = _get("/api/a-share/calendar/trading-days", {})
    return data.get("item", [])


# ---------------------------------------------------------------------------
# 11/12. A-share index — catalog & constituents
# ---------------------------------------------------------------------------


_THS_INDEX_TAGS = ("cn_concept", "region", "tszs", "industry")


def index_catalog_ths_index_list(
    tag: Literal["cn_concept", "region", "tszs", "industry"] = "cn_concept",
) -> list[dict]:
    """List 同花顺指数 (whole tag dump, no paging)."""
    if tag.lower() not in _THS_INDEX_TAGS:
        raise ValueError(f"tag must be one of {_THS_INDEX_TAGS}; got {tag!r}")
    data = _get(
        "/api/a-share-index/catalog/ths-index-list", {"tag": tag.lower()}
    )
    return data.get("item", [])


def index_constituents_ths_stock_list(thscode: str) -> list[dict]:
    """Current constituents of a single index (THS block or standard index like 000300.SH)."""
    _validate_thscode(thscode)
    data = _get(
        "/api/a-share-index/constituents/ths-stock-list", {"thscode": thscode}
    )
    return data.get("item", [])


# ---------------------------------------------------------------------------
# 13/14. A-share index — prices snapshot & historical
# ---------------------------------------------------------------------------


def index_prices_snapshot(thscodes: Iterable[str]) -> list[dict]:
    """Index snapshot — batch by thscodes ONLY. Empty input is rejected upstream
    (unlike a-share snapshot, there is no full-market mode for indices).
    """
    codes = list(thscodes) if thscodes is not None else []
    if not codes:
        raise ValueError("index_prices_snapshot requires non-empty thscodes")
    data = _get(
        "/api/a-share-index/prices/snapshot", {"thscodes": ",".join(codes)}
    )
    return data.get("item", [])


def index_prices_historical(
    thscode: str,
    start_ms: int,
    end_ms: int,
    *,
    interval: Literal["1d", "1w", "1mo"] = "1d",
) -> list[dict]:
    """Index historical K-line for a single thscode. Auto-slices >10y windows.

    Indices have no adjust / offset semantics; both are absent from the upstream contract.
    """
    _validate_thscode(thscode)
    if interval not in ("1d", "1w", "1mo"):
        raise ValueError(f"interval must be one of 1d/1w/1mo; got {interval!r}")
    if not isinstance(start_ms, int) or not isinstance(end_ms, int):
        raise ValueError("start_ms / end_ms must be int milliseconds")
    if end_ms < start_ms:
        raise ValueError("end_ms must be >= start_ms")

    slices: list[tuple[int, int]] = []
    cur = start_ms
    while cur < end_ms:
        nxt = min(cur + TEN_YEARS_MS, end_ms)
        slices.append((cur, nxt))
        cur = nxt + 1

    all_bars: list[dict] = []
    seen: set[int] = set()
    for s, e in slices:
        data = _get(
            "/api/a-share-index/prices/historical",
            {"thscode": thscode, "interval": interval, "start": s, "end": e},
        )
        for bar in data.get("item", []):
            d = bar.get("date_ms")
            if d in seen:
                continue
            seen.add(d)
            all_bars.append(bar)
    all_bars.sort(key=lambda b: b.get("date_ms", 0))
    return all_bars


# ---------------------------------------------------------------------------
# 15-21. Fund profile, performance, holders, and exchange market data
# ---------------------------------------------------------------------------


def _fund_detail(
    path: str, thscode: str, fund_type: FundType | str
) -> dict[str, Any]:
    normalized_type, normalized_code = _validate_fund_target(fund_type, thscode)
    return _get(path, {"fund_type": normalized_type, "thscode": normalized_code})


def fund_profile_detail(
    thscode: str, *, fund_type: FundType
) -> dict[str, Any]:
    """Fund profile for one explicitly typed fund target."""
    return _fund_detail("/api/fund/profile/detail", thscode, fund_type)


def fund_portfolio_holdings(
    thscode: str, *, fund_type: FundType
) -> dict[str, Any]:
    """Fund portfolio holdings for one explicitly typed target."""
    return _fund_detail("/api/fund/portfolio/holdings", thscode, fund_type)


def fund_performance_nav(
    thscode: str,
    *,
    fund_type: FundType,
    range: FundRange | None = None,
    nav_type: FundNavType = "unit,adj",
) -> dict[str, Any]:
    """Fund NAV; omit range for the latest point."""
    normalized_type, normalized_code = _validate_fund_target(fund_type, thscode)
    if range is not None and range not in _FUND_RANGES:
        raise ValueError(f"range must be one of {sorted(_FUND_RANGES)}; got {range!r}")
    if nav_type not in _FUND_NAV_TYPES:
        raise ValueError(
            f"nav_type must be one of unit/adj/unit,adj; got {nav_type!r}"
        )
    return _get(
        "/api/fund/performance/nav",
        {
            "fund_type": normalized_type,
            "thscode": normalized_code,
            "range": range,
            "nav_type": nav_type,
        },
    )


def fund_performance_returns(
    thscode: str, *, fund_type: FundType
) -> dict[str, Any]:
    """Fund interval-return summary for one explicitly typed target."""
    return _fund_detail("/api/fund/performance/returns", thscode, fund_type)


def fund_holders_detail(
    thscode: str,
    *,
    fund_type: FundType,
    merge_scope: FundHolderMergeScope | str = "all",
) -> dict[str, Any]:
    """Fund holder structure by merged, separate, or all disclosure scopes."""
    normalized_type, normalized_code = _validate_fund_target(fund_type, thscode)
    normalized_scope = (
        merge_scope.strip().lower() if isinstance(merge_scope, str) else ""
    )
    if normalized_scope not in _FUND_HOLDER_MERGE_SCOPES:
        raise ValueError(
            "merge_scope must be one of all/merged/separate; "
            f"got {merge_scope!r}"
        )
    return _get(
        "/api/fund/holders/detail",
        {
            "fund_type": normalized_type,
            "thscode": normalized_code,
            "merge_scope": normalized_scope,
        },
    )


def fund_market_snapshot(thscode: str) -> dict[str, Any]:
    """Market snapshot for one exchange-traded ETF/LOF target."""
    if isinstance(thscode, str) and "," in thscode:
        raise ValueError("single-thscode endpoint does not accept comma-separated input")
    normalized = _validate_exchange_fund_code(thscode)
    return _get("/api/fund/market/snapshot", {"thscode": normalized})


def fund_market_historical(
    thscode: str,
    start_ms: int,
    end_ms: int,
    *,
    interval: Literal["1d"] = "1d",
) -> dict[str, Any]:
    """Daily ETF price history for a single target and a maximum five-year window."""
    normalized = _validate_exchange_fund_code(thscode)
    if interval != "1d":
        raise ValueError("interval must be 1d")
    if not isinstance(start_ms, int) or not isinstance(end_ms, int):
        raise ValueError("start_ms / end_ms must be int milliseconds")
    if end_ms < start_ms:
        raise ValueError("end_ms must be >= start_ms")
    if end_ms > _five_year_limit_ms(start_ms):
        raise ValueError("fund history window must not exceed five years")
    return _get(
        "/api/fund/market/historical",
        {
            "thscode": normalized,
            "interval": interval,
            "start": start_ms,
            "end": end_ms,
        },
    )


# ---------------------------------------------------------------------------
# 22/23. Special data — limit-up pool & limit-up ladder
# ---------------------------------------------------------------------------


_LIMIT_UP_SORT_FIELDS = ("last_price", "continue_day_cnt", "seal_money", "limit_up_time")


def special_data_limit_up_pool(
    *,
    date_ms: int | None = None,
    page: int = 1,
    size: int = 50,
    sort_field: Literal[
        "last_price", "continue_day_cnt", "seal_money", "limit_up_time"
    ] = "last_price",
    sort_dir: Literal["asc", "desc"] = "desc",
) -> dict[str, Any]:
    """涨停股票池 — returns the full envelope {timestamp, pagination, item: [...]}.

    Pagination is exposed (size 1-200) so callers can drive their own loop.
    Omit date_ms to fall back to today (Asia/Shanghai).
    """
    if page < 1:
        raise ValueError("page must be >= 1")
    if not (1 <= size <= 200):
        raise ValueError("size must be in [1, 200]")
    if sort_field not in _LIMIT_UP_SORT_FIELDS:
        raise ValueError(
            f"sort_field must be one of {_LIMIT_UP_SORT_FIELDS}; got {sort_field!r}"
        )
    if sort_dir not in ("asc", "desc"):
        raise ValueError("sort_dir must be 'asc' or 'desc'")
    return _get(
        "/api/a-share/special-data/limit-up-pool",
        {
            "date_ms": date_ms,
            "page": page,
            "size": size,
            "sort_field": sort_field,
            "sort_dir": sort_dir,
        },
    )


def special_data_limit_up_ladder() -> dict[str, Any]:
    """连板天梯 — returns full envelope {timestamp, window, item: [...]}.

    No input params; upstream fixes the window at 30 trading days, board cap 4 each.
    """
    return _get("/api/a-share/special-data/limit-up-ladder", {})


# ---------------------------------------------------------------------------
# 17/18. Special data — same-day anomaly analysis
# ---------------------------------------------------------------------------


_ANOMALY_TAG_CODES = (
    "LIMIT_UP",
    "LIMIT_DOWN",
    "SHARP_RISE",
    "SHARP_FALL",
    "RAPID_RALLY",
    "RAPID_DECLINE",
)
_A_SHARE_THSCODE_PATTERN = re.compile(r"^[0-9]{6}\.(SH|SZ|BJ)$")
_ANOMALY_STOCK_MAX_THSCODES = 50


def special_data_anomaly_analysis_list(
    tag_codes: Iterable[str] | None = None,
) -> dict[str, Any]:
    """Same-day anomaly list; optional tags are combined with OR semantics."""
    raw_codes = [tag_codes] if isinstance(tag_codes, str) else list(tag_codes or [])
    normalized: list[str] = []
    seen: set[str] = set()
    for raw in raw_codes:
        code = raw.strip().upper() if isinstance(raw, str) else ""
        if not code:
            raise ValueError("tag_codes contains an empty token")
        if code not in _ANOMALY_TAG_CODES:
            raise ValueError(
                f"tag_codes must contain only {_ANOMALY_TAG_CODES}; got {raw!r}"
            )
        if code not in seen:
            seen.add(code)
            normalized.append(code)
    return _get(
        "/api/a-share/special-data/anomaly-analysis-list",
        {"tag_codes": ",".join(normalized) if normalized else None},
    )


def special_data_anomaly_analysis_stock(
    thscodes: Iterable[str],
) -> dict[str, Any]:
    """Same-day anomaly rows for 1..50 raw A-share thscode tokens."""
    raw_codes = [thscodes] if isinstance(thscodes, str) else list(thscodes or [])
    if not raw_codes:
        raise ValueError("thscodes must contain at least one code")
    if len(raw_codes) > _ANOMALY_STOCK_MAX_THSCODES:
        raise ValueError(
            f"thscodes count must not exceed {_ANOMALY_STOCK_MAX_THSCODES}"
        )

    normalized: list[str] = []
    seen: set[str] = set()
    for raw in raw_codes:
        code = raw.strip().upper() if isinstance(raw, str) else ""
        if not code:
            raise ValueError("thscodes contains an empty token")
        if not _A_SHARE_THSCODE_PATTERN.fullmatch(code):
            raise ValueError(f"Invalid thscode: {raw!r}")
        if code not in seen:
            seen.add(code)
            normalized.append(code)

    return _get(
        "/api/a-share/special-data/anomaly-analysis-stock",
        {"thscodes": ",".join(normalized)},
    )


# ---------------------------------------------------------------------------
# 19-23. Special data — hot lists, rank trend & dragon-tiger list
# ---------------------------------------------------------------------------


_HOT_LIST_PERIODS = ("day", "hour")
_DRAGON_TIGER_BOARD_TYPES = ("all", "org", "hot_money")


def _normalize_hot_list_period(period: str) -> str:
    normalized = period.strip().lower() if isinstance(period, str) else ""
    if normalized not in _HOT_LIST_PERIODS:
        raise ValueError(f"period must be one of {_HOT_LIST_PERIODS}; got {period!r}")
    return normalized


def _parse_iso_date(value: str, field_name: str) -> Date:
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        raise ValueError(f"{field_name} must use YYYY-MM-DD format")
    try:
        return Date.fromisoformat(value)
    except ValueError as exc:
        raise ValueError(f"{field_name} must be a valid calendar date") from exc


def _normalize_a_share_thscode(thscode: str) -> str:
    normalized = thscode.strip().upper() if isinstance(thscode, str) else ""
    if not _A_SHARE_THSCODE_PATTERN.fullmatch(normalized):
        raise ValueError(f"Invalid thscode: {thscode!r}")
    return normalized


def special_data_skyrocket_list(
    period: Literal["day", "hour"] = "day",
) -> dict[str, Any]:
    """Current skyrocket ranking for the day or hour period."""
    return _get(
        "/api/a-share/special-data/skyrocket-list",
        {"period": _normalize_hot_list_period(period)},
    )


def special_data_hot_stock_list(
    period: Literal["day", "hour"] = "day",
) -> dict[str, Any]:
    """Current hot-stock ranking for the day or hour period."""
    return _get(
        "/api/a-share/special-data/hot-stock-list",
        {"period": _normalize_hot_list_period(period)},
    )


def special_data_hot_stock_list_history(date: str) -> dict[str, Any]:
    """Historical hot-stock ranking for one date within the server's window."""
    _parse_iso_date(date, "date")
    return _get(
        "/api/a-share/special-data/hot-stock-list-history",
        {"date": date},
    )


def special_data_hot_stock_rank_trend(
    thscode: str,
    start_date: str,
    end_date: str,
) -> dict[str, Any]:
    """Daily hot-stock rank trend for one A-share code over at most one year."""
    normalized_thscode = _normalize_a_share_thscode(thscode)
    start = _parse_iso_date(start_date, "start_date")
    end = _parse_iso_date(end_date, "end_date")
    if start > end:
        raise ValueError("start_date must be before or equal to end_date")
    try:
        one_year_later = start.replace(year=start.year + 1)
    except ValueError:
        one_year_later = start.replace(year=start.year + 1, day=28)
    if end > one_year_later:
        raise ValueError("date range must not exceed one year")
    return _get(
        "/api/a-share/special-data/hot-stock-rank-trend",
        {
            "thscode": normalized_thscode,
            "start_date": start_date,
            "end_date": end_date,
        },
    )


def special_data_dragon_tiger_list(
    *,
    board_type: Literal["all", "org", "hot_money"] = "all",
    date: str | None = None,
) -> dict[str, Any]:
    """Dragon-tiger list, optionally filtered by board type and trade date."""
    normalized_board_type = (
        board_type.strip().lower() if isinstance(board_type, str) else ""
    )
    if normalized_board_type not in _DRAGON_TIGER_BOARD_TYPES:
        raise ValueError(
            f"board_type must be one of {_DRAGON_TIGER_BOARD_TYPES}; got {board_type!r}"
        )
    if date is not None:
        _parse_iso_date(date, "date")
    return _get(
        "/api/a-share/special-data/dragon-tiger-list",
        {"board_type": normalized_board_type, "date": date},
    )


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
    "financials_indicators",
    "a_share_valuations_snapshot",
    "calendar_trading_days",
    "index_catalog_ths_index_list",
    "index_constituents_ths_stock_list",
    "index_prices_snapshot",
    "index_prices_historical",
    "fund_profile_detail",
    "fund_portfolio_holdings",
    "fund_performance_nav",
    "fund_performance_returns",
    "fund_holders_detail",
    "fund_market_snapshot",
    "fund_market_historical",
    "special_data_limit_up_pool",
    "special_data_limit_up_ladder",
    "special_data_anomaly_analysis_list",
    "special_data_anomaly_analysis_stock",
    "special_data_skyrocket_list",
    "special_data_hot_stock_list",
    "special_data_hot_stock_list_history",
    "special_data_hot_stock_rank_trend",
    "special_data_dragon_tiger_list",
]
