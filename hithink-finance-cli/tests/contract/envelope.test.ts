import { describe, expect, test } from 'vitest';
import { CliError, internalError } from '../../src/contracts/errors.js';
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

  test('adds redacted opt-in diagnostics and a pre-populated internal error report URL', () => {
    const error = internalError(new Error('token=super-secret'));
    const result = errorEnvelope('doctor', error, '0.1.5', {
      debug: true,
      requestId: 'req_debug',
      bugReportBaseUrl: 'https://github.com/HiThink-Tech/Financial-API/issues',
    });

    expect(JSON.stringify(result)).not.toContain('super-secret');
    expect(result.error.reportUrl).toContain('/issues/new?');
    expect(result.error.reportUrl).toContain('req_debug');
    expect(result.meta.diagnostics).toMatchObject({ requestId: 'req_debug' });
    expect(result.meta.diagnostics?.stack).toContain('[REDACTED]');
  });
});
