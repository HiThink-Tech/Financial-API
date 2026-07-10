import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

const [packageName, cacheFile] = process.argv.slice(2);
if (packageName === undefined || cacheFile === undefined) process.exit(2);
const state = { checkedAt: Date.now(), status: 'failure' };
try {
  const response = await fetch(
    `https://registry.npmjs.org/${packageName.replace('/', '%2f')}/latest`,
    { signal: AbortSignal.timeout(15_000) },
  );
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const body = await response.json();
  if (typeof body.version !== 'string') throw new Error('missing version');
  state.status = 'success';
  state.latestVersion = body.version;
} catch {
  // Update checks are advisory; failure is represented only in the cache.
}
await mkdir(path.dirname(cacheFile), { recursive: true });
const temporary = `${cacheFile}.${process.pid}.tmp`;
await writeFile(temporary, `${JSON.stringify(state)}\n`, { mode: 0o600 });
await rename(temporary, cacheFile);
