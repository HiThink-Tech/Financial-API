from __future__ import annotations

import importlib.util
from pathlib import Path

import pytest


REPO_ROOT = Path(__file__).resolve().parents[1]
SCRIPT_PATH = REPO_ROOT / "examples" / "inspirations" / "scripts" / "build_index.py"


def load_build_index():
    assert SCRIPT_PATH.exists(), "inspirations index builder must exist"
    spec = importlib.util.spec_from_file_location("inspirations_build_index", SCRIPT_PATH)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def write_inspiration(root: Path, slug: str = "01-demo") -> Path:
    item = root / slug
    item.mkdir(parents=True)
    (item / "README.md").write_text(
        """# 示例灵感

> 用一句话理解这个灵感。

## 适用场景

快速验证。

## Prompt 示例

```text
请读取 toolkit/README.md，使用当前能力生成一个单文件 HTML 页面，并比较 A < B & C > D。
```

## 效果预览

![示例页面](preview.jpg)

[打开静态 HTML](example.html)
""",
        encoding="utf-8",
    )
    (item / "preview.jpg").write_bytes(b"\xff\xd8\xff")
    (item / "example.html").write_text("<!doctype html><title>demo</title>", encoding="utf-8")
    return item


def test_discover_inspirations_extracts_markdown_metadata(tmp_path: Path):
    module = load_build_index()
    write_inspiration(tmp_path)

    items = module.discover_inspirations(tmp_path)

    assert [(item.slug, item.title, item.summary, item.prompt) for item in items] == [
        (
            "01-demo",
            "示例灵感",
            "用一句话理解这个灵感。",
            "请读取 toolkit/README.md，使用当前能力生成一个单文件 HTML 页面，并比较 A < B & C > D。",
        )
    ]


@pytest.mark.parametrize("missing", ["README.md", "preview.jpg", "example.html"])
def test_discover_inspirations_rejects_missing_required_asset(tmp_path: Path, missing: str):
    module = load_build_index()
    item = write_inspiration(tmp_path)
    (item / missing).unlink()

    with pytest.raises(ValueError, match=missing):
        module.discover_inspirations(tmp_path)


def test_discover_inspirations_rejects_invalid_jpeg(tmp_path: Path):
    module = load_build_index()
    item = write_inspiration(tmp_path)
    (item / "preview.jpg").write_bytes(b"not-a-jpeg")

    with pytest.raises(ValueError, match="invalid JPEG"):
        module.discover_inspirations(tmp_path)


def test_update_index_check_detects_stale_content_and_write_repairs_it(tmp_path: Path):
    module = load_build_index()
    write_inspiration(tmp_path)
    (tmp_path / "README.md").write_text(
        "# 灵感\n\n<!-- INSPIRATIONS:START -->\n过期内容\n<!-- INSPIRATIONS:END -->\n",
        encoding="utf-8",
    )

    with pytest.raises(ValueError, match="out of date"):
        module.update_index(tmp_path, check=True)

    module.update_index(tmp_path, check=False)
    generated = (tmp_path / "README.md").read_text(encoding="utf-8")
    assert "## 1. 示例灵感" in generated
    assert '<img src="01-demo/preview.jpg" alt="示例灵感" width="420">' in generated
    assert "<details>" in generated
    assert "<details open>" not in generated
    assert "<summary><strong>复制 Prompt</strong></summary>" in generated
    assert "A &lt; B &amp; C &gt; D" in generated
    assert '<a href="01-demo/README.md">查看完整说明</a>' in generated
    assert '<a href="01-demo/example.html">打开静态 HTML</a>' in generated
    assert "查看灵感与复制 Prompt" not in generated
    module.update_index(tmp_path, check=True)


@pytest.mark.parametrize(
    "unsupported",
    [
        "/cn-a/news/article-list",
        "/cn-a/special-data/hot-themes/list",
        "/cn-a/company/profile",
        "同花顺 F10 主营构成",
        "/cn-a/special-data/top-list/board",
    ],
)
def test_discover_inspirations_rejects_unsupported_capabilities(
    tmp_path: Path, unsupported: str
):
    module = load_build_index()
    item = write_inspiration(tmp_path)
    readme = item / "README.md"
    readme.write_text(
        readme.read_text(encoding="utf-8").replace(
            "使用当前能力", f"调用 {unsupported}"
        ),
        encoding="utf-8",
    )

    with pytest.raises(ValueError, match="unsupported capability"):
        module.discover_inspirations(tmp_path)


def test_repository_gallery_is_complete_and_index_is_current():
    module = load_build_index()
    gallery = REPO_ROOT / "examples" / "inspirations"

    items = module.discover_inspirations(gallery)

    assert len(items) == 6
    module.update_index(gallery, check=True)
    for item in items:
        html = (gallery / item.slug / "example.html").read_text(encoding="utf-8")
        assert "效果示意" in html
        assert "不构成投资建议" in html
        assert "sk-fuyao-" not in html
        assert "<script" not in html.lower()
