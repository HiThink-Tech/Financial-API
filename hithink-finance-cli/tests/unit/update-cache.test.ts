import { expect, test } from 'vitest';
import { updateCacheDecision } from '../../src/infrastructure/updater/cache.js';

const hour = 3_600_000;
test('uses 24 hour success TTL and 6 hour failure cooldown', () => {
  expect(updateCacheDecision({ checkedAt: 0, status: 'success' }, 23 * hour)).toBe('fresh');
  expect(updateCacheDecision({ checkedAt: 0, status: 'success' }, 25 * hour)).toBe('refresh');
  expect(updateCacheDecision({ checkedAt: 0, status: 'failure' }, 5 * hour)).toBe('cooldown');
  expect(updateCacheDecision({ checkedAt: 0, status: 'failure' }, 7 * hour)).toBe('refresh');
});

test('guards concurrent refreshes for five minutes and supports disabled checks', () => {
  expect(
    updateCacheDecision(
      { checkedAt: 0, status: 'success', refreshStartedAt: 1000 },
      1000 + 4 * 60_000,
    ),
  ).toBe('refreshing');
  expect(updateCacheDecision(undefined, Date.now(), true)).toBe('disabled');
});
