import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execa } from 'execa';
import { expect, test } from 'vitest';

async function waitForPid(pidFile: string): Promise<number> {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    try {
      return Number(await readFile(pidFile, 'utf8'));
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
  throw new Error('Timed out waiting for the blocking child process.');
}

function processExists(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

test.skipIf(process.platform === 'win32')(
  'SIGTERM interrupts a real update child and exits with signal semantics',
  async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'hithink-shutdown-child-'));
    const pidFile = path.join(root, 'child.pid');
    const isWindows = process.platform === 'win32';
    const fakeNpm = path.join(root, isWindows ? 'npm.cmd' : 'npm');
    const fakeCli = path.join(root, isWindows ? 'hithink-finance.cmd' : 'hithink-finance');
    try {
      const blocker =
        "require('node:fs').writeFileSync(process.env.FAKE_CHILD_PID, String(process.pid)); setTimeout(() => {}, 1500)";
      if (isWindows) {
        await writeFile(fakeNpm, `@echo off\r\nnode -e "${blocker}"\r\n`);
        await writeFile(fakeCli, '@echo off\r\nexit /b 0\r\n');
      } else {
        await writeFile(fakeNpm, `#!/usr/bin/env node\n${blocker}\n`);
        await writeFile(fakeCli, '#!/usr/bin/env node\n');
        await Promise.all([chmod(fakeNpm, 0o755), chmod(fakeCli, 0o755)]);
      }

      const subprocess = execa(
        'node',
        ['dist/cli/main.js', 'update', '--repair', '--yes', '--format', 'json'],
        {
          reject: false,
          timeout: 8_000,
          env: {
            HITHINK_FINANCE_NPM_EXECUTABLE: fakeNpm,
            HITHINK_FINANCE_CLI_EXECUTABLE: fakeCli,
            FAKE_CHILD_PID: pidFile,
          },
        },
      );
      const childPid = await waitForPid(pidFile);
      subprocess.kill('SIGTERM');
      const result = await subprocess;

      expect(result.exitCode).toBe(143);
      expect(result.timedOut).toBe(false);
      expect(processExists(childPid)).toBe(false);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
);
