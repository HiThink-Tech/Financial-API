import { Writable } from 'node:stream';
import { expect, test } from 'vitest';
import type { CliContext } from '../../src/cli/context.js';
import { createDownloadProgressReporter } from '../../src/output/download-progress.js';

const MiB = 1024 * 1024;

class MemoryWriteStream extends Writable {
  readonly chunks: string[] = [];

  constructor(readonly isTTY: boolean) {
    super();
  }

  _write(
    chunk: string | Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    this.chunks.push(String(chunk));
    callback();
  }

  text(): string {
    return this.chunks.join('');
  }
}

function context(stderr: MemoryWriteStream): CliContext {
  return {
    format: 'json',
    language: 'zh-CN',
    color: false,
    requestId: 'test-request',
    stdout: new MemoryWriteStream(false) as unknown as NodeJS.WriteStream,
    stderr: stderr as unknown as NodeJS.WriteStream,
  };
}

test('refreshes a TTY line with known-size progress and a final newline', () => {
  const stderr = new MemoryWriteStream(true);
  let current = 0;
  const report = createDownloadProgressReporter(context(stderr), { now: () => current });

  report({ kind: 'daily-k', phase: 'started', downloadedBytes: 0, totalBytes: 16 * MiB });
  current = 100;
  report({ kind: 'daily-k', phase: 'progress', downloadedBytes: 8 * MiB, totalBytes: 16 * MiB });
  current = 200;
  report({ kind: 'daily-k', phase: 'completed', downloadedBytes: 16 * MiB, totalBytes: 16 * MiB });

  expect(stderr.text()).toContain('\r');
  expect(stderr.text()).toContain('50%');
  expect(stderr.text()).toMatch(/\n$/u);
});

test('throttles redirected progress by both time and byte thresholds', () => {
  const stderr = new MemoryWriteStream(false);
  let current = 0;
  const report = createDownloadProgressReporter(context(stderr), { now: () => current });

  report({ kind: 'daily-k', phase: 'started', downloadedBytes: 0, totalBytes: 32 * MiB });
  current = 4_999;
  report({ kind: 'daily-k', phase: 'progress', downloadedBytes: 8 * MiB, totalBytes: 32 * MiB });
  current = 5_000;
  report({ kind: 'daily-k', phase: 'progress', downloadedBytes: 7 * MiB, totalBytes: 32 * MiB });
  current = 10_000;
  report({ kind: 'daily-k', phase: 'progress', downloadedBytes: 15 * MiB, totalBytes: 32 * MiB });
  current = 10_001;
  report({ kind: 'daily-k', phase: 'completed', downloadedBytes: 32 * MiB, totalBytes: 32 * MiB });

  expect(stderr.text().trim().split('\n')).toHaveLength(3);
  expect(stderr.text()).toContain('47%');
});

test('omits a percentage when the response total is unknown', () => {
  const stderr = new MemoryWriteStream(false);
  const report = createDownloadProgressReporter(context(stderr), { now: () => 0 });

  report({ kind: 'adjustment-factors', phase: 'started', downloadedBytes: 0 });
  report({ kind: 'adjustment-factors', phase: 'completed', downloadedBytes: MiB });

  expect(stderr.text()).not.toContain('%');
});
