/**
 * Minimal internationalization (i18n) layer for user-facing CLI strings.
 *
 * 最小化国际化（i18n）模块 — 管理面向用户的 CLI 字符串翻译。
 *
 * Currently supports Chinese (`zh-CN`) and English (`en`). Messages are stored
 * in a static dictionary keyed by {@link MessageKey} so the translation look-up
 * is type-safe and never throws on missing keys.
 * 目前支持简体中文（`zh-CN`）和英语（`en`）。消息存储在由 {@link MessageKey}
 * 键控的静态字典中，使翻译查找类型安全，且不会因缺失键而抛出异常。
 */

/** Supported human-interface languages. 支持的界面语言。 */
export type Language = 'zh-CN' | 'en';

/**
 * Static message catalogue for all UI strings.
 * 所有 UI 字符串的静态消息目录。
 *
 * ## 消息结构说明
 *
 * 每条消息由 `MessageKey` 键索引，按语言分组。
 * 添加新字符串时，需要同时在 `en` 和 `zh-CN` 两个分支中添加对应翻译。
 *
 * The catalogue is `as const` so {@link MessageKey} can be derived from it
 * and every consumer gets exact string literal types.
 * 目录使用 `as const` 声明，使 {@link MessageKey} 可以从中派生，
 * 并且每个消费者都能获得精确的字符串字面量类型。
 */
const messages = {
  en: {
    rootDescription: 'Enterprise financial data CLI for humans and AI agents',
    versionDescription: 'Print the installed CLI version',
    unknownCommand: 'Unknown command.',
    unknownCommandHint: 'Run `hithink-finance --help` to list available commands.',
    authLoginAlreadyConfigured:
      'This profile is already logged in. To switch API keys atomically, run `hithink-finance auth login --replace` or use `--api-key-stdin --replace` in non-interactive shells.',
  },
  'zh-CN': {
    rootDescription: '面向人类与 AI Agent 的企业级金融数据命令行工具',
    versionDescription: '显示已安装的 CLI 版本',
    unknownCommand: '未知命令。',
    unknownCommandHint: '运行 `hithink-finance --help` 查看可用命令。',
    authLoginAlreadyConfigured:
      '当前 profile 已登录。如需原子切换 API Key，请运行 `hithink-finance auth login --replace`；非交互环境使用 `--api-key-stdin --replace`。',
  },
} as const;

const zhTextByEnglish: Record<string, string> = {
  'output format': '输出格式',
  'human interface language': '人类界面语言',
  'configuration and credential profile': '配置与凭据 profile',
  'explicit JSON configuration file': '显式指定 JSON 配置文件',
  'API key for this process': '仅当前进程使用的 API Key',
  'read an API key from stdin': '从标准输入读取 API Key',
  'disable interactive input': '禁用交互式输入',
  'confirm non-interactive operations': '确认非交互式操作',
  'data source: auto, local, or remote': '数据来源：auto、local 或 remote',
  'local DuckDB path': '本地 DuckDB 路径',
  'caller-supplied correlation ID': '调用方提供的关联 ID',
  'enable diagnostic details on stderr': '在 stderr 输出诊断细节',
  'disable terminal colors': '禁用终端颜色',
  'Manage API key authentication': '管理 API Key 认证',
  'Store an API key in the system credential store': '保存 API Key 到系统凭据库',
  'replace the existing API key for this profile': '替换当前 profile 已保存的 API Key',
  'Show whether an API key is configured': '查看 API Key 是否已配置',
  'Delete API key credentials': '删除 API Key 凭据',
  'delete every hithink-finance profile': '删除所有 hithink-finance profile 凭据',
  'Inspect resolved non-secret configuration': '查看已解析的非敏感配置',
  'Show resolved non-secret configuration': '显示已解析的非敏感配置',
  'List machine-readable command capabilities': '列出机器可读命令能力清单',
  'Show a command contract': '查看命令契约',
  'Manage Agent Skills': '管理 Agent Skills',
  'Check or repair the installed CLI version': '检查或修复已安装的 CLI 版本',
  'Check for a newer version without installing': '仅检查新版本，不安装',
  'Repair the current or target installation': '修复当前或目标安装',
  'Install a specific SemVer version': '安装指定 SemVer 版本',
  'Plan or run CLI uninstall cleanup': '预览或执行 CLI 卸载清理',
  'Show the uninstall plan without deleting anything': '只显示卸载计划，不删除任何内容',
  'Delete local data during uninstall': '卸载时删除本地数据',
  'Delete local configuration during uninstall': '卸载时删除本地配置',
  'Delete all CLI-managed API key credentials': '删除所有 CLI 管理的 API Key 凭据',
  'Run local environment diagnostics': '运行本地环境诊断',
  'Manage local DuckDB data': '管理本地 DuckDB 数据（初始化/同步需要先登录）',
  'Initialize local data from a verified dump': '初始化本地数据（远端初始化需要 API Key）',
  'Synchronize local data': '同步本地数据（需要 API Key）',
  'Show local database status': '显示本地数据库状态',
  'Validate local data quality': '校验本地数据质量',
  'Rebuild derived factors': '重建本地派生因子',
  'Plan or apply schema migrations': '预览或执行 schema 迁移',
  'Clean managed download caches': '清理托管下载缓存',
  'Remove the explicitly confirmed database': '删除已显式确认的数据库',
  'Query the local DuckDB': '查询本地 DuckDB',
  'Describe local database objects': '查看本地数据库对象',
  'Run a read-only SQL query': '执行只读 SQL 查询',
  'Export a read-only SQL query': '导出只读 SQL 查询结果',
  'ndjson, csv, or parquet': 'ndjson、csv 或 parquet',
  'Export a local full-market panel': '导出本地全市场面板',
  'Query local daily adjustment factors': '查询本地日频复权因子',
  'symbol remote data commands': '标的目录与代码搜索命令',
  'market remote data commands': '普通行情与交易日历命令',
  'special remote data commands': '特色榜单与事件数据命令',
  'financials remote data commands': '财务报表与指标命令',
  'index remote data commands': '指数目录、成分和行情命令',
  'fund remote data commands': '基金数据命令',
  'valuation remote data commands': 'A 股估值命令',
  'write the full JSON response envelope to a file': '将完整 JSON 响应信封写入文件',
  'read thscodes from a comma/newline-delimited file': '从逗号或换行分隔文件读取 thscode',
  'read thscodes from stdin': '从标准输入读取 thscode',
  'Resolve a name or code to thscode': '将名称、ticker 或代码消歧为 thscode',
  'List symbols with bounded pagination': '分页列出标的目录',
  'Query A-share price snapshots': '查询 A 股行情快照',
  'Query daily A-share history': '查询 A 股日线历史行情',
  'Query adjustment events': '查询公司行动/复权事件',
  'Query income financial statements': '查询利润表',
  'Query balance-sheet financial statements': '查询资产负债表',
  'Query cash-flow financial statements': '查询现金流量表',
  'Query financial indicators for a report': '查询指定报告期财务指标',
  'Query the one-year A-share trading calendar': '查询一年内 A 股交易日历',
  'List THS indices by category': '按类别列出同花顺指数',
  'Query index constituents': '查询指数成分股',
  'Query index price snapshots': '查询指数行情快照',
  'Query daily index history': '查询指数日线历史行情',
  'Query the limit-up stock pool': '查询涨停股票池',
  'Query the 30-day limit-up ladder': '查询 30 日连板天梯',
  'Query today-only anomaly analysis rows': '查询今日个股异动列表',
  'Query today-only anomalies for up to 50 raw code tokens': '查询最多 50 只股票的今日异动原因',
  'Query the skyrocket ranking': '查询飙升榜',
  'Query the current hot-stock ranking': '查询当前热股榜',
  'Query a historical hot-stock ranking': '查询历史热股榜',
  'Query one stock hot-rank trend': '查询单股热度排名趋势',
  'Query dragon-tiger board records': '查询龙虎榜记录',
  'Query current A-share valuation metrics': '查询当前 A 股估值指标',
  'Query fund profile detail': '查询基金档案详情',
  'Query fund portfolio holdings': '查询基金持仓',
  'Query fund net asset value series': '查询基金净值序列',
  'Query fund interval returns': '查询基金区间收益',
  'Query fund holder structure by disclosure scope': '按披露范围查询基金持有人结构',
  'Query exchange-traded fund market snapshot': '查询场内基金行情快照',
  'Query daily ETF price history': '查询 ETF 日线历史行情',
  'Query fund company detail': '查询基金公司详情',
  'Query fund industry allocation': '查询基金行业配置',
  'Query historical fund performance indicators with data timestamp/item only and no top-level thscode/interval':
    '查询基金历史业绩指标',
  'Query fund drawdown periods': '查询基金回撤区间',
  'Query top fund holders': '查询基金主要持有人',
  'Query fund dividend records': '查询基金分红记录',
  'Query fund diagnostics': '查询基金诊断数据',
  'Query fund financial indicators': '查询基金财务指标',
  'Query fund income statements': '查询基金利润表',
  'Query fund balance sheets': '查询基金资产负债表',
  'Query fund manager investment style': '查询基金经理投资风格',
  'Query fund manager performance': '查询基金经理业绩',
  'Query fund manager experience': '查询基金经理从业经历',
  'Query fund manager detail': '查询基金经理详情',
  'Query cursor-paginated public fund article metadata with has_more and no total':
    '游标分页查询基金公开资讯',
  'Query active or upcoming fund offerings': '查询在募或即将募集的基金',
  'Query historical fund stock holdings': '查询基金历史股票持仓',
  'Query fund stock holding report dates': '查询基金股票持仓报告期',
  'Query historical fund bond holdings': '查询基金历史债券持仓',
  'Query fund bond holding report dates': '查询基金债券持仓报告期',
  'Query fund asset allocation': '查询基金资产配置',
  'fund type': '基金类型',
  'single fund thscode': '单只基金 thscode',
  'comma-separated A-share thscodes (at most 100 raw tokens)':
    '逗号分隔的 A 股 thscode（最多 100 个原始 token）',
  'NAV history range; omit for the latest point': '净值历史区间；省略时取最新值',
  'NAV fields to return': '需要返回的净值字段',
  'holder disclosure scope': '持有人披露范围',
  'single ETF or LOF thscode': '单只 ETF 或 LOF thscode',
  'single ETF thscode': '单只 ETF thscode',
  'bar interval': 'K 线周期',
  'fund company identifier': '基金公司标识',
  'maximum holders (1-10)': '最大持有人数量（1-10）',
  'fund manager identifier': '基金经理标识',
  'performance range': '业绩区间',
  'page size (1-100)': '分页大小（1-100）',
  'opaque pagination cursor': '不透明分页游标',
  'offering status': '募集状态',
  'report type returned by the report-dates capability': '报告期能力返回的报告类型',
  'report end date returned by the report-dates capability': '报告期能力返回的截止日期',
  'optional report type filter': '可选报告类型过滤条件',
  'name, ticker, or thscode': '名称、ticker 或 thscode',
  'exchange filter': '交易所过滤条件',
  'asset type': '资产类型',
  'maximum matches (1-50)': '最大匹配数量（1-50）',
  'comma-separated exchanges': '逗号分隔的交易所',
  'page size (1-10000)': '分页大小（1-10000）',
  'row offset': '行偏移量',
  'comma-separated A-share thscodes': '逗号分隔的 A 股 thscode',
  'page size': '分页大小',
  'single A-share thscode': '单只 A 股 thscode',
  'start timestamp': '开始时间戳',
  'end timestamp': '结束时间戳',
  'adjustment mode': '复权模式',
  'first ex-date YYYY-MM-DD': '最早除权除息日期 YYYY-MM-DD',
  'last ex-date YYYY-MM-DD': '最晚除权除息日期 YYYY-MM-DD',
  'financial period': '财报周期',
  'recent report count (1-20)': '最近报告数量（1-20）',
  'range start in milliseconds': '区间开始毫秒时间戳',
  'range end in milliseconds': '区间结束毫秒时间戳',
  'report quarter YYYY-[1-4]': '报告季度 YYYY-[1-4]',
  'index category': '指数类别',
  'single index thscode': '单个指数 thscode',
  'comma-separated index thscodes': '逗号分隔的指数 thscode',
  'trade date at Asia/Shanghai midnight': 'Asia/Shanghai 零点对应的交易日',
  'page number': '页码',
  'page size (1-200)': '分页大小（1-200）',
  'sort field': '排序字段',
  'sort direction': '排序方向',
  'comma-separated anomaly tags': '逗号分隔的异动标签',
  '1-50 comma-separated A-share thscodes': '1-50 个逗号分隔的 A 股 thscode',
  'ranking period': '榜单周期',
  'trade date YYYY-MM-DD': '交易日 YYYY-MM-DD',
  'start date YYYY-MM-DD': '开始日期 YYYY-MM-DD',
  'end date YYYY-MM-DD': '结束日期 YYYY-MM-DD',
  'board category': '榜单类别',
  'optional trade date YYYY-MM-DD': '可选交易日 YYYY-MM-DD',
};

/**
 * Union of all translatable message keys — derived from the English catalogue.
 * 所有可翻译消息键的联合类型 — 从英语目录派生。
 *
 * Every key in `messages.en` is guaranteed to exist in every other language
 * because the type is derived from a single source of truth.
 * 由于类型是从单一信源派生的，`messages.en` 中的每个键保证存在于其他所有语言中。
 */
export type MessageKey = keyof (typeof messages)['en'];

/**
 * Looks up a localized message by key and returns the translated string.
 * 按键查找本地化消息并返回翻译后的字符串。
 *
 * @param language - Target language (`'zh-CN'` or `'en'`).
 *                   目标语言（`'zh-CN'` 或 `'en'`）。
 * @param key      - The message key to translate.
 *                   要翻译的消息键。
 * @returns The translated string in the requested language.
 *          请求语言下的翻译字符串。
 */
export function translate(language: Language, key: MessageKey): string {
  // 直接从消息目录中按语言和键索引，类型安全，不会抛出异常
  return messages[language][key];
}

export function localizeText(language: Language, english: string): string {
  return language === 'zh-CN' ? (zhTextByEnglish[english] ?? english) : english;
}

/**
 * Resolves the active language from a priority chain.
 * 从优先级链中解析当前激活的语言。
 *
 * ## 语言解析优先级 Language resolution priority
 *
 * 1. `explicit` — the `--lang` CLI flag or config file value.
 *    `explicit` — `--lang` CLI 标志或配置文件中的值。
 * 2. `locale`   — POSIX locale environment variables (`LC_ALL`, `LC_MESSAGES`, `LANG`).
 *    `locale`   — POSIX locale 环境变量（`LC_ALL`、`LC_MESSAGES`、`LANG`）。
 * 3. Fallback   — `'zh-CN'`, because the CLI defaults to Chinese UI.
 *    回退       — 回退到 `'zh-CN'`，因为 CLI 默认中文界面。
 *
 * @param explicit - Explicit language value from `--lang` or config.
 *                   来自 `--lang` 或配置的显式语言值。
 * @param locale   - POSIX locale string from the environment (e.g. `'zh_CN.UTF-8'`).
 *                   来自环境的 POSIX locale 字符串（例如 `'zh_CN.UTF-8'`）。
 * @returns A canonical language code: either `'zh-CN'` or `'en'`.
 *          规范化的语言代码：`'zh-CN'` 或 `'en'`。
 */
export function resolveLanguage(
  explicit: string | undefined,
  locale: string | undefined,
): Language {
  // 优先级 1: 显式指定的语言值
  if (explicit === 'zh-CN' || explicit === 'en') {
    return explicit;
  }

  if (locale?.toLowerCase().startsWith('en') === true) {
    return 'en';
  }
  return 'zh-CN';
}
