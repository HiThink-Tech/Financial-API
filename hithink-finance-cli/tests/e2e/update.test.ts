import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execa } from 'execa';
import { expect, test } from 'vitest';

test('update repair invokes npm with an exact package version using argument arrays', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'hithink-update-'));
  const log = path.join(root, 'args.json');
  const fake = path.join(root, 'npm.cmd');
  const cliLog = path.join(root, 'cli-args.txt');
  const fakeCli = path.join(root, 'hithink-finance.cmd');
  await writeFile(
    fake,
    `@echo off\r\nnode -e "require('fs').writeFileSync(process.env.FAKE_NPM_LOG, JSON.stringify(process.argv.slice(1)))" %*\r\n`,
  );
  await writeFile(fakeCli, `@echo off\r\necho %*>>"%FAKE_CLI_LOG%"\r\n`);
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
  expect(await readFile(log, 'utf8')).toContain('@hithink-tech/hithink-finance-cli@0.1.0');
  expect(await readFile(cliLog, 'utf8')).toContain('skills sync --repair');
  expect(await readFile(cliLog, 'utf8')).toContain('doctor');
});
