import { afterEach, expect, test, vi } from 'vitest';
import {
  createProcessShutdown,
  shutdownExitCode,
} from '../../src/infrastructure/process/shutdown.js';

afterEach(() => vi.restoreAllMocks());

test('aborts the shared signal when the process receives SIGINT', () => {
  let interrupt: (() => void) | undefined;
  vi.spyOn(process, 'once').mockImplementation(((event: string, listener: () => void) => {
    if (event === 'SIGINT') interrupt = listener;
    return process;
  }) as typeof process.once);
  vi.spyOn(process, 'removeListener').mockImplementation(() => process);

  const shutdown = createProcessShutdown();
  interrupt?.();

  expect(shutdown.signal.aborted).toBe(true);
  expect(shutdown.signal.reason).toBe('SIGINT');
  shutdown.dispose();
});

test('maps supported shutdown signals to conventional exit codes', () => {
  expect(shutdownExitCode('SIGINT')).toBe(130);
  expect(shutdownExitCode('SIGTERM')).toBe(143);
  expect(shutdownExitCode('SIGHUP')).toBe(129);
});
