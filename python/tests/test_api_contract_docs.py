"""Independent checks for the atomic REST contract and navigation graph."""

import json
from pathlib import Path
import re
from urllib.parse import unquote
from .contract_doc_inventory import inventory

ROOT = Path(__file__).resolve().parents[2]
STATE = {"entries": inventory()}
REST = [r for r in STATE["entries"] if r["kind"] == "rest"]


def body(endpoint):
    record = next(r for r in REST if r["endpoint"] == endpoint)
    return (ROOT / record["output"]).read_text(encoding="utf-8")


def test_atomic_identity_and_output_integrity():
    assert not (ROOT / 'docs/api/common').exists()
    assert not (ROOT / 'skills/hithink-finance/references/api/common').exists()
    assert len(REST) == len({r["id"] for r in REST})
    domains = {r["domain"] for r in REST}
    actual = {
        p.relative_to(ROOT).as_posix()
        for domain in domains
        for p in (ROOT / "docs/api" / domain).glob("*.md")
        if p.name != "README.md"
    }
    assert actual == {r["output"] for r in REST}
    for record in REST:
        text = (ROOT / record["output"]).read_text(encoding="utf-8")
        assert record["id"] in text
        assert "请求参数" in text
        assert "```bash" in text and "```json" in text
        assert "字段" in text
        assert "> **info 通用约定**" not in text
        assert "MCP Tool" not in text
        assert "../../mcp/" not in text
        assert ("**端内专用**" in text) == (record["access"] == "client-only")


def test_navigation_reaches_every_atomic_document():
    for kind, directory in [("rest", "api"), ("mcp", "mcp")]:
        visited, queue = set(), [ROOT / f"docs/{directory}/README.md"]
        while queue:
            page = queue.pop().resolve()
            if page in visited:
                continue
            visited.add(page)
            for url in re.findall(r"\]\(([^)]+)\)", page.read_text(encoding="utf-8")):
                if "://" not in url:
                    target = (page.parent / url.split("#")[0]).resolve()
                    if target.suffix == ".md":
                        queue.append(target)
        assert all(
            (ROOT / r["output"]).resolve() in visited
            for r in STATE["entries"]
            if r["kind"] == kind
        )


def test_local_contract_links_and_fragments_resolve():
    for directory in (
        "docs/api",
        "docs/mcp",
        "skills/hithink-finance/references/api",
        "skills/hithink-finance/references/mcp",
    ):
        for page in (ROOT / directory).rglob("*.md"):
            text = re.sub(
                r"```.*?```", "", page.read_text(encoding="utf-8"), flags=re.S
            )
            for url in re.findall(r"\]\(([^\s)]+)\)", text):
                if re.match(r"\w+:|//", url):
                    continue
                filename, _, fragment = url.partition("#")
                target = (page.parent / filename).resolve() if filename else page
                assert target.is_file(), (page, url)
                if fragment:
                    target_text = target.read_text(encoding="utf-8")
                    anchors = set(re.findall(r'<a id="([^"]+)"', target_text))
                    for heading in re.findall(r"^#{1,6} (.+)", target_text, re.M):
                        anchors.add(
                            re.sub(
                                r"[^\w\-\u4e00-\u9fff ]", "", heading.lower()
                            ).replace(" ", "-")
                        )
                    assert unquote(fragment) in anchors, (page, url)


def test_response_examples_are_valid_json():
    for record in REST:
        text = (ROOT / record["output"]).read_text(encoding="utf-8")
        for example in re.findall(r"```json\s*\n(.*?)\n```", text, re.S):
            json.loads(example)


def test_financial_and_fund_semantics_remain_explicit():
    checks = {
        "/api/fund/holders/detail": [
            "merge_scope",
            "merged",
            "separate",
            "report_date_ms",
            "ins_position",
        ],
        "/api/fund/market/historical": ["ETF", "1d", "start", "end", "前复权"],
        "/api/fund/performance/indicators-historical": [
            "rsi_pct",
            "donchian_channel",
            "track_index_pe_ttm_five_year_percentile",
            "timestamp",
        ],
        "/api/fund/portfolio/stock-history": [
            "rank",
            "null",
            "report_type",
            "end_date",
            "end_date_ms",
        ],
        "/api/fund/news/article-list": ["has_more", "article"],
        "/api/a-share/financials/income-statements": [
            "operating_income",
            "parent_holder_net_profit",
        ],
        "/api/a-share/valuations/snapshot": ["pe_ttm", "pb", "null"],
        "/api/futures/positions/contract-historical": [
            "position_item",
            "average_item",
            "start_date",
        ],
        "/api/futures/calendar/trading-schedule": [
            "trade_dates",
            "regular_schedules",
            "timezone",
        ],
        "/api/options/contracts/detail": [
            "exercise_style",
            "option_type",
            "trade_amount",
        ],
    }
    for endpoint, tokens in checks.items():
        for token in tokens:
            assert token in body(endpoint), (endpoint, token)


def test_access_and_availability_are_separate():
    client = [r for r in REST if r["access"] == "client-only"]
    assert client
    for record in client:
        text = (ROOT / record["output"]).read_text(encoding="utf-8")
        assert "README.md#端内能力说明" in text
        if record["status"] == "planned":
            assert "当前不可调用" in text
    assert "当前客户端尚未发布" in (ROOT / "docs/api/README.md").read_text(
        encoding="utf-8"
    )
