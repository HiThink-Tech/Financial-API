import { getEventListeners } from 'node:events';
import { PassThrough } from 'node:stream';
import { describe, expect, test } from 'vitest';
import { readStdin } from '../../src/infrastructure/filesystem/stdin.js';

async function* chunks(values: Array<string | Buffer>): AsyncIterable<string | Buffer> {
  for (const value of values) yield value;
}

describe('stdin reading', () => {
  test('concatenates string and Buffer chunks without trimming by default', async () => {
    await expect(readStdin(chunks(['600519.SH\n', Buffer.from('000001.SZ\n')]))).resolves.toBe(
      '600519.SH\n000001.SZ\n',
    );
  });

  test('optionally strips final line endings for secret input', async () => {
    await expect(
      readStdin(chunks([Buffer.from('secret-value\r\n')]), { stripFinalNewlines: true }),
    ).resolves.toBe('secret-value');
  });

  test('aborts a blocked stream and removes its listener', async () => {
    const input = new PassThrough();
    const controller = new AbortController();
    const result = readStdin(input, { signal: controller.signal });

    controller.abort('SIGINT');

    await expect(result).rejects.toMatchObject({ code: 'CLI_CANCELLED' });
    expect(input.destroyed).toBe(true);
    expect(getEventListeners(controller.signal, 'abort')).toHaveLength(0);
  });

  test('rejects input before buffering beyond the configured limit', async () => {
    await expect(readStdin(chunks(['1234', '5']), { maxBytes: 4 })).rejects.toMatchObject({
      code: 'CLI_STDIN_TOO_LARGE',
    });
  });
});
