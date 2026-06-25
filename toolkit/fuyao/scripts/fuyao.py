#!/usr/bin/env python3
"""Fuyao API CLI — thin argparse wrapper over fuyao_client.

Output contract: JSON to stdout (default indent=2; --compact for one-line).
Errors: code/message/request_id to stderr, exit non-zero.
Persisting / format conversion is the caller's job (shell redirect, jq, pandas).
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent))

from fuyao_client import (  # noqa: E402
    FuyaoApiError,
    calendar_trading_days,
    corp_actions_adjustment_factors,
    financials_balance_sheets,
    financials_cash_flow_statements,
    financials_income_statements,
    index_catalog_ths_index_list,
    index_constituents_ths_stock_list,
    index_prices_historical,
    index_prices_snapshot,
    prices_historical,
    prices_snapshot,
    special_data_limit_up_ladder,
    special_data_limit_up_pool,
    tickers_list,
    tickers_search,
)


def _read_codes_file(path: str) -> list[str]:
    lines = Path(path).read_text(encoding="utf-8").splitlines()
    return [ln.strip() for ln in lines if ln.strip() and not ln.startswith("#")]


def _emit(obj: Any, compact: bool) -> None:
    if compact:
        json.dump(obj, sys.stdout, ensure_ascii=False, separators=(",", ":"))
    else:
        json.dump(obj, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")


def _emit_update_notice() -> None:
    try:
        from marketdb.update_notice import maybe_emit_update_notice

        maybe_emit_update_notice()
    except Exception:
        return


# ---------------------------------------------------------------------------
# Subcommand handlers
# ---------------------------------------------------------------------------


def cmd_tickers_search(args):
    return tickers_search(
        q=args.q,
        exchange=args.exchange,
        asset_type=args.asset_type,
        limit=args.limit,
        remote=args.remote,
    )


def cmd_tickers_list(args):
    return tickers_list(
        exchange=args.exchange,
        asset_type=args.asset_type,
        limit=args.limit,
        offset=args.offset,
        fetch_all=args.all,
        refresh_cache=args.refresh_cache,
    )


def cmd_prices_snapshot(args):
    if args.thscodes_file:
        codes = _read_codes_file(args.thscodes_file)
        return prices_snapshot(thscodes=codes)
    if args.thscodes:
        return prices_snapshot(thscodes=args.thscodes.split(","))
    if args.all_market:
        return prices_snapshot(fetch_all_market=True, limit=args.limit, offset=args.offset)
    return prices_snapshot(limit=args.limit, offset=args.offset)


def cmd_prices_historical(args):
    if args.thscodes_file:
        codes = _read_codes_file(args.thscodes_file)
        result: dict[str, list[dict]] = {}
        for c in codes:
            result[c] = prices_historical(
                c,
                start_ms=args.start_ms,
                end_ms=args.end_ms,
                adjust=args.adjust,
            )
        return result
    return prices_historical(
        thscode=args.thscode,
        start_ms=args.start_ms,
        end_ms=args.end_ms,
        adjust=args.adjust,
    )


def cmd_corp_actions(args):
    return corp_actions_adjustment_factors(
        thscode=args.thscode,
        from_date=args.from_date,
        to_date=args.to_date,
    )


def _financials_args(fn):
    def _run(args):
        return fn(
            thscode=args.thscode,
            period=args.period,
            limit=args.limit,
            start_ms=args.start_ms,
            end_ms=args.end_ms,
        )

    return _run


def cmd_calendar(_args):
    return calendar_trading_days()


def cmd_index_catalog(args):
    return index_catalog_ths_index_list(tag=args.tag)


def cmd_index_constituents(args):
    return index_constituents_ths_stock_list(thscode=args.thscode)


def cmd_index_snapshot(args):
    if args.thscodes_file:
        codes = _read_codes_file(args.thscodes_file)
    else:
        codes = args.thscodes.split(",")
    return index_prices_snapshot(thscodes=codes)


def cmd_index_historical(args):
    return index_prices_historical(
        thscode=args.thscode,
        start_ms=args.start_ms,
        end_ms=args.end_ms,
        interval=args.interval,
    )


def cmd_limit_up_pool(args):
    return special_data_limit_up_pool(
        date_ms=args.date_ms,
        page=args.page,
        size=args.size,
        sort_field=args.sort_field,
        sort_dir=args.sort_dir,
    )


def cmd_limit_up_ladder(_args):
    return special_data_limit_up_ladder()


# ---------------------------------------------------------------------------
# argparse wiring
# ---------------------------------------------------------------------------


def _add_financials_subparser(sub, name: str, help_text: str, handler):
    p = sub.add_parser(name, help=help_text)
    p.add_argument("--thscode", required=True)
    p.add_argument("--period", default="annual", choices=["annual", "quarterly"])
    grp_mode = p.add_argument_group(
        "取数模式（二选一，互斥）",
        "默认走 limit (最近 N 期)；传 --start-ms + --end-ms 走时间区间模式。",
    )
    grp_mode.add_argument("--limit", type=int, default=None)
    grp_mode.add_argument("--start-ms", dest="start_ms", type=int, default=None)
    grp_mode.add_argument("--end-ms", dest="end_ms", type=int, default=None)
    p.set_defaults(func=handler)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="fuyao",
        description="Fuyao A-share data CLI (15 capabilities). JSON-only stdout. "
        "Auth: FUYAO_TOKEN env var.",
    )
    parser.add_argument("--compact", action="store_true", help="emit single-line JSON")
    sub = parser.add_subparsers(dest="command", required=True)

    # tickers-search
    p = sub.add_parser("tickers-search", help="resolve name/code into thscode (local cache by default)")
    p.add_argument("--q", required=True)
    p.add_argument("--exchange", choices=["SH", "SZ", "BJ"])
    p.add_argument("--asset-type", dest="asset_type", choices=["a-share", "a-share-index"])
    p.add_argument("--limit", type=int, default=10)
    p.add_argument("--remote", action="store_true", help="bypass local cache, hit upstream")
    p.set_defaults(func=cmd_tickers_search)

    # tickers-list
    p = sub.add_parser("tickers-list", help="bulk list tickers; --all loops paging; --refresh-cache writes local cache")
    p.add_argument("--exchange", default="SH,SZ")
    p.add_argument("--asset-type", dest="asset_type", default="a-share", choices=["a-share", "a-share-index"])
    p.add_argument("--limit", type=int, default=1000)
    p.add_argument("--offset", type=int, default=0)
    p.add_argument("--all", action="store_true", help="loop offset until exhausted")
    p.add_argument(
        "--refresh-cache",
        dest="refresh_cache",
        action="store_true",
        help="fetch all + write docs/tickers-cache.json (implies --all)",
    )
    p.set_defaults(func=cmd_tickers_list)

    # prices-snapshot
    p = sub.add_parser("prices-snapshot", help="snapshot quotes; batch or full-market paged")
    g = p.add_mutually_exclusive_group()
    g.add_argument("--thscodes", help="comma-separated batch codes")
    g.add_argument("--thscodes-file", dest="thscodes_file", help="file with one thscode per line")
    g.add_argument("--all-market", dest="all_market", action="store_true", help="page through entire universe")
    p.add_argument("--limit", type=int, default=100)
    p.add_argument("--offset", type=int, default=0)
    p.set_defaults(func=cmd_prices_snapshot)

    # prices-historical
    p = sub.add_parser("prices-historical", help="daily K-line; auto-slices windows >10y")
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument("--thscode", help="single thscode")
    g.add_argument("--thscodes-file", dest="thscodes_file", help="file with one thscode per line (serial loop)")
    p.add_argument("--start-ms", dest="start_ms", type=int, required=True)
    p.add_argument("--end-ms", dest="end_ms", type=int, required=True)
    p.add_argument("--adjust", default="forward", choices=["none", "forward", "backward"])
    p.set_defaults(func=cmd_prices_historical)

    # corp-actions
    p = sub.add_parser("corp-actions", help="adjustment-factor events for a single thscode")
    p.add_argument("--thscode", required=True)
    p.add_argument("--from-date", dest="from_date", help="YYYY-MM-DD")
    p.add_argument("--to-date", dest="to_date", help="YYYY-MM-DD")
    p.set_defaults(func=cmd_corp_actions)

    # financials
    _add_financials_subparser(
        sub,
        "financials-income",
        "income-statements multi-period series",
        _financials_args(financials_income_statements),
    )
    _add_financials_subparser(
        sub,
        "financials-balance",
        "balance-sheets multi-period series",
        _financials_args(financials_balance_sheets),
    )
    _add_financials_subparser(
        sub,
        "financials-cashflow",
        "cash-flow-statements multi-period series",
        _financials_args(financials_cash_flow_statements),
    )

    # calendar
    p = sub.add_parser("calendar-trading-days", help="A-share trading-day calendar (~1 year)")
    p.set_defaults(func=cmd_calendar)

    # index-catalog
    p = sub.add_parser(
        "index-catalog",
        help="THS index catalog by tag (cn_concept/region/tszs/industry)",
    )
    p.add_argument(
        "--tag",
        default="cn_concept",
        choices=["cn_concept", "region", "tszs", "industry"],
    )
    p.set_defaults(func=cmd_index_catalog)

    # index-constituents
    p = sub.add_parser(
        "index-constituents",
        help="current constituents of one index (THS block or standard, e.g. 000300.SH)",
    )
    p.add_argument("--thscode", required=True)
    p.set_defaults(func=cmd_index_constituents)

    # index-snapshot
    p = sub.add_parser("index-snapshot", help="index snapshot (batch by thscodes)")
    g = p.add_mutually_exclusive_group(required=True)
    g.add_argument("--thscodes", help="comma-separated index thscodes")
    g.add_argument(
        "--thscodes-file",
        dest="thscodes_file",
        help="file with one index thscode per line",
    )
    p.set_defaults(func=cmd_index_snapshot)

    # index-historical
    p = sub.add_parser(
        "index-historical",
        help="index historical K-line for a single thscode; auto-slices windows >10y",
    )
    p.add_argument("--thscode", required=True)
    p.add_argument("--start-ms", dest="start_ms", type=int, required=True)
    p.add_argument("--end-ms", dest="end_ms", type=int, required=True)
    p.add_argument("--interval", default="1d", choices=["1d", "1w", "1mo"])
    p.set_defaults(func=cmd_index_historical)

    # special-data limit-up-pool
    p = sub.add_parser(
        "limit-up-pool",
        help="A-share 涨停股票池（按日，分页+排序）",
    )
    p.add_argument(
        "--date-ms",
        dest="date_ms",
        type=int,
        default=None,
        help="交易日 00:00 毫秒戳；省略走服务端当前自然日",
    )
    p.add_argument("--page", type=int, default=1)
    p.add_argument("--size", type=int, default=50, help="1..200")
    p.add_argument(
        "--sort-field",
        dest="sort_field",
        default="last_price",
        choices=["last_price", "continue_day_cnt", "seal_money", "limit_up_time"],
    )
    p.add_argument(
        "--sort-dir", dest="sort_dir", default="desc", choices=["asc", "desc"]
    )
    p.set_defaults(func=cmd_limit_up_pool)

    # special-data limit-up-ladder
    p = sub.add_parser(
        "limit-up-ladder",
        help="A-share 连板天梯（近 30 个交易日 × 6 板位矩阵；无入参）",
    )
    p.set_defaults(func=cmd_limit_up_ladder)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    exit_code = 0
    try:
        result = args.func(args)
    except FuyaoApiError as e:
        print(
            f"[fuyao error] code={e.code} message={e.message} request_id={e.request_id}",
            file=sys.stderr,
        )
        exit_code = 2
    except ValueError as e:
        print(f"[fuyao input error] {e}", file=sys.stderr)
        exit_code = 3
    except RuntimeError as e:
        print(f"[fuyao runtime error] {e}", file=sys.stderr)
        exit_code = 4
    else:
        _emit(result, compact=args.compact)
    finally:
        _emit_update_notice()
    return exit_code


if __name__ == "__main__":
    sys.exit(main())
