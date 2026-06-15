# AGENTS.md

> Entry file for any AI coding agent (Codex CLI, OpenAI Agents, Cursor, Windsurf, ChatGPT, Claude Code, …) working in this repository. This file is intentionally short — it points you at the canonical contracts and stays out of the way.

## Repository at a glance

- **`marketdb/`** — local DuckDB-backed A-share data warehouse (Parquet → DuckDB → SQL/SDK). See `feature/2026-06-09-本地行情数据库与回测分析应用/` for design.
- **`toolkit/`** — tool-agnostic toolkits for both data sources. Start at `toolkit/README.md` (unified router):
  - **`toolkit/marketdb/`** — local DB queries (历史 OHLCV、复权、面板、因子). Use whenever the answer lives in `data/market.duckdb`.
  - **`toolkit/fuyao/`** — upstream 扶摇 (fuyao.aicubes.cn) REST + MCP API. Use whenever you need fresh data (snapshots, financials, ticker catalog).
- **`examples/`** — runnable end-to-end Python scripts. Best first stop when learning the repo.
- **`feature/`** — dated iteration workspaces; each contains its own `01-requirement.md` → `05-summary.md` decision record.
- **`tests/`**, **`docs/`**, **`refer-to/`** — standard.

## Which toolkit do I use?

| You want… | Go to |
| --- | --- |
| Historical OHLCV / 复权 / 面板 / 因子研究 / SQL on local DB | `toolkit/marketdb/README.md` |
| Live snapshot / 财报 / 复权事件 / 标的目录刷新 | `toolkit/fuyao/README.md` |
| "Where's the data? How do I start?" | `toolkit/README.md` (decision tree) + `examples/README.md` |

Full responsibility boundary + routing rules: [`toolkit/README.md`](toolkit/README.md).

## Auth (for `toolkit/fuyao/`)

```bash
export FUYAO_TOKEN=<token>     # issued at https://fuyao.aicubes.cn/admin
# or API_KEY=<token> for MCP compatibility
```

**Never** paste tokens into prompts, code, or git commits.

## Big-data discipline (mandatory for all AI agents)

**Do not** echo paginated / full-market / multi-year / multi-ticker results into your conversation context. The flow is always:

```bash
python3 toolkit/fuyao/scripts/fuyao.py <cmd> ... > /tmp/<x>.json     # or
marketdb query --json --db data/market.duckdb --sql "..." > /tmp/<x>.json
# then report file path + row count, NOT the contents
jq length /tmp/<x>.json
```

Downstream consumers (notebooks, marketdb, pandas) read the file. This keeps context cost bounded and lets you do many calls cheaply.

## Conventions in this repo

- **Dated iterations**: substantial features live in `feature/<YYYY-MM-DD>-<slug>/` with the 5-file decision-record template. Read those `05-summary.md` files to understand recent history.
- **No global state writes by AI**: never install things into `~/.claude/`, `~/.config/`, etc. on behalf of the user. All deliverables ship inside this repo.
- **No vendor lock-in in the toolkit**: both `toolkit/fuyao/` and `toolkit/marketdb/` are intentionally free of `SKILL.md` / `.cursorrules` / `.claude/`. Add tool-specific glue *outside* `toolkit/` if you need it (see each toolkit's README § "如何接入各 AI 工具").

## If you're a specific tool

- **Codex CLI / OpenAI Agents** — you found this file automatically. Read `toolkit/README.md` next; it routes to the right sub-toolkit.
- **Claude Code** — there's no `.claude/skills/SKILL.md` yet; rely on this AGENTS.md + `toolkit/README.md`. If a project-level SKILL.md is added later, it will just be a thin pointer to the same `toolkit/`.
- **Cursor / Windsurf** — no `.cursor/rules/` or `.windsurf/` glue today. Either paste `toolkit/README.md` into the project prompt, or add a `.mdc` file pointing here.
- **ChatGPT (web)** — attach `toolkit/fuyao/docs/llms-full.txt` (full upstream API contract) or `toolkit/marketdb/README.md` (local DB ops) when relevant.

## Pointers

- Unified routing + boundary: `toolkit/README.md`
- Local DB SDK / CLI: `toolkit/marketdb/README.md`
- Upstream API contract (authoritative): `toolkit/fuyao/docs/llms-full.txt` (mirror of `https://fuyao.aicubes.cn/llms-full.txt`)
- Endpoint cheatsheet: `toolkit/fuyao/docs/api-cheatsheet.md`
- Error codes + retry policy: `toolkit/fuyao/docs/error-codes.md`
- MCP client config snippets: `toolkit/fuyao/docs/mcp-config.md`
- Examples: `examples/`
- Project history: `project-dev-log.md`, `feature/*/05-summary.md`
