import { describe, expect, test } from 'vitest';
import { CliError } from '../../src/contracts/errors.js';
import { errorEnvelope, successEnvelope } from '../../src/contracts/envelope.js';

describe('result envelopes', () => {
  test('creates a successful result with stable protocol metadata', () => {
    expect(successEnvelope('version', { version: '0.1.0' }, { requestId: 'req_test' })).toEqual({
      ok: true,
      command: 'version',
      data: { version: '0.1.0' },
      meta: {
        truncated: false,
        requestId: 'req_test',
        schemaVersion: '1',
      },
    });
  });

  test('creates an error result without leaking a supplied secret', () => {
    const error = new CliError({
      code: 'CLI_BAD_ARGUMENT',
      category: 'validation',
      message: 'Invalid token=super-secret',
      hint: 'Remove api-key=super-secret',
      retryable: false,
      exitCode: 2,
      requestId: 'req_test',
    });

    const result = errorEnvelope('version', error, '0.1.0');
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain('super-secret');
    expect(result.error.code).toBe('CLI_BAD_ARGUMENT');
  });
});
