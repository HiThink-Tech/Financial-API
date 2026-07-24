from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
SKILL_ROOT = REPO_ROOT / "skills" / "hithink-finance"


def _skill_text() -> str:
    return (SKILL_ROOT / "SKILL.md").read_text(encoding="utf-8")


def _api_capability_text() -> str:
    return (SKILL_ROOT / "references" / "api" / "capability-map.md").read_text(
        encoding="utf-8"
    )


def test_hithink_finance_skill_is_the_cross_interface_agent_entry() -> None:
    skill = _skill_text()

    assert "统一 Agent 入口" in skill
    for access_mode in ("REST API", "MCP", "CLI", "Python SDK"):
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
    ):
        assert capability in capability_map


def test_hithink_finance_skill_defines_safe_agent_execution_contract() -> None:
    skill = _skill_text()

    assert "消歧" in skill
    assert "JSON" in skill
    assert "落盘" in skill
    assert "环境变量" in skill
    assert "不得要求用户" in skill and "API Key" in skill
    assert "线上" in skill and "离线" in skill
    assert "模拟数据" in skill


def test_cli_entry_covers_setup_lifecycle_and_routes_to_builtin_skills() -> None:
    cli = (SKILL_ROOT / "references" / "cli.md").read_text(encoding="utf-8")
    setup = (SKILL_ROOT / "references" / "cli" / "setup.md").read_text(
        encoding="utf-8"
    )
    builtin = (SKILL_ROOT / "references" / "cli" / "builtin-skills.md").read_text(
        encoding="utf-8"
    )
    combined = cli + setup

    for command in (
        "--version",
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
    assert "已安装" in cli and "内置 Skill" in cli


def test_cli_skill_contract_verifies_the_active_agent_and_handles_long_data_init() -> None:
    skill = _skill_text()
    cli = (SKILL_ROOT / "references" / "cli.md").read_text(encoding="utf-8")
    setup = (SKILL_ROOT / "references" / "cli" / "setup.md").read_text(
        encoding="utf-8"
    )
    builtin = (SKILL_ROOT / "references" / "cli" / "builtin-skills.md").read_text(
        encoding="utf-8"
    )
    combined = "\n".join((skill, cli, setup, builtin))

    for required in (
        "当前 Agent 的 Skills 目录",
        "10 个 CLI 配套 Skill",
        "不能证明当前 Agent 已发现",
        "主动复制",
        "不覆盖无关 Skills",
        "data init",
        "不少于 15 分钟",
        "存活 PID",
        "不得在该 DB 上继续执行",
    ):
        assert required in combined


def test_skill_unifies_credentials_and_bootstraps_cli_without_reprompting() -> None:
    skill = _skill_text()
    setup = (SKILL_ROOT / "references" / "cli" / "setup.md").read_text(
        encoding="utf-8"
    )
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
    mcp = (SKILL_ROOT / "references" / "mcp" / "hithink-finance-fund.md").read_text(
        encoding="utf-8"
    )
    python_sdk = (SKILL_ROOT / "references" / "python-sdk.md").read_text(
        encoding="utf-8"
    )
    remote_toolkit = (
        SKILL_ROOT / "references" / "python-sdk" / "remote-toolkit.md"
    ).read_text(encoding="utf-8")

    for phrase in ("基金", "净值", "持仓", "持有人", "ETF"):
        assert phrase in skill + api + mcp + python_sdk
    assert "hithink-finance-fund" in mcp
    assert "fund_market_historical" in python_sdk + remote_toolkit


def test_skill_routes_valuation_tasks_across_all_access_modes() -> None:
    skill = _skill_text()
    api = _api_capability_text()
    mcp = (
        SKILL_ROOT / "references" / "mcp" / "hithink-finance-a-share.md"
    ).read_text(encoding="utf-8")
    builtin = (
        SKILL_ROOT / "references" / "cli" / "builtin-skills.md"
    ).read_text(encoding="utf-8")
    python_sdk = (SKILL_ROOT / "references" / "python-sdk.md").read_text(
        encoding="utf-8"
    )
    remote_toolkit = (
        SKILL_ROOT / "references" / "python-sdk" / "remote-toolkit.md"
    ).read_text(encoding="utf-8")

    assert "估值" in skill
    assert "/api/a-share/valuations/snapshot" in api
    assert "get_a_share_valuations_snapshot" in mcp
    assert "hithink-finance-valuation" in builtin
    assert "a_share_valuations_snapshot" in python_sdk + remote_toolkit


def test_skill_never_routes_agents_to_remote_llms_contract() -> None:
    combined = "\n".join(
        path.read_text(encoding="utf-8")
        for path in SKILL_ROOT.rglob("*")
        if path.is_file()
    )
    assert "llms-full" not in combined
