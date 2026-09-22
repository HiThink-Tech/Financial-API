"""Importer behavior: preservation, failure isolation, ownership and deletion."""

import importlib.util
import json
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location(
    "sync_api_docs", ROOT / "scripts/sync_api_docs.py"
)
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)


@pytest.fixture
def inputs(tmp_path):
    source, target = tmp_path / "frontend", tmp_path / "target"
    folder = source / "apps/docs/docs/api-reference"
    folder.mkdir(parents=True)
    (source / "apps/docs/docs/mcp/tools").mkdir(parents=True)
    page = folder / "prices.mdx"
    page.write_text(
        "---\ntitle: 行情\n---\n\n:::info 公共口径\n价格单位元，null 保留。\n:::\n\n"
        "## 快照\n\nGET /api/a-share/prices/snapshot\n\n### 请求参数\n无。\n### 字段\nprice\n```bash\ncurl URL\n```\n"
        '```json\n{"data":{"item":[{"price":null}]}}\n```\n\n'
        "## 历史 {#history}\n\nGET /api/a-share/prices/historical\n\n"
        "### 请求参数\n| 参数 | 必填 |\n| --- | --- |\n| start | 是 |\n"
        '### 字段\nprice\n```bash\ncurl URL\n```\n```json\n{"data":[]}\n```\n',
        encoding="utf-8",
    )
    governance = {
        "restSingle": [],
        "restModule": ["apps/docs/docs/api-reference/prices.mdx"],
        "restOverview": [],
        "restClientOnly": [],
        "mcpPlaceholder": [],
    }
    (source / "apps/docs/api-doc-governance.json").write_text(
        json.dumps(governance), encoding="utf-8"
    )
    config = {
        "pages": {"prices": ["a-share", "prices"]},
        "domains": {"a-share": {"title": "A股", "intent": "价格"}},
        "groups": {"prices": {"title": "行情", "intent": "快照或历史"}},
        "overviews": {},
        "exceptions": [],
    }
    return source, target, config, page


def test_split_preserves_common_contract_and_json(inputs):
    source, target, config, _ = inputs
    state = sync.synchronize(source, target, config)
    assert len(state["entries"]) == 2
    assert all(record["page_title"] == "行情" for record in state["entries"])
    page_map = json.loads((target / "docs/api/page-map.json").read_text(encoding="utf-8"))
    assert [record["page"] for record in page_map["entries"]] == ["prices", "prices"]
    assert all("source" not in record for record in page_map["entries"])
    bodies = [
        (target / r["output"]).read_text(encoding="utf-8") for r in state["entries"]
    ]
    assert all("价格单位元，null 保留。" in body for body in bodies)
    assert '{"data":{"item":[{"price":null}]}}' in bodies[0]
    assert '<a id="prices-historical--history"></a>' in bodies[1]
    before = {p: p.read_bytes() for p in target.rglob("*") if p.is_file()}
    sync.synchronize(source, target, config, check=True)
    sync.synchronize(source, target, config)
    assert before == {p: p.read_bytes() for p in target.rglob("*") if p.is_file()}


def test_unrecognized_component_does_not_modify_previous_output(inputs):
    source, target, config, page = inputs
    sync.synchronize(source, target, config)
    before = {p: p.read_bytes() for p in target.rglob("*") if p.is_file()}
    page.write_text(
        page.read_text(encoding="utf-8") + "\n<UnknownContract />\n", encoding="utf-8"
    )
    with pytest.raises(sync.DocumentError, match="Unsupported"):
        sync.synchronize(source, target, config)
    assert before == {p: p.read_bytes() for p in target.rglob("*") if p.is_file()}


def test_changed_source_check_and_owned_deletion(inputs):
    source, target, config, page = inputs
    old = sync.synchronize(source, target, config)
    unrelated = target / "docs/api/notes.md"
    unrelated.write_text("maintained", encoding="utf-8")
    page.write_text(
        page.read_text(encoding="utf-8").replace("/snapshot", "/latest"),
        encoding="utf-8",
    )
    with pytest.raises(sync.DocumentError, match="drift"):
        sync.synchronize(source, target, config, check=True)
    sync.synchronize(source, target, config)
    grouped = (target / old["entries"][0]["output"]).read_text(encoding="utf-8")
    assert "GET /api/a-share/prices/snapshot" not in grouped
    assert "GET /api/a-share/prices/latest" in grouped
    assert unrelated.read_text(encoding="utf-8") == "maintained"


def test_local_edits_and_unsafe_paths_are_rejected(inputs):
    source, target, config, page = inputs
    state = sync.synchronize(source, target, config)
    edited = target / state["entries"][0]["output"]
    edited.write_text("local edits", encoding="utf-8")
    with pytest.raises(sync.DocumentError, match="local modifications"):
        sync.synchronize(source, target, config)
    assert edited.read_text(encoding="utf-8") == "local edits"
    with pytest.raises(sync.DocumentError, match="Unsafe"):
        sync.safe_target(target, "../outside.md")


def test_rest_compaction_preserves_constraints_and_code():
    example = '```text\n**MCP Tool**：example\n> **info 通用约定**\n```\n'
    text = (
        '> **info 通用约定**\n'
        '> - **Base URL**：`https://fuyao.aicubes.cn`。\n'
        '> - **必需请求头**：`X-api-key`，缺失或无效返回 `code=2001`。\n'
        '> - 时间戳字段统一为毫秒级 Unix 时间戳，时区按 `Asia/Shanghai`。\n'
        '> - 一次请求默认最多接受 100 个原始 token。\n'
        '> - 新增业务约束必须保留。\n\n'
        '**MCP Tool**：[`get_snapshot`](/docs/mcp/tools/get_snapshot)\n\n'
        'MCP Tool：[`get_snapshot`](/docs/mcp/tools/get_snapshot)\n\n'
        '| REST 端点 | MCP Tool | 说明 |\n|---|---|---|\n'
        '| GET /api/test | [get_snapshot](/docs/mcp/tools/get_snapshot) | 保留描述 |\n\n'
        '### 请求参数\n原始字段\n' + example
    )
    result = sync.compact_rest(text)
    assert 'Base URL' not in result and '必需请求头' not in result
    assert 'get_snapshot' not in result
    assert '| REST 端点 | 说明 |' in result
    assert '| GET /api/test | 保留描述 |' in result
    assert '- 一次请求默认最多接受 100 个原始 token。' in result
    assert '- 新增业务约束必须保留。' in result
    assert '### 请求参数\n原始字段' in result
    assert example in result


def test_overview_routes_to_readme_without_generating_guide(inputs):
    source, target, config, page = inputs
    overview = page.with_name('overview.mdx')
    overview.write_text('---\ntitle: 总览\n---\n重复总览\n', encoding='utf-8')
    governance_path = source / 'apps/docs/api-doc-governance.json'
    governance = json.loads(governance_path.read_text(encoding='utf-8'))
    governance['restOverview'] = [overview.relative_to(source).as_posix()]
    governance_path.write_text(json.dumps(governance), encoding='utf-8')
    config['overviews']['overview'] = 'README.md'
    page.write_text(page.read_text(encoding='utf-8') + '\n[总览](overview)\n', encoding='utf-8')
    state = sync.synchronize(source, target, config)
    assert all(r['kind'] == 'rest' for r in state['entries'])
    assert not (target / 'docs/api/common').exists()
    historical = target / 'docs/api/a-share/prices.md'
    assert '[总览](../README.md)' in historical.read_text(encoding='utf-8')


def test_domain_group_intent_overrides_shared_copy(inputs):
    source, target, config, _ = inputs
    config['domains']['a-share']['group_intents'] = {'prices': 'A 股快照或历史'}
    sync.synchronize(source, target, config)
    assert 'A 股快照或历史' in (target / 'docs/api/a-share/README.md').read_text(encoding='utf-8')


def test_client_only_capability_uses_released_client_status(inputs):
    source, target, config, page = inputs
    config["entry_templates"] = {
        "rest": "# 业务路由\n\n{{domains}}\n\n## 端内能力说明\n\n客户端可用。\n"
    }
    governance_path = source / "apps/docs/api-doc-governance.json"
    governance = json.loads(governance_path.read_text(encoding="utf-8"))
    governance["restClientOnly"] = [page.relative_to(source).as_posix()]
    governance_path.write_text(json.dumps(governance), encoding="utf-8")
    notice = (
        '<div className="ai-client-notice">'
        '<span>当前版本暂不可使用本项目数据，敬请期待。</span>'
        '<a href="https://example.com">客户端</a></div>\n'
    )
    page.write_text(
        page.read_text(encoding="utf-8").replace("---\n\n", "---\n\n" + notice, 1),
        encoding="utf-8",
    )

    state = sync.synchronize(source, target, config)
    rest = [record for record in state["entries"] if record["kind"] == "rest"]
    assert rest and all(record["access"] == "client-only" for record in rest)
    assert all(record["status"] == "documented" for record in rest)
    for record in rest:
        text = (target / record["output"]).read_text(encoding="utf-8")
        assert "**同花顺AI客户端可用**" in text
        assert "待上线，当前不可调用" not in text
    domain = (target / "docs/api/a-share/README.md").read_text(encoding="utf-8")
    assert "端内专用，客户端可用" in domain


def test_client_only_mcp_source_is_not_published(inputs):
    source, target, config, page = inputs
    config["entry_templates"] = {
        "rest": "# 业务路由\n\n{{domains}}\n\n## 端内能力说明\n\n客户端可用。\n"
    }
    governance_path = source / "apps/docs/api-doc-governance.json"
    governance = json.loads(governance_path.read_text(encoding="utf-8"))
    governance["restClientOnly"] = [page.relative_to(source).as_posix()]
    governance_path.write_text(json.dumps(governance), encoding="utf-8")
    page.write_text(
        page.read_text(encoding="utf-8").replace(
            "---\n\n",
            "---\n\n<div className=\"ai-client-notice\"><a href=\"https://example.com\">客户端</a></div>\n",
            1,
        ),
        encoding="utf-8",
    )
    tool = source / "apps/docs/docs/mcp/tools/get_client_only_prices.mdx"
    tool.write_text(
        "---\ntitle: 端内行情工具\n---\n工具名：`get_client_only_prices`\n"
        "[GET /api/a-share/prices/snapshot](/docs/api-reference/prices#快照)\n",
        encoding="utf-8",
    )

    state = sync.synchronize(source, target, config)

    assert [record["kind"] for record in state["entries"]] == ["rest", "rest"]
    assert tool.relative_to(source).as_posix() in state["sources"]
    assert not (target / "docs/mcp/a-share").exists()


def test_heading_in_code_is_not_an_interface():
    text = "```text\n## example\n```\n## real\n"
    assert sync.headings(text) == [(text.index("## real"), "real")]


def test_ambiguous_or_unclassified_source_fails(inputs):
    source, target, config, page = inputs
    config["pages"] = {}
    with pytest.raises(sync.DocumentError, match="routing"):
        sync.synchronize(source, target, config)
    assert not target.exists()
    with pytest.raises(sync.DocumentError, match="ambiguous"):
        sync.split_rest(
            "## One\nGET /api/x\nGET /api/y\n## Two\nGET /api/z\n", True, "Test"
        )


def test_failed_replace_rolls_back_all_files(inputs, monkeypatch):
    source, target, config, page = inputs
    sync.synchronize(source, target, config)
    before = {p: p.read_bytes() for p in target.rglob("*") if p.is_file()}
    page.write_text(
        page.read_text(encoding="utf-8").replace("价格单位元", "价格单位人民币元"),
        encoding="utf-8",
    )
    real_replace, calls = sync.os.replace, []

    def fail_second(old, new):
        calls.append(new)
        if len(calls) == 2:
            raise OSError("simulated write failure")
        return real_replace(old, new)

    monkeypatch.setattr(sync.os, "replace", fail_second)
    with pytest.raises(OSError, match="simulated"):
        sync.synchronize(source, target, config)
    assert before == {p: p.read_bytes() for p in target.rglob("*") if p.is_file()}


def test_mcp_identity_and_atomic_rest_link(inputs):
    source, target, config, _ = inputs
    tool = source / "apps/docs/docs/mcp/tools/get_snapshot.mdx"
    tool.write_text(
        "---\ntitle: 快照工具\n---\n工具名：`get_snapshot`\n"
        "[GET /api/a-share/prices/snapshot](/docs/api-reference/prices#快照)\n",
        encoding="utf-8",
    )
    state = sync.synchronize(source, target, config)
    record = next(r for r in state["entries"] if r["kind"] == "mcp")
    text = (target / record["output"]).read_text(encoding="utf-8")
    assert "../../api/a-share/prices.md#prices-snapshot--快照" in text
    tool.write_text(
        tool.read_text(encoding="utf-8").replace(
            "工具名：`get_snapshot`", "工具名：`invented`"
        ),
        encoding="utf-8",
    )
    with pytest.raises(sync.DocumentError, match="identity"):
        sync.synchronize(source, target, config)
