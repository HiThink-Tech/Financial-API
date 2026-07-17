#!/usr/bin/env python3
"""Build and verify the generated index in examples/inspirations/README.md."""

from __future__ import annotations

import argparse
import html
import re
from pathlib import Path
from typing import NamedTuple


START_MARKER = "<!-- INSPIRATIONS:START -->"
END_MARKER = "<!-- INSPIRATIONS:END -->"
SLUG_PATTERN = re.compile(r"^\d{2}-[a-z0-9-]+$")
PROMPT_PATTERN = re.compile(
    r"^## Prompt 示例[ \t]*\r?\n.*?^```(?:markdown|text)?[ \t]*\r?\n"
    r"(?P<prompt>.*?)(?:\r?\n)```[ \t]*$",
    re.MULTILINE | re.DOTALL,
)
ROUTE_PATTERN = re.compile(r"^- 推荐路径：(?P<route>.+?)。[ \t]*$", re.MULTILINE)
UNSUPPORTED_CAPABILITIES = (
    "/cn-a/news/article-list",
    "/cn-a/special-data/hot-themes/",
    "/cn-a/company/profile",
    "同花顺 F10 主营构成",
    "/cn-a/special-data/top-list/",
)


class Inspiration(NamedTuple):
    slug: str
    title: str
    summary: str
    route: str
    prompt: str


def _read_metadata(readme: Path) -> tuple[str, str, str, str]:
    content = readme.read_text(encoding="utf-8")
    for capability in UNSUPPORTED_CAPABILITIES:
        if capability in content:
            raise ValueError(f"{readme}: unsupported capability {capability}")
    lines = content.splitlines()
    title = next((line[2:].strip() for line in lines if line.startswith("# ")), "")
    summary = next((line[2:].strip() for line in lines if line.startswith("> ")), "")
    if not title:
        raise ValueError(f"{readme}: missing level-one title")
    if not summary:
        raise ValueError(f"{readme}: missing blockquote summary")
    prompt_match = PROMPT_PATTERN.search(content)
    if not prompt_match or not prompt_match.group("prompt").strip():
        raise ValueError(f"{readme}: missing fenced Prompt body under '## Prompt 示例'")
    route_match = ROUTE_PATTERN.search(content)
    if not route_match:
        raise ValueError(f"{readme}: missing recommended route under '## 能力与口径'")
    return title, summary, route_match.group("route").strip(), prompt_match.group("prompt").strip()


def discover_inspirations(root: Path) -> list[Inspiration]:
    """Discover numbered inspiration directories and validate required assets."""
    items: list[Inspiration] = []
    for directory in sorted(path for path in root.iterdir() if path.is_dir()):
        if not SLUG_PATTERN.fullmatch(directory.name):
            continue
        for filename in ("README.md", "preview.jpg", "example.html"):
            if not (directory / filename).is_file():
                raise ValueError(f"{directory}: missing {filename}")
        if not (directory / "preview.jpg").read_bytes().startswith(b"\xff\xd8\xff"):
            raise ValueError(f"{directory}: invalid JPEG signature in preview.jpg")
        title, summary, route, prompt = _read_metadata(directory / "README.md")
        items.append(Inspiration(directory.name, title, summary, route, prompt))
    if not items:
        raise ValueError(f"{root}: no numbered inspiration directories found")
    return items


def render_index(items: list[Inspiration]) -> str:
    sections: list[str] = []
    for position, item in enumerate(items, start=1):
        title = html.escape(item.title)
        summary = html.escape(item.summary)
        route = html.escape(item.route)
        prompt = html.escape(item.prompt, quote=False)
        sections.append(
            "\n".join(
                [
                    f"## {position}. {item.title}",
                    "",
                    "<table>",
                    "<tr>",
                    '<td width="440" valign="top">',
                    f'<a href="{item.slug}/example.html"><img src="{item.slug}/preview.jpg" '
                    f'alt="{title}" width="420"></a>',
                    "</td>",
                    '<td valign="top">',
                    f"<p>{summary}</p>",
                    f'<p><strong>{route}</strong> · '
                    f'<a href="{item.slug}/README.md">查看完整说明</a> · '
                    f'<a href="{item.slug}/example.html">打开单文件 HTML</a></p>',
                    "<details>",
                    "<summary><strong>复制完整 Prompt</strong></summary>",
                    f"<pre><code>{prompt}</code></pre>",
                    "</details>",
                    "</td>",
                    "</tr>",
                    "</table>",
                ]
            )
        )
    return "\n\n".join(sections)


def _default_readme() -> str:
    return """# 灵感

复制一段 Prompt，就能让安装了 `hithink-finance` Skill 的 Agent 生成第一张金融看板。无需克隆本仓库，也无需先写设计文档。

每个灵感都默认产出可离线打开的单文件 HTML。截图和示例 HTML 只展示一种可能效果，不是模板。

<!-- INSPIRATIONS:START -->
<!-- INSPIRATIONS:END -->
"""


def update_index(root: Path, check: bool = False) -> None:
    """Update the generated index block, or fail when ``check`` finds drift."""
    readme = root / "README.md"
    current = readme.read_text(encoding="utf-8") if readme.exists() else _default_readme()
    if START_MARKER not in current or END_MARKER not in current:
        raise ValueError(f"{readme}: missing generated index markers")
    before, remainder = current.split(START_MARKER, maxsplit=1)
    _, after = remainder.split(END_MARKER, maxsplit=1)
    block = render_index(discover_inspirations(root))
    expected = f"{before}{START_MARKER}\n{block}\n{END_MARKER}{after}"
    if check:
        if not readme.exists() or current != expected:
            raise ValueError(f"{readme}: generated index is out of date")
        return
    readme.write_text(expected, encoding="utf-8")


def default_inspirations_root() -> Path:
    """Return the monorepo-level static inspiration gallery."""
    return Path(__file__).resolve().parents[3] / "examples" / "inspirations"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="fail if README.md is stale")
    parser.add_argument(
        "--root",
        type=Path,
        default=default_inspirations_root(),
        help="inspirations directory (defaults to the monorepo gallery)",
    )
    args = parser.parse_args()
    update_index(args.root.resolve(), check=args.check)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
