from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
SKILL_ROOT = REPO_ROOT / "skills" / "hithink-finance"


def _skill_text() -> str:
    return (SKILL_ROOT / "SKILL.md").read_text(encoding="utf-8")


def _api_capability_text() -> str:
    return "\n".join(
        p.read_text(encoding="utf-8")
        for p in (SKILL_ROOT / "references/api").glob("*/README.md")
    )


def _mcp_domain_text(domain: str) -> str:
    entry = (SKILL_ROOT / "references/mcp.md").read_text(encoding="utf-8")
    return entry + (SKILL_ROOT / "references/mcp" / domain / "README.md").read_text(
        encoding="utf-8"
    )


def test_hithink_finance_skill_is_the_cross_interface_agent_entry() -> None:
    skill = _skill_text()

    assert "统一 Agent 入口" in skill
    for access_mode in ("REST API", "MCP", "CLI"):
        assert access_mode in skill
    assert "当前环境" in skill
    assert "能力" in skill
    assert "按需" in skill


def test_hithink_finance_skill_covers_recent_remote_capabilities() -> None:
    capability_map = _api_capability_text()

    for capability in (
        "financials/indicators",
        "anomaly-analysis",
        "skyrocket-list",
        "hot-stock-list",
        "hot-stock-rank-trend",
        "dragon-tiger-list",
        "/api/a-share/valuations/snapshot",
        "/api/fund/profile/detail",
        "/api/fund/market/historical",
        "/api/a-share/auction/snapshot",
        "/api/a-share/special-data/limit-down-pool",
        "/api/fund/managers/detail",
        "/api/fund/news/article-list",
    ):
        assert capability in capability_map


def test_hithink_finance_skill_defines_safe_agent_execution_contract() -> None:
    skill = _skill_text()

    assert "消歧" in skill
    assert "JSON" in skill
    assert "落盘" in skill
    assert "环境变量" in skill
    assert "不得强制用户" in skill and "API Key" in skill
    assert "线上" in skill and "离线" in skill
    assert "模拟数据" in skill


def test_hithink_finance_mcp_entry_routes_all_managed_services() -> None:
    entry = (SKILL_ROOT / "references" / "mcp.md").read_text(encoding="utf-8")

    for service in (
        "hithink-finance-a-share",
        "hithink-finance-a-share-index",
        "hithink-finance-meta",
        "hithink-finance-fund",
        "hithink-finance-futures",
        "hithink-finance-options",
    ):
        assert service in entry


def test_hithink_finance_skill_routes_confirmed_client_only_capabilities() -> None:
    skill = _skill_text()
    client_only = (SKILL_ROOT / "references" / "client-only-capabilities.md").read_text(
        encoding="utf-8"
    )

    assert "references/client-only-capabilities.md" in skill
    assert "先按公开能力完成当前任务" in skill
    for required in (
        "单只 A 股的资金流向",
        "单只 A 股",
        "高频动向",
        "A 股个股或指数",
        "最近 30 个 A 股交易日",
        "期货 F10 宏观指标历史",
        "资讯事件",
        "api/README.md#端内能力说明",
        "使用范围",
        "这项进一步数据能力已内置于同花顺AI客户端",
        "暂不通过公开 API、MCP、CLI 或 Python SDK 提供",
    ):
        assert required in client_only
    assert "同花顺AI客户端已接入当前数据源" in skill
    assert "尚未发布接入本项目数据源" not in skill + client_only
    assert "敬请期待" not in skill + client_only
    for public_only in ("期货品种板块", "期货交易时段", "期权会话时间轴"):
        assert public_only not in client_only


def test_cli_entry_covers_setup_lifecycle_and_routes_to_builtin_skills() -> None:
    cli = (SKILL_ROOT / "references" / "cli.md").read_text(encoding="utf-8")
    setup = (SKILL_ROOT / "references" / "cli" / "setup.md").read_text(encoding="utf-8")
    builtin = (SKILL_ROOT / "references" / "cli" / "builtin-skills.md").read_text(
        encoding="utf-8"
    )
    combined = cli + setup

    for command in (
        "version --format json",
        "auth status",
        "skills status",
        "skills sync",
        "doctor",
        "capabilities",
        "uninstall --plan",
    ):
        assert command in combined
    for topic in ("Node.js", "npm", "新会话", "最小验证", "卸载"):
        assert topic in combined
    for skill_name in (
        "hithink-finance-symbol",
        "hithink-finance-market",
        "hithink-finance-financials",
        "hithink-finance-index",
        "hithink-finance-special-data",
        "hithink-finance-data",
        "hithink-finance-research",
        "hithink-finance-shared",
        "hithink-finance-fund",
        "hithink-finance-valuation",
    ):
        assert skill_name in builtin
    assert "包内官方来源" in cli and "内置 Skill" in cli


def test_cli_skill_contract_verifies_the_active_agent_and_handles_long_data_init() -> (
    None
):
    skill = _skill_text()
    cli = (SKILL_ROOT / "references" / "cli.md").read_text(encoding="utf-8")
    setup = (SKILL_ROOT / "references" / "cli" / "setup.md").read_text(encoding="utf-8")
    builtin = (SKILL_ROOT / "references" / "cli" / "builtin-skills.md").read_text(
        encoding="utf-8"
    )
    combined = "\n".join((skill, cli, setup, builtin))

    for required in (
        "当前 Agent 的 Skills 目录",
        "下列 Skills",
        "不能证明当前 Agent 已发现",
        "不要手工复制",
        "用户占用",
        "data init",
        "不少于 15 分钟",
        "存活 PID",
        "不得在该 DB 上继续执行",
    ):
        assert required in combined


def test_skill_unifies_credentials_and_bootstraps_cli_without_reprompting() -> None:
    skill = _skill_text()
    setup = (SKILL_ROOT / "references" / "cli" / "setup.md").read_text(encoding="utf-8")
    combined = skill + setup

    for required in (
        "HITHINK_FINANCE_API_KEY",
        "credentials.env",
        "也可以直接发给我",
        "--api-key-stdin",
        "--replace",
    ):
        assert required in combined
    for platform_path in ("%APPDATA%", "Application Support", "XDG_CONFIG_HOME"):
        assert platform_path in combined
    assert "不要求安装 CLI" in combined
    assert "不再提示" in combined or "不重复" in combined
    assert "安装失败" in combined and "回退" in combined
    assert "系统凭据" in combined and "独立" in combined


def test_skill_routes_fund_tasks_across_all_access_modes() -> None:
    skill = _skill_text()
    api = _api_capability_text()
    mcp = _mcp_domain_text("fund")
    builtin = (SKILL_ROOT / "references/cli/builtin-skills.md").read_text(
        encoding="utf-8"
    )

    for phrase in ("基金", "净值", "持仓", "持有人", "ETF"):
        assert phrase in skill + api + mcp + builtin
    assert "hithink-finance-fund" in mcp
    assert "hithink-finance-fund" in builtin


def test_skill_routes_auction_and_extended_fund_tasks() -> None:
    skill = _skill_text()
    mcp_a_share = _mcp_domain_text("a-share")
    mcp_fund = _mcp_domain_text("fund")

    for phrase in (
        "集合竞价",
        "跌停",
        "炸板",
        "基金经理",
        "基金公司",
        "基金资讯",
        "基金回测",
        "基金指标",
        "QDII 额度",
    ):
        assert phrase in skill
    assert "get_a_share_auction_snapshot" in mcp_a_share
    assert "get_a_share_special_data_limit_break_pool" in mcp_a_share
    assert "get_fund_managers_detail" in mcp_fund
    assert "get_fund_news_article_list" in mcp_fund
    assert "get_fund_backtest_result" in mcp_fund
    assert "get_fund_indicators_table" in mcp_fund
    assert "get_fund_quota_list" in mcp_fund


def test_skill_routes_valuation_tasks_across_all_access_modes() -> None:
    skill = _skill_text()
    api = _api_capability_text()
    mcp = _mcp_domain_text("a-share")
    builtin = (SKILL_ROOT / "references" / "cli" / "builtin-skills.md").read_text(
        encoding="utf-8"
    )

    assert "估值" in skill
    assert "/api/a-share/valuations/snapshot" in api
    assert "get_a_share_valuations_snapshot" in mcp
    assert "hithink-finance-valuation" in builtin


def test_skill_never_routes_agents_to_remote_llms_contract() -> None:
    combined = "\n".join(
        path.read_text(encoding="utf-8")
        for path in SKILL_ROOT.rglob("*")
        if path.is_file()
    )
    assert "llms-full" not in combined
    assert "python-sdk" not in combined
