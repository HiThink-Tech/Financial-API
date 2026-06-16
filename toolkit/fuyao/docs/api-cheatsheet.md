# Fuyao API Cheatsheet (9 capabilities)

Base URL: `https://fuyao.aicubes.cn`
Auth: `X-api-key: <token>` (REST) · `API_KEY` env var (MCP)
Response envelope: `{code, message, request_id, data}` — HTTP always 200, business errors via `code`.

Field conventions:
- `thscode` = ticker with exchange suffix, e.g. `600519.SH`. Pure 6-digit `600519` is NOT accepted.
- Timestamps are millisecond Unix (Asia/Shanghai timezone).
- Amounts are raw currency (CNY for A-share); `basic_eps` is per-share (do NOT scale).

---

## 1. `GET /api/meta/tickers/search`
- MCP tool: `get_meta_tickers_search`
- Required: `q` (string — thscode / ticker / 中英文名 substring).
- Optional: `exchange` ∈ {SH, SZ, BJ}, `asset_type` ∈ {a-share, a-share-index}, `limit` (≤50, default 10).
- Returns: `{timestamp, item: [TickerItem...]}` ranked by relevance.

## 2. `GET /api/meta/tickers/list`
- MCP tool: `get_meta_tickers_list`
- Optional: `exchange` (comma list, default `SH,SZ`), `asset_type` (default `a-share`), `limit` (≤10000, default 1000), `offset` (default 0).
- Pagination: loop offset += limit until `len(item) < limit`.
- Returns: `{timestamp, item: [TickerItem...]}`.

## 3. `GET /api/a-share/prices/snapshot`
- MCP tool: `get_a_share_prices_snapshot`
- Optional: `thscodes` (comma list — batch mode, ignores paging) OR (`limit` default 100, `offset` default 0 — full-market paged).
- Returns: `{timestamp, total, item: [PriceSnapshotItem...]}`.
- Snapshot does NOT return `name`; pair with `tickers/search` or `tickers/list` if needed.

## 4. `GET /api/a-share/prices/historical`
- MCP tool: `get_a_share_prices_historical`
- Required: `thscode` (single, no comma), `interval` (only `1d` supported), `start` (ms), `end` (ms).
- Optional: `adjust` ∈ {none, forward (default), backward}, `offset`.
- **HARD LIMIT**: `end - start` ≤ 10 years → otherwise `code=1003`. Split client-side.
- Returns: `{timestamp, item: [PriceBarItem...]}`.

## 5. `GET /api/a-share/corporate-actions/adjustment-factors`
- MCP tool: `get_a_share_corporate_actions_adjustment_factors`
- Required: `thscode` (single).
- Optional: `from` (`YYYY-MM-DD`), `to` (`YYYY-MM-DD`).
- Returns: `{thscode, ticker, item: [AdjustmentFactorItem...]}` sorted DESC by `ex_date_ms`.
- Event type is implicit (no `event_type` field): cash dividend iff `dividend_per_share > 0`; stock bonus iff `per_share_bonus > 0`.

## 6/7/8. `GET /api/a-share/financials/{income-statements | balance-sheets | cash-flow-statements}`
- MCP tools: `get_a_share_financials_{income_statements | balance_sheets | cash_flow_statements}`
- Required: `thscode` (single), `period` ∈ {annual, quarterly} (default `annual`).
- **MUTUALLY EXCLUSIVE** modes:
  - Recent N: omit `start`/`end`, optional `limit` (1–20, default 4).
  - Date range: `start` AND `end` (ms), window ≤ 10 years.
- Passing both `(start|end)` and `limit` → `code=1004`. Passing only one of `start`/`end` → `code=1004`.
- Returns: `{timestamp, item: [Item...]}` sorted DESC by `period_end_ms`.
- `null` field means "not disclosed in that period" — do NOT zero-fill.

## 9. `GET /api/a-share/calendar/trading-days`
- MCP tool: `get_a_share_calendar_trading_days`
- No input parameters.
- Window is fixed: `[today - 1 year, today]` (Asia/Shanghai).
- Returns: `{timestamp, item: [{date_ms, date "yyyyMMdd"}...]}` sorted ASC.

---

## Common pitfalls
- HTTP 200 + non-zero `code` is a business error. Check `code` first.
- Don't pass pure 6-digit codes — always include exchange suffix.
- For financials, choose ONE mode: recent-N (`limit`) OR date-range (`start`+`end`). Mixing returns `1004`.
- Historical K-line: split windows >10y on the client. `fuyao_client.prices_historical` handles this automatically.
- Snapshot full-market mode: loop pages until `len(item) < limit`.
