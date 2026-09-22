import { z, type ZodType } from 'zod';

export interface RemoteOptionDescriptor {
  flags: string;
  description: string;
  type: 'string' | 'integer' | 'number' | 'boolean';
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
  paging: 'none' | 'offset' | 'page' | 'json';
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
  'futures',
  'options',
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
const securityCode = z.string().regex(/^\d{6}\.(OF|SH|SZ|BJ)$/iu);
const derivativeCode = z.string().trim().min(1);
const derivativeVariety = z.string().regex(/^[A-Z][A-Z0-9]*$/u);
const derivativeList = z.string().superRefine((value, context) => {
  const tokens = value.split(',').map((token) => token.trim());
  if (tokens.length < 1 || tokens.length > 5 || tokens.some((token) => token.length === 0))
    context.addIssue({ code: 'custom', message: 'list must contain 1 to 5 non-empty values' });
});
const record = z.record(z.string(), z.unknown());
const itemOutput = z.object({ item: z.array(record) }).passthrough();
const objectOutput = z.object({}).passthrough();
const arrayOutput = z.array(z.unknown());

function jsonString<T>(schema: z.ZodType<T>, field: string): z.ZodString {
  return z.string().superRefine((value, context) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(value) as unknown;
    } catch {
      context.addIssue({ code: 'custom', message: `${field} must be valid JSON` });
      return;
    }
    const result = schema.safeParse(parsed);
    if (!result.success) {
      for (const issue of result.error.issues) {
        context.addIssue({
          code: 'custom',
          message: `${field}.${issue.path.join('.')}: ${issue.message}`,
        });
      }
    }
  });
}

const conditionJson = jsonString(z.union([record, z.array(z.unknown())]), 'condition');
const lineIndexesJson = jsonString(
  z.array(
    z
      .object({
        thscodes: z.array(securityCode),
        index_info: z.array(
          z
            .object({ index_id: z.string().min(1), attribute: z.unknown().optional() })
            .passthrough(),
        ),
      })
      .passthrough(),
  ),
  'indexes',
);
const timeRangeJson = jsonString(
  z
    .object({
      time_type: z.string().min(1),
      start: z.number().int().safe().optional(),
      end: z.number().int().safe().optional(),
      offset: z.number().int().safe().optional(),
    })
    .passthrough()
    .refine(
      (value) => value.start === undefined || value.end === undefined || value.end >= value.start,
      {
        message: 'end must be >= start',
      },
    ),
  'time_range',
);
const tableSelectorsJson = jsonString(
  z
    .object({
      include: z.array(z.object({ type: z.string().min(1) }).passthrough()).optional(),
    })
    .passthrough()
    .superRefine((value, context) => {
      for (const selector of value.include ?? []) {
        const candidate = selector as Record<string, unknown>;
        const securities = selector.type === 'stock_code' || selector.type === 'fund_code';
        const values = securities ? candidate.thscodes : candidate.values;
        if (
          !Array.isArray(values) ||
          values.some(
            (item) =>
              typeof item !== 'string' || (securities && !securityCode.safeParse(item).success),
          ) ||
          (securities && candidate.values !== undefined)
        ) {
          context.addIssue({ code: 'custom', message: 'invalid code selector' });
        }
      }
    }),
  'code_selectors',
);
const tableIndexesJson = jsonString(
  z.array(
    z
      .object({
        index_id: z.string().min(1),
        timestamp: z.number().int().safe().optional(),
        attribute: z.unknown().optional(),
      })
      .passthrough(),
  ),
  'indexes',
);
const pageInfoJson = jsonString(
  z
    .object({
      page_begin: z.number().int().safe().optional(),
      page_size: z.number().int().safe().optional(),
      code_begin: z.number().int().safe().optional(),
      code_page_size: z.number().int().safe().optional(),
    })
    .passthrough(),
  'page_info',
);
const sortJson = jsonString(
  z.array(z.object({ idx: z.number().int().safe(), type: z.string().min(1) }).passthrough()),
  'sort',
);
const quotaTabsJson = jsonString(z.array(z.string().trim().min(1)), 'tab');

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
    inputSchema: z.object({ thscode: fundCode }).strict(),
    outputSchema: itemOutput,
    options: [
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
        thscode: fundCode,
        reportType: z.string().min(1),
        endDate: z.string().min(1),
      })
      .strict(),
    outputSchema: itemOutput,
    options: [
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
        thscode: fundCode,
        reportType: z.string().min(1).optional(),
      })
      .strict(),
    outputSchema: itemOutput,
    options: [
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

function derivativeCapability(
  domain: 'futures' | 'options',
  command: string,
  description: string,
  endpoint: string,
  inputSchema: ZodType<Record<string, unknown>> = z.object({}).strict(),
  options: readonly RemoteOptionDescriptor[] = [],
  outputSchema: ZodType<unknown> = itemOutput,
  window: RemoteCapabilityDescriptor['window'] = 'none',
  paging: RemoteCapabilityDescriptor['paging'] = 'none',
): RemoteCapabilityDescriptor {
  return {
    id: `${domain}.${command}`,
    command: [domain, command],
    description,
    endpoint,
    method: 'GET',
    inputSchema,
    outputSchema,
    options,
    paging,
    window,
  };
}

const thscodeOption: RemoteOptionDescriptor = {
  flags: '--thscode <code>',
  description: 'full futures or options thscode',
  type: 'string',
  required: true,
};
const derivativeContractListInput = z
  .object({
    limit: z.number().int().min(1).max(1000).optional(),
    offset: z.number().int().min(0).optional(),
  })
  .strict();
const derivativeContractListOptions: readonly RemoteOptionDescriptor[] = [
  {
    flags: '--limit <number>',
    description: 'page size (1-1000)',
    type: 'integer',
    defaultValue: 100,
  },
  { flags: '--offset <number>', description: 'row offset', type: 'integer', defaultValue: 0 },
];
const sessionOption: RemoteOptionDescriptor = {
  flags: '--session <session>',
  description: 'trading session',
  type: 'string',
  choices: ['pre_market', 'intraday', 'post_market'],
  defaultValue: 'intraday',
};
const derivativeDailyInput = z
  .object({
    thscode: derivativeCode,
    start: z.number().int().positive().optional(),
    end: z.number().int().positive().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if ((value.start === undefined) !== (value.end === undefined))
      context.addIssue({ code: 'custom', message: 'start and end must be provided together' });
    if (value.start !== undefined && value.end !== undefined && value.start > value.end)
      context.addIssue({ code: 'custom', message: 'start must be <= end' });
  });
const derivativeDailyOptions: readonly RemoteOptionDescriptor[] = [
  thscodeOption,
  {
    flags: '--start <milliseconds>',
    description: 'range start in Unix milliseconds',
    type: 'integer',
  },
  { flags: '--end <milliseconds>', description: 'range end in Unix milliseconds', type: 'integer' },
];
const derivativeIntradayInput = z
  .object({
    thscode: derivativeCode,
    session: z.enum(['pre_market', 'intraday', 'post_market']).default('intraday'),
  })
  .strict();
const derivativeIntradayOptions: readonly RemoteOptionDescriptor[] = [thscodeOption, sessionOption];

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
        thscode: fundCode,
        mergeScope: z.enum(['all', 'merged', 'separate']).default('all'),
      })
      .strict(),
    outputSchema: itemOutput,
    options: [
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
    description: 'Query forward-adjusted daily ETF price history',
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
        thscode: fundCode,
        limit: z.number().int().min(1).max(10).optional(),
      })
      .strict(),
    outputSchema: itemOutput,
    options: [
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
        thscode: fundCode,
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.string().min(1).optional(),
      })
      .strict(),
    outputSchema: itemOutput,
    options: [
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
    'Query historical fund stock holdings; rank is populated only for the top 10',
    '/api/fund/portfolio/stock-history',
  ),
  fundReportDates(
    'stock-report-dates',
    'Query fund stock holding report dates',
    '/api/fund/portfolio/stock-report-dates',
  ),
  fundPortfolioHistory(
    'bond-history',
    'Query historical fund bond holdings; rank is populated only for the top 10',
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
    id: 'fund.backtest-result',
    command: ['fund', 'backtest-result'],
    description: 'Run a stateless online fund backtest',
    endpoint: '/api/fund/backtest/result',
    method: 'GET',
    inputSchema: z
      .object({
        thscode: fundCode,
        buyConditions: conditionJson,
        sellConditions: conditionJson,
        buyFrequencyType: z.string().min(1),
        maxBuyTimes: z.number().finite(),
        perBuyAmount: z.number().finite(),
      })
      .strict(),
    outputSchema: objectOutput,
    options: [
      {
        flags: '--thscode <code>',
        description: 'single fund thscode',
        type: 'string',
        required: true,
      },
      {
        flags: '--buy-conditions <json>',
        description: 'buy condition JSON object or array',
        type: 'string',
        required: true,
        queryName: 'buy_conditions',
      },
      {
        flags: '--sell-conditions <json>',
        description: 'sell condition JSON object or array',
        type: 'string',
        required: true,
        queryName: 'sell_conditions',
      },
      {
        flags: '--buy-frequency-type <type>',
        description: 'upstream buy frequency type',
        type: 'string',
        required: true,
        queryName: 'buy_frequency_type',
      },
      {
        flags: '--max-buy-times <number>',
        description: 'maximum buy count',
        type: 'number',
        required: true,
        queryName: 'max_buy_times',
      },
      {
        flags: '--per-buy-amount <number>',
        description: 'amount for each buy',
        type: 'number',
        required: true,
        queryName: 'per_buy_amount',
      },
    ],
    paging: 'none',
    window: 'none',
  },
  {
    id: 'fund.backtest-indicators',
    command: ['fund', 'backtest-indicators'],
    description: 'List indicators supported by the fund backtest service',
    endpoint: '/api/fund/backtest/indicators',
    method: 'GET',
    inputSchema: z.object({}).strict(),
    outputSchema: arrayOutput,
    options: [],
    paging: 'none',
    window: 'none',
  },
  {
    id: 'fund.indicators-line',
    command: ['fund', 'indicators-line'],
    description: 'Query line-oriented fund indicators',
    endpoint: '/api/fund/indicators/line',
    method: 'GET',
    inputSchema: z.object({ indexes: lineIndexesJson, timeRange: timeRangeJson }).strict(),
    outputSchema: objectOutput,
    options: [
      {
        flags: '--indexes <json>',
        description:
          'JSON array of groups: thscodes[], index_info[] with required index_id and optional attribute',
        type: 'string',
        required: true,
      },
      {
        flags: '--time-range <json>',
        description:
          'JSON object: required time_type; optional Unix-millisecond start/end and integer offset',
        type: 'string',
        required: true,
        queryName: 'time_range',
      },
    ],
    paging: 'none',
    window: 'none',
  },
  {
    id: 'fund.indicators-table',
    command: ['fund', 'indicators-table'],
    description: 'Query table-oriented fund indicators',
    endpoint: '/api/fund/indicators/table',
    method: 'GET',
    inputSchema: z
      .object({
        codeSelectors: tableSelectorsJson.optional(),
        indexes: tableIndexesJson.optional(),
        pageInfo: pageInfoJson.optional(),
        sort: sortJson.optional(),
      })
      .strict(),
    outputSchema: objectOutput,
    options: [
      {
        flags: '--code-selectors <json>',
        description:
          'JSON object with include[]; fund_code/stock_code selectors use thscodes[], other types use values[]',
        type: 'string',
        queryName: 'code_selectors',
      },
      {
        flags: '--indexes <json>',
        description: 'JSON array: required index_id; optional timestamp and attribute',
        type: 'string',
      },
      {
        flags: '--page-info <json>',
        description:
          'JSON object: optional integer page_begin/page_size/code_begin/code_page_size; verify progress from returned rows',
        type: 'string',
        queryName: 'page_info',
      },
      {
        flags: '--sort <json>',
        description: 'JSON array with required integer idx and string type',
        type: 'string',
      },
    ],
    paging: 'json',
    window: 'none',
  },
  {
    id: 'fund.quota-summary',
    command: ['fund', 'quota-summary'],
    description: 'Query QDII quota summaries by category',
    endpoint: '/api/fund/quota/summary',
    method: 'GET',
    inputSchema: z.object({ tab: quotaTabsJson }).strict(),
    outputSchema: arrayOutput,
    options: [
      {
        flags: '--tab <json>',
        description: 'category name JSON array',
        type: 'string',
        required: true,
      },
    ],
    paging: 'none',
    window: 'none',
  },
  {
    id: 'fund.quota-list',
    command: ['fund', 'quota-list'],
    description: 'Query QDII fund quotas by category',
    endpoint: '/api/fund/quota/list',
    method: 'GET',
    inputSchema: z.object({ tab: quotaTabsJson, buy: z.boolean().optional() }).strict(),
    outputSchema: arrayOutput,
    options: [
      {
        flags: '--tab <json>',
        description: 'category name JSON array',
        type: 'string',
        required: true,
      },
      {
        flags: '--buy <boolean>',
        description: 'optional true/false purchasable filter',
        type: 'boolean',
      },
    ],
    paging: 'none',
    window: 'none',
  },
  derivativeCapability(
    'futures',
    'varieties',
    'List public futures varieties',
    '/api/futures/varieties/list',
  ),
  derivativeCapability(
    'futures',
    'variety-plates',
    'List futures variety plates',
    '/api/futures/variety-plates/list',
  ),
  derivativeCapability(
    'futures',
    'contract-detail',
    'Query futures contract details',
    '/api/futures/contracts/detail',
    z.object({ thscode: derivativeCode }).strict(),
    [thscodeOption],
    objectOutput,
  ),
  derivativeCapability(
    'futures',
    'contracts',
    'List futures contracts',
    '/api/futures/contracts/list',
    derivativeContractListInput,
    derivativeContractListOptions,
    itemOutput,
    'none',
    'offset',
  ),
  derivativeCapability(
    'futures',
    'main-continuous',
    'List futures main-continuous contracts',
    '/api/futures/contracts/main-continuous-list',
  ),
  derivativeCapability(
    'futures',
    'main',
    'List futures main contracts',
    '/api/futures/contracts/main-list',
  ),
  derivativeCapability(
    'futures',
    'secondary-main',
    'List futures secondary-main contracts',
    '/api/futures/contracts/secondary-main-list',
  ),
  derivativeCapability(
    'futures',
    'commodity-indexes',
    'List futures commodity indexes',
    '/api/futures/contracts/commodity-index-list',
  ),
  derivativeCapability(
    'futures',
    'variety-positions',
    'Query daily futures variety positions',
    '/api/futures/positions/variety-daily',
    z.object({ date: isoDate }).strict(),
    [
      {
        flags: '--date <date>',
        description: 'trading date (YYYY-MM-DD)',
        type: 'string',
        required: true,
      },
    ],
  ),
  derivativeCapability(
    'futures',
    'company-variety-positions',
    'Query daily company positions by futures varieties',
    '/api/futures/positions/company-variety-daily',
    z.object({ date: isoDate, varieties: derivativeList }).strict(),
    [
      {
        flags: '--date <date>',
        description: 'trading date (YYYY-MM-DD)',
        type: 'string',
        required: true,
      },
      {
        flags: '--varieties <codes>',
        description: '1 to 5 comma-separated variety codes',
        type: 'string',
        required: true,
      },
    ],
  ),
  derivativeCapability(
    'futures',
    'contract-positions',
    'Query daily futures contract positions',
    '/api/futures/positions/contract-daily',
    z.object({ thscode: derivativeCode, variety: derivativeVariety, date: isoDate }).strict(),
    [
      thscodeOption,
      {
        flags: '--variety <code>',
        description: 'uppercase futures variety code',
        type: 'string',
        required: true,
      },
      {
        flags: '--date <date>',
        description: 'trading date (YYYY-MM-DD)',
        type: 'string',
        required: true,
      },
    ],
    objectOutput,
  ),
  derivativeCapability(
    'futures',
    'contract-position-history',
    'Query up to one year of futures contract positions',
    '/api/futures/positions/contract-historical',
    z
      .object({
        thscode: derivativeCode,
        variety: derivativeVariety,
        company: z.string().trim().min(1),
        startDate: isoDate,
      })
      .strict(),
    [
      thscodeOption,
      {
        flags: '--variety <code>',
        description: 'uppercase futures variety code',
        type: 'string',
        required: true,
      },
      {
        flags: '--company <name>',
        description: 'futures company name',
        type: 'string',
        required: true,
      },
      {
        flags: '--start-date <date>',
        description: 'start date within the last year',
        type: 'string',
        required: true,
        queryName: 'start_date',
      },
    ],
    objectOutput,
    'one-year',
  ),
  derivativeCapability(
    'futures',
    'position-companies',
    'List futures position companies',
    '/api/futures/positions/company-list',
  ),
  derivativeCapability(
    'futures',
    'warehouse-receipts',
    'Query historical futures warehouse receipts',
    '/api/futures/warehouse-receipts/historical',
    z
      .object({ thscode: derivativeCode, startDate: isoDate, endDate: isoDate })
      .strict()
      .refine((value) => value.startDate <= value.endDate, {
        message: 'start-date must be <= end-date',
      }),
    [
      thscodeOption,
      {
        flags: '--start-date <date>',
        description: 'range start (YYYY-MM-DD)',
        type: 'string',
        required: true,
        queryName: 'start_date',
      },
      {
        flags: '--end-date <date>',
        description: 'range end (YYYY-MM-DD)',
        type: 'string',
        required: true,
        queryName: 'end_date',
      },
    ],
  ),
  derivativeCapability(
    'futures',
    'latest-basis',
    'Query latest main-continuous futures basis',
    '/api/futures/basis/main-continuous-latest',
  ),
  derivativeCapability(
    'futures',
    'basis-history',
    'Query historical futures basis',
    '/api/futures/basis/historical',
    z
      .object({ thscode: derivativeCode, spotIndicatorId: z.string().trim().min(1).optional() })
      .strict(),
    [
      thscodeOption,
      {
        flags: '--spot-indicator-id <id>',
        description: 'optional spot indicator identifier',
        type: 'string',
        queryName: 'spot_indicator_id',
      },
    ],
  ),
  derivativeCapability(
    'futures',
    'trading-schedule',
    'Query futures trading schedule',
    '/api/futures/calendar/trading-schedule',
    z
      .object({ thscode: derivativeCode, startDate: isoDate, endDate: isoDate })
      .strict()
      .refine((value) => value.startDate <= value.endDate, {
        message: 'start-date must be <= end-date',
      }),
    [
      thscodeOption,
      {
        flags: '--start-date <date>',
        description: 'range start (YYYY-MM-DD)',
        type: 'string',
        required: true,
        queryName: 'start_date',
      },
      {
        flags: '--end-date <date>',
        description: 'range end (YYYY-MM-DD)',
        type: 'string',
        required: true,
        queryName: 'end_date',
      },
    ],
    objectOutput,
  ),
  derivativeCapability(
    'futures',
    'session-timeline',
    'Query futures session timeline',
    '/api/futures/calendar/session-timeline',
    z.object({ thscode: derivativeCode }).strict(),
    [thscodeOption],
    objectOutput,
  ),
  derivativeCapability(
    'futures',
    'intraday',
    'Query current futures session intraday prices',
    '/api/futures/prices/intraday',
    derivativeIntradayInput,
    derivativeIntradayOptions,
    objectOutput,
    'today-only',
  ),
  derivativeCapability(
    'futures',
    'daily',
    'Query fixed 1d futures prices',
    '/api/futures/prices/daily',
    derivativeDailyInput,
    derivativeDailyOptions,
    objectOutput,
  ),
  derivativeCapability(
    'options',
    'varieties',
    'List public options varieties',
    '/api/options/varieties/list',
  ),
  derivativeCapability(
    'options',
    'contract-detail',
    'Query options contract details',
    '/api/options/contracts/detail',
    z.object({ thscode: derivativeCode }).strict(),
    [thscodeOption],
    objectOutput,
  ),
  derivativeCapability(
    'options',
    'contracts',
    'List options contracts',
    '/api/options/contracts/list',
    derivativeContractListInput,
    derivativeContractListOptions,
    itemOutput,
    'none',
    'offset',
  ),
  derivativeCapability(
    'options',
    'session-timeline',
    'Query options session timeline',
    '/api/options/calendar/session-timeline',
    z.object({ thscode: derivativeCode }).strict(),
    [thscodeOption],
    objectOutput,
  ),
  derivativeCapability(
    'options',
    'intraday',
    'Query current options session intraday prices',
    '/api/options/prices/intraday',
    derivativeIntradayInput,
    derivativeIntradayOptions,
    objectOutput,
    'today-only',
  ),
  derivativeCapability(
    'options',
    'daily',
    'Query fixed 1d options prices',
    '/api/options/prices/daily',
    derivativeDailyInput,
    derivativeDailyOptions,
    objectOutput,
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
