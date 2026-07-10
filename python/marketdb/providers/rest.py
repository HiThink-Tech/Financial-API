from __future__ import annotations

import random
import time
from dataclasses import dataclass, field
from typing import Any, Iterator

import requests


class RestApiError(RuntimeError):
    """Raised when the API envelope returns a non-zero business code."""

    def __init__(self, code: int, message: str, request_id: str | None = None):
        super().__init__(f"code={code} message={message} request_id={request_id}")
        self.code = code
        self.message = message
        self.request_id = request_id


@dataclass
class RestProvider:
    base_url: str
    api_key: str
    timeout: float = 15.0
    max_retries: int = 3
    backoff_seconds: float = 1.5
    # Client-side rate limit: minimum gap between two outgoing requests.
    # 0.2s ≈ 5 QPS — safe default for the upstream A-share REST quota.
    min_interval_seconds: float = 0.2
    _last_request_at: float = field(default=0.0, init=False, repr=False)

    def _throttle(self) -> None:
        gap = time.monotonic() - self._last_request_at
        if gap < self.min_interval_seconds:
            time.sleep(self.min_interval_seconds - gap)

    def _sleep_with_jitter(self, base: float, retry_after: float | None = None) -> None:
        # Exponential-ish backoff (caller passes attempt-scaled base) plus
        # ±20% jitter so concurrent retries do not synchronize.
        delay = retry_after if retry_after is not None else base
        jitter = delay * 0.2 * (2 * random.random() - 1)
        time.sleep(max(0.0, delay + jitter))

    @staticmethod
    def _parse_retry_after(resp: requests.Response | None) -> float | None:
        if resp is None:
            return None
        raw = resp.headers.get("Retry-After")
        if not raw:
            return None
        try:
            return float(raw)
        except (TypeError, ValueError):
            return None

    def _request(self, path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        url = f"{self.base_url.rstrip('/')}{path}"
        headers = {"X-api-key": self.api_key, "Accept": "application/json"}
        last_error: Exception | None = None
        for attempt in range(1, self.max_retries + 1):
            self._throttle()
            resp: requests.Response | None = None
            try:
                resp = requests.get(url, params=params, headers=headers, timeout=self.timeout)
                self._last_request_at = time.monotonic()
                resp.raise_for_status()
                body = resp.json()
            except (requests.RequestException, ValueError) as exc:
                self._last_request_at = time.monotonic()
                last_error = exc
                if attempt == self.max_retries:
                    raise
                retry_after = self._parse_retry_after(getattr(exc, "response", None))
                self._sleep_with_jitter(self.backoff_seconds * attempt, retry_after)
                continue
            code = body.get("code", -1)
            if code != 0:
                # 4001 = rate limit, 5xx = upstream — retry; otherwise fail fast.
                if code in (4001, 5001, 5002, 5003) and attempt < self.max_retries:
                    self._sleep_with_jitter(
                        self.backoff_seconds * attempt,
                        self._parse_retry_after(resp),
                    )
                    continue
                raise RestApiError(code, body.get("message", ""), body.get("request_id"))
            return body.get("data") or {}
        raise RuntimeError(f"unreachable: {last_error!r}")

    # --- /api/meta/tickers/list with auto-pagination -----------------------
    def list_symbols(
        self,
        *,
        asset_type: str = "a-share",
        page_size: int = 1000,
    ) -> Iterator[dict[str, Any]]:
        offset = 0
        while True:
            data = self._request(
                "/api/meta/tickers/list",
                {
                    "asset_type": asset_type,
                    "limit": page_size,
                    "offset": offset,
                },
            )
            page = data.get("item") or []
            for row in page:
                yield row
            if len(page) < page_size:
                return
            offset += page_size

    # --- /api/a-share/calendar/trading-days --------------------------------
    def trading_days(self) -> list[dict[str, Any]]:
        data = self._request("/api/a-share/calendar/trading-days")
        return data.get("item") or []

    # --- /api/a-share/prices/historical (single thscode, ≤2y window) -------
    def historical(
        self,
        *,
        thscode: str,
        start_ms: int,
        end_ms: int,
        interval: str = "1d",
        adjust: str = "none",
    ) -> list[dict[str, Any]]:
        data = self._request(
            "/api/a-share/prices/historical",
            {
                "thscode": thscode,
                "interval": interval,
                "start": start_ms,
                "end": end_ms,
                "adjust": adjust,
            },
        )
        return data.get("item") or []

    # --- /api/a-share/corporate-actions/adjustment-factors ------------------
    def adjustment_events(
        self,
        *,
        thscode: str,
        date_from: str | None = None,
        date_to: str | None = None,
    ) -> list[dict[str, Any]]:
        params: dict[str, Any] = {"thscode": thscode}
        if date_from:
            params["from"] = date_from
        if date_to:
            params["to"] = date_to
        data = self._request("/api/a-share/corporate-actions/adjustment-factors", params)
        return data.get("item") or []
