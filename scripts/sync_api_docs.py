"""Deterministic frontend REST/MCP Markdown import. No network or model calls."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import posixpath
import re
import tempfile
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
STATE = Path(".agents/skills/sync-api-docs/references/sync-state.json")
CONFIG = Path(".agents/skills/sync-api-docs/references/taxonomy.json")
SITE = "https://fuyao.aicubes.cn"
ENDPOINT = re.compile(r"\b(GET|POST|PUT|DELETE|PATCH) (/api/[a-zA-Z0-9_/{}/-]+)")
LINK = re.compile(r"(?<!!)\[([^\]\n]+)\]\(([^\s)]+)\)")


class DocumentError(ValueError):
    pass


def digest(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def frontmatter(text: str) -> tuple[dict, str]:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    match = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    if not match:
        raise DocumentError("Missing frontmatter")
    metadata = {}
    for line in match[1].splitlines():
        if ":" in line:
            key, value = line.split(":", 1)
            metadata[key] = value.strip().strip("\"'")
    if not metadata.get("title"):
        raise DocumentError("Missing title")
    return metadata, text[match.end() :].strip()


def headings(text: str, level: int = 2) -> list[tuple[int, str]]:
    result, fence, offset = [], None, 0
    for line in text.splitlines(keepends=True):
        marker = re.match(r"^\s*(`{3,}|~{3,})", line)
        if marker:
            token = marker[1]
            if fence is None:
                fence = token
            elif token[0] == fence[0] and len(token) >= len(fence):
                fence = None
        elif fence is None and line.startswith("#" * level + " "):
            result.append((offset, line[level + 1 :].strip()))
        offset += len(line)
    if fence:
        raise DocumentError("Unclosed code fence")
    return result


def anchor(title: str) -> str:
    explicit = re.search(r"\{#([^}]+)\}", title)
    if explicit:
        return explicit[1]
    return re.sub(r"[^\w\-\u4e00-\u9fff ]", "", title.lower()).replace(" ", "-")


def title_text(title: str) -> str:
    return re.sub(r"\s*\{#[^}]+\}", "", title)


def markdown(body: str, client_only: bool = False) -> str:
    # The sole presentation-only widget accepted by the importer. Its status
    # and destination are represented by the generated access banner.
    if client_only:
        body, count = re.subn(
            r'<div className="ai-client-notice">.*?</a>\s*</div>', "", body, flags=re.S
        )
        if count != 1:
            raise DocumentError("Expected exactly one client access notice")
    body = re.sub(r"^import Link from [^\n]+\n?", "", body, flags=re.M)
    body = re.sub(r'<Link id="([^"]+)"\s*/>', r'<a id="\1"></a>', body)
    # Fail on unknown components; never silently drop content.
    if re.search(r"^\s*(?:import |</?[A-Z]|<div|<svg)", body, re.M):
        raise DocumentError("Unsupported MDX component")
    out, admonition, fence = [], False, False
    for line in body.splitlines():
        if line.startswith("```"):
            fence = not fence
        if not fence and line.startswith(":::"):
            if line.strip() == ":::":
                if not admonition:
                    raise DocumentError("Unmatched admonition")
                admonition = False
                out.append("")
            else:
                if admonition:
                    raise DocumentError(
                        "Nested admonition requires an explicit converter"
                    )
                admonition = True
                out.append("> **" + line[3:].strip() + "**")
        else:
            out.append(("> " + line if line else ">") if admonition else line)
    if admonition:
        raise DocumentError("Unclosed admonition")
    return "\n".join(out).strip() + "\n"


def compact_rest(body: str) -> str:
    """Centralize protocol boilerplate, retaining source-specific constraints.

    Only whole, known protocol bullets are omitted. New business wording stays
    verbatim, even when the source places it inside the common-conventions box.
    Fenced examples are never processed as presentation markup.
    """
    common = re.compile(
        r"(?:\*\*Base URL\*\*：`https://fuyao\.aicubes\.cn`。"
        r"|\*\*必需请求头\*\*[^\n]+"
        r"|本页接口结构用于说明计划接入同花顺AI客户端的数据契约，当前不作为外部接入入口。"
        r"|(?:所有接口|本页接口|接口)返回统一 `ApiResponse` 信封[；，]"
        r"(?:业务结果通过 `code` 表达。|包含 `code`、`message`、`data` 与 `request_id`。"
        r"|时间戳均为毫秒级 Unix 时间戳，时区按 `Asia/Shanghai`。"
        r"|ISO 日期按 `Asia/Shanghai` 解释，Unix 时间戳为毫秒。"
        r"|时间戳为毫秒级 Unix 时间戳，时间(?:与交易日)?窗(?:口)?按 `Asia/Shanghai` 判断。)"
        r"|时间戳字段(?:统一)?为毫秒级 Unix 时间戳(?:，时区按 `Asia/Shanghai`)?。)"
    )

    def conventions(match):
        retained = []
        for line in match[0].splitlines()[1:]:
            content = line.removeprefix("> ").strip()
            if content and not common.fullmatch(content.removeprefix("- ")):
                retained.append(content)
        return "\n".join(retained) + "\n"

    parts = re.split(r"(```[^\n]*\n.*?^```[^\n]*$)", body, flags=re.S | re.M)
    for i, part in enumerate(parts):
        if part.startswith("```"):
            continue
        part = re.sub(
            r"^> \*\*info 通用约定\*\*\n(?:>[^\n]*(?:\n|$))*",
            conventions, part, flags=re.M,
        )
        part = re.sub(r"^(?:\*\*)?MCP Tool(?:\*\*)?[^\n]*(?:\n|$)", "", part, flags=re.M)
        # Source overviews also expose MCP links in table columns.
        lines, columns, width = [], set(), 0
        for line in part.splitlines():
            if line.startswith("|") and line.rstrip().endswith("|"):
                cells = re.split(r"(?<!\\)\|", line.strip())[1:-1]
                excluded = {n for n, cell in enumerate(cells) if cell.strip() in ("MCP", "MCP Tool")}
                if excluded:
                    columns, width = excluded, len(cells)
                if columns:
                    if len(cells) != width:
                        raise DocumentError("Inconsistent REST/MCP table columns")
                    line = "|" + "|".join(cell for n, cell in enumerate(cells) if n not in columns) + "|"
            else:
                columns, width = set(), 0
            lines.append(line)
        parts[i] = re.sub(r"\n{3,}", "\n\n", "\n".join(lines) + "\n")
    return "".join(parts).strip() + "\n"


def split_rest(body: str, module: bool, title: str) -> list[tuple[str, str, str]]:
    if not module:
        endpoints = set(ENDPOINT.findall(body))
        if len(endpoints) != 1:
            raise DocumentError(f"Single page has {len(endpoints)} endpoints")
        return [(title, "", body)]
    hs = headings(body)
    if len(hs) < 2:
        raise DocumentError("Module must contain at least two interface sections")
    preamble = body[: hs[0][0]]
    result = []
    for i, (start, heading) in enumerate(hs):
        end = hs[i + 1][0] if i + 1 < len(hs) else len(body)
        section = body[start:end]
        if len(set(ENDPOINT.findall(section))) != 1:
            raise DocumentError(f"Interface section is ambiguous: {heading}")
        result.append((title_text(heading), anchor(heading), preamble + section))
    return result


def rel_link(source: str, target: str) -> str:
    return posixpath.relpath(target, posixpath.dirname(source))


def collect(source: Path, config: dict) -> tuple[list[dict], dict]:
    governance_path = source / "apps/docs/api-doc-governance.json"
    governance = json.loads(governance_path.read_text(encoding="utf-8"))
    hashes = {
        "apps/docs/api-doc-governance.json": digest(
            governance_path.read_text(encoding="utf-8")
        )
    }
    records = []
    classified = set(
        sum((governance[k] for k in ("restSingle", "restModule", "restOverview")), [])
    )
    actual = {
        p.relative_to(source).as_posix()
        for p in (source / "apps/docs/docs/api-reference").glob("*.mdx")
    }
    if actual != classified:
        raise DocumentError(
            f"Unclassified/missing REST pages: {sorted(actual ^ classified)}"
        )
    for kind in ("restSingle", "restModule"):
        for filename in governance[kind]:
            raw = (source / filename).read_text(encoding="utf-8")
            hashes[filename] = digest(raw)
            meta, body = frontmatter(raw)
            page = Path(filename).stem
            if page not in config["pages"]:
                raise DocumentError(f"Add business routing for {page}")
            domain, group = config["pages"][page]
            client = filename in governance["restClientOnly"]
            clean = markdown(body, client)
            all_headings = sorted(
                h for level in range(1, 7) for h in headings(clean, level)
            )
            counts, source_fragments = {}, []
            for offset, heading in all_headings:
                slug = anchor(heading)
                count = counts.get(slug, 0)
                counts[slug] = count + 1
                source_fragments.append(
                    (offset, slug + (f"-{count}" if count else ""), slug)
                )
            sections = headings(clean) if kind == "restModule" else []
            for number, (title, section_anchor, part) in enumerate(
                split_rest(clean, kind == "restModule", meta["title"])
            ):
                contract = (
                    part[headings(part)[0][0] :] if kind == "restModule" else part
                )
                method, endpoint = next(iter(set(ENDPOINT.findall(contract))))
                route_group = config.get("endpoint_groups", {}).get(endpoint, group)
                if (
                    domain not in config["domains"]
                    or route_group not in config["groups"]
                ):
                    raise DocumentError(f"Unknown business classification: {endpoint}")
                name = endpoint.removeprefix("/api/").split("/", 1)[1].replace("/", "-")
                start = sections[number][0] if sections else 0
                end = (
                    sections[number + 1][0]
                    if sections and number + 1 < len(sections)
                    else len(clean)
                )
                fragments = {
                    original: local
                    for offset, original, local in source_fragments
                    if start <= offset < end
                }
                records.append(
                    dict(
                        kind="rest",
                        id=f"{method} {endpoint}",
                        endpoint=endpoint,
                        title=title,
                        source=filename,
                        page=page,
                        anchor=section_anchor,
                        fragments=fragments,
                        domain=domain,
                        group=route_group,
                        body=part,
                        access="client-only" if client else "public",
                        # Client-only capability availability is maintained by
                        # this repository. The source page may still carry the
                        # historical pre-release notice for its public REST
                        # example, but the capability is available in the
                        # released AI client.
                        status=(
                            "documented"
                            if client
                            else (
                                "planned"
                                if "当前版本暂不可使用" in body or "敬请期待" in body
                                else "documented"
                            )
                        ),
                        output=f"docs/api/{domain}/{name}.md",
                    )
                )
    rest_by_endpoint = {r["endpoint"]: r for r in records}
    for path in sorted((source / "apps/docs/docs/mcp/tools").glob("*.mdx")):
        filename = path.relative_to(source).as_posix()
        raw = path.read_text(encoding="utf-8")
        hashes[filename] = digest(raw)
        meta, body = frontmatter(raw)
        if filename in governance["mcpPlaceholder"]:
            # Preserve placeholder pages as non-callable documentation.
            domain, group, endpoint, status = "planned", "overview", "", "planned"
        else:
            names = re.findall(r"工具名：`([^`]+)`", body)
            if names != [path.stem]:
                raise DocumentError(f"MCP tool identity mismatch: {filename}")
            endpoints = set(ENDPOINT.findall(body))
            if len(endpoints) != 1:
                raise DocumentError(f"MCP REST mapping missing/ambiguous: {filename}")
            endpoint = next(iter(endpoints))[1]
            rest = rest_by_endpoint.get(endpoint)
            if not rest:
                raise DocumentError(f"MCP has no public REST document: {filename}")
            if rest["access"] == "client-only":
                # The frontend also records the AI-client tool contract beside
                # its REST page. It is not a public MCP surface, so retain its
                # source hash but do not publish a MCP mirror.
                continue
            domain, group, status = rest["domain"], rest["group"], "documented"
        records.append(
            dict(
                kind="mcp",
                id=path.stem,
                endpoint=endpoint,
                title=meta["title"],
                source=filename,
                page=path.stem,
                anchor="",
                domain=domain,
                group=group,
                body=markdown(body),
                access="public",
                status=status,
                output=f"docs/mcp/{domain}/{path.stem}.md",
            )
        )
    ids = [(r["kind"], r["id"]) for r in records]
    if len(set(ids)) != len(ids) or len({r["output"] for r in records}) != len(records):
        raise DocumentError("Duplicate interface/tool identity")
    return records, hashes


def render(source: Path, config: dict) -> tuple[dict[str, str], dict]:
    records, hashes = collect(source, config)
    outputs, pages, anchors = {}, {}, {}
    for r in records:
        key = "/" + r["source"].removeprefix("apps/docs/").removesuffix(".mdx")
        pages.setdefault(key, []).append(r)
        if r["anchor"]:
            anchors[(key, r["anchor"])] = (r["output"], "")
        for original, local in r.get("fragments", {}).items():
            anchors[(key, original)] = (r["output"], local)
    # Module landing pages preserve the source page's local address and aliases.
    page_targets = {}
    for key, items in pages.items():
        if len(items) == 1:
            page_targets[key] = items[0]["output"]
        else:
            page_targets[key] = f"docs/api/{items[0]['domain']}/README.md"

    def rewrite(text: str, r: dict) -> str:
        source_url = "/" + r["source"].removeprefix("apps/docs/").removesuffix(".mdx")

        def replace(match):
            label, url = match.groups()
            parsed = urlsplit(url)
            if parsed.scheme or url.startswith("//"):
                return match[0]
            if url.startswith("#"):
                key = source_url
            elif parsed.path.startswith("/"):
                key = parsed.path.rstrip("/")
            else:
                key = posixpath.normpath(
                    posixpath.join(posixpath.dirname(source_url), parsed.path)
                )
            key = re.sub(r"\.mdx?$", "", key)
            fragment = unquote(parsed.fragment)
            resolved_anchor = anchors.get((key, fragment))
            target = resolved_anchor[0] if resolved_anchor else page_targets.get(key)
            if target:
                candidates = pages[key]
                same = [x for x in candidates if x["endpoint"] == r["endpoint"]]
                if len(same) == 1 and (not fragment or (key, fragment) not in anchors):
                    target = same[0]["output"]
                # Section links resolved to their standalone document. Generic
                # field anchors remain on the selected atomic document.
                destination_fragment = (
                    resolved_anchor[1] if resolved_anchor else fragment
                )
                suffix = "#" + destination_fragment if destination_fragment else ""
                return f'[{label}]({rel_link(r["output"], target)}{suffix})'
            if key.startswith("/docs/api-reference/"):
                # Overview documents have no endpoint body; business entry
                # supplies the local navigation while retaining the source link.
                overview = config["overviews"].get(key.rsplit("/", 1)[-1])
                if overview:
                    target = "docs/api/" + overview
                    return f'[{label}]({rel_link(r["output"], target)})'
                raise DocumentError(f"Unmapped REST link: {key}")
            return (
                f"[{label}]({SITE}{key}"
                + (f"?{parsed.query}" if parsed.query else "")
                + (f"#{fragment}" if fragment else "")
                + ")"
            )

        # Do not rewrite sample strings inside fenced code.
        parts = re.split(r"(```[^\n]*\n.*?^```[^\n]*$)", text, flags=re.S | re.M)
        return "".join(
            p if p.startswith("```") else LINK.sub(replace, p) for p in parts
        )

    for r in records:
        root = "docs/mcp" if r["kind"] == "mcp" else "docs/api"
        parent = f"{root}/{r['domain']}/README.md"
        banner = f"[业务导航]({rel_link(r['output'], parent)})"
        if r["access"] == "client-only":
            banner += f" · **端内专用** · **同花顺AI客户端可用** · [使用说明]({rel_link(r['output'], 'docs/api/README.md')}#端内能力说明)"
        if r["status"] == "planned":
            banner += " · **待上线，当前不可调用**"
        body = compact_rest(r["body"]) if r["kind"] == "rest" else r["body"]
        body = rewrite(body, r)
        body = re.sub(
            r"^(#{1,6} .+?)\s*\{#([^}]+)\}$", r'<a id="\2"></a>\n\1', body, flags=re.M
        )
        if r["kind"] == "rest":
            for required in ("请求参数", "```bash", "```json", "字段"):
                if required not in body:
                    raise DocumentError(
                        f'Incomplete REST document ({required}): {r["id"]}'
                    )
        for example in re.findall(r"```json\s*\n(.*?)\n```", body, re.S):
            try:
                json.loads(example)
            except json.JSONDecodeError as error:
                raise DocumentError(f'Invalid JSON example: {r["source"]}') from error
        outputs[r["output"]] = f"# {r['title']}\n\n{banner}\n\n{body}"
    # Independently compare source code blocks, rather than trusting the
    # splitter's own manifest as proof that examples survived conversion.
    for filename in {r["source"] for r in records}:
        raw = (source / filename).read_text(encoding="utf-8").replace("\r\n", "\n")
        combined = "\n".join(
            outputs[r["output"]] for r in records if r["source"] == filename
        )
        for block in re.findall(r"```[^\n]*\n.*?^```", raw, re.S | re.M):
            if block not in combined:
                raise DocumentError(f"Code example lost in conversion: {filename}")
    for kind, root in [("rest", "docs/api"), ("mcp", "docs/mcp")]:
        subset = [r for r in records if r["kind"] == kind]
        domains = [
            domain
            for domain in config["domains"]
            if any(r["domain"] == domain for r in subset)
        ]
        entry = f"{root}/README.md"
        entry_template = config.get("entry_templates", {}).get(
            kind, "# 业务路由\n\n{{domains}}\n"
        )
        domain_links = ""
        for domain in domains:
            info = config["domains"][domain]
            domain_links += (
                f"- [{info['title']}]({domain}/README.md)：{info['intent']}\n"
            )
            domain_path = f"{root}/{domain}/README.md"
            outputs[domain_path] = (
                f"# {info['title']}\n\n[全部业务域](../README.md)\n\n{info['intent']}\n\n"
            )
            for group in (
                group
                for group in config["groups"]
                if any(r["domain"] == domain and r["group"] == group for r in subset)
            ):
                group_info = config["groups"][group]
                intent = info.get("group_intents", {}).get(group, group_info["intent"])
                text = f"\n## {group_info['title']}\n\n{intent}\n\n"
                text += "| 需求 / 文档 | 接口或工具 | 使用范围 |\n| --- | --- | --- |\n"
                for r in subset:
                    if (r["domain"], r["group"]) == (domain, group):
                        scope = (
                            "端内专用，客户端可用"
                            if r["access"] == "client-only"
                            else "公开"
                        )
                        if r["status"] == "planned":
                            scope += "，待上线"
                        text += f"| [{r['title']}]({rel_link(domain_path, r['output'])}) | `{r['id']}` | {scope} |\n"
                outputs[domain_path] += text
        outputs[entry] = entry_template.replace("{{domains}}", domain_links.rstrip())
    entries = [{k: v for k, v in r.items() if k != "body"} for r in records]
    for filename, expected in hashes.items():
        if digest((source / filename).read_text(encoding="utf-8")) != expected:
            raise DocumentError(f"Source changed during synchronization: {filename}")
    return outputs, {
        "version": 1,
        "sources": hashes,
        "entries": entries,
        "outputs": {k: digest(v) for k, v in sorted(outputs.items())},
        "exceptions": config["exceptions"],
    }


def safe_target(root: Path, name: str) -> Path:
    path = (root / name).resolve()
    if not path.is_relative_to(root.resolve()) or name.startswith(("/", "\\")):
        raise DocumentError(f"Unsafe generated path: {name}")
    return path


def validate_links(outputs: dict[str, str], target: Path) -> None:
    """Validate generated local destinations before replacing any document."""
    for name, body in outputs.items():
        body = re.sub(r"```.*?```", "", body, flags=re.S)
        for _, url in LINK.findall(body):
            if re.match(r"\w+:|//", url):
                continue
            filename, _, fragment = url.partition("#")
            destination = (
                posixpath.normpath(posixpath.join(posixpath.dirname(name), filename))
                if filename
                else name
            )
            path = safe_target(target, destination)
            text = outputs.get(destination)
            if text is None:
                if not path.is_file():
                    raise DocumentError(f"Missing document link: {name} -> {url}")
                text = path.read_text(encoding="utf-8")
            if fragment:
                available = set(re.findall(r'<a id="([^"]+)"', text))
                available.update(
                    anchor(h) for level in range(1, 7) for _, h in headings(text, level)
                )
                if unquote(fragment) not in available:
                    raise DocumentError(f"Missing fragment: {name} -> {url}")


def synchronize(source: Path, target: Path, config: dict, check: bool = False) -> dict:
    if source.resolve() == target.resolve() or target.resolve().is_relative_to(
        source.resolve()
    ):
        raise DocumentError("Target must be outside the frontend source")
    outputs, state = render(source, config)
    validate_links(outputs, target)
    state_file = target / STATE
    old = (
        json.loads(state_file.read_text(encoding="utf-8"))
        if state_file.exists()
        else {"outputs": {}}
    )
    owned_roots = tuple(
        f"{root}/{domain}"
        for root in ("docs/api", "docs/mcp")
        for domain in config["domains"]
    )
    actual = {
        p.relative_to(target).as_posix()
        for folder in owned_roots
        for p in (target / folder).rglob("*.md")
    }
    unexpected = actual - set(old["outputs"]) - set(outputs)
    if unexpected:
        raise DocumentError(
            f"Unmanaged files in generated directories: {sorted(unexpected)}"
        )
    changed = [
        p
        for p, value in outputs.items()
        if not safe_target(target, p).exists()
        or safe_target(target, p).read_text(encoding="utf-8") != value
    ]
    removed = sorted(set(old["outputs"]) - set(outputs))
    for name in removed:
        if not name.startswith(("docs/api/", "docs/mcp/")):
            raise DocumentError(f"Unowned deletion: {name}")
    state_text = json.dumps(state, ensure_ascii=False, indent=2) + "\n"
    state_changed = (
        not state_file.exists() or state_file.read_text(encoding="utf-8") != state_text
    )
    if check:
        if changed or removed or state_changed:
            raise DocumentError(
                f"Document drift: {len(changed)} changed, {len(removed)} removed, state={state_changed}"
            )
        return state
    # Refuse to overwrite local edits to previously generated files.
    for name in set(changed) | set(removed):
        path = safe_target(target, name)
        if path.exists() and (
            name not in old["outputs"]
            or digest(path.read_text(encoding="utf-8")) != old["outputs"][name]
        ):
            raise DocumentError(f"Generated file has local modifications: {name}")
    mutations = {name: outputs[name] for name in changed}
    mutations[str(STATE).replace("\\", "/")] = state_text
    backups = {
        name: (
            safe_target(target, name).read_bytes()
            if safe_target(target, name).exists()
            else None
        )
        for name in set(mutations) | set(removed)
    }
    # All source parsing and link resolution has succeeded before any write.
    try:
        # The state is the completion marker: replace it after output deletions.
        ordered = [name for name in mutations if name != STATE.as_posix()] + [
            STATE.as_posix()
        ]
        for name in ordered:
            if name == STATE.as_posix():
                for deleted in removed:
                    safe_target(target, deleted).unlink(missing_ok=True)
            value = mutations[name]
            path = safe_target(target, name)
            path.parent.mkdir(parents=True, exist_ok=True)
            with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as stream:
                temp = Path(stream.name)
                stream.write(value.encode("utf-8"))
            try:
                os.replace(temp, path)
            finally:
                temp.unlink(missing_ok=True)
    except BaseException:
        for name, value in backups.items():
            path = safe_target(target, name)
            if value is None:
                path.unlink(missing_ok=True)
            else:
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(value)
        raise
    for folder in ("docs/api", "docs/mcp"):
        for directory in sorted(
            (target / folder).rglob("*"), key=lambda p: len(p.parts), reverse=True
        ):
            safe_target(target, directory.relative_to(target).as_posix())
            if directory.is_dir() and not any(directory.iterdir()):
                directory.rmdir()
    return state


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-repo", required=True, type=Path)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    try:
        config = json.loads((ROOT / CONFIG).read_text(encoding="utf-8"))
        config["entry_templates"] = {
            kind: (ROOT / CONFIG.parent / f"{name}-entry.md").read_text(
                encoding="utf-8"
            )
            for kind, name in [("rest", "api"), ("mcp", "mcp")]
        }
        state = synchronize(args.source_repo, ROOT, config, args.check)
        print(
            f"REST {sum(r['kind'] == 'rest' for r in state['entries'])}; MCP {sum(r['kind'] == 'mcp' for r in state['entries'])}; documents synchronized"
        )
        return 0
    except (DocumentError, OSError, KeyError) as error:
        print(str(error))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
