import { describe, expect, test } from 'vitest';
import { remoteCapabilities } from '../../src/contracts/remote-capabilities.js';

const EXPECTED_23_IDS = [
  'symbol.search',
  'symbol.list',
  'market.snapshot',
  'market.history',
  'market.corporate-actions',
  'financials.income',
  'financials.balance-sheet',
  'financials.cash-flow',
  'financials.indicators',
  'market.calendar',
  'index.catalog',
  'index.constituents',
  'index.snapshot',
  'index.history',
  'special.limit-up-pool',
  'special.limit-up-ladder',
  'special.anomaly-list',
  'special.anomaly-stock',
  'special.skyrocket',
  'special.hot-stock',
  'special.hot-stock-history',
  'special.hot-stock-trend',
  'special.dragon-tiger',
];

test('registers exactly the frozen 23 remote capabilities with unique command paths', () => {
  expect(remoteCapabilities.map((capability) => capability.id).sort()).toEqual(
    EXPECTED_23_IDS.sort(),
  );
  expect(new Set(remoteCapabilities.map((capability) => capability.command.join(' '))).size).toBe(
    23,
  );
  expect(remoteCapabilities.every((capability) => capability.method === 'GET')).toBe(true);
});

test('keeps all nine special-data capabilities under special only', () => {
  const specialPaths = remoteCapabilities
    .filter((capability) => capability.id.startsWith('special.'))
    .map((capability) => capability.command.join(' '));
  expect(specialPaths).toEqual([
    'special limit-up-pool',
    'special limit-up-ladder',
    'special anomaly-list',
    'special anomaly-stock',
    'special skyrocket',
    'special hot-stock',
    'special hot-stock-history',
    'special hot-stock-trend',
    'special dragon-tiger',
  ]);
  expect(
    remoteCapabilities.some(
      (capability) => capability.command[0] === 'market' && capability.id.startsWith('special.'),
    ),
  ).toBe(false);
});

describe.each(['financials.income', 'financials.balance-sheet', 'financials.cash-flow'])(
  '%s input contract',
  (id) => {
    const capability = remoteCapabilities.find((candidate) => candidate.id === id)!;

    test('rejects recent limit combined with a date range', () => {
      expect(
        capability.inputSchema.safeParse({
          thscode: '600519.SH',
          period: 'annual',
          limit: 4,
          startMs: 1,
          endMs: 2,
        }).success,
      ).toBe(false);
    });

    test('requires both date range endpoints', () => {
      expect(capability.inputSchema.safeParse({ thscode: '600519.SH', startMs: 1 }).success).toBe(
        false,
      );
    });
  },
);

test('enforces anomaly stock raw token limit before deduplication', () => {
  const capability = remoteCapabilities.find(
    (candidate) => candidate.id === 'special.anomaly-stock',
  )!;
  const repeated = Array.from({ length: 51 }, () => '600519.SH').join(',');
  expect(capability.inputSchema.safeParse({ thscodes: repeated }).success).toBe(false);
});

test('enforces index and special-data enums and date formats', () => {
  const indexHistory = remoteCapabilities.find((candidate) => candidate.id === 'index.history')!;
  expect(
    indexHistory.inputSchema.safeParse({
      thscode: '000300.SH',
      startMs: 1,
      endMs: 2,
      adjust: 'forward',
    }).success,
  ).toBe(false);

  const dragonTiger = remoteCapabilities.find(
    (candidate) => candidate.id === 'special.dragon-tiger',
  )!;
  expect(dragonTiger.inputSchema.safeParse({ boardType: 'invalid' }).success).toBe(false);
  expect(dragonTiger.inputSchema.safeParse({ date: '20260708' }).success).toBe(false);
});
