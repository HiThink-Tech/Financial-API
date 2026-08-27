import { Writable } from 'node:stream';
import { expect, test } from 'vitest';
import { createCliContext, type CliContext } from '../../src/cli/context.js';
import { internalError } from '../../src/contracts/errors.js';
import { errorEnvelope } from '../../src/contracts/envelope.js';
import { renderResult } from '../../src/output/renderer.js';

class MemoryStream extends Writable {
  readonly chunks: string[] = [];
  override _write(chunk: Buffer | string, _encoding: BufferEncoding, done: () => void): void {
    this.chunks.push(chunk.toString());
    done();
  }
  text(): string {
    return this.chunks.join('');
  }
}

test('--no-color disables terminal decoration even on a TTY', () => {
  const descriptor = Object.getOwnPropertyDescriptor(process.stderr, 'isTTY');
  const noColor = process.env.NO_COLOR;
  Object.defineProperty(process.stderr, 'isTTY', { configurable: true, value: true });
  delete process.env.NO_COLOR;
  try {
    expect(createCliContext(['--no-color']).color).toBe(false);
    expect(createCliContext([]).color).toBe(true);
  } finally {
    if (descriptor === undefined) delete (process.stderr as { isTTY?: boolean }).isTTY;
    else Object.defineProperty(process.stderr, 'isTTY', descriptor);
    if (noColor === undefined) delete process.env.NO_COLOR;
    else process.env.NO_COLOR = noColor;
  }
});

test('human errors use color and clickable report links only when enabled', async () => {
  const result = errorEnvelope('doctor', internalError(new Error('boom')), '0.1.5', {
    requestId: 'req-terminal',
    bugReportBaseUrl: 'https://example.com/issues',
  });
  const decorated = new MemoryStream();
  const plain = new MemoryStream();
  const base = {
    format: 'table',
    language: 'en',
    requestId: 'req-terminal',
    stdout: new MemoryStream() as unknown as NodeJS.WriteStream,
    signal: new AbortController().signal,
    debug: false,
  } satisfies Omit<CliContext, 'color' | 'stderr'>;

  await renderResult(result, {
    ...base,
    color: true,
    stderr: decorated as unknown as NodeJS.WriteStream,
  });
  await renderResult(result, {
    ...base,
    color: false,
    stderr: plain as unknown as NodeJS.WriteStream,
  });

  expect(decorated.text()).toContain('\u001B[31mError (CLI_INTERNAL_ERROR)\u001B[39m');
  expect(decorated.text()).toContain('\u001B]8;;https://example.com/issues/new?');
  expect(plain.text()).toContain('Error (CLI_INTERNAL_ERROR)');
  expect(plain.text()).toContain('Report: https://example.com/issues/new?');
  expect(plain.text()).not.toContain('\u001B');
});
