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
});
