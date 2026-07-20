import { chmod, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execa } from 'execa';
import { expect, test } from 'vitest';

test('update repair invokes npm with an exact package version using argument arrays', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'hithink-update-'));
  const log = path.join(root, 'args.json');
  const isWindows = process.platform === 'win32';
  const fake = path.join(root, isWindows ? 'npm.cmd' : 'npm');
  const cliLog = path.join(root, 'cli-args.txt');
  const fakeCli = path.join(root, isWindows ? 'hithink-finance.cmd' : 'hithink-finance');

  if (isWindows) {
    await writeFile(
      fake,
      `@echo off\r\nnode -e "require('fs').writeFileSync(process.env.FAKE_NPM_LOG, JSON.stringify(process.argv.slice(1)))" %*\r\n`,
    );
    await writeFile(fakeCli, `@echo off\r\necho %*>>"%FAKE_CLI_LOG%"\r\n`);
  } else {
    await writeFile(
      fake,
      `#!/usr/bin/env node\nconst { writeFileSync } = require('node:fs');\nwriteFileSync(process.env.FAKE_NPM_LOG, JSON.stringify(process.argv.slice(2)));\n`,
    );
    await writeFile(
      fakeCli,
      `#!/usr/bin/env node\nconst { appendFileSync } = require('node:fs');\nappendFileSync(process.env.FAKE_CLI_LOG, process.argv.slice(2).join(' ') + '\\n');\n`,
    );
    await Promise.all([chmod(fake, 0o755), chmod(fakeCli, 0o755)]);
  }
  const result = await execa(
    'node',
    ['dist/cli/main.js', 'update', '--repair', '--yes', '--format', 'json'],
    {
      env: {
        HITHINK_FINANCE_NPM_EXECUTABLE: fake,
        HITHINK_FINANCE_CLI_EXECUTABLE: fakeCli,
        FAKE_NPM_LOG: log,
        FAKE_CLI_LOG: cliLog,
      },
    },
  );
  expect(result.exitCode).toBe(0);
  expect(await readFile(log, 'utf8')).toContain('install');
  expect(await readFile(log, 'utf8')).toContain('@hithink-tech/hithink-finance-cli@0.1.3');
  expect(await readFile(cliLog, 'utf8')).toContain('skills sync --repair');
  expect(await readFile(cliLog, 'utf8')).toContain('doctor');
});
