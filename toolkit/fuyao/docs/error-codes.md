# Fuyao API Error Codes

All Fuyao API responses return HTTP 200. Business errors are signaled via the `code` field in the response envelope `{code, message, request_id, data}`. Treat any non-zero `code` as a failure.

| code | meaning | typical cause | client handling |
| --- | --- | --- | --- |
| `0` | success | — | proceed with `data` |
| `1001` | missing required param | `start`/`end`/`q`/`thscode` omitted | check function signature; raise `ValueError` before calling |
| `1002` | param format invalid | `exchange` not in {SH, SZ, BJ}; non-ms timestamp | normalize input client-side |
| `1003` | param out of range | `limit ≤ 0`; historical/financials window > 10 years | split window client-side (`fuyao_client.prices_historical` does this automatically) |
| `1004` | param conflict | financials mixing `start`/`end` with `limit`; half-open `start`/`end` | enforce mutual exclusion in client (`financials_*` does) |
| `2001` | unauthenticated | missing/invalid `X-api-key` | re-issue token at `/admin`; check `FUYAO_TOKEN` env var |
| `2003` | unauthorized | token lacks capability | contact admin for entitlement |
| `4001` | rate limited | exceeded QPS | exponential backoff with retry (client does up to 3 retries) |
| `5001` | internal error | server fault | retry with backoff; if persistent, report `request_id` |
| `5002` | upstream timeout | datasource slow | retry with backoff |
| `5003` | datasource unavailable | datasource degraded | retry later; report `request_id` upstream |

## Client-side mapping

`fuyao_client.FuyaoApiError` carries `(code, message, request_id)`. Caller can branch:

```python
from fuyao_client import FuyaoApiError, prices_historical

try:
    bars = prices_historical("600519.SH", start_ms, end_ms)
except FuyaoApiError as e:
    if e.code == 2001:
        # re-issue token
        ...
    elif e.code == 2003:
        # surface to user: capability not entitled
        ...
    else:
        raise
```

## What is auto-retried

The client wraps `requests` with exponential backoff (base 1s, max 3 attempts) for:
- `4001` (rate limited)
- `5001` / `5002` / `5003` (server-side)
- Network-level errors (`requests.ConnectionError`, `requests.Timeout`)

`1xxx` / `2xxx` errors are user-fixable and raised immediately without retry.

## Reporting bugs

When opening an issue against the data, always include `request_id` from the error — that's the upstream tracing key.
