"""Build the standalone Skill from canonical REST and MCP documents."""

from __future__ import annotations

import argparse
import sys
import re
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
REFERENCES = REPO_ROOT / "skills" / "hithink-finance" / "references"
API_SOURCE = REPO_ROOT / "docs" / "api"
API_ENTRY_TARGET = REFERENCES / "api.md"
API_DETAIL_TARGET = REFERENCES / "api"
MCP_ENTRY_TARGET = REFERENCES / "mcp.md"
MCP_DETAIL_SOURCE = REPO_ROOT / "docs" / "mcp"
MCP_DETAIL_TARGET = REFERENCES / "mcp"
MCP_ROUTE_DOMAINS = ("meta", "a-share", "index", "fund", "futures", "options")
MCP_TOOL_ROW = re.compile(r"^\| \[[^]]+\]\((get_[^)]+\.md)\) \| `(get_[^`]+)` \|", re.M)


def markdown_files(root: Path, *, exclude: set[str] | None = None) -> dict[str, Path]:
    excluded = exclude or set()
    return {
        path.relative_to(root).as_posix(): path
        for path in sorted(root.rglob("*.md"))
        if path.relative_to(root).as_posix() not in excluded
    }


def api_entry_content() -> str:
    """Make the standalone entry self-contained and point links at api/ details."""
    content = (API_SOURCE / "README.md").read_text(encoding="utf-8")
    content = "\n".join(
        line
        for line in content.splitlines()
        if "llms-full" not in line and "llms.txt" not in line
    ).replace("本目录是", "本 Skill 内置契约是")
    content = re.sub(r"\]\((?!https?://|#)([^)]+)\)", r"](api/\1)", content)
    return content.rstrip() + "\n"


def api_grouped_content() -> dict[str, str]:
    """Mirror the public REST pages produced by the frontend synchronizer."""
    return {
        name: source.read_text(encoding="utf-8")
        for name, source in markdown_files(API_SOURCE).items()
    }


def mcp_text(content: str, *, response: bool = False) -> str:
    """Keep source prose while adapting links to the merged domain page."""
    lines = [re.sub(r"^> ?", "", line) for line in content.strip().splitlines()]
    text = "\n".join(lines).strip()
    if response:
        text = re.sub(r"\n?```.*?```\n?", "\n", text, flags=re.S).strip()

    def link(match: re.Match[str]) -> str:
        label, target = match.groups()
        if target.startswith("../../api/"):
            return f"[{label}](../api/{target.removeprefix('../../api/')})"
        if target.startswith(("https://", "http://")):
            return match.group(0)
        return label

    text = re.sub(r"\[([^]]+)\]\(([^)]+)\)", link, text)
    return re.sub(r"REST 端点\s+(?=\[)", "", text)


def mcp_tool_content(domain: str, name: str) -> str:
    source = MCP_DETAIL_SOURCE / domain / f"{name}.md"
    if not source.is_file():
        raise ValueError(f"MCP route references missing tool: {source.relative_to(REPO_ROOT)}")
    content = source.read_text(encoding="utf-8")
    title = re.search(r"^# (.+)$", content, re.M)
    identity = re.search(r"工具名：`([^`]+)`", content)
    sections = re.split(r"^## (.+)$", content, flags=re.M)
    blocks = dict(zip(sections[1::2], sections[2::2]))
    if not title or not identity or identity.group(1) != name:
        raise ValueError(f"invalid MCP tool identity: {source.relative_to(REPO_ROOT)}")
    if any(not blocks.get(heading, "").strip() for heading in ("工具描述", "参数", "返回")):
        raise ValueError(f"incomplete MCP tool sections: {source.relative_to(REPO_ROOT)}")

    parts = [f"### {title.group(1)}（`{name}`）"]
    for heading, label in (("工具描述", "描述"), ("参数", "入参"), ("返回", "响应")):
        body = mcp_text(blocks[heading], response=heading == "返回")
        if not body:
            raise ValueError(f"empty MCP {heading}: {source.relative_to(REPO_ROOT)}")
        parts.append(f"**{label}**\n\n{body}")
    return "\n\n".join(parts)


def mcp_route_content(domain: str) -> str:
    source = MCP_DETAIL_SOURCE / domain / "README.md"
    content = source.read_text(encoding="utf-8")
    groups = re.split(r"^## (.+)$", content, flags=re.M)
    title = re.search(r"^# (.+)$", groups[0], re.M)
    if not title:
        raise ValueError(f"missing MCP domain title: {source.relative_to(REPO_ROOT)}")
    introduction = "\n".join(
        line for line in groups[0].splitlines()[1:] if not line.startswith("[全部业务域]")
    ).strip()
    parts = [f"# {title.group(1)} MCP 工具", introduction]
    names: list[str] = []
    for heading, body in zip(groups[1::2], groups[2::2]):
        rows = MCP_TOOL_ROW.findall(body)
        if not rows:
            raise ValueError(f"empty MCP route group: {domain}/{heading}")
        note = body.split("| 需求 / 文档", 1)[0].strip()
        parts.append(f"## {heading}" + (f"\n\n{note}" if note else ""))
        for filename, name in rows:
            if filename != f"{name}.md":
                raise ValueError(f"MCP route name mismatch: {domain}/{filename}")
            names.append(name)
            parts.append(mcp_tool_content(domain, name))
    source_names = {path.stem for path in (MCP_DETAIL_SOURCE / domain).glob("get_*.md")}
    if len(names) != len(set(names)) or set(names) != source_names:
        raise ValueError(f"MCP route inventory mismatch: {domain}")
    return "\n\n".join(parts).rstrip() + "\n"


def drift() -> list[str]:
    problems: list[str] = []
    api_outputs = api_grouped_content()
    expected_api_entry = api_entry_content()
    if not API_ENTRY_TARGET.is_file():
        problems.append("missing Skill API entry: references/api.md")
    elif API_ENTRY_TARGET.read_text(encoding="utf-8") != expected_api_entry:
        problems.append("stale Skill API entry: references/api.md")

    api_detail_target = (
        markdown_files(API_DETAIL_TARGET) if API_DETAIL_TARGET.exists() else {}
    )
    for name in sorted(api_outputs.keys() - api_detail_target.keys()):
        problems.append(f"missing Skill API mirror: {name}")
    for name in sorted(api_detail_target.keys() - api_outputs.keys()):
        problems.append(f"unexpected Skill API mirror: {name}")
    for name in sorted(api_outputs.keys() & api_detail_target.keys()):
        if api_outputs[name] != api_detail_target[name].read_text(encoding="utf-8"):
            problems.append(f"stale Skill API mirror: {name}")

    if not MCP_ENTRY_TARGET.is_file():
        problems.append("missing Skill MCP entry: references/mcp.md")
    else:
        entry = MCP_ENTRY_TARGET.read_text(encoding="utf-8")
        for domain in MCP_ROUTE_DOMAINS:
            if f"mcp/{domain}.md" not in entry:
                problems.append(f"missing Skill MCP route link: {domain}")

    expected_routes = {f"{domain}.md" for domain in MCP_ROUTE_DOMAINS}
    actual_routes = (
        set(markdown_files(MCP_DETAIL_TARGET)) if MCP_DETAIL_TARGET.exists() else set()
    )
    for name in sorted(expected_routes - actual_routes):
        problems.append(f"missing Skill MCP route: {name}")
    for name in sorted(actual_routes - expected_routes):
        problems.append(f"unexpected Skill MCP document: {name}")
    for domain in MCP_ROUTE_DOMAINS:
        route = MCP_DETAIL_TARGET / f"{domain}.md"
        if not route.is_file():
            continue
        if route.read_text(encoding="utf-8") != mcp_route_content(domain):
            problems.append(f"stale Skill MCP route: {domain}")
    return problems


def sync_api_tree(outputs: dict[str, str], target_root: Path) -> None:
    target_root.mkdir(parents=True, exist_ok=True)
    for path in target_root.rglob("*.md"):
        if path.relative_to(target_root).as_posix() not in outputs:
            path.unlink()
    for name, content in outputs.items():
        (target_root / name).parent.mkdir(parents=True, exist_ok=True)
        (target_root / name).write_text(content, encoding="utf-8")
    for directory in sorted(
        target_root.rglob("*"), key=lambda p: len(p.parts), reverse=True
    ):
        if (
            directory.resolve().is_relative_to(target_root.resolve())
            and directory.is_dir()
            and not any(directory.iterdir())
        ):
            directory.rmdir()


def sync() -> None:
    api_outputs = api_grouped_content()
    routes = {domain: mcp_route_content(domain) for domain in MCP_ROUTE_DOMAINS}
    expected_routes = {f"{domain}.md" for domain in MCP_ROUTE_DOMAINS}
    REFERENCES.mkdir(parents=True, exist_ok=True)
    API_ENTRY_TARGET.write_text(api_entry_content(), encoding="utf-8")

    sync_api_tree(api_outputs, API_DETAIL_TARGET)

    MCP_DETAIL_TARGET.mkdir(parents=True, exist_ok=True)
    for path in MCP_DETAIL_TARGET.rglob("*.md"):
        if path.relative_to(MCP_DETAIL_TARGET).as_posix() not in expected_routes:
            path.unlink()
    for domain, content in routes.items():
        (MCP_DETAIL_TARGET / f"{domain}.md").write_text(content, encoding="utf-8")
    for directory in sorted(
        MCP_DETAIL_TARGET.rglob("*"), key=lambda path: len(path.parts), reverse=True
    ):
        if directory.is_dir() and not any(directory.iterdir()):
            directory.rmdir()


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Build REST source-page references and MCP domain references."
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="report drift without writing files",
    )
    args = parser.parse_args()

    try:
        if not args.check:
            sync()
        problems = drift()
    except ValueError as error:
        print(error, file=sys.stderr)
        return 1
    if problems:
        print("\n".join(problems), file=sys.stderr)
        return 1

    print("hithink-finance REST page and MCP domain references are synchronized")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
