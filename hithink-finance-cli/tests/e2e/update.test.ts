import { chmod, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execa } from 'execa';
import { expect, test } from 'vitest';

async function runUpdate(args: string[], latestVersion = '0.2.0') {
  const root = await mkdtemp(path.join(tmpdir(), 'hithink-update-'));
  const log = path.join(root, 'args.json');
  const isWindows = process.platform === 'win32';
  const fake = path.join(root, isWindows ? 'npm.cmd' : 'npm');
  const cliLog = path.join(root, 'cli-args.txt');
  const fakeCli = path.join(root, isWindows ? 'hithink-finance.cmd' : 'hithink-finance');

  if (isWindows) {
    await writeFile(
      fake,
      `@echo off\r\nif "%1"=="view" (\r\n  echo "${latestVersion}"\r\n  exit /b 0\r\n)\r\necho npm stdout\r\necho npm stderr 1>&2\r\nnode -e "require('fs').writeFileSync(process.env.FAKE_NPM_LOG, JSON.stringify(process.argv.slice(1)))" %*\r\n`,
    );
    await writeFile(
      fakeCli,
      `@echo off\r\necho cli stdout\r\necho cli stderr 1>&2\r\necho %HITHINK_FINANCE_SKILLS_INSTALL% %*>>"%FAKE_CLI_LOG%"\r\n`,
    );
  } else {
    await writeFile(
      fake,
      `#!/usr/bin/env node\nconst { writeFileSync } = require('node:fs');\nconst args = process.argv.slice(2);\nif (args[0] === 'view') {\n  process.stdout.write(JSON.stringify('${latestVersion}') + '\\n');\n  process.exit(0);\n}\nprocess.stdout.write('npm stdout\\n');\nprocess.stderr.write('npm stderr\\n');\nwriteFileSync(process.env.FAKE_NPM_LOG, JSON.stringify(args));\n`,
    );
    await writeFile(
      fakeCli,
      `#!/usr/bin/env node\nconst { appendFileSync } = require('node:fs');\nprocess.stdout.write('cli stdout\\n');\nprocess.stderr.write('cli stderr\\n');\nappendFileSync(process.env.FAKE_CLI_LOG, \`\${process.env.HITHINK_FINANCE_SKILLS_INSTALL ?? ''} \${process.argv.slice(2).join(' ')}\\n\`);\n`,
    );
    await Promise.all([chmod(fake, 0o755), chmod(fakeCli, 0o755)]);
  }
  const result = await execa(
    'node',
    ['dist/cli/main.js', 'update', ...args, '--yes', '--format', 'json'],
    {
      env: {
        HITHINK_FINANCE_NPM_EXECUTABLE: fake,
        HITHINK_FINANCE_CLI_EXECUTABLE: fakeCli,
        FAKE_NPM_LOG: log,
        FAKE_CLI_LOG: cliLog,
      },
    },
  );
  return { cliLog, log, result };
}

test('update resolves and installs the latest npm version', async () => {
  const { cliLog, log, result } = await runUpdate([]);

  expect(result.exitCode).toBe(0);
  expect(JSON.parse(result.stdout)).toMatchObject({
    ok: true,
    command: 'update',
    data: { version: '0.2.0', repaired: false },
  });
  expect(result.stderr).toContain('npm stdout');
  expect(result.stderr).toContain('npm stderr');
  expect(result.stderr).toContain('cli stdout');
  expect(result.stderr).toContain('cli stderr');
  expect(await readFile(log, 'utf8')).toContain('install');
  expect(await readFile(log, 'utf8')).toContain('@hithink-tech/hithink-finance-cli@0.2.0');
  expect(await readFile(cliLog, 'utf8')).toContain('skills sync --repair');
  expect(await readFile(cliLog, 'utf8')).toContain('1 skills sync --repair');
  expect(await readFile(cliLog, 'utf8')).toContain('doctor');
});

test('update repair reinstalls the current package version', async () => {
  const { log, result } = await runUpdate(['--repair']);

  expect(JSON.parse(result.stdout)).toMatchObject({
    ok: true,
    command: 'update',
    data: { version: '0.1.12', repaired: true },
  });
  expect(await readFile(log, 'utf8')).toContain('@hithink-tech/hithink-finance-cli@0.1.12');
});

test('update target-version installs the requested package version', async () => {
  const { log, result } = await runUpdate(['--target-version', '0.1.9']);

  expect(JSON.parse(result.stdout)).toMatchObject({
    ok: true,
    command: 'update',
    data: { version: '0.1.9', repaired: false },
  });
  expect(await readFile(log, 'utf8')).toContain('@hithink-tech/hithink-finance-cli@0.1.9');
});

test('update modes are mutually exclusive', async () => {
  const result = await execa(
    'node',
    ['dist/cli/main.js', 'update', '--repair', '--target-version', '0.2.0', '--format', 'json'],
    { reject: false },
  );

  expect(result.exitCode).toBe(2);
  expect(JSON.parse(result.stderr)).toMatchObject({ error: { code: 'CLI_BAD_ARGUMENT' } });
});
