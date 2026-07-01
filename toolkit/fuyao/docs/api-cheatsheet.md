# Fuyao API Cheatsheet (18 REST endpoints / 17 MCP tools)

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
- `GET /api/a-share/financials/income-statements`
- `GET /api/a-share/financials/balance-sheets`
- `GET /api/a-share/financials/cash-flow-statements`
- MCP tools: `get_a_share_financials_{income_statements | balance_sheets | cash_flow_statements}`
- Required: `thscode` (single), `period` ∈ {annual, quarterly} (default `annual`).
- **MUTUALLY EXCLUSIVE** modes:
  - Recent N: omit `start`/`end`, optional `limit` (1–20, default 4).
  - Date range: `start` AND `end` (ms), window ≤ 10 years.
- Passing both `(start|end)` and `limit` → `code=1004`. Passing only one of `start`/`end` → `code=1004`.
- Returns: `{timestamp, item: [Item...]}` sorted DESC by `period_end_ms`.
- `null` field means "not disclosed in that period" — do NOT zero-fill.

## 9. `GET /api/a-share/financials/indicators`
- MCP tool: `get_a_share_financials_indicators`
- Required: `thscode` (single), `report` matching `YYYY-[1-4]` (for example `2025-1`).
- Returns: `{thscode, report, abilities}`. `abilities` is always ordered as `growth`, `profitability`, `solvency`, `operation`, `cash-flow`; each block contains `indicators: [{index_id, value}...]`.
- `value` is a string; missing upstream values are returned as `null`, not `""` or `0`.

## 10. `GET /api/a-share/calendar/trading-days`
- MCP tool: `get_a_share_calendar_trading_days`
- No input parameters.
- Window is fixed: `[today - 1 year, today]` (Asia/Shanghai).
- Returns: `{timestamp, item: [{date_ms, date "yyyyMMdd"}...]}` sorted ASC.

## 11. `GET /api/a-share-index/catalog/ths-index-list`
- MCP tool: `get_a_share_index_catalog_ths_index_list`
- Optional: `tag` ∈ {cn_concept (default), region, tszs, industry}. Case-insensitive.
- Whole-tag dump (no paging).
- Returns: `{timestamp, item: [{thscode, name}...]}`. 指数维度不暴露纯 `ticker`。

## 12. `GET /api/a-share-index/constituents/ths-stock-list`
- MCP tool: `get_a_share_index_constituents_ths_stock_list`
- Required: `thscode` (single — `886042.TI` 同花顺板块 OR `000300.SH` 沪深 300 等标准指数). 不接受逗号。
- Returns: `{timestamp, item: [{thscode, ticker, name}...]}`.

## 13. `GET /api/a-share-index/prices/snapshot`
- MCP tool: `get_a_share_index_prices_snapshot`
- Required: `thscodes` (comma-list — index thscodes). **No full-market mode**; empty input is rejected.
- `limit` / `offset` exist for signature parity with a-share snapshot but have **no effect**.
- Returns: same `SnapshotData` shape as `/api/a-share/prices/snapshot`.

## 14. `GET /api/a-share-index/prices/historical`
- MCP tool: `get_a_share_index_prices_historical`
- Required: `thscode` (single, no comma), `interval` ∈ {1d (default), 1w, 1mo}, `start` (ms), `end` (ms).
- No `adjust`, no `offset` — indices don't have 复权 semantics; response `data.adjust` is always `null`.
- **HARD LIMIT**: `end - start` ≤ 10 years → otherwise `code=1003`. Client auto-slices.
- Returns: same `PriceBarItem` shape as a-share historical.

## 15. `GET /api/a-share/special-data/limit-up-pool`
- MCP tool: `get_a_share_special_data_limit_up_pool`
- Optional: `date_ms` (00:00 Asia/Shanghai; omit → server today), `page` ≥1 (default 1), `size` 1-200 (default 50), `sort_field` ∈ {last_price (default), continue_day_cnt, seal_money, limit_up_time}, `sort_dir` ∈ {asc, desc (default)}.
- Backend pool is fixed to all 连板 + `main,chinext,ssestar,north` 四类板块 — not configurable.
- Returns: `{timestamp, pagination:{total, pages, size, page}, item: [{thscode, ticker, name, is_st, is_new, last_price, price_change_ratio_pct, limit_up_time, limit_up_reason, continue_day_text, continue_day_cnt, seal_money, max_seal_money}...]}`.
- Errors: bad `sort_field` → `1002`; `page<1` or `size∉[1,200]` → `1003`.

## 16. `GET /api/a-share/special-data/limit-up-ladder`
- MCP tool: `get_a_share_special_data_limit_up_ladder`
- No input parameters.
- Returns 近 30 个交易日的连板矩阵：`{timestamp, window:{length, date_list, board_caps}, item: [{date, boards:{two_board, three_board, four_board, five_board, six_board, seven_over}}...]}`.
- Each `boards.*` is capped at 4 stocks; missing boards return `[]`.
- `boards.*[].seal_nextday` is `null` for the most recent trading day (no next-day reference).

## 17. `GET /api/a-share/special-data/anomaly-analysis-list`
- REST-only: no hosted MCP tool is registered for this endpoint.
- Optional: `tag_codes` comma list. Omit or pass blank for all same-day rows.
- Allowed tags: `LIMIT_UP`, `LIMIT_DOWN`, `SHARP_RISE`, `SHARP_FALL`, `RAPID_RALLY`, `RAPID_DECLINE`; case-insensitive, deduplicated, OR semantics.
- Empty tokens (consecutive/trailing comma) and unknown tags return `1002`.
- Returns current-day snapshot only: `{timestamp, item:[{stock_name, analysis_content, keyword_list, thscode, tag_name}...]}`. No historical query is available.

## 18. `GET /api/a-share/special-data/anomaly-analysis-stock`
- MCP tool: `get_a_share_special_data_anomaly_analysis_stock`.
- Required: `thscodes`, 1–50 raw comma-separated tokens. The limit is checked before deduplication.
- Code format: six digits + `.SH/.SZ/.BJ`; suffix is case-insensitive and normalized to uppercase; results are grouped in the deduplicated input order.
- Missing input returns `1001`; bad/empty tokens return `1002`; more than 50 raw tokens returns `1003`.
- Returns the same current-day `{timestamp, item}` shape and five public item fields as `anomaly-analysis-list`.

---

## Common pitfalls
- HTTP 200 + non-zero `code` is a business error. Check `code` first.
- Don't pass pure 6-digit codes — always include exchange suffix.
- For financials, choose ONE mode: recent-N (`limit`) OR date-range (`start`+`end`). Mixing returns `1004`.
- Historical K-line: split windows >10y on the client. `fuyao_client.prices_historical` / `index_prices_historical` handle this automatically.
- Snapshot full-market mode: loop pages until `len(item) < limit`. **Index snapshot has no full-market mode** — you must supply `thscodes`.
- Index endpoints have no `adjust` / no `offset`. Index thscode supports both THS suffixes (`.TI`) and standard exchange suffixes (`.SH` / `.SZ`).
- Limit-up pool defaults to today; pass `date_ms` for historical days. The pool is sorted by `last_price desc` by default — pass `--sort-field limit_up_time` for time-of-day ordering.
- Anomaly analysis is today-only. Do not treat `anomaly-analysis-list` as an MCP tool; only the stock endpoint is exposed through hosted MCP.
