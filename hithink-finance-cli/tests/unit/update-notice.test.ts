import { expect, test } from 'vitest';
import { updatePromptDecision, compareSemver } from '../../src/infrastructure/updater/cache.js';

const hour = 3_600_000;

test('compares semantic versions including prereleases', () => {
  expect(compareSemver('1.2.4', '1.2.3')).toBeGreaterThan(0);
  expect(compareSemver('2.0.0', '1.99.99')).toBeGreaterThan(0);
  expect(compareSemver('1.2.3', '1.2.3')).toBe(0);
  expect(compareSemver('1.2.3', '1.2.3-next.1')).toBeGreaterThan(0);
  expect(compareSemver('1.2.3-next.2', '1.2.3-next.10')).toBeLessThan(0);
});

test('prompts only when cached latest version is newer and prompt cooldown expired', () => {
  expect(
    updatePromptDecision(
      { checkedAt: 0, status: 'success', latestVersion: '0.2.0' },
      '0.1.0',
      25 * hour,
    ),
  ).toBe('prompt');
  expect(
    updatePromptDecision(
      { checkedAt: 0, status: 'success', latestVersion: '0.1.0' },
      '0.1.0',
      25 * hour,
    ),
  ).toBe('none');
  expect(
    updatePromptDecision(
      { checkedAt: 0, status: 'failure', latestVersion: '0.2.0' },
      '0.1.0',
      25 * hour,
    ),
  ).toBe('none');
  expect(
    updatePromptDecision(
      {
        checkedAt: 0,
        status: 'success',
        latestVersion: '0.2.0',
        promptedAt: 2 * hour,
        promptedCurrentVersion: '0.1.0',
        promptedLatestVersion: '0.2.0',
      },
      '0.1.0',
      25 * hour,
    ),
  ).toBe('none');
  expect(
    updatePromptDecision(
      {
        checkedAt: 0,
        status: 'success',
        latestVersion: '0.2.0',
        promptedAt: 1,
        promptedCurrentVersion: '0.1.0',
        promptedLatestVersion: '0.2.0',
      },
      '0.1.0',
      25 * hour,
    ),
  ).toBe('prompt');
  expect(
    updatePromptDecision(
      {
        checkedAt: 0,
        status: 'success',
        latestVersion: '0.3.0',
        promptedAt: 24 * hour,
        promptedCurrentVersion: '0.1.0',
        promptedLatestVersion: '0.2.0',
      },
      '0.1.0',
      25 * hour,
    ),
  ).toBe('prompt');
});
