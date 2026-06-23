# toolkit/fuyao

A tool-agnostic toolkit for calling the **同花顺金融数据 API (fuyao.aicubes.cn)** — a structured A-share financial data service offering 15 capabilities over REST + MCP. **Use this for remote / live data (snapshots, financials, ticker catalog, indices, 涨跌停). For local historical OHLCV go to [`../marketdb/`](../marketdb/README.md).**

This folder is **the entry point for the remote API** for any human or AI agent (Claude Code, Codex, Cursor, ChatGPT, scripts in CI, Jupyter, …). It contains:

- `scripts/fuyao_client.py` — typed Python functions; every API contract (required params, mutual exclusion, enums, 10-year window, error codes) is encoded in the function signature.
- `scripts/fuyao.py` — argparse CLI wrapping the client; JSON-only stdout.
- `docs/` — protocol reference (`llms.txt`, `llms-full.txt`), endpoint cheatsheet, error codes, MCP config snippets.

**There is no auto-trigger glue file** (no SKILL.md / AGENTS.md / .cursorrules). Use one of the integration patterns below.

---

## When to use this

Trigger keywords (for AI agents reading this file in-context):

- 同花顺金融数据 API / fuyao.aicubes.cn
- A股 / thscode / 贵州茅台 类的代码、涨跌幅、行情快照、历史 K 线、复权事件
- 利润表 / 资产负债表 / 现金流量表 / 财报 / 营收 / 净利润
- A 股代码表、交易日历
- 同花顺指数 / 概念板块 / 行业指数 / 沪深 300 等指数的列表、成分股、行情快照、历史 K 线
- 涨停股票池 / 连板天梯 / 涨跌停盘面复盘 / 短线情绪分析
- 量化、回测、对账类脚本要拉 A 股结构化数据

Do **not** trigger for: 宏观经济、海外行情、个股新闻 / 公告原文 / 研报。

## Auth (mandatory before any call)

Sign a token at https://fuyao.aicubes.cn/admin, then export it. **Never** paste the token into prompts, code, or git commits.

```bash
export FUYAO_TOKEN="<your-token>"       # preferred
# or:  export API_KEY="<your-token>"    # MCP compatibility
```

The client/CLI reads the token from env only. It is never logged, never returned, never accepted as a parameter.

---

## Integration patterns

### Pattern A — Python function library (preferred when caller can run Python)

```python
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent  # adjust to your script's relation to repo root
sys.path.insert(0, str(REPO_ROOT / "toolkit/fuyao/scripts"))

from fuyao_client import (
    tickers_search, tickers_list,
    prices_snapshot, prices_historical,
    corp_actions_adjustment_factors,
    financials_income_statements,
    financials_balance_sheets,
    financials_cash_flow_statements,
    calendar_trading_days,
    index_catalog_ths_index_list,
    index_constituents_ths_stock_list,
    index_prices_snapshot, index_prices_historical,
    special_data_limit_up_pool, special_data_limit_up_ladder,
    FuyaoApiError,
)

# Name → thscode (default goes through 12h local cache)
hit = tickers_search("贵州茅台", limit=1)[0]

# Long window — auto-sliced on the client (no need to chunk yourself)
import datetime as dt
start = int(dt.datetime(2015, 1, 1).timestamp() * 1000)
end   = int(dt.datetime(2025, 1, 1).timestamp() * 1000)
bars = prices_historical(hit["thscode"], start_ms=start, end_ms=end, adjust="forward")

# Financials: two mutually exclusive modes — pick one
recent = financials_income_statements(hit["thscode"], period="annual", limit=5)
ranged = financials_income_statements(
    hit["thscode"], period="quarterly",
    start_ms=1672502400000, end_ms=1735574400000,
)

try:
    financials_income_statements(hit["thscode"], limit=4, start_ms=1, end_ms=2)
except ValueError as e:
    print("rejected client-side:", e)
```

The function signatures (and only the signatures) are the source of truth — see `scripts/fuyao_client.py`. Field-level details (units, snake_case keys, null semantics) live in `docs/llms-full.txt`.

### Pattern B — CLI (preferred for shell / CI / non-Python harnesses)

```bash
# Resolve a name (uses local cache by default; warns if cache stale)
python3 toolkit/fuyao/scripts/fuyao.py tickers-search --q "贵州茅台"

# Warm the local cache (writes toolkit/fuyao/docs/tickers-cache.json, TTL 12h)
python3 toolkit/fuyao/scripts/fuyao.py tickers-list --refresh-cache > /tmp/tickers.json

# Full-market snapshot — page through everything, dump to disk
python3 toolkit/fuyao/scripts/fuyao.py prices-snapshot --all-market > /tmp/snapshot.json

# Long-window historical (10y slicing handled internally)
python3 toolkit/fuyao/scripts/fuyao.py prices-historical \
    --thscode 600519.SH \
    --start-ms 1262275200000 --end-ms 1735660800000 \
    --adjust forward > /tmp/600519.json

# Multi-ticker serial pull (one thscode per line in file)
python3 toolkit/fuyao/scripts/fuyao.py prices-historical \
    --thscodes-file /tmp/watchlist.txt \
    --start-ms 1704038400000 --end-ms 1735660800000 \
    > /tmp/watchlist.json

# Financials — recent N
python3 toolkit/fuyao/scripts/fuyao.py financials-income --thscode 600519.SH --limit 4

# Financials — date range (mutually exclusive with --limit)
python3 toolkit/fuyao/scripts/fuyao.py financials-balance \
    --thscode 000858.SZ --period quarterly \
    --start-ms 1672502400000 --end-ms 1735574400000

# Corporate actions / calendar
python3 toolkit/fuyao/scripts/fuyao.py corp-actions --thscode 600519.SH
python3 toolkit/fuyao/scripts/fuyao.py calendar-trading-days

# 指数 — 列表 / 成分股 / 快照 / 历史 K
python3 toolkit/fuyao/scripts/fuyao.py index-catalog --tag cn_concept
python3 toolkit/fuyao/scripts/fuyao.py index-constituents --thscode 000300.SH
python3 toolkit/fuyao/scripts/fuyao.py index-snapshot --thscodes 000001.SH,399001.SZ,886042.TI
python3 toolkit/fuyao/scripts/fuyao.py index-historical \
    --thscode 000001.SH \
    --start-ms 1716105600000 --end-ms 1747641600000

# 涨跌停 — 涨停股票池（按日，分页+排序）/ 连板天梯（近 30 日 × 6 板位矩阵）
python3 toolkit/fuyao/scripts/fuyao.py limit-up-pool \
    --page 1 --size 50 --sort-field limit_up_time --sort-dir desc > /tmp/limit-up.json
python3 toolkit/fuyao/scripts/fuyao.py limit-up-ladder > /tmp/ladder.json
```

CLI emits JSON to stdout only (default `indent=2`, `--compact` for one-line). Persisting / format conversion is the caller's responsibility — there's intentionally **no** built-in csv / parquet writer. Convert outside:

```bash
python3 -c "import json,pandas as pd; \
  pd.DataFrame(json.load(open('/tmp/snapshot.json'))).to_parquet('/tmp/snapshot.parquet')"
```

Exit codes: `0` success · `2` `FuyaoApiError` (business code != 0) · `3` `ValueError` (rejected client-side) · `4` `RuntimeError` (e.g. missing token).

### Pattern C — Hosted MCP (no code; in-conversation)

Configure your MCP client (Claude Desktop / Cursor / Windsurf) to point at the API's hosted endpoints. Snippets in `docs/mcp-config.md`. This bypasses `scripts/` entirely and is the lightest integration for interactive use.

---

## Capability matrix (15 endpoints)

| Function | CLI subcommand | Notes |
| --- | --- | --- |
| `tickers_search` | `tickers-search` | Local cache by default; pass `--remote` to bypass |
| `tickers_list` | `tickers-list` | `--all` paginates to exhaustion; `--refresh-cache` writes local cache |
| `prices_snapshot` | `prices-snapshot` | Three modes: batch by codes / full-market paged / single-page |
| `prices_historical` | `prices-historical` | Single thscode; windows >10y auto-sliced+deduped+sorted |
| `corp_actions_adjustment_factors` | `corp-actions` | Event type is implicit (look at `dividend_per_share` / `per_share_bonus`) |
| `financials_income_statements` | `financials-income` | `limit` XOR `(start_ms, end_ms)` — enforced client-side |
| `financials_balance_sheets` | `financials-balance` | same modes |
| `financials_cash_flow_statements` | `financials-cashflow` | same modes |
| `calendar_trading_days` | `calendar-trading-days` | No input; fixed `[today−1y, today]` |
| `index_catalog_ths_index_list` | `index-catalog` | THS 指数清单；`tag` ∈ {cn_concept, region, tszs, industry}，单 tag 全量返回 |
| `index_constituents_ths_stock_list` | `index-constituents` | 单只指数当前成分股；同时支持 THS 板块（`886042.TI`）和标准指数（`000300.SH`） |
| `index_prices_snapshot` | `index-snapshot` | 指数快照；**只支持 batch by thscodes**，不支持全市场分页 |
| `index_prices_historical` | `index-historical` | 指数历史 K 线；**无 adjust / offset**；窗口 >10y 自动切片去重 |
| `special_data_limit_up_pool` | `limit-up-pool` | 涨停股票池；`size` 1-200，`sort_field` ∈ {last_price, continue_day_cnt, seal_money, limit_up_time}；省略 `date_ms` 取当日 |
| `special_data_limit_up_ladder` | `limit-up-ladder` | 连板天梯；无入参，固定返回近 30 个交易日 × 6 板位矩阵 |

Full per-endpoint contract: [`docs/api-cheatsheet.md`](docs/api-cheatsheet.md).
Full field semantics: [`docs/llms-full.txt`](docs/llms-full.txt).

## Error model

- Business errors → `FuyaoApiError(code, message, request_id)` (CLI exit 2).
- Input rejected client-side → `ValueError` (CLI exit 3).
- Auto-retried with exponential backoff (3 attempts): `code in {4001, 5001, 5002, 5003}` + network errors.
- `1xxx` / `2xxx` never retried — they need the caller to fix input / token.

Full handling table: [`docs/error-codes.md`](docs/error-codes.md).

## Big-data discipline (important for AI agents)

Do **not** push paginated / full-market / multi-year / multi-ticker results back into the conversation context. The flow is:

```
1) call CLI/function → redirect stdout to /tmp/<x>.json
2) report row count + file path back to the conversation
3) downstream consumers (notebooks, marketdb, pandas) read the file
```

Concretely:

```bash
python3 toolkit/fuyao/scripts/fuyao.py tickers-list --all > /tmp/all-tickers.json
jq length /tmp/all-tickers.json    # 5000+; report this number, not the contents
```

The CLI deliberately **does not** embed pandas/pyarrow to keep deps light (`requests` is the only hard dep). Conversion to parquet/csv is one line of pandas in user code.

## Required Python dependency

```bash
pip install requests   # only hard dep
# Optional for downstream conversion / analysis:
pip install pandas pyarrow
```

## How to wire this into specific AI tools

Each tool has a different auto-loading convention. Since this skill keeps the framework-agnostic core only, you wire it up per tool yourself:

| Tool | How to surface this skill |
| --- | --- |
| Claude Code | In conversation: "use `toolkit/fuyao/` for remote API queries — start by reading `toolkit/fuyao/README.md`." Or add a project-level `.claude/skills/<name>/SKILL.md` that points here. |
| Codex CLI / OpenAI Agents | Put a top-level `AGENTS.md` saying "for A-share data use `toolkit/fuyao/` — see `toolkit/fuyao/README.md`." Codex auto-reads `AGENTS.md`. |
| Cursor | Add `.cursor/rules/fuyao.mdc` pointing at this README; or paste this README into the project system prompt. |
| Windsurf / Codeium | `.windsurf/rules/*.md` similarly. |
| ChatGPT (web) | Upload `docs/llms-full.txt` (or this README) as a file attachment in the conversation. |
| Generic / any AI | Tell the model "first read `toolkit/fuyao/README.md`, then call its scripts." That's enough. |

The integration files are intentionally **not** included in this folder so the toolkit stays minimal. Add only the ones you actually use.

## Maintenance

- Upstream protocol change → re-download `https://fuyao.aicubes.cn/llms-full.txt`, overwrite `docs/llms-full.txt`, sanity-check against `docs/api-cheatsheet.md`.
- The local ticker cache `docs/tickers-cache.json` is TTL 12h and is **not auto-refreshed** on expiry (to avoid silently triggering bulk remote fetches). Users / agents see a `[fuyao] warn: tickers cache stale` on stderr and run `tickers-list --refresh-cache` manually.

## Security

- Token only via env var (`FUYAO_TOKEN` / `API_KEY`).
- Never logged; never accepted as a function/CLI parameter.
- Rotate via https://fuyao.aicubes.cn/admin if leaked.
