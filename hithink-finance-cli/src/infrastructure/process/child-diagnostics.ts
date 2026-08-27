import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import type { Writable } from 'node:stream';
import { cancelledError, CliError } from '../../contracts/errors.js';

/**
 * Drains child stdout and stderr into the CLI diagnostic stream.
 *
 * Child lifecycle tools may emit human-oriented progress on stdout. Routing
 * both streams to stderr keeps the parent CLI stdout machine-readable while
 * still applying Node stream backpressure.
 */
export function forwardChildDiagnostics(
  child: ChildProcess,
  diagnostics: Writable = process.stderr,
): void {
  child.stdout?.pipe(diagnostics, { end: false });
  child.stderr?.pipe(diagnostics, { end: false });
}

async function terminateChild(
  child: ChildProcess,
  killGraceMs: number,
  processGroup: boolean,
  setForceKill: (timer: NodeJS.Timeout) => void,
): Promise<void> {
  if (child.exitCode !== null || child.pid === undefined) return;
  if (process.platform === 'win32') {
    const taskkill = path.join(
      process.env.SystemRoot ?? String.raw`C:\Windows`,
      'System32',
      'taskkill.exe',
    );
    await new Promise<void>((resolve) => {
      const killer = spawn(taskkill, ['/pid', String(child.pid), '/t', '/f'], {
        stdio: 'ignore',
        windowsHide: true,
      });
      killer.once('error', () => resolve());
      killer.once('exit', () => resolve());
    });
    return;
  } else {
    try {
      if (processGroup) process.kill(-child.pid, 'SIGTERM');
      else child.kill('SIGTERM');
    } catch {
      child.kill('SIGTERM');
    }
  }
  if (processGroup || child.exitCode === null) {
    await new Promise<void>((resolve) => {
      const forceKill = setTimeout(() => {
        try {
          if (processGroup && child.pid !== undefined) process.kill(-child.pid, 'SIGKILL');
          else child.kill('SIGKILL');
        } catch {
          if (!processGroup) child.kill('SIGKILL');
        } finally {
          resolve();
        }
      }, killGraceMs);
      if (!processGroup) forceKill.unref();
      setForceKill(forceKill);
    });
  }
}

export interface WaitForChildOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  killGraceMs?: number;
  processGroup?: boolean;
  operation?: string;
}

function childTimeoutError(operation: string, timeoutMs: number): CliError {
  return new CliError({
    code: 'CLI_CHILD_TIMEOUT',
    category: 'internal',
    message: `${operation} did not finish within ${timeoutMs} ms.`,
    hint: 'Check the child tool diagnostics and retry when the local package manager is responsive.',
    retryable: true,
    exitCode: 1,
  });
}

/** Waits for a child and terminates it when the caller's shared signal aborts. */
export function waitForChild(
  child: ChildProcess,
  signalOrOptions?: AbortSignal | WaitForChildOptions,
): Promise<number> {
  const options: WaitForChildOptions =
    signalOrOptions === undefined
      ? {}
      : 'aborted' in signalOrOptions
        ? { signal: signalOrOptions }
        : signalOrOptions;
  const signal = options.signal;
  const killGraceMs = options.killGraceMs ?? 2_000;
  return new Promise((resolve, reject) => {
    let cancelled = signal?.aborted === true;
    let timedOut = false;
    let forceKill: NodeJS.Timeout | undefined;
    let timeout: NodeJS.Timeout | undefined;
    let terminating = false;
    let termination: Promise<void> | undefined;
    let settlementStarted = false;
    const cleanup = () => {
      signal?.removeEventListener('abort', onAbort);
      if (timeout !== undefined) clearTimeout(timeout);
      if (forceKill !== undefined) clearTimeout(forceKill);
    };
    const terminate = () => {
      if (terminating) return;
      terminating = true;
      termination = terminateChild(child, killGraceMs, options.processGroup === true, (timer) => {
        forceKill = timer;
      });
    };
    const onAbort = () => {
      cancelled = true;
      terminate();
    };
    const settle = async (error: Error | undefined, code?: number | null) => {
      if (settlementStarted) return;
      settlementStarted = true;
      if (terminating && options.processGroup === true) await termination;
      cleanup();
      if (cancelled) return reject(cancelledError());
      else if (timedOut)
        return reject(
          childTimeoutError(options.operation ?? 'The child process', options.timeoutMs ?? 0),
        );
      if (error !== undefined) return reject(error);
      resolve(code ?? 1);
    };
    child.once('error', (error) => {
      void settle(error);
    });
    child.once('exit', (code) => {
      void settle(undefined, code);
    });
    signal?.addEventListener('abort', onAbort, { once: true });
    if (cancelled) onAbort();
    if (options.timeoutMs !== undefined) {
      timeout = setTimeout(() => {
        timedOut = true;
        terminate();
      }, options.timeoutMs);
      timeout.unref();
    }
  });
}
