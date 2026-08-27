import { spawn } from 'node:child_process';
import { getEventListeners, once } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, test } from 'vitest';
import { waitForChild } from '../../src/infrastructure/process/child-diagnostics.js';

async function processHasStopped(pid: number): Promise<boolean> {
  try {
    process.kill(pid, 0);
  } catch {
    return true;
  }
  if (process.platform !== 'linux') return false;
  const stat = await readFile(`/proc/${pid}/stat`, 'utf8').catch(() => undefined);
  if (stat === undefined) return true;
  const commandEnd = stat.lastIndexOf(')');
  return commandEnd >= 0 && stat.slice(commandEnd + 2, commandEnd + 3) === 'Z';
}

async function waitForProcessToStop(pid: number, timeoutMs = 2_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  do {
    if (await processHasStopped(pid)) return true;
    await new Promise((resolve) => setTimeout(resolve, 20));
  } while (Date.now() < deadline);
  return processHasStopped(pid);
}

test('aborting a child wait terminates the real child process', async () => {
  const controller = new AbortController();
  const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
    stdio: 'ignore',
    windowsHide: true,
  });
  await once(child, 'spawn');
  const childPid = child.pid;
  const completion = waitForChild(child, controller.signal);

  controller.abort('SIGTERM');

  await expect(completion).rejects.toMatchObject({ code: 'CLI_CANCELLED' });
  expect(childPid).toBeDefined();
  expect(() => process.kill(childPid!, 0)).toThrow();
  expect(getEventListeners(controller.signal, 'abort')).toHaveLength(0);
});

test('times out and terminates a child that never exits', async () => {
  const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
    stdio: 'ignore',
    windowsHide: true,
  });
  await once(child, 'spawn');
  const childPid = child.pid;

  await expect(waitForChild(child, { timeoutMs: 25, killGraceMs: 25 })).rejects.toMatchObject({
    code: 'CLI_CHILD_TIMEOUT',
  });
  expect(childPid).toBeDefined();
  expect(() => process.kill(childPid!, 0)).toThrow();
});

test('aborting a managed child terminates its descendant process tree', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'hithink-child-tree-'));
  const pidFile = path.join(root, 'grandchild.pid');
  const controller = new AbortController();
  const script = [
    "const { spawn } = require('node:child_process')",
    "const { writeFileSync } = require('node:fs')",
    "const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' })",
    'writeFileSync(process.env.GRANDCHILD_PID_FILE, String(child.pid))',
    'setInterval(() => {}, 1000)',
  ].join(';');
  const child = spawn(process.execPath, ['-e', script], {
    stdio: 'ignore',
    windowsHide: true,
    detached: process.platform !== 'win32',
    env: { ...process.env, GRANDCHILD_PID_FILE: pidFile },
  });
  try {
    await once(child, 'spawn');
    let grandchildPid: number | undefined;
    const deadline = Date.now() + 5_000;
    while (grandchildPid === undefined && Date.now() < deadline) {
      grandchildPid = await readFile(pidFile, 'utf8')
        .then(Number)
        .catch(() => undefined);
      if (grandchildPid === undefined) await new Promise((resolve) => setTimeout(resolve, 20));
    }
    expect(grandchildPid).toBeDefined();
    const completion = waitForChild(child, {
      signal: controller.signal,
      processGroup: process.platform !== 'win32',
      killGraceMs: 50,
    });

    controller.abort('SIGTERM');

    await expect(completion).rejects.toMatchObject({ code: 'CLI_CANCELLED' });
    expect(await waitForProcessToStop(grandchildPid!)).toBe(true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test.skipIf(process.platform === 'win32')(
  'waits for force-kill when the group leader exits but a descendant ignores SIGTERM',
  async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'hithink-child-resistant-tree-'));
    const pidFile = path.join(root, 'grandchild.pid');
    const controller = new AbortController();
    const grandchildScript = [
      "process.on('SIGTERM', () => {})",
      'setInterval(() => {}, 1000)',
    ].join(';');
    const leaderScript = [
      "const { spawn } = require('node:child_process')",
      "const { writeFileSync } = require('node:fs')",
      `const child = spawn(process.execPath, ['-e', ${JSON.stringify(grandchildScript)}], { stdio: 'ignore' })`,
      'writeFileSync(process.env.GRANDCHILD_PID_FILE, String(child.pid))',
      "process.on('SIGTERM', () => process.exit(0))",
      'setInterval(() => {}, 1000)',
    ].join(';');
    const child = spawn(process.execPath, ['-e', leaderScript], {
      stdio: 'ignore',
      detached: true,
      env: { ...process.env, GRANDCHILD_PID_FILE: pidFile },
    });
    try {
      await once(child, 'spawn');
      let grandchildPid: number | undefined;
      const deadline = Date.now() + 5_000;
      while (grandchildPid === undefined && Date.now() < deadline) {
        grandchildPid = await readFile(pidFile, 'utf8')
          .then(Number)
          .catch(() => undefined);
        if (grandchildPid === undefined) await new Promise((resolve) => setTimeout(resolve, 20));
      }
      expect(grandchildPid).toBeDefined();
      const completion = waitForChild(child, {
        signal: controller.signal,
        processGroup: true,
        killGraceMs: 50,
      });

      controller.abort('SIGTERM');

      await expect(completion).rejects.toMatchObject({ code: 'CLI_CANCELLED' });
      expect(await waitForProcessToStop(grandchildPid!)).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  },
);
