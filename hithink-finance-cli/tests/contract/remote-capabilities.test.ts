import { describe, expect, test } from 'vitest';
import { remoteCapabilities } from '../../src/contracts/remote-capabilities.js';

const EXPECTED_30_IDS = [
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
  'fund.profile',
  'fund.holdings',
  'fund.nav',
  'fund.returns',
  'fund.holders',
  'fund.snapshot',
  'fund.history',
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

test('registers exactly the frozen 30 remote capabilities with unique command paths', () => {
  expect(remoteCapabilities.map((capability) => capability.id).sort()).toEqual(
    EXPECTED_30_IDS.sort(),
  );
  expect(new Set(remoteCapabilities.map((capability) => capability.command.join(' '))).size).toBe(
    30,
  );
  expect(remoteCapabilities.every((capability) => capability.method === 'GET')).toBe(true);
});

test('keeps all seven fund capabilities under the fund command group', () => {
  const fund = remoteCapabilities.filter((capability) => capability.id.startsWith('fund.'));
  expect(fund.map((capability) => capability.command.join(' '))).toEqual([
    'fund profile',
    'fund holdings',
    'fund nav',
    'fund returns',
    'fund holders',
    'fund snapshot',
    'fund history',
  ]);
  expect(fund.map((capability) => capability.endpoint)).toEqual([
    '/api/fund/profile/detail',
    '/api/fund/portfolio/holdings',
    '/api/fund/performance/nav',
    '/api/fund/performance/returns',
    '/api/fund/holders/detail',
    '/api/fund/market/snapshot',
    '/api/fund/market/historical',
  ]);
});

test('validates fund enum and five-year historical boundaries', () => {
  const profile = remoteCapabilities.find((candidate) => candidate.id === 'fund.profile')!;
  expect(profile.inputSchema.safeParse({ fundType: 'otc', thscode: '025480.OF' }).success).toBe(
    true,
  );
  expect(profile.inputSchema.safeParse({ fundType: 'invalid', thscode: '025480.OF' }).success).toBe(
    false,
  );

  const history = remoteCapabilities.find((candidate) => candidate.id === 'fund.history')!;
  expect(
    history.inputSchema.safeParse({ thscode: '510300.SH', startMs: 1, endMs: 2 }).success,
  ).toBe(true);
  expect(
    history.inputSchema.safeParse({
      thscode: '510300.SH',
      startMs: 1,
      endMs: 5 * 366 * 24 * 60 * 60 * 1000 + 2,
    }).success,
  ).toBe(false);

  const snapshot = remoteCapabilities.find((candidate) => candidate.id === 'fund.snapshot')!;
  expect(snapshot.inputSchema.safeParse({ thscode: '510300.SH' }).success).toBe(true);
  expect(snapshot.inputSchema.safeParse({ thscodes: '510300.SH,159915.SZ' }).success).toBe(false);

  const holders = remoteCapabilities.find((candidate) => candidate.id === 'fund.holders')!;
  expect(
    holders.inputSchema.safeParse({
      fundType: 'otc',
      thscode: '161725.SZ',
      mergeScope: 'separate',
    }).success,
  ).toBe(true);
  expect(holders.inputSchema.parse({ fundType: 'otc', thscode: '161725.SZ' }).mergeScope).toBe(
    'all',
  );
  expect(
    holders.inputSchema.safeParse({
      fundType: 'otc',
      thscode: '161725.SZ',
      mergeScope: 'combined',
    }).success,
  ).toBe(false);
});

test('accepts documented comma-separated asset types and rejects unknown tokens', () => {
  const search = remoteCapabilities.find((candidate) => candidate.id === 'symbol.search')!;
  expect(
    search.inputSchema.safeParse({ q: '基金', assetType: 'fund-otc,fund-etf', limit: 10 }).success,
  ).toBe(true);
  expect(search.inputSchema.safeParse({ q: '基金', assetType: 'fund', limit: 10 }).success).toBe(
    false,
  );
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
