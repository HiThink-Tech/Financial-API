"""Mirror canonical public contracts into the standalone hithink-finance Skill."""

from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
REFERENCES = REPO_ROOT / "skills" / "hithink-finance" / "references"
API_SOURCE = REPO_ROOT / "docs" / "api"
API_ENTRY_TARGET = REFERENCES / "api.md"
API_DETAIL_TARGET = REFERENCES / "api"
MCP_ENTRY_SOURCE = REPO_ROOT / "docs" / "mcp.md"
MCP_ENTRY_TARGET = REFERENCES / "mcp.md"
MCP_DETAIL_SOURCE = REPO_ROOT / "docs" / "mcp"
MCP_DETAIL_TARGET = REFERENCES / "mcp"


def markdown_files(root: Path, *, exclude: set[str] | None = None) -> dict[str, Path]:
    excluded = exclude or set()
    return {
        path.name: path
        for path in sorted(root.glob("*.md"))
        if path.name not in excluded
    }


def api_entry_content() -> str:
    """Make the standalone entry self-contained and point links at api/ details."""
    content = (API_SOURCE / "README.md").read_text(encoding="utf-8")
    content = "\n".join(
        line
        for line in content.splitlines()
        if "llms-full" not in line and "llms.txt" not in line
    ).replace("本目录是", "本 Skill 内置契约是")
    for filename in markdown_files(API_SOURCE, exclude={"README.md"}):
        content = content.replace(f"({filename})", f"(api/{filename})")
    return content.rstrip() + "\n"


def tree_drift(source_root: Path, target_root: Path, label: str) -> list[str]:
    problems: list[str] = []
    source_files = markdown_files(source_root)
    target_files = markdown_files(target_root) if target_root.exists() else {}

    for name in sorted(source_files.keys() - target_files.keys()):
        problems.append(f"missing Skill {label} mirror: {name}")
    for name in sorted(target_files.keys() - source_files.keys()):
        problems.append(f"unexpected Skill {label} mirror: {name}")
    for name in sorted(source_files.keys() & target_files.keys()):
        if source_files[name].read_bytes() != target_files[name].read_bytes():
            problems.append(f"stale Skill {label} mirror: {name}")
    return problems


def drift() -> list[str]:
    problems: list[str] = []
    expected_api_entry = api_entry_content()
    if not API_ENTRY_TARGET.is_file():
        problems.append("missing Skill API entry: references/api.md")
    elif API_ENTRY_TARGET.read_text(encoding="utf-8") != expected_api_entry:
        problems.append("stale Skill API entry: references/api.md")

    api_detail_source = markdown_files(API_SOURCE, exclude={"README.md"})
    api_detail_target = (
        markdown_files(API_DETAIL_TARGET) if API_DETAIL_TARGET.exists() else {}
    )
    for name in sorted(api_detail_source.keys() - api_detail_target.keys()):
        problems.append(f"missing Skill API mirror: {name}")
    for name in sorted(api_detail_target.keys() - api_detail_source.keys()):
        problems.append(f"unexpected Skill API mirror: {name}")
    for name in sorted(api_detail_source.keys() & api_detail_target.keys()):
        if api_detail_source[name].read_bytes() != api_detail_target[name].read_bytes():
            problems.append(f"stale Skill API mirror: {name}")

    if not MCP_ENTRY_TARGET.is_file():
        problems.append("missing Skill MCP entry: references/mcp.md")
    elif MCP_ENTRY_SOURCE.read_bytes() != MCP_ENTRY_TARGET.read_bytes():
        problems.append("stale Skill MCP entry: references/mcp.md")
    problems.extend(tree_drift(MCP_DETAIL_SOURCE, MCP_DETAIL_TARGET, "MCP"))
    return problems


def sync_tree(source_root: Path, target_root: Path) -> None:
    target_root.mkdir(parents=True, exist_ok=True)
    source_files = markdown_files(source_root)
    for path in target_root.glob("*.md"):
        if path.name not in source_files:
            path.unlink()
    for name, source in source_files.items():
        shutil.copyfile(source, target_root / name)


def sync() -> None:
    REFERENCES.mkdir(parents=True, exist_ok=True)
    API_ENTRY_TARGET.write_text(api_entry_content(), encoding="utf-8")

    API_DETAIL_TARGET.mkdir(parents=True, exist_ok=True)
    api_files = markdown_files(API_SOURCE, exclude={"README.md"})
    for path in API_DETAIL_TARGET.glob("*.md"):
        if path.name not in api_files:
            path.unlink()
    for name, source in api_files.items():
        shutil.copyfile(source, API_DETAIL_TARGET / name)

    shutil.copyfile(MCP_ENTRY_SOURCE, MCP_ENTRY_TARGET)
    sync_tree(MCP_DETAIL_SOURCE, MCP_DETAIL_TARGET)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Mirror docs/api and docs/mcp contracts into hithink-finance."
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="report drift without writing files",
    )
    args = parser.parse_args()

    if not args.check:
        sync()

    problems = drift()
    if problems:
        print("\n".join(problems), file=sys.stderr)
        return 1

    print("hithink-finance contract mirrors are synchronized")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
