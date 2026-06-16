# marketdb CLI 参考

所有命令都接受 `--db PATH`（默认 `data/market.duckdb` 或 `$MARKETDB_DB_PATH`）。四个对 agent 友好的命令（`status` / `validate` / `query` / `describe`）传 `--json` 时把 JSON 写到 stdout（`describe` 永远 JSON）。其他命令走 `rich` 打印给人看。

## 速查

```bash
marketdb status   --json --db data/market.duckdb
marketdb validate --json --db data/market.duckdb
marketdb describe       --db data/market.duckdb
marketdb query    --json --db data/market.duckdb --sql "<SQL>" [--limit 50]
marketdb export         --db data/market.duckdb --thscode 300033.SZ --out out/x.csv --adjust forward
marketdb update-daily   --db data/market.duckdb [--target YYYY-MM-DD]
marketdb sync-symbols   --db data/market.duckdb
marketdb init           --db data/market.duckdb
marketdb import-parquet --db data/market.duckdb --daily <daily.parquet> --events <events.parquet>
marketdb rebuild-views   --db data/market.duckdb
marketdb rebuild-factors --db data/market.duckdb
marketdb version
```

## status

版本号 + 各核心表行数 + 最大日期。

```bash
marketdb status --json --db data/market.duckdb
```

输出（JSON）：

```json
{
  "db_path": "data/market.duckdb",
  "schema_version": "1.0.0",
  "project_version": "0.1.0",
  "raw_kline_daily.rows": "9445047",
  "raw_kline_daily.max_date": "2026-06-11",
  "raw_adjustment_events.rows": "52560",
  "calc_adjust_factor_daily.rows": "9445047",
  "dim_symbol.rows": "0"
}
```

> 注意：所有数值都按字符串输出（与 DuckDB CLI 对 bigint / date 的默认行为一致），消费方按需 cast。

## validate

跑 8 项数据质量校验。任何 error 级别的问题都会让退出码变 `1`。

```bash
marketdb validate --json --db data/market.duckdb
```

```json
{
  "db_path": "data/market.duckdb",
  "ok": true,
  "issues": []
}
```

失败 issue 的形状：

```json
{ "check": "raw_kline_daily.ohlc_valid", "severity": "error", "detail": "...", "sample": [...] }
```

## describe

一次 JSON 把整个 schema 转出来：对象类别（`table` / `view`）、列名 + 类型、行数、如果有 `date` 列还会附 `max_date`。专门给 AI agent 用 —— 一次调用就能掌握整个数据库面。

```bash
marketdb describe --db data/market.duckdb > /tmp/schema.json
jq 'keys' /tmp/schema.json                                # 顶层键
jq '.objects | keys'        /tmp/schema.json              # 所有 table / view
jq '.objects.v_daily_qfq.columns[].name' /tmp/schema.json # 某个视图的所有列名
```

形状：

```json
{
  "db_path": "...",
  "schema_version": "1.0.0",
  "project_version": "0.1.0",
  "objects": {
    "v_daily_qfq": {
      "kind": "view",
      "columns": [
        { "name": "thscode", "type": "VARCHAR" },
        { "name": "date",    "type": "DATE" },
        ...
      ],
      "row_count": 9445047,
      "max_date": "2026-06-11"
    },
    ...
  }
}
```

## query

透传 SQL。默认人类输出，加 `--json` 给机器用。`--limit` 控制截断（传 `0` 不截）。

```bash
# 近 5 个交易日内的领涨股
marketdb query --json --db data/market.duckdb --limit 10 --sql "
  SELECT thscode,
         (close / FIRST_VALUE(close) OVER (PARTITION BY thscode ORDER BY date)) - 1 AS ret
  FROM v_daily_qfq
  WHERE date >= '2026-06-05'
  QUALIFY ROW_NUMBER() OVER (PARTITION BY thscode ORDER BY date DESC) = 1
  ORDER BY ret DESC
"
```

JSON 形状：

```json
{
  "row_count": 5234,
  "truncated_to": 10,
  "columns": ["thscode", "ret"],
  "rows": [ { "thscode": "...", "ret": 0.1234 }, ... ]
}
```

日期是 ISO 字符串（`"2026-06-11T00:00:00.000"`），消费方按需转换。

## export

单股 CSV。暂不支持日期范围（导出全历史）。要按日期范围导，请用 SDK。

```bash
marketdb export --db data/market.duckdb --thscode 300033.SZ \
                --out out/300033_qfq.csv --adjust forward
```

## update-daily

REST 增量合并。需要 `.env` 里有 `API_KEY`。落后超过 `MARKETDB_MAX_LAG_TRADING_DAYS`（默认 7）会拒绝运行。

```bash
marketdb update-daily --db data/market.duckdb                       # 到最新交易日
marketdb update-daily --db data/market.duckdb --target 2026-06-12   # 到指定日
```

总是 JSON 出 stdout：

```json
{ "batch_id": "rest-kline-...", "window_start": "2026-06-09", "window_end": "2026-06-11", "rows": 5234 }
```

## sync-symbols

从 REST `/api/meta/tickers/list` 刷新 `dim_symbol`。首次 `update-daily` 之前需要先跑一次。需要 `API_KEY`。

```bash
marketdb sync-symbols --db data/market.duckdb
```

## init / import-parquet / rebuild-*

管道命令 —— 通常 `bootstrap.sh` 帮你调。直接调的形式：

```bash
marketdb init           --db data/market.duckdb
marketdb import-parquet --db data/market.duckdb \
                        --daily  "refer-to/data/a_share_daily_k_1d_none_10y_<YYYYMMDD>.parquet" \
                        --events "refer-to/data/a_share_adjustment_factors_event_none_all_<YYYYMMDD>.parquet"
marketdb rebuild-views   --db data/market.duckdb
marketdb rebuild-factors --db data/market.duckdb
```

## version

```bash
marketdb version
# → marketdb 0.1.0  schema 1.0.0
```

## 退出码

| 码 | 含义 |
| --- | --- |
| 0 | 成功 |
| 1 | `validate` 发现 error 级别的问题 |
| 2 | REST 命令缺 `API_KEY` |
| (typer 默认) | 参数错误 / 未知 flag |

## 给 AI agent 的小贴士

- 永远优先 `--json`，不要 parse `rich` 表格 —— 后者会换行折叠，正则方案脆得很。
- 大查询结果重定向到文件：`marketdb query --json ... > /tmp/q.json`，回报 `jq '.row_count' /tmp/q.json`，不要把行贴回上下文。
- 会话开头跑一次 `describe`，把当前 schema 拉到本地，后面别瞎猜列名。
- "补当天数据" 是 `update-daily` 的活；`bootstrap.sh --force` 是大锤，平时别用。
