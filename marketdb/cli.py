from __future__ import annotations

import json
import sys
from dataclasses import asdict
from pathlib import Path

import typer
from rich.console import Console
from rich.table import Table

from marketdb._version import SCHEMA_VERSION, __version__
from marketdb.calculations.adjustment import rebuild_adjustment_factors
from marketdb.checks.quality import run_quality_checks
from marketdb.config import Settings
from marketdb.db import connect
from marketdb.importers.parquet import (
    import_adjustment_events_parquet,
    import_kline_daily_parquet,
)
from marketdb.providers.rest import RestProvider
from marketdb.schema import (
    check_compatibility,
    get_meta,
    init_schema,
    rebuild_views,
)
from marketdb.updaters.daily import sync_symbols, update_daily

app = typer.Typer(
    add_completion=False,
    help="Local A-share market database (DuckDB) — import, update, query.",
)
console = Console()


def _settings(db: Path | None) -> Settings:
    return Settings.load(db_path=db)


@app.command()
def version() -> None:
    """Print marketdb and schema versions."""
    console.print(f"marketdb {__version__}  schema {SCHEMA_VERSION}")


@app.command()
def init(
    db: Path = typer.Option(None, "--db", help="DuckDB file path"),
    data_root: Path = typer.Option(None, "--data-root", help="Where parquet dumps live"),
) -> None:
    """Create tables and views and seed _meta."""
    settings = Settings.load(db_path=db, data_root=data_root)
    con = connect(settings.db_path)
    init_schema(con, data_root=str(settings.data_root))
    console.print(f"[green]initialized[/green] {settings.db_path}")
    con.close()


@app.command("import-parquet")
def import_parquet(
    daily: Path = typer.Option(..., "--daily", help="Daily K-line parquet file"),
    events: Path = typer.Option(
        None, "--events", help="Adjustment events parquet file (optional)"
    ),
    rebuild_factors: bool = typer.Option(
        True, "--rebuild-factors/--no-rebuild-factors",
        help="Rebuild calc_adjust_factor_daily after import",
    ),
    db: Path = typer.Option(None, "--db", help="DuckDB file path"),
) -> None:
    """Import full daily K-line and (optionally) adjustment events parquet dumps."""
    settings = _settings(db)
    con = connect(settings.db_path)
    check_compatibility(con)
    rows_k = import_kline_daily_parquet(con, daily)
    console.print(f"[green]raw_kline_daily[/green] imported rows={rows_k}")
    if events:
        rows_e = import_adjustment_events_parquet(con, events)
        console.print(f"[green]raw_adjustment_events[/green] imported rows={rows_e}")
    if rebuild_factors:
        rows_f = rebuild_adjustment_factors(con)
        console.print(f"[green]calc_adjust_factor_daily[/green] rebuilt rows={rows_f}")
    rebuild_views(con)
    con.close()


@app.command("rebuild-views")
def rebuild_views_cmd(
    db: Path = typer.Option(None, "--db", help="DuckDB file path"),
) -> None:
    """Drop and recreate v_* views from sql/views.sql."""
    settings = _settings(db)
    con = connect(settings.db_path)
    rebuild_views(con)
    console.print("[green]views rebuilt[/green]")
    con.close()


@app.command("rebuild-factors")
def rebuild_factors_cmd(
    db: Path = typer.Option(None, "--db", help="DuckDB file path"),
) -> None:
    """Recompute calc_adjust_factor_daily from raw events."""
    settings = _settings(db)
    con = connect(settings.db_path)
    rows = rebuild_adjustment_factors(con)
    console.print(f"[green]factors rebuilt[/green] rows={rows}")
    con.close()


@app.command()
def validate(
    db: Path = typer.Option(None, "--db", help="DuckDB file path"),
    as_json: bool = typer.Option(False, "--json", help="Emit machine-readable JSON to stdout"),
) -> None:
    """Run quality checks on raw tables."""
    settings = _settings(db)
    con = connect(settings.db_path)
    issues = run_quality_checks(con)
    errors = [i for i in issues if i.severity == "error"]
    if as_json:
        sys.stdout.write(json.dumps({
            "db_path": str(settings.db_path),
            "ok": not errors,
            "issues": [asdict(i) for i in issues],
        }, ensure_ascii=False, indent=2) + "\n")
        con.close()
        if errors:
            raise typer.Exit(code=1)
        return
    if not issues:
        console.print("[green]OK[/green] no issues found")
        con.close()
        return
    table = Table(title="Quality issues", header_style="bold red")
    table.add_column("check")
    table.add_column("severity")
    table.add_column("detail")
    for issue in issues:
        table.add_row(issue.check, issue.severity, issue.detail)
    console.print(table)
    con.close()
    if errors:
        raise typer.Exit(code=1)


@app.command("sync-symbols")
def sync_symbols_cmd(
    db: Path = typer.Option(None, "--db", help="DuckDB file path"),
    exchange: str = typer.Option("SH,SZ", "--exchange"),
    asset_type: str = typer.Option("a-share", "--asset-type"),
) -> None:
    """Refresh dim_symbol from the REST tickers list endpoint."""
    settings = _settings(db)
    if not settings.api_key:
        console.print("[red]missing API_KEY[/red] — set it in .env or env vars")
        raise typer.Exit(code=2)
    con = connect(settings.db_path)
    provider = RestProvider(
        base_url=settings.base_url,
        api_key=settings.api_key,
        min_interval_seconds=settings.rest_min_interval_seconds,
    )
    n = sync_symbols(con, provider)
    console.print(f"[green]dim_symbol[/green] upserted rows={n}")
    con.close()


@app.command("update-daily")
def update_daily_cmd(
    db: Path = typer.Option(None, "--db", help="DuckDB file path"),
    target: str = typer.Option(None, "--target", help="Target trading day YYYY-MM-DD"),
    sync_symbols_first: bool = typer.Option(
        True,
        "--sync-symbols/--no-sync-symbols",
        help="Refresh dim_symbol before pulling K-line so new listings are picked up.",
    ),
) -> None:
    """Pull recent daily K-line via REST and merge incrementally."""
    settings = _settings(db)
    if not settings.api_key:
        console.print("[red]missing API_KEY[/red] — set it in .env or env vars")
        raise typer.Exit(code=2)
    from datetime import date as _date
    target_date = _date.fromisoformat(target) if target else None
    con = connect(settings.db_path)
    provider = RestProvider(
        base_url=settings.base_url,
        api_key=settings.api_key,
        min_interval_seconds=settings.rest_min_interval_seconds,
    )
    result = update_daily(
        con,
        provider,
        max_lag_trading_days=settings.max_lag_trading_days,
        target_date=target_date,
        sync_symbols_first=sync_symbols_first,
    )
    console.print_json(json.dumps(result))
    con.close()


@app.command()
def query(
    sql: str = typer.Option(..., "--sql"),
    db: Path = typer.Option(None, "--db", help="DuckDB file path"),
    limit: int = typer.Option(50, "--limit", help="Truncate results; pass 0 for no limit"),
    as_json: bool = typer.Option(False, "--json", help="Emit machine-readable JSON to stdout"),
) -> None:
    """Run an ad-hoc SQL query and pretty-print (or JSON-dump) results."""
    settings = _settings(db)
    con = connect(settings.db_path)
    df = con.execute(sql).df()
    total = len(df)
    if limit and total > limit:
        df = df.head(limit)
    if as_json:
        payload = {
            "row_count": total,
            "truncated_to": len(df) if limit and total > limit else total,
            "columns": list(df.columns),
            "rows": json.loads(df.to_json(orient="records", date_format="iso")),
        }
        sys.stdout.write(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
    else:
        console.print(df.to_string(index=False))
    con.close()


@app.command()
def export(
    thscode: str = typer.Option(..., "--thscode"),
    out: Path = typer.Option(..., "--out"),
    adjust: str = typer.Option("none", "--adjust", help="none | forward | backward"),
    db: Path = typer.Option(None, "--db", help="DuckDB file path"),
) -> None:
    """Export a single symbol's daily series to CSV."""
    from marketdb.sdk import MarketDB
    settings = _settings(db)
    market = MarketDB(settings.db_path)
    path = market.export_csv(thscode, out, adjust=adjust)
    console.print(f"[green]exported[/green] {path}")
    market.close()


_STATUS_QUERIES: list[tuple[str, str]] = [
    ("raw_kline_daily.rows", "SELECT COUNT(*) FROM raw_kline_daily"),
    ("raw_kline_daily.max_date", "SELECT MAX(date) FROM raw_kline_daily"),
    ("raw_adjustment_events.rows", "SELECT COUNT(*) FROM raw_adjustment_events"),
    ("calc_adjust_factor_daily.rows", "SELECT COUNT(*) FROM calc_adjust_factor_daily"),
    ("dim_symbol.rows", "SELECT COUNT(*) FROM dim_symbol"),
]


@app.command()
def status(
    db: Path = typer.Option(None, "--db", help="DuckDB file path"),
    as_json: bool = typer.Option(False, "--json", help="Emit machine-readable JSON to stdout"),
) -> None:
    """Show schema version, table row counts, and last batch ids."""
    settings = _settings(db)
    con = connect(settings.db_path)
    payload: dict = {
        "db_path": str(settings.db_path),
        "schema_version": get_meta(con, "schema_version"),
        "project_version": get_meta(con, "project_version"),
    }
    for label, sql in _STATUS_QUERIES:
        row = con.execute(sql).fetchone()
        value = row[0] if row else 0
        # JSON-serialise date / numerics consistently
        payload[label] = str(value) if value is not None else None
    con.close()
    if as_json:
        sys.stdout.write(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
        return
    table = Table(title=f"marketdb status @ {settings.db_path}", header_style="bold")
    table.add_column("key")
    table.add_column("value")
    for key, val in payload.items():
        if key == "db_path":
            continue
        table.add_row(key, str(val) if val is not None else "0")
    console.print(table)


@app.command()
def describe(
    db: Path = typer.Option(None, "--db", help="DuckDB file path"),
) -> None:
    """Emit machine-readable schema info (tables, views, columns, row counts, max date).

    Intended for AI agents and automation: one query gives you the full surface
    of the local DB without having to read SQL files. Output is JSON on stdout.
    """
    settings = _settings(db)
    con = connect(settings.db_path)
    objects: dict[str, dict] = {}
    for name, kind in con.execute(
        "SELECT table_name, table_type FROM information_schema.tables "
        "WHERE table_schema = 'main' "
        "ORDER BY CASE table_type WHEN 'VIEW' THEN 0 ELSE 1 END, table_name"
    ).fetchall():
        objects[name] = {
            "kind": "view" if kind == "VIEW" else "table",
            "columns": [],
            "row_count": None,
            "max_date": None,
        }
    for name, col, dtype in con.execute(
        "SELECT table_name, column_name, data_type FROM information_schema.columns "
        "WHERE table_schema = 'main' "
        "ORDER BY table_name, ordinal_position"
    ).fetchall():
        if name in objects:
            objects[name]["columns"].append({"name": col, "type": dtype})
    for name, info in objects.items():
        # Skip volatile / internal staging tables in stats — they're often empty.
        try:
            info["row_count"] = con.execute(f'SELECT COUNT(*) FROM "{name}"').fetchone()[0]
        except Exception:
            info["row_count"] = None
        has_date = any(c["name"] == "date" for c in info["columns"])
        if has_date and info["row_count"]:
            try:
                row = con.execute(f'SELECT MAX(date) FROM "{name}"').fetchone()
                info["max_date"] = str(row[0]) if row and row[0] is not None else None
            except Exception:
                info["max_date"] = None
    payload = {
        "db_path": str(settings.db_path),
        "schema_version": get_meta(con, "schema_version"),
        "project_version": get_meta(con, "project_version"),
        "objects": objects,
    }
    con.close()
    sys.stdout.write(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    app()
