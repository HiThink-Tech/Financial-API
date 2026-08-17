import { z, type ZodType } from 'zod';

export interface RemoteOptionDescriptor {
  flags: string;
  description: string;
  type: 'string' | 'integer' | 'boolean';
  required?: boolean;
  choices?: readonly string[];
  defaultValue?: string | number | boolean;
  queryName?: string;
}

export interface RemoteCapabilityDescriptor {
  id: string;
  command: readonly [string, string];
  description: string;
  endpoint: string;
  method: 'GET';
  inputSchema: ZodType<Record<string, unknown>>;
  outputSchema: ZodType<unknown>;
  options: readonly RemoteOptionDescriptor[];
  paging: 'none' | 'offset' | 'page';
  pagingEnd?: 'short-page' | 'has-more';
  window: 'none' | 'ten-years' | 'five-years' | 'one-year' | 'today-only';
}

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u);
const aShareCode = z.string().regex(/^\d{6}\.(SH|SZ|BJ)$/iu);
const indexCode = z.string().regex(/^\d{6}\.(SH|SZ|BJ|TI)$/iu);
const commaCodes = z.string().min(1);
const assetTypes = [
  'a-share',
  'a-share-index',
  'forex',
  'fund-otc',
  'fund-etf',
  'fund-lof',
  'fund-reits',
] as const;
const assetTypeCsv = z.string().superRefine((value, context) => {
  const tokens = value.split(',');
  if (
    tokens.length === 0 ||
    tokens.some(
      (token) => token.length === 0 || !assetTypes.includes(token as (typeof assetTypes)[number]),
    )
  ) {
    context.addIssue({ code: 'custom', message: 'invalid comma-separated asset type' });
  }
});
const fundCode = z.string().regex(/^\d{6}\.(OF|SH|SZ)$/iu);
const record = z.record(z.string(), z.unknown());
const itemOutput = z.object({ item: z.array(record) }).passthrough();
const objectOutput = z.object({}).passthrough();

const valuationCodes = z
  .string()
  .superRefine((value, context) => {
    const tokens = value.split(',');
    if (tokens.length > 100) {
      context.addIssue({ code: 'custom', message: 'thscodes accepts at most 100 raw tokens' });
    }
    if (
      tokens.length === 0 ||
      tokens.some(
        (token) => token.trim().length === 0 || !aShareCode.safeParse(token.trim()).success,
      )
    ) {
      context.addIssue({
        code: 'custom',
        message: 'thscodes must be comma-separated A-share codes',
      });
    }
  })
  .transform((value) => {
    const seen = new Set<string>();
    return value
      .split(',')
      .map((token) => token.trim().toUpperCase())
      .filter((token) => {
        if (seen.has(token)) return false;
        seen.add(token);
        return true;
      })
      .join(',');
  });

const historyInput = z
  .object({
    thscode: aShareCode,
    startMs: z.number().int().nonnegative(),
    endMs: z.number().int().nonnegative(),
    adjust: z.enum(['none', 'forward', 'backward']).default('forward'),
  })
  .strict()
  .refine((value) => value.endMs >= value.startMs, { message: 'end-ms must be >= start-ms' });

const indexHistoryInput = z
  .object({
    thscode: indexCode,
    startMs: z.number().int().nonnegative(),
    endMs: z.number().int().nonnegative(),
  })
  .strict()
  .refine((value) => value.endMs >= value.startMs, { message: 'end-ms must be >= start-ms' });

const fundHistoryInput = z
  .object({
    thscode: fundCode,
    interval: z.literal('1d').default('1d'),
    startMs: z.number().int().nonnegative(),
    endMs: z.number().int().nonnegative(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.endMs < value.startMs) {
      context.addIssue({ code: 'custom', message: 'end-ms must be >= start-ms' });
      return;
    }
    const latest = new Date(value.startMs);
    latest.setUTCFullYear(latest.getUTCFullYear() + 5);
    if (value.endMs > latest.getTime()) {
      context.addIssue({
        code: 'custom',
        message: 'fund history window must not exceed five years',
      });
    }
  });

const financialInput = z
  .object({
    thscode: aShareCode,
    period: z.enum(['annual', 'quarterly']).default('annual'),
    limit: z.number().int().min(1).max(20).optional(),
    startMs: z.number().int().nonnegative().optional(),
    endMs: z.number().int().nonnegative().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const hasStart = value.startMs !== undefined;
    const hasEnd = value.endMs !== undefined;
    if (hasStart !== hasEnd) {
      context.addIssue({
        code: 'custom',
        message: 'start-ms and end-ms must be provided together',
      });
    }
    if ((hasStart || hasEnd) && value.limit !== undefined) {
      context.addIssue({ code: 'custom', message: 'limit and date range are mutually exclusive' });
    }
    if (hasStart && hasEnd && value.endMs! < value.startMs!) {
      context.addIssue({ code: 'custom', message: 'end-ms must be >= start-ms' });
    }
  });

const financialOptions: readonly RemoteOptionDescriptor[] = [
  {
    flags: '--thscode <code>',
    description: 'single A-share thscode',
    type: 'string',
    required: true,
  },
  {
    flags: '--period <period>',
    description: 'financial period',
    type: 'string',
    choices: ['annual', 'quarterly'],
    defaultValue: 'annual',
  },
  { flags: '--limit <number>', description: 'recent report count (1-20)', type: 'integer' },
  {
    flags: '--start-ms <milliseconds>',
    description: 'range start in milliseconds',
    type: 'integer',
    queryName: 'start',
  },
  {
    flags: '--end-ms <milliseconds>',
    description: 'range end in milliseconds',
    type: 'integer',
    queryName: 'end',
  },
];

function financial(
  id: string,
  command: 'income' | 'balance-sheet' | 'cash-flow',
  endpoint: string,
): RemoteCapabilityDescriptor {
  return {
    id,
    command: ['financials', command],
    description: `Query ${command} financial statements`,
    endpoint,
    method: 'GET',
    inputSchema: financialInput,
    outputSchema: itemOutput,
    options: financialOptions,
    paging: 'none',
    window: 'ten-years',
  };
}

function fundDetail(
  command:
    | 'profile'
    | 'holdings'
    | 'returns'
    | 'holders'
    | 'industry-allocation'
    | 'drawdowns'
    | 'dividends'
    | 'diagnostics'
    | 'financial-indicators'
    | 'income-statements'
    | 'balance-sheets'
    | 'asset-allocation',
  description: string,
  endpoint: string,
): RemoteCapabilityDescriptor {
  return {
    id: `fund.${command}`,
    command: ['fund', command],
    description,
    endpoint,
    method: 'GET',
    inputSchema: z
      .object({ fundType: z.enum(['otc', 'exchange', 'reits']), thscode: fundCode })
      .strict(),
    outputSchema: itemOutput,
    options: [
      {
        flags: '--fund-type <type>',
        description: 'fund type',
        type: 'string',
        required: true,
        choices: ['otc', 'exchange', 'reits'],
        queryName: 'fund_type',
      },
      {
        flags: '--thscode <code>',
        description: 'single fund thscode',
        type: 'string',
        required: true,
      },
    ],
    paging: 'none',
    window: 'none',
  };
}

function fundManager(
  command: 'manager-style' | 'manager-performance' | 'manager-experience' | 'manager-detail',
  description: string,
  endpoint: string,
): RemoteCapabilityDescriptor {
  const needsRange = command === 'manager-performance';
  const ranges = ['month', 'tmonth', 'year', 'nowyear', 'now'] as const;
  return {
    id: `fund.${command}`,
    command: ['fund', command],
    description,
    endpoint,
    method: 'GET',
    inputSchema: needsRange
      ? z.object({ managerId: z.string().min(1), range: z.enum(ranges) }).strict()
      : z.object({ managerId: z.string().min(1) }).strict(),
    outputSchema: itemOutput,
    options: [
      {
        flags: '--manager-id <id>',
        description: 'fund manager identifier',
        type: 'string',
        required: true,
        queryName: 'manager_id',
      },
      ...(needsRange
        ? [
            {
              flags: '--range <range>',
              description: 'performance range',
              type: 'string' as const,
              required: true,
              choices: ranges,
            },
          ]
        : []),
    ],
    paging: 'none',
    window: 'none',
  };
}

function fundPortfolioHistory(
  command: 'stock-history' | 'bond-history',
  description: string,
  endpoint: string,
): RemoteCapabilityDescriptor {
  return {
    id: `fund.${command}`,
    command: ['fund', command],
    description,
    endpoint,
    method: 'GET',
    inputSchema: z
      .object({
        fundType: z.enum(['otc', 'exchange', 'reits']),
        thscode: fundCode,
        reportType: z.string().min(1),
        endDate: z.string().min(1),
      })
      .strict(),
    outputSchema: itemOutput,
    options: [
      {
        flags: '--fund-type <type>',
        description: 'fund type',
        type: 'string',
        required: true,
        choices: ['otc', 'exchange', 'reits'],
        queryName: 'fund_type',
      },
      {
        flags: '--thscode <code>',
        description: 'single fund thscode',
        type: 'string',
        required: true,
      },
      {
        flags: '--report-type <type>',
        description: 'report type returned by the report-dates capability',
        type: 'string',
        required: true,
        queryName: 'report_type',
      },
      {
        flags: '--end-date <date>',
        description: 'report end date returned by the report-dates capability',
        type: 'string',
        required: true,
        queryName: 'end_date',
      },
    ],
    paging: 'none',
    window: 'none',
  };
}

function fundReportDates(
  command: 'stock-report-dates' | 'bond-report-dates',
  description: string,
  endpoint: string,
): RemoteCapabilityDescriptor {
  return {
    id: `fund.${command}`,
    command: ['fund', command],
    description,
    endpoint,
    method: 'GET',
    inputSchema: z
      .object({
        fundType: z.enum(['otc', 'exchange', 'reits']),
        thscode: fundCode,
        reportType: z.string().min(1).optional(),
      })
      .strict(),
    outputSchema: itemOutput,
    options: [
      {
        flags: '--fund-type <type>',
        description: 'fund type',
        type: 'string',
        required: true,
        choices: ['otc', 'exchange', 'reits'],
        queryName: 'fund_type',
      },
      {
        flags: '--thscode <code>',
        description: 'single fund thscode',
        type: 'string',
        required: true,
      },
      {
        flags: '--report-type <type>',
        description: 'optional report type filter',
        type: 'string',
        queryName: 'report_type',
      },
    ],
    paging: 'none',
    window: 'none',
  };
}

function specialPool(
  command: 'limit-down-pool' | 'limit-break-pool',
  description: string,
  endpoint: string,
): RemoteCapabilityDescriptor {
  const sortFields =
    command === 'limit-down-pool'
      ? ([
          'last_limit_time',
          'first_limit_time',
          'last_price',
          'price_change_ratio_pct',
          'turnover_ratio_pct',
        ] as const)
      : ([
          'price_change_ratio_pct',
          'open_times',
          'last_price',
          'turnover_ratio_pct',
          'turnover',
        ] as const);
  const defaultSortField =
    command === 'limit-down-pool' ? 'last_limit_time' : 'price_change_ratio_pct';
  return {
    id: `special.${command}`,
    command: ['special', command],
    description,
    endpoint,
    method: 'GET',
    inputSchema: z
      .object({
        dateMs: z.number().int().nonnegative().optional(),
        page: z.number().int().min(1).default(1),
        size: z.number().int().min(1).max(200).default(50),
        sortField: z.enum(sortFields).default(defaultSortField),
        sortDir: z.enum(['asc', 'desc']).default('desc'),
      })
      .strict(),
    outputSchema: itemOutput,
    options: [
      {
        flags: '--date-ms <milliseconds>',
        description: 'trade date at Asia/Shanghai midnight',
        type: 'integer',
        queryName: 'date_ms',
      },
      { flags: '--page <number>', description: 'page number', type: 'integer', defaultValue: 1 },
      {
        flags: '--size <number>',
        description: 'page size (1-200)',
        type: 'integer',
        defaultValue: 50,
      },
      {
        flags: '--sort-field <field>',
        description: 'sort field',
        type: 'string',
        choices: sortFields,
        defaultValue: defaultSortField,
        queryName: 'sort_field',
      },
      {
        flags: '--sort-dir <direction>',
        description: 'sort direction',
        type: 'string',
        choices: ['asc', 'desc'],
        defaultValue: 'desc',
        queryName: 'sort_dir',
      },
    ],
    paging: 'page',
    window: 'none',
  };
}

export const remoteCapabilities: readonly RemoteCapabilityDescriptor[] = [
  {
    id: 'symbol.search',
    command: ['symbol', 'search'],
    description: 'Resolve a name or code to thscode',
    endpoint: '/api/meta/tickers/search',
    method: 'GET',
    inputSchema: z
      .object({
        q: z.string().min(1),
        exchange: z.enum(['SH', 'SZ', 'BJ']).optional(),
        assetType: assetTypeCsv.optional(),
        limit: z.number().int().min(1).max(50).default(10),
      })
      .strict(),
    outputSchema: itemOutput,
    options: [
      {
        flags: '--q <query>',
        description: 'name, ticker, or thscode',
        type: 'string',
        required: true,
      },
      {
        flags: '--exchange <exchange>',
        description: 'exchange filter',
        type: 'string',
        choices: ['SH', 'SZ', 'BJ'],
      },
      {
        flags: '--asset-type <type>',
        type: 'string',
        description: `comma-separated asset types: ${assetTypes.join(', ')}`,
        queryName: 'asset_type',
      },
      {
        flags: '--limit <number>',
        description: 'maximum matches (1-50)',
        type: 'integer',
        defaultValue: 10,
      },
    ],
    paging: 'none',
    window: 'none',
  },
  {
    id: 'symbol.list',
    command: ['symbol', 'list'],
    description: 'List symbols with bounded pagination',
    endpoint: '/api/meta/tickers/list',
    method: 'GET',
    inputSchema: z
      .object({
        exchange: z.string().default('SH,SZ'),
        assetType: assetTypeCsv.default('a-share'),
        limit: z.number().int().min(1).max(10000).default(1000),
        offset: z.number().int().nonnegative().default(0),
      })
      .strict(),
    outputSchema: itemOutput,
    options: [
      {
        flags: '--exchange <exchanges>',
        description: 'comma-separated exchanges',
        type: 'string',
        defaultValue: 'SH,SZ',
      },
      {
        flags: '--asset-type <type>',
        type: 'string',
        description: `comma-separated asset types: ${assetTypes.join(', ')}`,
        defaultValue: 'a-share',
        queryName: 'asset_type',
      },
      {
        flags: '--limit <number>',
        description: 'page size (1-10000)',
        type: 'integer',
        defaultValue: 1000,
      },
      { flags: '--offset <number>', description: 'row offset', type: 'integer', defaultValue: 0 },
    ],
    paging: 'offset',
    window: 'none',
  },
  {
    id: 'market.snapshot',
    command: ['market', 'snapshot'],
    description: 'Query A-share price snapshots',
    endpoint: '/api/a-share/prices/snapshot',
    method: 'GET',
    inputSchema: z
      .object({
        thscodes: commaCodes.optional(),
        limit: z.number().int().min(1).max(10000).default(100),
        offset: z.number().int().nonnegative().default(0),
      })
      .strict(),
    outputSchema: itemOutput,
    options: [
      {
        flags: '--thscodes <codes>',
        description: 'comma-separated A-share thscodes',
        type: 'string',
      },
      { flags: '--limit <number>', description: 'page size', type: 'integer', defaultValue: 100 },
      { flags: '--offset <number>', description: 'row offset', type: 'integer', defaultValue: 0 },
    ],
    paging: 'offset',
    window: 'none',
  },
  {
    id: 'market.history',
    command: ['market', 'history'],
    description: 'Query daily A-share history',
    endpoint: '/api/a-share/prices/historical',
    method: 'GET',
    inputSchema: historyInput,
    outputSchema: itemOutput,
    options: [
      {
        flags: '--thscode <code>',
        description: 'single A-share thscode',
        type: 'string',
        required: true,
      },
      {
        flags: '--start-ms <milliseconds>',
        description: 'start timestamp',
        type: 'integer',
        required: true,
        queryName: 'start',
      },
      {
        flags: '--end-ms <milliseconds>',
        description: 'end timestamp',
        type: 'integer',
        required: true,
        queryName: 'end',
      },
      {
        flags: '--adjust <mode>',
        description: 'adjustment mode',
        type: 'string',
        choices: ['none', 'forward', 'backward'],
        defaultValue: 'forward',
      },
    ],
    paging: 'none',
    window: 'ten-years',
  },
  {
    id: 'market.corporate-actions',
    command: ['market', 'corporate-actions'],
    description: 'Query adjustment events',
    endpoint: '/api/a-share/corporate-actions/adjustment-factors',
    method: 'GET',
    inputSchema: z
      .object({ thscode: aShareCode, fromDate: isoDate.optional(), toDate: isoDate.optional() })
      .strict(),
    outputSchema: itemOutput,
    options: [
      {
        flags: '--thscode <code>',
        description: 'single A-share thscode',
        type: 'string',
        required: true,
      },
      {
        flags: '--from-date <date>',
        description: 'first ex-date YYYY-MM-DD',
        type: 'string',
        queryName: 'from',
      },
      {
        flags: '--to-date <date>',
        description: 'last ex-date YYYY-MM-DD',
        type: 'string',
        queryName: 'to',
      },
    ],
    paging: 'none',
    window: 'none',
  },
  financial('financials.income', 'income', '/api/a-share/financials/income-statements'),
  financial('financials.balance-sheet', 'balance-sheet', '/api/a-share/financials/balance-sheets'),
  financial('financials.cash-flow', 'cash-flow', '/api/a-share/financials/cash-flow-statements'),
  {
    id: 'financials.indicators',
    command: ['financials', 'indicators'],
    description: 'Query financial indicators for a report',
    endpoint: '/api/a-share/financials/indicators',
    method: 'GET',
    inputSchema: z
      .object({ thscode: aShareCode, report: z.string().regex(/^\d{4}-[1-4]$/u) })
      .strict(),
    outputSchema: z.object({ abilities: z.array(record) }).passthrough(),
    options: [
      {
        flags: '--thscode <code>',
        description: 'single A-share thscode',
        type: 'string',
        required: true,
      },
      {
        flags: '--report <period>',
        description: 'report quarter YYYY-[1-4]',
        type: 'string',
        required: true,
      },
    ],
    paging: 'none',
    window: 'none',
  },
  {
    id: 'valuation.snapshot',
    command: ['valuation', 'snapshot'],
    description: 'Query current A-share valuation metrics',
    endpoint: '/api/a-share/valuations/snapshot',
    method: 'GET',
    inputSchema: z.object({ thscodes: valuationCodes }).strict(),
    outputSchema: itemOutput,
    options: [
      {
        flags: '--thscodes <codes>',
        description: 'comma-separated A-share thscodes (at most 100 raw tokens)',
        type: 'string',
        required: true,
      },
    ],
    paging: 'none',
    window: 'none',
  },
  {
    id: 'market.calendar',
    command: ['market', 'calendar'],
    description: 'Query the one-year A-share trading calendar',
    endpoint: '/api/a-share/calendar/trading-days',
    method: 'GET',
    inputSchema: z.object({}).strict(),
    outputSchema: itemOutput,
    options: [],
    paging: 'none',
    window: 'one-year',
  },
  {
    id: 'market.auction-snapshot',
    command: ['market', 'auction-snapshot'],
    description: 'Query auction snapshots whose timestamp is the response assembly timestamp',
    endpoint: '/api/a-share/auction/snapshot',
    method: 'GET',
    inputSchema: z
      .object({ thscodes: valuationCodes, stage: z.enum(['live', 'final']).default('final') })
      .strict(),
    outputSchema: itemOutput,
    options: [
      {
        flags: '--thscodes <codes>',
        description: 'comma-separated A-share thscodes (at most 100 raw tokens)',
        type: 'string',
        required: true,
      },
      {
        flags: '--stage <stage>',
        description: 'auction stage',
        type: 'string',
        choices: ['live', 'final'],
        defaultValue: 'final',
      },
    ],
    paging: 'none',
    window: 'today-only',
  },
  {
    id: 'market.auction-benchmark',
    command: ['market', 'auction-benchmark'],
    description:
      'Query the short-term auction benchmark; omit date for the Asia/Shanghai current date and read resolved date/date_ms from data',
    endpoint: '/api/a-share/auction/short-term-benchmark',
    method: 'GET',
    inputSchema: z.object({ date: isoDate.optional() }).strict(),
    outputSchema: itemOutput,
    options: [
      {
        flags: '--date <date>',
        description: 'optional trade date YYYY-MM-DD; omit for the Asia/Shanghai current date',
        type: 'string',
      },
    ],
    paging: 'none',
    window: 'none',
  },
  {
    id: 'index.catalog',
    command: ['index', 'catalog'],
    description: 'List THS indices by category',
    endpoint: '/api/a-share-index/catalog/ths-index-list',
    method: 'GET',
    inputSchema: z
      .object({ tag: z.enum(['cn_concept', 'region', 'tszs', 'industry']).default('cn_concept') })
      .strict(),
    outputSchema: itemOutput,
    options: [
      {
        flags: '--tag <tag>',
        description: 'index category',
        type: 'string',
        choices: ['cn_concept', 'region', 'tszs', 'industry'],
        defaultValue: 'cn_concept',
      },
    ],
    paging: 'none',
    window: 'none',
  },
  {
    id: 'index.constituents',
    command: ['index', 'constituents'],
    description: 'Query index constituents',
    endpoint: '/api/a-share-index/constituents/ths-stock-list',
    method: 'GET',
    inputSchema: z.object({ thscode: indexCode }).strict(),
    outputSchema: itemOutput,
    options: [
      {
        flags: '--thscode <code>',
        description: 'single index thscode',
        type: 'string',
        required: true,
      },
    ],
    paging: 'none',
    window: 'none',
  },
  {
    id: 'index.snapshot',
    command: ['index', 'snapshot'],
    description: 'Query index price snapshots',
    endpoint: '/api/a-share-index/prices/snapshot',
    method: 'GET',
    inputSchema: z.object({ thscodes: commaCodes }).strict(),
    outputSchema: itemOutput,
    options: [
      {
        flags: '--thscodes <codes>',
        description: 'comma-separated index thscodes',
        type: 'string',
        required: true,
      },
    ],
    paging: 'none',
    window: 'none',
  },
  {
    id: 'index.history',
    command: ['index', 'history'],
    description: 'Query daily index history',
    endpoint: '/api/a-share-index/prices/historical',
    method: 'GET',
    inputSchema: indexHistoryInput,
    outputSchema: itemOutput,
    options: [
      {
        flags: '--thscode <code>',
        description: 'single index thscode',
        type: 'string',
        required: true,
      },
      {
        flags: '--start-ms <milliseconds>',
        description: 'start timestamp',
        type: 'integer',
        required: true,
        queryName: 'start',
      },
      {
        flags: '--end-ms <milliseconds>',
        description: 'end timestamp',
        type: 'integer',
        required: true,
        queryName: 'end',
      },
    ],
    paging: 'none',
    window: 'ten-years',
  },
  fundDetail('profile', 'Query fund profile detail', '/api/fund/profile/detail'),
  fundDetail('holdings', 'Query fund portfolio holdings', '/api/fund/portfolio/holdings'),
  {
    id: 'fund.nav',
    command: ['fund', 'nav'],
    description: 'Query fund net asset value series',
    endpoint: '/api/fund/performance/nav',
    method: 'GET',
    inputSchema: z
      .object({
        fundType: z.enum(['otc', 'exchange', 'reits']),
        thscode: fundCode,
        range: z
          .enum(['week', 'month', 'tmonth', 'hyear', 'year', 'twoyear', 'tyear', 'fyear'])
          .optional(),
        navType: z.enum(['unit', 'adj', 'unit,adj']).default('unit,adj'),
      })
      .strict(),
    outputSchema: itemOutput,
    options: [
      {
        flags: '--fund-type <type>',
        description: 'fund type',
        type: 'string',
        required: true,
        choices: ['otc', 'exchange', 'reits'],
        queryName: 'fund_type',
      },
      {
        flags: '--thscode <code>',
        description: 'single fund thscode',
        type: 'string',
        required: true,
      },
      {
        flags: '--range <range>',
        description: 'NAV history range; omit for the latest point',
        type: 'string',
        choices: ['week', 'month', 'tmonth', 'hyear', 'year', 'twoyear', 'tyear', 'fyear'],
      },
      {
        flags: '--nav-type <type>',
        description: 'NAV fields to return',
        type: 'string',
        choices: ['unit', 'adj', 'unit,adj'],
        defaultValue: 'unit,adj',
        queryName: 'nav_type',
      },
    ],
    paging: 'none',
    window: 'none',
  },
  fundDetail('returns', 'Query fund interval returns', '/api/fund/performance/returns'),
  {
    id: 'fund.holders',
    command: ['fund', 'holders'],
    description: 'Query fund holder structure by disclosure scope',
    endpoint: '/api/fund/holders/detail',
    method: 'GET',
    inputSchema: z
      .object({
        fundType: z.enum(['otc', 'exchange', 'reits']),
        thscode: fundCode,
        mergeScope: z.enum(['all', 'merged', 'separate']).default('all'),
      })
      .strict(),
    outputSchema: itemOutput,
    options: [
      {
        flags: '--fund-type <type>',
        description: 'fund type',
        type: 'string',
        required: true,
        choices: ['otc', 'exchange', 'reits'],
        queryName: 'fund_type',
      },
      {
        flags: '--thscode <code>',
        description: 'single fund thscode',
        type: 'string',
        required: true,
      },
      {
        flags: '--merge-scope <scope>',
        description: 'holder disclosure scope',
        type: 'string',
        choices: ['all', 'merged', 'separate'],
        defaultValue: 'all',
        queryName: 'merge_scope',
      },
    ],
    paging: 'none',
    window: 'none',
  },
  {
    id: 'fund.snapshot',
    command: ['fund', 'snapshot'],
    description: 'Query exchange-traded fund market snapshot',
    endpoint: '/api/fund/market/snapshot',
    method: 'GET',
    inputSchema: z.object({ thscode: fundCode }).strict(),
    outputSchema: itemOutput,
    options: [
      {
        flags: '--thscode <code>',
        description: 'single ETF or LOF thscode',
        type: 'string',
        required: true,
      },
    ],
    paging: 'none',
    window: 'none',
  },
  {
    id: 'fund.history',
    command: ['fund', 'history'],
    description: 'Query daily ETF price history',
    endpoint: '/api/fund/market/historical',
    method: 'GET',
    inputSchema: fundHistoryInput,
    outputSchema: itemOutput,
    options: [
      {
        flags: '--thscode <code>',
        description: 'single ETF thscode',
        type: 'string',
        required: true,
      },
      {
        flags: '--interval <interval>',
        description: 'bar interval',
        type: 'string',
        choices: ['1d'],
        defaultValue: '1d',
      },
      {
        flags: '--start-ms <milliseconds>',
        description: 'start timestamp',
        type: 'integer',
        required: true,
        queryName: 'start',
      },
      {
        flags: '--end-ms <milliseconds>',
        description: 'end timestamp',
        type: 'integer',
        required: true,
        queryName: 'end',
      },
    ],
    paging: 'none',
    window: 'five-years',
  },
  {
    id: 'fund.company-detail',
    command: ['fund', 'company-detail'],
    description: 'Query fund company detail',
    endpoint: '/api/fund/companies/detail',
    method: 'GET',
    inputSchema: z.object({ companyId: z.string().min(1) }).strict(),
    outputSchema: itemOutput,
    options: [
      {
        flags: '--company-id <id>',
        description: 'fund company identifier',
        type: 'string',
        required: true,
        queryName: 'company_id',
      },
    ],
    paging: 'none',
    window: 'none',
  },
  fundDetail(
    'industry-allocation',
    'Query fund industry allocation',
    '/api/fund/portfolio/industry-allocation',
  ),
  {
    id: 'fund.indicators-history',
    command: ['fund', 'indicators-history'],
    description:
      'Query historical fund performance indicators with data timestamp/item only and no top-level thscode/interval',
    endpoint: '/api/fund/performance/indicators-historical',
    method: 'GET',
    inputSchema: z
      .object({
        fundType: z.enum(['otc', 'exchange', 'reits']),
        thscode: fundCode,
        startMs: z.number().int().nonnegative(),
        endMs: z.number().int().nonnegative(),
      })
      .strict()
      .superRefine((value, context) => {
        if (value.endMs < value.startMs) {
          context.addIssue({ code: 'custom', message: 'end-ms must be >= start-ms' });
          return;
        }
        const latest = new Date(value.startMs);
        latest.setUTCFullYear(latest.getUTCFullYear() + 5);
        if (value.endMs > latest.getTime()) {
          context.addIssue({
            code: 'custom',
            message: 'indicator window must not exceed five years',
          });
        }
      }),
    outputSchema: itemOutput,
    options: [
      {
        flags: '--fund-type <type>',
        description: 'fund type',
        type: 'string',
        required: true,
        choices: ['otc', 'exchange', 'reits'],
        queryName: 'fund_type',
      },
      {
        flags: '--thscode <code>',
        description: 'single fund thscode',
        type: 'string',
        required: true,
      },
      {
        flags: '--start-ms <milliseconds>',
        description: 'range start in milliseconds',
        type: 'integer',
        required: true,
        queryName: 'start',
      },
      {
        flags: '--end-ms <milliseconds>',
        description: 'range end in milliseconds',
        type: 'integer',
        required: true,
        queryName: 'end',
      },
    ],
    paging: 'none',
    window: 'five-years',
  },
  fundDetail('drawdowns', 'Query fund drawdown periods', '/api/fund/performance/drawdowns'),
  {
    id: 'fund.top-holders',
    command: ['fund', 'top-holders'],
    description: 'Query top fund holders',
    endpoint: '/api/fund/holders/top',
    method: 'GET',
    inputSchema: z
      .object({
        fundType: z.enum(['otc', 'exchange', 'reits']),
        thscode: fundCode,
        limit: z.number().int().min(1).max(10).optional(),
      })
      .strict(),
    outputSchema: itemOutput,
    options: [
      {
        flags: '--fund-type <type>',
        description: 'fund type',
        type: 'string',
        required: true,
        choices: ['otc', 'exchange', 'reits'],
        queryName: 'fund_type',
      },
      {
        flags: '--thscode <code>',
        description: 'single fund thscode',
        type: 'string',
        required: true,
      },
      { flags: '--limit <number>', description: 'maximum holders (1-10)', type: 'integer' },
    ],
    paging: 'none',
    window: 'none',
  },
  fundDetail('dividends', 'Query fund dividend records', '/api/fund/corporate-actions/dividends'),
  fundDetail('diagnostics', 'Query fund diagnostics', '/api/fund/diagnostics/detail'),
  fundDetail(
    'financial-indicators',
    'Query fund financial indicators',
    '/api/fund/financials/indicators',
  ),
  fundDetail(
    'income-statements',
    'Query fund income statements',
    '/api/fund/financials/income-statements',
  ),
  fundDetail('balance-sheets', 'Query fund balance sheets', '/api/fund/financials/balance-sheets'),
  fundManager(
    'manager-style',
    'Query fund manager investment style',
    '/api/fund/managers/investment-style',
  ),
  fundManager(
    'manager-performance',
    'Query fund manager performance',
    '/api/fund/managers/performance',
  ),
  fundManager(
    'manager-experience',
    'Query fund manager experience',
    '/api/fund/managers/experience',
  ),
  fundManager('manager-detail', 'Query fund manager detail', '/api/fund/managers/detail'),
  {
    id: 'fund.news',
    command: ['fund', 'news'],
    description: 'Query cursor-paginated public fund article metadata with has_more and no total',
    endpoint: '/api/fund/news/article-list',
    method: 'GET',
    inputSchema: z
      .object({
        fundType: z.enum(['otc', 'exchange', 'reits']),
        thscode: fundCode,
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.string().min(1).optional(),
      })
      .strict(),
    outputSchema: itemOutput,
    options: [
      {
        flags: '--fund-type <type>',
        description: 'fund type',
        type: 'string',
        required: true,
        choices: ['otc', 'exchange', 'reits'],
        queryName: 'fund_type',
      },
      {
        flags: '--thscode <code>',
        description: 'single fund thscode',
        type: 'string',
        required: true,
      },
      {
        flags: '--limit <number>',
        description: 'page size (1-100)',
        type: 'integer',
        defaultValue: 20,
      },
      { flags: '--offset <cursor>', description: 'opaque pagination cursor', type: 'string' },
    ],
    paging: 'offset',
    pagingEnd: 'has-more',
    window: 'none',
  },
  {
    id: 'fund.offerings',
    command: ['fund', 'offerings'],
    description: 'Query active or upcoming fund offerings',
    endpoint: '/api/fund/offerings/list',
    method: 'GET',
    inputSchema: z.object({ subscribe: z.enum(['active', 'upcoming']) }).strict(),
    outputSchema: itemOutput,
    options: [
      {
        flags: '--subscribe <status>',
        description: 'offering status',
        type: 'string',
        required: true,
        choices: ['active', 'upcoming'],
      },
    ],
    paging: 'none',
    window: 'none',
  },
  fundPortfolioHistory(
    'stock-history',
    'Query historical fund stock holdings',
    '/api/fund/portfolio/stock-history',
  ),
  fundReportDates(
    'stock-report-dates',
    'Query fund stock holding report dates',
    '/api/fund/portfolio/stock-report-dates',
  ),
  fundPortfolioHistory(
    'bond-history',
    'Query historical fund bond holdings',
    '/api/fund/portfolio/bond-history',
  ),
  fundReportDates(
    'bond-report-dates',
    'Query fund bond holding report dates',
    '/api/fund/portfolio/bond-report-dates',
  ),
  fundDetail(
    'asset-allocation',
    'Query fund asset allocation',
    '/api/fund/portfolio/asset-allocation',
  ),
  {
    id: 'special.limit-up-pool',
    command: ['special', 'limit-up-pool'],
    description: 'Query the limit-up stock pool',
    endpoint: '/api/a-share/special-data/limit-up-pool',
    method: 'GET',
    inputSchema: z
      .object({
        dateMs: z.number().int().nonnegative().optional(),
        page: z.number().int().min(1).default(1),
        size: z.number().int().min(1).max(200).default(50),
        sortField: z
          .enum(['last_price', 'continue_day_cnt', 'seal_money', 'limit_up_time'])
          .default('last_price'),
        sortDir: z.enum(['asc', 'desc']).default('desc'),
      })
      .strict(),
    outputSchema: itemOutput,
    options: [
      {
        flags: '--date-ms <milliseconds>',
        description: 'trade date at Asia/Shanghai midnight',
        type: 'integer',
        queryName: 'date_ms',
      },
      { flags: '--page <number>', description: 'page number', type: 'integer', defaultValue: 1 },
      {
        flags: '--size <number>',
        description: 'page size (1-200)',
        type: 'integer',
        defaultValue: 50,
      },
      {
        flags: '--sort-field <field>',
        description: 'sort field',
        type: 'string',
        choices: ['last_price', 'continue_day_cnt', 'seal_money', 'limit_up_time'],
        defaultValue: 'last_price',
        queryName: 'sort_field',
      },
      {
        flags: '--sort-dir <direction>',
        description: 'sort direction',
        type: 'string',
        choices: ['asc', 'desc'],
        defaultValue: 'desc',
        queryName: 'sort_dir',
      },
    ],
    paging: 'page',
    window: 'none',
  },
  specialPool(
    'limit-down-pool',
    'Query the limit-down stock pool',
    '/api/a-share/special-data/limit-down-pool',
  ),
  specialPool(
    'limit-break-pool',
    'Query the limit-break stock pool',
    '/api/a-share/special-data/limit-break-pool',
  ),
  {
    id: 'special.limit-up-ladder',
    command: ['special', 'limit-up-ladder'],
    description: 'Query the 30-day limit-up ladder',
    endpoint: '/api/a-share/special-data/limit-up-ladder',
    method: 'GET',
    inputSchema: z.object({}).strict(),
    outputSchema: itemOutput,
    options: [],
    paging: 'none',
    window: 'none',
  },
  {
    id: 'special.anomaly-list',
    command: ['special', 'anomaly-list'],
    description: 'Query today-only anomaly analysis rows',
    endpoint: '/api/a-share/special-data/anomaly-analysis-list',
    method: 'GET',
    inputSchema: z
      .object({
        tagCodes: z
          .string()
          .refine((value) =>
            value
              .split(',')
              .every(
                (token) =>
                  [
                    'LIMIT_UP',
                    'LIMIT_DOWN',
                    'SHARP_RISE',
                    'SHARP_FALL',
                    'RAPID_RALLY',
                    'RAPID_DECLINE',
                  ].includes(token.toUpperCase()) && token.length > 0,
              ),
          )
          .optional(),
      })
      .strict(),
    outputSchema: itemOutput,
    options: [
      {
        flags: '--tag-codes <codes>',
        description: 'comma-separated anomaly tags',
        type: 'string',
        queryName: 'tag_codes',
      },
    ],
    paging: 'none',
    window: 'today-only',
  },
  {
    id: 'special.anomaly-stock',
    command: ['special', 'anomaly-stock'],
    description: 'Query today-only anomalies for up to 50 raw code tokens',
    endpoint: '/api/a-share/special-data/anomaly-analysis-stock',
    method: 'GET',
    inputSchema: z
      .object({
        thscodes: z.string().superRefine((value, context) => {
          const tokens = value.split(',');
          if (tokens.length > 50)
            context.addIssue({ code: 'custom', message: 'at most 50 raw tokens' });
          if (tokens.some((token) => !/^\d{6}\.(SH|SZ|BJ)$/iu.test(token)))
            context.addIssue({ code: 'custom', message: 'invalid or empty A-share token' });
        }),
      })
      .strict(),
    outputSchema: itemOutput,
    options: [
      {
        flags: '--thscodes <codes>',
        description: '1-50 comma-separated A-share thscodes',
        type: 'string',
        required: true,
      },
    ],
    paging: 'none',
    window: 'today-only',
  },
  {
    id: 'special.skyrocket',
    command: ['special', 'skyrocket'],
    description: 'Query the skyrocket ranking',
    endpoint: '/api/a-share/special-data/skyrocket-list',
    method: 'GET',
    inputSchema: z.object({ period: z.enum(['day', 'hour']).default('day') }).strict(),
    outputSchema: itemOutput,
    options: [
      {
        flags: '--period <period>',
        description: 'ranking period',
        type: 'string',
        choices: ['day', 'hour'],
        defaultValue: 'day',
      },
    ],
    paging: 'none',
    window: 'none',
  },
  {
    id: 'special.hot-stock',
    command: ['special', 'hot-stock'],
    description: 'Query the current hot-stock ranking',
    endpoint: '/api/a-share/special-data/hot-stock-list',
    method: 'GET',
    inputSchema: z.object({ period: z.enum(['day', 'hour']).default('day') }).strict(),
    outputSchema: itemOutput,
    options: [
      {
        flags: '--period <period>',
        description: 'ranking period',
        type: 'string',
        choices: ['day', 'hour'],
        defaultValue: 'day',
      },
    ],
    paging: 'none',
    window: 'none',
  },
  {
    id: 'special.hot-stock-history',
    command: ['special', 'hot-stock-history'],
    description: 'Query a historical hot-stock ranking',
    endpoint: '/api/a-share/special-data/hot-stock-list-history',
    method: 'GET',
    inputSchema: z.object({ date: isoDate }).strict(),
    outputSchema: itemOutput,
    options: [
      {
        flags: '--date <date>',
        description: 'trade date YYYY-MM-DD',
        type: 'string',
        required: true,
      },
    ],
    paging: 'none',
    window: 'one-year',
  },
  {
    id: 'special.hot-stock-trend',
    command: ['special', 'hot-stock-trend'],
    description: 'Query one stock hot-rank trend',
    endpoint: '/api/a-share/special-data/hot-stock-rank-trend',
    method: 'GET',
    inputSchema: z
      .object({ thscode: aShareCode, startDate: isoDate, endDate: isoDate })
      .strict()
      .refine((value) => value.startDate <= value.endDate, {
        message: 'start-date must be <= end-date',
      }),
    outputSchema: itemOutput,
    options: [
      {
        flags: '--thscode <code>',
        description: 'single A-share thscode',
        type: 'string',
        required: true,
      },
      {
        flags: '--start-date <date>',
        description: 'start date YYYY-MM-DD',
        type: 'string',
        required: true,
        queryName: 'start_date',
      },
      {
        flags: '--end-date <date>',
        description: 'end date YYYY-MM-DD',
        type: 'string',
        required: true,
        queryName: 'end_date',
      },
    ],
    paging: 'none',
    window: 'one-year',
  },
  {
    id: 'special.dragon-tiger',
    command: ['special', 'dragon-tiger'],
    description: 'Query dragon-tiger board records',
    endpoint: '/api/a-share/special-data/dragon-tiger-list',
    method: 'GET',
    inputSchema: z
      .object({
        boardType: z.enum(['all', 'org', 'hot_money']).default('all'),
        date: isoDate.optional(),
      })
      .strict(),
    outputSchema: objectOutput,
    options: [
      {
        flags: '--board-type <type>',
        description: 'board category',
        type: 'string',
        choices: ['all', 'org', 'hot_money'],
        defaultValue: 'all',
        queryName: 'board_type',
      },
      { flags: '--date <date>', description: 'optional trade date YYYY-MM-DD', type: 'string' },
    ],
    paging: 'none',
    window: 'one-year',
  },
] as const;
