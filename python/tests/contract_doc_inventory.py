"""Read contract identities from the public documentation tree."""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def inventory():
    entries = []
    for page in sorted((ROOT / 'docs/api').glob('*/*.md')):
        if page.name == 'README.md':
            continue
        text = page.read_text(encoding='utf-8')
        matches = {
            (method, endpoint)
            for method, endpoint in re.findall(r'\b(GET|POST) (/api/[a-z0-9/-]+)', text)
            if endpoint.removeprefix('/api/').split('/', 1)[-1].replace('/', '-') == page.stem
        }
        assert len(matches) == 1, page
        method, endpoint = matches.pop()
        entries.append(dict(kind='rest', id=f'{method} {endpoint}', endpoint=endpoint,
                            output=page.relative_to(ROOT).as_posix(), domain=page.parent.name,
                            access='client-only' if '**端内专用**' in text else 'public',
                            status='planned' if '**待上线，当前不可调用**' in text else 'documented'))
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
