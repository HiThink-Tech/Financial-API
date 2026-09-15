"""MCP identity, REST correspondence and executable availability boundaries."""

from pathlib import Path
from .contract_doc_inventory import inventory

ROOT = Path(__file__).resolve().parents[2]
STATE = {"entries": inventory()}


def test_tool_identity_and_public_rest_mapping():
    rest = {r["endpoint"]: r for r in STATE["entries"] if r["kind"] == "rest"}
    tools = [r for r in STATE["entries"] if r["kind"] == "mcp"]
    assert len(tools) == len({r["id"] for r in tools})
    for tool in tools:
        text = (ROOT / tool["output"]).read_text(encoding="utf-8")
        if tool["status"] == "planned":
            assert "待上线，当前不可调用" in text
            continue
        assert f"工具名：`{tool['id']}`" in text
        assert "## 参数" in text and "## 返回" in text
        assert rest[tool["endpoint"]]["access"] == "public"
        assert rest[tool["endpoint"]]["output"].split("/")[-1] in text


def test_entry_preserves_connection_and_runtime_schema_rules():
    text = (ROOT / "docs/mcp.md").read_text(encoding="utf-8")
    assert text.count("${HITHINK_FINANCE_API_KEY}") == 6
    for domain in ("meta", "a-share", "a-share-index", "fund", "futures", "options"):
        assert f"https://fuyao.aicubes.cn/mcp/{domain}" in text
    assert "tools/list" in text and "schema" in text and "code=2003" in text
