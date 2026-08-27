const shutdownSignals = [
  'SIGINT',
  'SIGTERM',
  'SIGHUP',
] as const satisfies readonly NodeJS.Signals[];
const signalExitCodes: Record<(typeof shutdownSignals)[number], number> = {
  SIGHUP: 129,
  SIGINT: 130,
  SIGTERM: 143,
};

export interface ProcessShutdown {
  signal: AbortSignal;
  dispose(): void;
}

export function shutdownExitCode(reason: unknown): number | undefined {
  return typeof reason === 'string' && reason in signalExitCodes
    ? signalExitCodes[reason as keyof typeof signalExitCodes]
    : undefined;
}

/** Registers one-shot process signal handlers and exposes a shared abort signal. */
export function createProcessShutdown(): ProcessShutdown {
  const controller = new AbortController();
  const listeners = new Map<NodeJS.Signals, () => void>();

  for (const processSignal of shutdownSignals) {
    const listener = () => controller.abort(processSignal);
    listeners.set(processSignal, listener);
    process.once(processSignal, listener);
  }

  return {
    signal: controller.signal,
    dispose() {
      for (const [processSignal, listener] of listeners) {
        process.removeListener(processSignal, listener);
      }
    },
  };
}
