import { describe, expect, test } from 'vitest';
import { redactValue } from '../../src/infrastructure/credentials/redact.js';

describe('secret redaction', () => {
  test('redacts secret keys recursively without mutating the input', () => {
    const input = {
      headers: { authorization: 'Bearer top-secret' },
      nested: [{ api_key: 'top-secret' }, { safe: 'visible' }],
    };

    expect(redactValue(input)).toEqual({
      headers: { authorization: '[REDACTED]' },
      nested: [{ api_key: '[REDACTED]' }, { safe: 'visible' }],
    });
    expect(input.headers.authorization).toBe('Bearer top-secret');
  });

  test('redacts known secret values embedded in ordinary strings', () => {
    expect(redactValue({ message: 'request failed for top-secret' }, ['top-secret'])).toEqual({
      message: 'request failed for [REDACTED]',
    });
  });
});
