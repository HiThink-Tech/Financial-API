import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { format } from 'prettier';
import { createHash } from 'node:crypto';
import { remoteCapabilities } from '../dist/contracts/remote-capabilities.js';
import { localCapabilities } from '../dist/contracts/local-capabilities.js';

const root = path.resolve(process.argv[2] ?? process.cwd());
async function writeFormatted(file, content, parser) {
  await writeFile(
    file,
    await format(content, {
      parser,
      singleQuote: true,
      trailingComma: 'all',
      printWidth: 100,
    }),
  );
}
await mkdir(path.join(root, 'schemas'), { recursive: true });
const capabilities = [
  ...remoteCapabilities.map(({ id, command, endpoint, method, paging, window }) => ({
    id,
    command,
    endpoint,
    method,
    paging,
    window,
    source: 'remote',
  })),
  ...localCapabilities.map(({ id, command, description }) => ({
    id,
    command,
    description,
    source: 'local',
  })),
].sort((left, right) => left.id.localeCompare(right.id));
const skillCapabilities = [...remoteCapabilities, ...localCapabilities].sort((left, right) =>
  left.id.localeCompare(right.id),
);
await writeFormatted(
  path.join(root, 'schemas', 'capabilities.json'),
  `${JSON.stringify({ schema_version: '1', capabilities }, null, 2)}\n`,
  'json',
);
await writeFormatted(
  path.join(root, 'schemas', 'command-envelope.schema.json'),
  `${JSON.stringify({ $schema: 'https://json-schema.org/draft/2020-12/schema', title: 'hithink-finance command envelope', oneOf: [{ required: ['ok', 'command', 'data', 'meta'] }, { required: ['ok', 'command', 'error', 'meta'] }] }, null, 2)}\n`,
  'json',
);

const domainConfigs = {
  shared: {
    description:
      '用于 Agent 通过 hithink-finance CLI 做安装后自检、API Key 认证、配置、版本更新、诊断、卸载、Skills 安装/同步/移除，以及 JSON 输出、安全和大结果处理规则；不要用于行情、财务、指数、特色数据或研究取数。',
    identity:
      '共享规则和生命周期入口。只放全局约束、认证、输出、安全、更新和 Skills 管理，不承载业务取数路由。',
    decisions: [
      ['检查 CLI 是否可用或版本', '`hithink-finance version --format json`'],
      ['查看真实能力清单', '`hithink-finance capabilities --format json`'],
      ['查看某个命令参数契约', '`hithink-finance schema <capability-id> --format json`'],
      [
        '获取并保存 API Key',
        '先打开 https://fuyao.aicubes.cn/admin 获取 API Key，再运行 `hithink-finance auth login --api-key-stdin --format json`；交互终端也可运行 `hithink-finance auth login` 隐藏输入',
      ],
      ['检查认证状态', '`hithink-finance auth status --format json`'],
      ['查看非敏感配置', '`hithink-finance config show --format json`'],
      ['诊断运行环境', '`hithink-finance doctor --format json`'],
      [
        '同步/修复配套 Skills',
        '`hithink-finance skills status --format json` 或 `hithink-finance skills sync --format json`',
      ],
      [
        '更新 CLI',
        '`hithink-finance update --check --format json` 或 `hithink-finance update --repair --format json`',
      ],
      ['预览卸载', '`hithink-finance uninstall --plan --format json`'],
    ],
    boundaries: [
      '业务取数请求必须切到 symbol、market、special-data、financials、index、data 或 research skill。',
      '不要把 API Key 写入命令、配置文件、日志、Markdown、Git 或对话正文；优先 stdin 或系统凭据库。',
      '不要把 stderr 更新提示、诊断详情或完整大数据结果当作最终答案原样展开。',
    ],
  },
  symbol: {
    description:
      '用于 Agent 通过 hithink-finance CLI 处理标的目录、股票/指数代码搜索、名称或 ticker 到 thscode 的消歧、A 股或指数代码表分页导出；行情价格转 hithink-finance-market，指数成分转 hithink-finance-index。',
    identity:
      '标的识别和代码表路由。目标是把自然语言名称、ticker、thscode 或代码表需求变成后续可执行的证券标识。',
    decisions: [
      ['用户给出名称/简称/ticker，需要消歧', '`symbol search`'],
      ['用户要股票或指数代码表/全量目录', '`symbol list`，大结果必须将 JSON stdout 重定向落盘'],
      ['用户要价格、K 线、快照', '切到 `hithink-finance-market`'],
      ['用户要指数成分或指数行情', '切到 `hithink-finance-index`'],
    ],
    boundaries: [
      '只解决“标的是什么”。不要在本 skill 内回答价格、涨跌幅、财报或策略结论。',
      '名称搜索可能返回多个候选；用于后续精确查询前必须让用户意图或字段证据完成消歧。',
    ],
  },
  market: {
    description:
      '用于 Agent 通过 hithink-finance CLI 获取普通 A 股行情快照、历史 K 线、交易日历、复权因子、公司行动、本地全市场面板；涨停、热榜、龙虎榜、异动和游资机构榜转 hithink-finance-special-data。',
    identity:
      '普通行情和本地行情派生能力。优先使用本地库覆盖的历史/面板能力，必要时走远端同花顺金融数据服务。',
    decisions: [
      ['单票历史日线/K 线', '`market history`；`--source auto` 会在本地覆盖时走本地'],
      ['实时或分页行情快照', '`market snapshot`'],
      ['交易日历', '`market calendar`'],
      ['复权因子', '`market adjustment-factors`'],
      ['公司行动/除权除息事件', '`market corporate-actions`'],
      ['全市场区间面板/批量研究输入', '`market panel --output <file>`'],
      ['涨停池、连板、热股、龙虎榜、异动', '切到 `hithink-finance-special-data`'],
    ],
    boundaries: [
      '不提供投资建议、买卖判断或收益承诺；只返回数据或中立统计。',
      '全市场、长区间、多标的结果必须落盘，只汇报路径、行数和关键元信息。',
    ],
  },
  'special-data': {
    description:
      '用于 Agent 通过 hithink-finance CLI 查询特色数据：涨停池、连板天梯、个股异动、异动原因、飙升榜、热股榜、热度历史/趋势、龙虎榜、游资和机构榜；普通行情转 hithink-finance-market。',
    identity: '特色榜单和事件型数据入口。强调窗口约束和榜单口径，不替代普通行情或财报。',
    decisions: [
      ['今日异动列表/异动标签', '`special anomaly-list`，仅今日'],
      ['最多 50 只股票的今日异动原因', '`special anomaly-stock`，仅今日'],
      ['涨停池分页', '`special limit-up-pool`'],
      ['连板天梯', '`special limit-up-ladder`'],
      ['飙升榜', '`special skyrocket`'],
      ['当前热股榜', '`special hot-stock`'],
      ['历史热股榜', '`special hot-stock-history`'],
      ['单股热度趋势', '`special hot-stock-trend`'],
      ['龙虎榜/机构/游资', '`special dragon-tiger`'],
    ],
    boundaries: [
      'today-only 能力不能补历史；用户要历史时说明边界并选择有历史窗口的命令。',
      '榜单热度不是投资建议，不要扩写成推荐或确定性原因。',
    ],
  },
  financials: {
    description:
      '用于 Agent 通过 hithink-finance CLI 查询 A 股利润表、资产负债表、现金流量表、财务指标、年度/季度报告窗口；价格行情转 hithink-finance-market，指数财务不在本 skill 范围。',
    identity: 'A 股财务报表和指标入口。把报告期、时间窗口和 limit 约束转成稳定命令。',
    decisions: [
      ['利润表/收入成本利润项目', '`financials income`'],
      ['资产负债结构', '`financials balance-sheet`'],
      ['现金流量项目', '`financials cash-flow`'],
      ['单个报告期的财务指标', '`financials indicators`'],
      ['用户问价格或涨跌', '切到 `hithink-finance-market`'],
    ],
    boundaries: [
      '财务报表窗口最多 10 年；超过时拆分不重叠窗口并合并去重。',
      '`--limit` 与 `--start-ms/--end-ms` 互斥；不要同时传。',
    ],
  },
  index: {
    description:
      '用于 Agent 通过 hithink-finance CLI 查询同花顺指数/概念/行业/地域/特色指数目录、指数成分股、指数快照和指数历史；个股行情转 hithink-finance-market，股票代码搜索转 hithink-finance-symbol。',
    identity: '指数目录、指数成分和指数行情入口。只处理指数对象及其成分关系。',
    decisions: [
      ['找概念/行业/地域/特色指数目录', '`index catalog`'],
      ['查某个指数成分股', '`index constituents`'],
      ['查指数实时快照', '`index snapshot`'],
      ['查指数历史日线', '`index history`'],
      ['查个股历史/快照', '切到 `hithink-finance-market`'],
    ],
    boundaries: [
      '指数代码通常是 `000000.SH/SZ/BJ/TI` 形式；不要把 A 股股票 thscode 当指数代码。',
      '成分股结果是指数成员关系，不等于用户的投资组合或推荐清单。',
    ],
  },
  data: {
    description:
      '用于 Agent 通过 hithink-finance CLI 管理本地 DuckDB：初始化、同步、状态、校验、迁移、修复、清理、删除、只读 SQL、导出；远端实时数据转对应业务 skill。',
    identity:
      '本地数据生命周期和 SQL 入口。负责让数据可用、可校验、可导出，而不是解释所有研究结论。',
    decisions: [
      ['首次建库或从 dump 导入', '`data init`'],
      ['增量/重新同步本地数据', '`data sync`'],
      ['查看库路径和 schema', '`data status`'],
      ['质量校验', '`data validate`'],
      ['迁移计划或应用', '`data migrate`'],
      ['重建复权等派生数据', '`data repair`'],
      ['清理下载缓存', '`data clean`'],
      ['删除本地库', '`data remove --plan` 先预览'],
      ['查看表/视图', '`db describe`'],
      ['只读 SQL 查询', '`db query --sql <sql>`'],
      ['大结果导出', '`db export --sql <sql> --output <file>`'],
    ],
    boundaries: [
      'SQL 必须只读；写入、DDL、删除或外部副作用不属于 `db query`。',
      '删除数据库或清除数据前先用 plan/状态输出让用户确认，真正删除需要显式 `--yes`。',
      '查询结果很多时用 `db export --output <file>`，不要回显全表。',
    ],
  },
  research: {
    description:
      '用于 Agent 通过 hithink-finance CLI 基于已有本地数据做中立研究准备、面板导出、只读 SQL、描述性统计和可复现实证数据集；不用于实时取数、荐股、择时、组合建议或投资结论。',
    identity:
      '研究工作流路由。它不拥有独立 `research` 命令，而是指导 Agent 组合 data、db 和 market panel 产出可复现数据证据。',
    decisions: [
      [
        '用户要构造研究样本/面板',
        '先 `data status` 和 `data validate`，再 `market panel --output <file>`',
      ],
      ['用户要 SQL 统计或因子分布', '用 `db query` 小结果或 `db export` 大结果'],
      ['用户要解释数据缺口', '先 `data validate`，必要时 `data sync` 或 `data repair`'],
      ['用户要实时快照或最新榜单', '切到对应业务 skill，不在 research 中直接取数'],
      ['用户要投资建议/策略推荐', '拒绝给出建议，可提供中立数据分析边界'],
    ],
    boundaries: [
      '只做描述性、可复现、数据来源明确的研究辅助；不要生成买入/卖出/持有建议。',
      '必须保留查询 SQL、输入文件路径、输出路径、行数和时间窗口，便于复核。',
    ],
  },
};

const domainOrder = [
  'shared',
  'symbol',
  'market',
  'special-data',
  'financials',
  'index',
  'data',
  'research',
];

const localCommandDetails = {
  'data.init': {
    exampleArgs: '--kline <kline.parquet> --events <events.parquet>',
    preconditions: [
      '远端初始化需要 API Key；执行前先运行 `hithink-finance auth status --format json`，未登录时到 https://fuyao.aicubes.cn/admin 获取 API Key 并运行 `hithink-finance auth login`。',
      '本地文件导入必须同时提供 `--kline` 和 `--events`。',
    ],
    parameters: [
      '`--kline <path>` 与 `--events <path>` 成对出现；可选 `--symbols <path>`。',
      '省略本地文件时从远端 Market Dump 初始化，使用全局 `--profile` / `--api-key-stdin`。',
    ],
    errors: ['只给 `--kline` 或只给 `--events` 会失败；两者必须成对。'],
  },
  'data.sync': {
    preconditions: [
      '需要 API Key；执行前先运行 `hithink-finance auth status --format json`，未登录时到 https://fuyao.aicubes.cn/admin 获取 API Key 并运行 `hithink-finance auth login`。',
      '命令会持有数据锁，避免并发写库。',
    ],
    parameters: ['使用全局 `--db` 指定库路径；默认路径来自平台数据目录。'],
    errors: ['认证失败时先回到 shared skill 的 auth 流程。'],
  },
  'data.status': {
    preconditions: ['本地库不存在时用于确认默认路径和 schema 状态。'],
    parameters: ['可用全局 `--db <path>` 指定库。'],
    errors: ['schema 过新时升级 CLI；schema 过旧时看 `data migrate`。'],
  },
  'data.validate': {
    preconditions: ['用于同步、迁移、研究导出前的质量门禁。'],
    parameters: ['可用全局 `--db <path>` 指定库。'],
    errors: ['报告数据质量问题时给出 check 名称和 count，不要展开全量行。'],
  },
  'data.repair': {
    preconditions: ['用于重建派生复权因子等本地派生数据。'],
    parameters: ['可用全局 `--db <path>` 指定库。'],
    errors: ['修复前后建议跑 `data validate` 复核。'],
  },
  'data.migrate': {
    exampleArgs: '--apply',
    preconditions: ['默认只输出迁移计划；应用迁移前让用户确认。'],
    parameters: ['`--apply` 应用迁移；重型迁移需要 `--allow-heavy`。'],
    errors: ['看到重型迁移提示时不要自动加 `--allow-heavy`。'],
  },
  'data.clean': {
    preconditions: ['只清理 CLI 管理的下载缓存，不删除数据库。'],
    parameters: ['当前实现清理 cache；仍使用 `--format json` 读取结果。'],
    errors: ['不要把 cache 清理当作数据库删除。'],
  },
  'data.remove': {
    exampleArgs: '--plan',
    preconditions: ['高风险操作；先运行 `--plan` 报告路径和大小。'],
    parameters: ['真正删除需要全局 `--yes`；可用全局 `--db <path>` 指定目标。'],
    errors: ['没有用户明确确认时不要追加 `--yes`。'],
  },
  'db.describe': {
    preconditions: ['查询本地 DuckDB 表和视图清单。'],
    parameters: ['可用全局 `--db <path>` 指定库。'],
    errors: ['如果库不存在或 schema 不兼容，先处理 `data status|migrate`。'],
  },
  'db.query': {
    exampleArgs: '--sql "<readonly sql>"',
    preconditions: ['只读 SQL；小结果才可直接读取 JSON。'],
    parameters: ['必填 `--sql <sql>`；大结果改用 `db export`。'],
    errors: ['不要执行写入、DDL、删除、外部函数或会改变状态的 SQL。'],
  },
  'db.export': {
    exampleArgs: '--sql "<readonly sql>" --output <result.parquet> --file-format parquet',
    preconditions: ['用于大结果或下游 pandas/notebook 消费。'],
    parameters: ['必填 `--sql <sql>` 和 `--output <path>`；`--file-format ndjson|csv|parquet`。'],
    errors: ['导出后只汇报路径、格式、行数，不回显文件内容。'],
  },
  'market.panel': {
    exampleArgs:
      '--start <YYYY-MM-DD> --end <YYYY-MM-DD> --output <panel.parquet> --file-format parquet',
    preconditions: ['需要本地库覆盖请求窗口；适合作为研究样本输入。'],
    parameters: ['必填 `--start YYYY-MM-DD --end YYYY-MM-DD --output <path>`；默认 parquet。'],
    errors: ['日期必须是 `YYYY-MM-DD`；大面板永远落盘。'],
  },
  'market.adjustment-factors': {
    exampleArgs: '--thscode <code> --start <YYYY-MM-DD> --end <YYYY-MM-DD>',
    preconditions: ['查询本地日级复权因子；需要本地库。'],
    parameters: ['必填 `--thscode <code>`；可选 `--start` / `--end`。'],
    errors: ['日期必须是 `YYYY-MM-DD`；没有本地库先走 `data init|sync`。'],
  },
};

const sharedReferenceFiles = {
  'global-rules.md': `# 全局规则

## 前置条件

- 优先运行 \`hithink-finance capabilities --format json\` 获取当前 CLI 事实。
- 机器读取必须显式使用 \`--format json\`；需要表格给人看时才用 \`table\`。
- \`--output <path>\` 只在声明该参数的具体命令上使用；远端能力命令会把完整 JSON envelope 写入文件，本地 \`db export\` / \`market panel\` 会写数据文件。它不是全局参数。

## 输出契约

- 成功以进程退出码 0 和 \`ok: true\` 为准。
- 错误以非 0 退出码和 \`ok: false\` 为准；读取 \`error.code\`、\`error.category\`、\`error.hint\`。
- 不要按上游旧格式 \`code == 0\` 判断成功。

## 大结果纪律

- 全市场、分页、长区间、多 ticker 数据不得回显完整内容。
- 远端大结果用该命令自己的 \`--output <path>\`，stdout 只保留路径/count 摘要。
- 本地大结果用 \`db export --output <path>\` 或 \`market panel --output <path>\`。
- 最终回答只报告输出路径、行数、时间窗口、命令摘要和必要字段名。
- 下游需要数据时让 pandas/notebook/脚本读取落盘文件。
`,
  'auth-and-config.md': `# 认证和配置

## 前置条件

- API Key 只能来自系统凭据库、进程环境变量 \`HITHINK_FINANCE_API_KEY\`、stdin 或当前进程参数。
- API Key 获取地址为 https://fuyao.aicubes.cn/admin；交互式用户可运行 \`hithink-finance auth login\`，CLI 会说明用途并隐藏输入。
- 不要把密钥写入配置文件、日志、Git、Markdown 或对话正文。

## 命令

\`\`\`bash
hithink-finance auth login --api-key-stdin --format json
hithink-finance auth login
hithink-finance auth status --format json
hithink-finance auth logout --format json
hithink-finance config show --format json
\`\`\`

## 参数选择策略

- 交互式终端可用 \`auth login\` 隐藏输入。
- 如果 \`auth login\` 提示已登录，需要切换 API Key 时先运行 \`auth logout\`，再重新登录。
- Agent/CI 优先用 \`--api-key-stdin\` 或 \`HITHINK_FINANCE_API_KEY\`。
- 多套凭据使用全局 \`--profile <name>\`。
- \`config show\` 只显示非敏感项；不要期待它返回 API Key。

## 常见错误

- \`AUTH_API_KEY_MISSING\`：运行 \`auth login\` 或设置 \`HITHINK_FINANCE_API_KEY\`。
- \`CLI_MISSING_ARGUMENT\`：非交互场景使用 \`auth login --api-key-stdin\`，不要把 API Key 写入对话或日志。
- \`CLI_CONFLICTING_ARGUMENTS\`：不要同时传 \`--api-key\` 和 \`--api-key-stdin\`。
`,
  'lifecycle.md': `# 生命周期命令

## 命令

\`\`\`bash
hithink-finance version --format json
hithink-finance doctor --format json
hithink-finance update --check --format json
hithink-finance update --repair --format json
hithink-finance uninstall --plan --format json
\`\`\`

## 参数选择策略

- 先 \`update --check\`，只有用户确认修复/升级时再 \`update --repair\`。
- 卸载先 \`uninstall --plan\`，真实清理按计划和用户确认执行。
- 直接 \`npm uninstall -g\` 不可靠清理 Agent Skill 目录；需要先运行 \`hithink-finance uninstall --yes\` 或 \`hithink-finance skills remove\`。
- 诊断输出用于定位环境、路径、依赖和版本问题；不要把它当业务数据。

## 常见错误

- 普通命令可能在完成后向 stderr 输出更新提示；不要把它混入业务数据。
- 不要因为更新提示中断取数、翻页或导出流程；需要升级时先运行 \`update --check\`，获得用户确认后再 \`update --repair\`。
`,
  'skills-management.md': `# Skills 管理

## 命令

\`\`\`bash
hithink-finance skills status --format json
hithink-finance skills sync --format json
hithink-finance skills remove --format json
\`\`\`

## 参数选择策略

- \`status\` 检查已安装 Skills 是否与 CLI 包内 manifest 一致。
- \`sync\` 修复缺失或漂移的受管文件；用户改过的受管文件会备份。
- \`remove\` 只移除本 CLI manifest 拥有的 8 个 skill，不做全局清空。
- 若某个 Agent 不在自动安装范围内，读取 \`status --format json\` 的 \`canonical\` 目录，并把其中 8 个 \`hithink-finance-*\` 目录复制到该 Agent 文档声明的 skills 发现目录。

## 常见错误

- 自动安装可覆盖时，不要手工复制 skill 文件绕过 manifest；用 CLI 的 skills 子命令。
- 手工兜底安装时，不要改名、拆分或只复制部分 reference 文件；保持整个 skill 目录原样复制。
- 不要删除用户自建 skill 或非 hithink-finance 前缀 skill。
`,
};

function yamlString(value) {
  return JSON.stringify(value);
}

function lines(items) {
  return items.map((item) => `- ${item}`).join('\n');
}

function markdownCell(value) {
  return String(value).replaceAll('|', '\\|').replaceAll('\n', '<br>');
}

function normalizeLineEndings(value) {
  return value.replaceAll('\r\n', '\n');
}

function table(rows) {
  return rows.map((row) => `| ${row.map(markdownCell).join(' |')} |`).join('\n');
}

function commandSlug(command) {
  return `${command.join('-')}.md`;
}

function commandTitle(command) {
  return `hithink-finance ${command.join(' ')}`;
}

function capDomain(capability) {
  if (capability.command[0] === 'special') return 'special-data';
  if (capability.command[0] === 'db') return 'data';
  return capability.command[0];
}

function optionValue(flags) {
  const match = flags.match(/^(--[a-z0-9-]+)(?:\s+<([^>]+)>)?/u);
  if (match === null) return flags;
  return match[2] === undefined ? match[1] : `${match[1]} <${match[2]}>`;
}

function requiredArgs(capability) {
  if (!('options' in capability)) return '';
  return capability.options
    .filter((option) => option.required === true)
    .map((option) => optionValue(option.flags))
    .join(' ');
}

function schemaId(capability) {
  return capability.id;
}

function windowText(window) {
  return {
    none: '无额外时间窗口限制，仍按命令参数和上游返回为准。',
    'ten-years': '单次请求窗口最多 10 年；超过时拆分为不重叠窗口并合并去重。',
    'one-year': '单次请求窗口最多 1 年；超过时拆分或缩小范围。',
    'today-only': '仅当前交易日/今日数据；不能补历史。',
  }[window];
}

function pagingText(paging) {
  return {
    none: '无分页参数；仍检查返回中的 count/数组长度。',
    offset: '使用 `--limit` + `--offset` 翻页；全量抓取时循环到返回条数小于 limit。',
    page: '使用 `--page` + `--size` 翻页；全量抓取时逐页推进。',
  }[paging];
}

function optionRows(capability) {
  const options = effectiveOptions(capability);
  if (options.length === 0)
    return '| 参数 | 必填 | 说明 |\n| --- | --- | --- |\n| 无 | 否 | 运行前仍可用全局参数 `--format json`、`--profile`、`--db`；`--output` 不是全局参数。 |';
  return [
    '| 参数 | 必填 | 说明 |',
    '| --- | --- | --- |',
    ...options.map((option) => {
      const extras = [];
      if (option.choices !== undefined) extras.push(`可选: ${option.choices.join(', ')}`);
      if (option.defaultValue !== undefined) extras.push(`默认: ${option.defaultValue}`);
      if (option.queryName !== undefined) extras.push(`上游参数: ${option.queryName}`);
      return `| \`${option.flags}\` | ${option.required === true ? '是' : '否'} | ${[
        option.description,
        ...extras,
      ].join('；')} |`;
    }),
  ].join('\n');
}

function effectiveOptions(capability) {
  const options = 'options' in capability ? [...capability.options] : [];
  if ('endpoint' in capability) {
    options.push({
      flags: '--output <path>',
      description: 'write the full JSON response envelope to a file',
      type: 'string',
    });
  }
  return options;
}

function localDetail(capability) {
  return localCommandDetails[capability.id] ?? {};
}

function referenceContent(capability) {
  const isRemote = 'endpoint' in capability;
  const detail = localDetail(capability);
  const required = requiredArgs(capability);
  const localArgs = detail.exampleArgs ?? '';
  const examples = [
    `hithink-finance schema ${schemaId(capability)} --format json`,
    `hithink-finance ${capability.command.join(' ')}${
      required === '' ? (localArgs === '' ? '' : ` ${localArgs}`) : ` ${required}`
    } --format json`,
  ];
  if (isRemote && capability.options.some((option) => option.flags.startsWith('--thscodes '))) {
    examples.push(
      `hithink-finance ${capability.command.join(' ')} --codes-file codes.txt --output result.json --format json`,
    );
  }
  return `# \`${commandTitle(capability.command)}\`

## 前置条件

${lines([
  '先读取本 skill 的 `SKILL.md` 和 `../hithink-finance-shared/SKILL.md`。',
  `执行前用 \`hithink-finance schema ${schemaId(capability)} --format json\` 确认当前参数契约。`,
  ...(isRemote
    ? ['远端命令需要 API Key；认证失败时回到 shared skill。']
    : ['本地命令通常需要可用 DuckDB 或本地数据目录。']),
  ...(detail.preconditions ?? []),
])}

## 命令

\`\`\`bash
${examples.join('\n')}
\`\`\`

## 参数选择策略

${isRemote ? optionRows(capability) : lines(detail.parameters ?? ['读取 schema/help 后选择参数。'])}

## 窗口与分页

${isRemote ? lines([windowText(capability.window), pagingText(capability.paging)]) : lines(['本地命令无远端分页；只有声明 `--output` 的命令可直接落盘；其他大结果改用导出命令。'])}

## 常见错误

${lines([
  ...(isRemote
    ? [
        '参数校验失败时按 `error.hint` 修正，不要猜字段名。',
        '认证失败时不要重试刷屏；先处理 API Key。',
      ]
    : ['本地库不存在或 schema 不兼容时先运行 `data status` / `data migrate`。']),
  ...(detail.errors ?? []),
])}

## 批量操作说明

${lines([
  '批量或全量请求必须落盘，最终只报告路径、行数和窗口。',
  isRemote && capability.options.some((option) => option.flags.startsWith('--thscodes '))
    ? '支持 `--codes-file` 或 `--codes-stdin` 读取多 thscode；不要同时用 `--api-key-stdin` 和 `--codes-stdin`。'
    : '如果需要多标的循环，逐批执行并记录每批参数；不要把完整结果塞进上下文。',
])}
`;
}

function sharedSkillContent(name, config) {
  return `---
name: ${name}
description: ${yamlString(config.description)}
---

# ${name}

${config.identity}

## 前置条件表

| 条件 | 操作 |
| --- | --- |
| 第一次接触此 CLI 或怀疑版本漂移 | 运行 \`hithink-finance version --format json\` 和 \`hithink-finance capabilities --format json\` |
| 需要机器读取 | 始终加 \`--format json\` |
| 结果可能很大 | 使用命令声明的 \`--output <path>\` 落盘；远端 stdout 只返回摘要 |
| 需要远端同花顺金融数据服务 | 先确认 \`auth status\` 或准备 \`HITHINK_FINANCE_API_KEY\` / \`--api-key-stdin\` |

## 快速决策

${table([['用户意图', '首选命令 / 路由'], ['---', '---'], ...config.decisions])}

## References

| 需要了解 | 读取 |
| --- | --- |
| JSON 输出、大结果、安全规则 | [global-rules.md](references/global-rules.md) |
| API Key、profile、配置优先级 | [auth-and-config.md](references/auth-and-config.md) |
| version、doctor、update、uninstall | [lifecycle.md](references/lifecycle.md) |
| skills status/sync/remove | [skills-management.md](references/skills-management.md) |

## 权限表

| 能力 | 凭据 |
| --- | --- |
| 本地 data/db/market panel | 通常不需要 API Key，除非需要同步或初始化远端 dump |
| symbol/market remote/special/financials/index | 需要统一 API Key |
| skills/update/uninstall | 需要本机文件系统权限；不要写全局非 CLI 管理目录 |

## 边界声明

${lines(config.boundaries)}
`;
}

function domainSkillContent(domain, name, config, domainCapabilities) {
  const shortcutRows = domainCapabilities.map((capability) => [
    `[${capability.command.join(' ')}](references/${commandSlug(capability.command)})`,
    'endpoint' in capability
      ? capability.description
      : (localDetail(capability).preconditions?.[0] ?? capability.description),
  ]);
  const referenceRows =
    shortcutRows.length === 0
      ? [
          [
            '[research-workflow.md](references/research-workflow.md)',
            '组合 data/db/market panel 做中立研究数据准备',
          ],
        ]
      : shortcutRows;
  const nativeHelp =
    domain === 'research'
      ? [
          'hithink-finance data <command> --help',
          'hithink-finance db <command> --help',
          'hithink-finance market panel --help',
        ]
      : domain === 'data'
        ? ['hithink-finance data <command> --help', 'hithink-finance db <command> --help']
        : [`hithink-finance ${domain === 'special-data' ? 'special' : domain} <command> --help`];
  return `---
name: ${name}
description: ${yamlString(config.description)}
---

# ${name}

${config.identity}

## 前置条件表

| 条件 | 操作 |
| --- | --- |
| 开始任何 CLI 调用 | 先读取并遵循 [hithink-finance-shared](../hithink-finance-shared/SKILL.md) |
| 不确定命令是否存在或参数是否变化 | 运行 \`hithink-finance capabilities --format json\`，再运行 \`hithink-finance schema <id> --format json\` |
| 需要执行下表某个命令 | 先读取对应 reference 文件，不要只凭命令名猜参数 |
| 结果可能是全市场、分页、多标的或长区间 | 使用命令声明的 \`--output <path>\` 落盘；远端 stdout 只返回摘要 |

## 快速决策

${table([['用户意图', '首选命令 / 路由'], ['---', '---'], ...config.decisions])}

## Shortcuts

| 命令 | 何时使用 |
| --- | --- |
${table(referenceRows)}

## 原生命令与 schema

\`\`\`bash
hithink-finance capabilities --format json
hithink-finance schema <capability-id> --format json
${nativeHelp.join('\n')}
\`\`\`

使用原生命令前必须先看 schema；schema 是当前 CLI 参数契约，reference 是决策和边界补充。

## 权限表

| 命令类型 | 要求 |
| --- | --- |
| 远端服务查询 | API Key 来自系统凭据库、\`HITHINK_FINANCE_API_KEY\` 或 \`--api-key-stdin\` |
| 本地 DuckDB 查询/导出 | 本地库存在且 schema 兼容；可用全局 \`--db <path>\` 指定 |
| 删除、迁移、修复等有副作用操作 | 先预览或说明影响；需要用户明确确认时才加 \`--yes\` |

## 边界声明

${lines(config.boundaries)}
`;
}

function researchReference() {
  return `# research workflow

## 前置条件

- 先读取 [hithink-finance-shared](../../hithink-finance-shared/SKILL.md)。
- 确认用户要的是中立研究数据、统计或可复现实证输入，不是投资建议。
- 本地库状态未知时先运行 \`hithink-finance data status --format json\` 和 \`hithink-finance data validate --format json\`。

## 命令

\`\`\`bash
hithink-finance data status --format json
hithink-finance data validate --format json
hithink-finance market panel --start <YYYY-MM-DD> --end <YYYY-MM-DD> --output <panel.parquet> --file-format parquet --format json
hithink-finance db query --sql "<readonly sql>" --format json
hithink-finance db export --sql "<readonly sql>" --output <result.parquet> --file-format parquet --format json
\`\`\`

## 参数选择策略

- 小样本探索用 \`db query\`，并在 SQL 中显式 \`LIMIT\`。
- 下游分析、全市场、长区间、多因子结果用 \`db export\` 或 \`market panel\`。
- 研究报告必须记录 SQL、时间窗口、库路径或输出文件路径、行数。

## 常见错误

- 不要把相关性、排序或榜单解释成买卖建议。
- 不要在研究 skill 中临时取实时榜单；切到对应业务 skill 后再把结果作为证据。
- 不要修改数据库；研究 SQL 必须只读。

## 批量操作说明

- 分批导出时给每批文件命名，最终合并前按 \`thscode/date\` 等主键去重。
- 最终回答只摘要统计结果和证据路径，不粘贴大表。
`;
}

for (const domain of domainOrder) {
  const config = domainConfigs[domain];
  const description = config.description;
  const name = `hithink-finance-${domain}`;
  const directory = path.join(root, 'skills', name);
  await rm(directory, { recursive: true, force: true });
  await mkdir(path.join(directory, 'references'), { recursive: true });
  const domainCapabilities = skillCapabilities.filter((item) => capDomain(item) === domain);
  await writeFormatted(
    path.join(directory, 'SKILL.md'),
    domain === 'shared'
      ? sharedSkillContent(name, config)
      : domainSkillContent(domain, name, config, domainCapabilities),
    'markdown',
  );
  if (domain === 'shared') {
    for (const [file, content] of Object.entries(sharedReferenceFiles))
      await writeFormatted(path.join(directory, 'references', file), content, 'markdown');
  } else if (domain === 'research') {
    await writeFormatted(
      path.join(directory, 'references', 'research-workflow.md'),
      researchReference(),
      'markdown',
    );
  } else {
    for (const capability of domainCapabilities)
      await writeFormatted(
        path.join(directory, 'references', commandSlug(capability.command)),
        referenceContent(capability),
        'markdown',
      );
  }
}

async function skillFiles(directory, current = directory) {
  const output = [];
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory()) output.push(...(await skillFiles(directory, absolute)));
    else if (entry.isFile() && entry.name !== 'manifest.json')
      output.push(path.relative(directory, absolute).replaceAll(path.sep, '/'));
  }
  return output.sort();
}

const manifestFiles = {};
const skillsRoot = path.join(root, 'skills');
for (const relative of await skillFiles(skillsRoot)) {
  manifestFiles[relative] = createHash('sha256')
    .update(
      normalizeLineEndings(await readFile(path.join(skillsRoot, ...relative.split('/')), 'utf8')),
    )
    .digest('hex');
}
const packageMetadata = JSON.parse(
  await readFile(path.join(process.cwd(), 'package.json'), 'utf8'),
);
await writeFormatted(
  path.join(skillsRoot, 'manifest.json'),
  JSON.stringify({
    protocolVersion: '1',
    cliVersion: packageMetadata.version,
    files: manifestFiles,
  }),
  'json',
);
