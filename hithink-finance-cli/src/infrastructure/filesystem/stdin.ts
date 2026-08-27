/**
 * Shared stdin reader for commands that need piped text input.
 */

import { cancelledError, CliError } from '../../contracts/errors.js';

export interface ReadStdinOptions {
  stripFinalNewlines?: boolean;
  signal?: AbortSignal;
  maxBytes?: number;
}

export async function readStdin(
  input: AsyncIterable<string | Buffer> = process.stdin,
  options: ReadStdinOptions = {},
): Promise<string> {
  const chunks: Buffer[] = [];
  const iterator = input[Symbol.asyncIterator]();
  let completed = false;
  let totalBytes = 0;
  let rejectAbort: (() => void) | undefined;
  const aborted = new Promise<never>((_resolve, reject) => {
    rejectAbort = () => reject(cancelledError());
  });
  const stopInput = () => {
    const destroy = (input as { destroy?: () => void }).destroy;
    if (typeof destroy === 'function') destroy.call(input);
  };
  const onAbort = () => {
    rejectAbort?.();
    stopInput();
  };
  options.signal?.addEventListener('abort', onAbort, { once: true });
  if (options.signal?.aborted === true) onAbort();
  try {
    while (true) {
      const next =
        options.signal === undefined
          ? await iterator.next()
          : await Promise.race([iterator.next(), aborted]);
      if (next.done === true) {
        completed = true;
        break;
      }
      const chunk = Buffer.isBuffer(next.value) ? next.value : Buffer.from(String(next.value));
      totalBytes += chunk.length;
      if (options.maxBytes !== undefined && totalBytes > options.maxBytes) {
        stopInput();
        throw new CliError({
          code: 'CLI_STDIN_TOO_LARGE',
          category: 'validation',
          message: `Standard input exceeds the ${options.maxBytes} byte limit.`,
          hint: 'Use a bounded input file or split the request into smaller batches.',
          retryable: false,
          exitCode: 2,
        });
      }
      chunks.push(chunk);
    }
  } finally {
    options.signal?.removeEventListener('abort', onAbort);
    if (!completed) {
      try {
        await iterator.return?.();
      } catch {
        // Preserve the original cancellation or validation error.
      }
    }
  }
  const text = Buffer.concat(chunks).toString('utf8');
  return options.stripFinalNewlines === true ? text.replace(/[\r\n]+$/u, '') : text;
}
