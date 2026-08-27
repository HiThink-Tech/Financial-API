import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const [packageName, cacheFile, leasePath, leaseToken] = process.argv.slice(2);
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
const temporary = `${cacheFile}.${process.pid}.tmp`;
try {
  await mkdir(path.dirname(cacheFile), { recursive: true });
  await writeFile(temporary, `${JSON.stringify(state)}\n`, { mode: 0o600 });
  await rename(temporary, cacheFile);
} finally {
  await rm(temporary, { force: true }).catch(() => undefined);
  if (leasePath !== undefined && leaseToken !== undefined) {
    try {
      const lease = JSON.parse(await readFile(leasePath, 'utf8'));
      if (lease.token === leaseToken) await rm(leasePath, { force: true });
    } catch {
      // Lease cleanup is advisory.
    }
  }
}
