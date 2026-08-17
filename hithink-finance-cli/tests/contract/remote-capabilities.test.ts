import { describe, expect, test } from 'vitest';
import { remoteCapabilities } from '../../src/contracts/remote-capabilities.js';

const EXPECTED_56_IDS = [
  'symbol.search',
  'symbol.list',
  'market.snapshot',
  'market.history',
  'market.corporate-actions',
  'financials.income',
  'financials.balance-sheet',
  'financials.cash-flow',
  'financials.indicators',
  'valuation.snapshot',
  'market.calendar',
  'market.auction-snapshot',
  'market.auction-benchmark',
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
  'fund.company-detail',
  'fund.industry-allocation',
  'fund.indicators-history',
  'fund.drawdowns',
  'fund.top-holders',
  'fund.dividends',
  'fund.diagnostics',
  'fund.financial-indicators',
  'fund.income-statements',
  'fund.balance-sheets',
  'fund.manager-style',
  'fund.manager-performance',
  'fund.manager-experience',
  'fund.manager-detail',
  'fund.news',
  'fund.offerings',
  'fund.stock-history',
  'fund.stock-report-dates',
  'fund.bond-history',
  'fund.bond-report-dates',
  'fund.asset-allocation',
  'special.limit-up-pool',
  'special.limit-down-pool',
  'special.limit-break-pool',
  'special.limit-up-ladder',
  'special.anomaly-list',
  'special.anomaly-stock',
  'special.skyrocket',
  'special.hot-stock',
  'special.hot-stock-history',
  'special.hot-stock-trend',
  'special.dragon-tiger',
];

test('registers exactly the frozen 56 remote capabilities with unique command paths', () => {
  expect(remoteCapabilities.map((capability) => capability.id).sort()).toEqual(
    EXPECTED_56_IDS.sort(),
  );
  expect(new Set(remoteCapabilities.map((capability) => capability.command.join(' '))).size).toBe(
    56,
  );
  expect(remoteCapabilities.every((capability) => capability.method === 'GET')).toBe(true);
});

test('maps valuation snapshot to its dedicated command and validates raw code tokens', () => {
  const valuation = remoteCapabilities.find((candidate) => candidate.id === 'valuation.snapshot')!;

  expect(valuation.command.join(' ')).toEqual('valuation snapshot');
  expect(valuation.endpoint).toEqual('/api/a-share/valuations/snapshot');
  expect(valuation.options).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ flags: '--thscodes <codes>', required: true }),
    ]),
  );
  expect(
    valuation.inputSchema.parse({
      thscodes: ' 600519.sh,000001.SZ,600519.SH ',
    }),
  ).toEqual({ thscodes: '600519.SH,000001.SZ' });
  expect(
    valuation.inputSchema.safeParse({
      thscodes: Array.from({ length: 101 }, () => '600519.SH').join(','),
    }).success,
  ).toBe(false);
  expect(valuation.inputSchema.safeParse({ thscodes: '600519.SH,' }).success).toBe(false);
  expect(valuation.inputSchema.safeParse({ thscodes: '000300.TI' }).success).toBe(false);
});

test('keeps all 28 fund capabilities under the fund command group', () => {
  const fund = remoteCapabilities.filter((capability) => capability.id.startsWith('fund.'));
  expect(fund.map((capability) => capability.command.join(' '))).toEqual([
    'fund profile',
    'fund holdings',
    'fund nav',
    'fund returns',
    'fund holders',
    'fund snapshot',
    'fund history',
    'fund company-detail',
    'fund industry-allocation',
    'fund indicators-history',
    'fund drawdowns',
    'fund top-holders',
    'fund dividends',
    'fund diagnostics',
    'fund financial-indicators',
    'fund income-statements',
    'fund balance-sheets',
    'fund manager-style',
    'fund manager-performance',
    'fund manager-experience',
    'fund manager-detail',
    'fund news',
    'fund offerings',
    'fund stock-history',
    'fund stock-report-dates',
    'fund bond-history',
    'fund bond-report-dates',
    'fund asset-allocation',
  ]);
  expect(fund.map((capability) => capability.endpoint)).toEqual([
    '/api/fund/profile/detail',
    '/api/fund/portfolio/holdings',
    '/api/fund/performance/nav',
    '/api/fund/performance/returns',
    '/api/fund/holders/detail',
    '/api/fund/market/snapshot',
    '/api/fund/market/historical',
    '/api/fund/companies/detail',
    '/api/fund/portfolio/industry-allocation',
    '/api/fund/performance/indicators-historical',
    '/api/fund/performance/drawdowns',
    '/api/fund/holders/top',
    '/api/fund/corporate-actions/dividends',
    '/api/fund/diagnostics/detail',
    '/api/fund/financials/indicators',
    '/api/fund/financials/income-statements',
    '/api/fund/financials/balance-sheets',
    '/api/fund/managers/investment-style',
    '/api/fund/managers/performance',
    '/api/fund/managers/experience',
    '/api/fund/managers/detail',
    '/api/fund/news/article-list',
    '/api/fund/offerings/list',
    '/api/fund/portfolio/stock-history',
    '/api/fund/portfolio/stock-report-dates',
    '/api/fund/portfolio/bond-history',
    '/api/fund/portfolio/bond-report-dates',
    '/api/fund/portfolio/asset-allocation',
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

test('keeps all eleven special-data capabilities under special only', () => {
  const specialPaths = remoteCapabilities
    .filter((capability) => capability.id.startsWith('special.'))
    .map((capability) => capability.command.join(' '));
  expect(specialPaths).toEqual([
    'special limit-up-pool',
    'special limit-down-pool',
    'special limit-break-pool',
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
    remoteCapabilities
      .filter((capability) => capability.id.startsWith('special.'))
      .map((capability) => capability.endpoint),
  ).toEqual([
    '/api/a-share/special-data/limit-up-pool',
    '/api/a-share/special-data/limit-down-pool',
    '/api/a-share/special-data/limit-break-pool',
    '/api/a-share/special-data/limit-up-ladder',
    '/api/a-share/special-data/anomaly-analysis-list',
    '/api/a-share/special-data/anomaly-analysis-stock',
    '/api/a-share/special-data/skyrocket-list',
    '/api/a-share/special-data/hot-stock-list',
    '/api/a-share/special-data/hot-stock-list-history',
    '/api/a-share/special-data/hot-stock-rank-trend',
    '/api/a-share/special-data/dragon-tiger-list',
  ]);
  expect(
    remoteCapabilities.some(
      (capability) => capability.command[0] === 'market' && capability.id.startsWith('special.'),
    ),
  ).toBe(false);
});

test.each([
  [
    'special.limit-down-pool',
    'last_limit_time',
    [
      'last_limit_time',
      'first_limit_time',
      'last_price',
      'price_change_ratio_pct',
      'turnover_ratio_pct',
    ],
  ],
  [
    'special.limit-break-pool',
    'price_change_ratio_pct',
    ['price_change_ratio_pct', 'open_times', 'last_price', 'turnover_ratio_pct', 'turnover'],
  ],
] as const)('%s preserves the published sort contract', (id, defaultSortField, choices) => {
  const capability = remoteCapabilities.find((candidate) => candidate.id === id)!;
  const sortOption = capability.options.find((option) => option.flags === '--sort-field <field>');

  expect(sortOption).toEqual(
    expect.objectContaining({
      choices,
      defaultValue: defaultSortField,
      queryName: 'sort_field',
    }),
  );
  expect(capability.inputSchema.parse({}).sortField).toBe(defaultSortField);
  expect(capability.inputSchema.safeParse({ sortField: 'price_change_ratio_pct' }).success).toBe(
    true,
  );
});

test('maps auction and new fund parameter boundaries', () => {
  const auction = remoteCapabilities.find(
    (candidate) => candidate.id === 'market.auction-snapshot',
  )!;
  expect(auction.command.join(' ')).toEqual('market auction-snapshot');
  expect(auction.endpoint).toEqual('/api/a-share/auction/snapshot');
  expect(auction.description).toContain('response assembly timestamp');
  expect(auction.inputSchema.safeParse({ thscodes: '600519.SH', stage: 'live' }).success).toBe(
    true,
  );
  expect(auction.inputSchema.safeParse({ thscodes: '600519.SH', stage: 'open' }).success).toBe(
    false,
  );
  const benchmark = remoteCapabilities.find(
    (candidate) => candidate.id === 'market.auction-benchmark',
  )!;
  expect(benchmark.command.join(' ')).toEqual('market auction-benchmark');
  expect(benchmark.endpoint).toEqual('/api/a-share/auction/short-term-benchmark');
  expect(benchmark.description).toContain('Asia/Shanghai current date');
  expect(benchmark.description).toContain('date/date_ms');

  const indicators = remoteCapabilities.find(
    (candidate) => candidate.id === 'fund.indicators-history',
  )!;
  expect(indicators.endpoint).toEqual('/api/fund/performance/indicators-historical');
  expect(indicators.description).toContain('data timestamp/item only');
  expect(indicators.description).toContain('no top-level thscode/interval');
  expect(
    indicators.inputSchema.safeParse({
      fundType: 'otc',
      thscode: '025480.OF',
      startMs: 1,
      endMs: 2,
    }).success,
  ).toBe(true);
  expect(
    indicators.inputSchema.safeParse({
      fundType: 'otc',
      thscode: '025480.OF',
      startMs: 2,
      endMs: 1,
    }).success,
  ).toBe(false);

  const news = remoteCapabilities.find((candidate) => candidate.id === 'fund.news')!;
  expect(news.description).toContain('has_more');
  expect(news.description).toContain('no total');
  expect(news.pagingEnd).toBe('has-more');
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
