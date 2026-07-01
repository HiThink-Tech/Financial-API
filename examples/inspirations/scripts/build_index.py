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
    r"^## Prompt 示例[ \t]*\r?\n(?:\r?\n)*```(?:text)?[ \t]*\r?\n"
    r"(?P<prompt>.*?)(?:\r?\n)```[ \t]*$",
    re.MULTILINE | re.DOTALL,
)
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
    prompt: str


def _read_metadata(readme: Path) -> tuple[str, str, str]:
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
    return title, summary, prompt_match.group("prompt").strip()


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
        title, summary, prompt = _read_metadata(directory / "README.md")
        items.append(Inspiration(directory.name, title, summary, prompt))
    if not items:
        raise ValueError(f"{root}: no numbered inspiration directories found")
    return items


def render_index(items: list[Inspiration]) -> str:
    sections: list[str] = []
    for position, item in enumerate(items, start=1):
        title = html.escape(item.title)
        summary = html.escape(item.summary)
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
                    f'<p><a href="{item.slug}/README.md">查看完整说明</a> · '
                    f'<a href="{item.slug}/example.html">打开静态 HTML</a></p>',
                    "<details>",
                    "<summary><strong>复制 Prompt</strong></summary>",
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

复制一段 Prompt，调用本项目已有数据能力，制作你的第一张金融看板。

截图和静态 HTML 只展示一种可能效果，不是模板或复现标准。可在本页展开并复制 Prompt 交给 Agent，让它自由设计页面。

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


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="fail if README.md is stale")
    parser.add_argument(
        "--root",
        type=Path,
        default=Path(__file__).resolve().parents[1],
        help="inspirations directory (defaults to the script's parent gallery)",
    )
    args = parser.parse_args()
    update_index(args.root.resolve(), check=args.check)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
