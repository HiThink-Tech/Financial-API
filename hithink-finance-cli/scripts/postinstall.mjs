import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const globalInstall =
  !root.includes(`${path.sep}node_modules${path.sep}.pnpm${path.sep}`) &&
  root.includes(`${path.sep}node_modules${path.sep}`);
if (globalInstall && existsSync(path.join(root, 'dist', 'cli', 'main.js'))) {
  const result = spawnSync(
    process.execPath,
    [
      path.join(root, 'dist', 'cli', 'main.js'),
      'skills',
      'sync',
      '--repair',
      '--yes',
      '--format',
      'json',
    ],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        DISABLE_TELEMETRY: '1',
        HITHINK_FINANCE_NO_UPDATE_CHECK: '1',
        HITHINK_FINANCE_SKILLS_INSTALL: '1',
      },
      windowsHide: true,
    },
  );
  if (result.status !== 0)
    process.stderr.write(
      'hithink-finance: Skills sync incomplete; run `hithink-finance skills sync --repair`.\n',
    );
}
