from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
SKILL_PATH = REPO_ROOT / "skills" / "financial-api" / "SKILL.md"


def _skill_text() -> str:
    return SKILL_PATH.read_text(encoding="utf-8")


def test_financial_api_skill_is_the_user_agent_entry_and_routes_to_toolkits():
    skill = _skill_text()

    assert "Agent 入口" in skill
    assert "toolkit/README.md" in skill
    assert "source of truth" in skill.lower()
    assert "toolkit/marketdb/README.md" in skill
    assert "toolkit/fuyao/README.md" in skill
    assert "examples/README.md" in skill


def test_financial_api_skill_covers_recent_remote_capabilities():
    skill = _skill_text()

    for capability in (
        "financials-indicators",
        "anomaly-analysis",
        "skyrocket-list",
        "hot-stock-list",
        "hot-stock-rank-trend",
        "dragon-tiger-list",
    ):
        assert capability in skill


def test_financial_api_skill_defines_safe_agent_execution_contract():
    skill = _skill_text()

    assert "消歧" in skill
    assert "JSON" in skill
    assert "/tmp/" in skill
    assert "环境变量" in skill
    assert "不要" in skill and "token" in skill.lower()
    assert "线上" in skill and "离线" in skill
    assert "模拟数据" in skill
