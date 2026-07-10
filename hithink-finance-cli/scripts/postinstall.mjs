import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const globalInstall =
  !root.includes(`${path.sep}node_modules${path.sep}.pnpm${path.sep}`) &&
  root.includes(`${path.sep}node_modules${path.sep}`);
if (globalInstall && existsSync(path.join(root, 'node_modules', 'skills', 'bin', 'cli.mjs'))) {
  const result = spawnSync(
    process.execPath,
    [
      path.join(root, 'node_modules', 'skills', 'bin', 'cli.mjs'),
      'add',
      path.join(root, 'skills'),
      '--global',
      '--copy',
      '--all',
      '--full-depth',
    ],
    { stdio: 'inherit', env: { ...process.env, DISABLE_TELEMETRY: '1' }, windowsHide: true },
  );
  if (result.status !== 0)
    process.stderr.write(
      'hithink-finance: Skills sync incomplete; run `hithink-finance skills sync --repair`.\n',
    );
}
