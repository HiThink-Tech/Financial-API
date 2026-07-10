import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execa } from 'execa';
import { expect, test } from 'vitest';

test('packed tarball installs into an isolated global prefix', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'hithink-global-'));
  try {
    const pack = await execa('npm', ['pack', '--json', '--ignore-scripts'], { cwd: process.cwd() });
    const [{ filename }] = JSON.parse(pack.stdout) as Array<{ filename: string }>;
    const tarball = path.resolve(filename);
    const prefix = path.join(root, 'prefix');
    await execa('npm', ['install', '-g', tarball, '--prefix', prefix, '--ignore-scripts']);
    const executable =
      process.platform === 'win32'
        ? path.join(prefix, 'hithink-finance.cmd')
        : path.join(prefix, 'bin', 'hithink-finance');
    const version = await execa(executable, ['version', '--format', 'json']);
    expect(JSON.parse(version.stdout)).toMatchObject({
      ok: true,
      data: { package: '@hithink-tech/hithink-finance-cli' },
    });
    const doctor = await execa(executable, ['doctor', '--format', 'json']);
    expect(JSON.parse(doctor.stdout)).toMatchObject({ ok: true, command: 'doctor' });
    const plan = await execa(executable, ['uninstall', '--plan', '--format', 'json']);
    expect(JSON.parse(plan.stdout)).toMatchObject({ data: { purge_data: false } });
    await rm(tarball, { force: true });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 120_000);
