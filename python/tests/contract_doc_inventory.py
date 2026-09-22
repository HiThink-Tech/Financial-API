"""Read contract identities from the public REST page map and documents."""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def inventory():
    entries = []
    page_map = json.loads((ROOT / 'docs/api/page-map.json').read_text(encoding='utf-8'))
    assert page_map['version'] == 1
    for record in page_map['entries']:
        page = ROOT / record['output']
        text = page.read_text(encoding='utf-8')
        assert record['id'] in text, page
        if record['section_anchor']:
            assert f'<a id="{record["section_anchor"]}"></a>' in text, page
        method, endpoint = record['id'].split(' ', 1)
        assert method in {'GET', 'POST'} and endpoint.startswith('/api/'), page
        entries.append(dict(kind='rest', id=record['id'], endpoint=endpoint,
                            output=record['output'], section_anchor=record['section_anchor'],
                            domain=record['domain'],
                            access='client-only' if '**端内专用**' in text else 'public',
                            status='planned' if '**待上线，当前不可调用**' in text else 'documented'))
    assert len({record['id'] for record in entries}) == len(entries)
    actual = {
        path.relative_to(ROOT).as_posix()
        for path in (ROOT / 'docs/api').glob('*/*.md')
        if path.name != 'README.md'
    }
    assert actual == {record['output'] for record in entries}
    for page in sorted((ROOT / 'docs/mcp').glob('*/*.md')):
        if page.name == 'README.md':
            continue
        text = page.read_text(encoding='utf-8')
        endpoints = set(re.findall(r'\bGET (/api/[a-z0-9/-]+)', text))
        planned = page.parent.name == 'planned'
        assert planned or len(endpoints) == 1, page
        entries.append(dict(kind='mcp', id=page.stem, endpoint=next(iter(endpoints), ''),
                            output=page.relative_to(ROOT).as_posix(),
                            status='planned' if planned else 'documented'))
    return entries
