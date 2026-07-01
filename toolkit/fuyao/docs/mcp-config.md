# MCP Config for Fuyao (Claude Desktop / Cursor / Windsurf)

Fuyao publishes 17 tools through 3 hosted MCP services. You don't need to run a local MCP server — just point your client at the hosted endpoints with your API token.

## Endpoints

| Service | Universe | Endpoint |
| --- | --- | --- |
| `fuyao-a-share` | A-share data | `https://fuyao.aicubes.cn/mcp/a-share` |
| `fuyao-a-share-index` | A-share indices / THS sectors | `https://fuyao.aicubes.cn/mcp/a-share-index` |
| `fuyao-meta` | cross-universe meta | `https://fuyao.aicubes.cn/mcp/meta` |

Load all three — `fuyao-meta` is the prerequisite resolver (search `公司名` → `thscode`) for business calls, while the two business services separate stocks from indices.

## Claude Desktop

Edit `claude_desktop_config.json` (macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "fuyao-a-share": {
      "type": "http",
      "url": "https://fuyao.aicubes.cn/mcp/a-share",
      "headers": {
        "X-api-key": "${FUYAO_TOKEN}"
      }
    },
    "fuyao-a-share-index": {
      "type": "http",
      "url": "https://fuyao.aicubes.cn/mcp/a-share-index",
      "headers": {
        "X-api-key": "${FUYAO_TOKEN}"
      }
    },
    "fuyao-meta": {
      "type": "http",
      "url": "https://fuyao.aicubes.cn/mcp/meta",
      "headers": {
        "X-api-key": "${FUYAO_TOKEN}"
      }
    }
  }
}
```

## Cursor

Edit `~/.cursor/mcp.json` — same schema as Claude Desktop.

## Windsurf

Edit `~/.codeium/windsurf/mcp_config.json` — same schema.

## Verifying

After restart, the client should expose 17 tools:
- `get_a_share_calendar_trading_days`
- `get_a_share_corporate_actions_adjustment_factors`
- `get_a_share_financials_balance_sheets`
- `get_a_share_financials_cash_flow_statements`
- `get_a_share_financials_indicators`
- `get_a_share_financials_income_statements`
- `get_a_share_prices_historical`
- `get_a_share_prices_snapshot`
- `get_a_share_special_data_anomaly_analysis_stock`
- `get_a_share_special_data_limit_up_ladder`
- `get_a_share_special_data_limit_up_pool`
- `get_a_share_index_catalog_ths_index_list`
- `get_a_share_index_constituents_ths_stock_list`
- `get_a_share_index_prices_historical`
- `get_a_share_index_prices_snapshot`
- `get_meta_tickers_list`
- `get_meta_tickers_search`

`GET /api/a-share/special-data/anomaly-analysis-list` is REST-only and therefore does not appear in this MCP tool list.

## Security

- Never paste the token into prompts or commit it to git. Use env vars / secrets store.
- The token grants the same access as REST — rotate via `https://fuyao.aicubes.cn/admin` if leaked.

## When to use MCP vs the local Python CLI

| Scenario | Prefer |
| --- | --- |
| Conversational lookups inside Claude Desktop / Cursor | MCP (zero code) |
| Scripting, bulk pulls, scheduled jobs, CI | `fuyao_client.py` / `fuyao.py` CLI (versionable, testable) |
| Cross-tool consistency (CLI today, MCP later) | Both — they share semantics |
