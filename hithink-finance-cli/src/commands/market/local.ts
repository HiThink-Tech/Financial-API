/**
 * 本地行情命令模块
 *
 * 注册纯本地执行的 market 子命令，不依赖远程 Fuyao API：
 * - `market panel`：从本地 DuckDB 导出全市场面板数据
 * - `market adjustment-factors`：查询本地每日复权因子
 *
 * 这两个命令强制使用本地数据源（通过 {@link chooseSource} 验证），
 * 因为它们依赖的是本地数据库中的衍生视图（v_daily_qfq）和计算表（calc_adjust_factor_daily）。
 */

import type { Command } from 'commander';
import type { CliContext } from '../../cli/context.js';
import { localizeText } from '../../cli/i18n.js';
import { successEnvelope } from '../../contracts/envelope.js';
import { exportQuery, queryReadOnly } from '../../application/use-cases/local-query.js';
import { openDatabase } from '../../infrastructure/duckdb/connection.js';
import { renderResult } from '../../output/renderer.js';
import { chooseSource, type DataSource } from '../../application/source-policy.js';
import { CliError } from '../../contracts/errors.js';

/**
 * SQL 字符串转义单引号
 *
 * 防止 SQL 注入，将字符串中的单引号替换为两个单引号（SQL 标准转义）。
 *
 * @param value - 原始字符串
 * @returns 转义后的安全字符串
 */
function quote(value: string): string {
  return value.replaceAll("'", "''");
}

/**
 * 日期格式校验
 *
 * 确保传入的日期字符串符合 YYYY-MM-DD 格式。
 *
 * @param value - 日期字符串
 * @throws {Error} 如果格式不合法
 */
function assertDate(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value))
    throw new CliError({
      code: 'CLI_BAD_ARGUMENT',
      category: 'validation',
      message: 'dates must use YYYY-MM-DD',
      hint: 'Pass dates like 2026-07-09.',
      retryable: false,
      exitCode: 2,
    });
}

/**
 * 注册纯本地行情命令
 *
 * 需要 `market` 命令组已提前注册（通过 {@link registerMarketCommands}），
 * 否则会抛出异常。
 *
 * ### market panel — 面板导出流程
 * 1. 校验 `--start` / `--end` 日期格式
 * 2. 通过 {@link chooseSource} 确认使用本地数据源（kind: 'panel'）
 * 3. 打开 DuckDB 数据库
 * 4. 从复权视图 `v_daily_qfq` 中按日期范围查询所有股票
 * 5. 使用 {@link exportQuery} 将结果导出为指定格式（默认 parquet）
 * 6. 返回包含输出路径和记录数的元信息
 *
 * ### market adjustment-factors — 复权因子查询
 * 1. 校验日期格式
 * 2. 通过 {@link chooseSource} 确认使用本地数据源（kind: 'factors'）
 * 3. 构建 `calc_adjust_factor_daily` 表的查询条件
 * 4. 使用 {@link queryReadOnly} 执行只读查询
 * 5. 返回复权因子数据
 *
 * @param program - Commander 根程序实例
 * @param context - CLI 上下文
 * @param fallbackDbPath - 默认数据库文件路径
 */
export function registerLocalMarketCommands(
  program: Command,
  context: CliContext,
  fallbackDbPath: string,
): void {
  // 需要在 market 命令组已注册的前提下追加本地子命令
  const market = program.commands.find((command) => command.name() === 'market');
  if (market === undefined) throw new Error('market command group is not registered');

  // ========== market panel ==========
  const panel = market
    .command('panel')
    .description(localizeText(context.language, 'Export a local full-market panel'))
    .requiredOption('--start <date>')
    .requiredOption('--end <date>')
    .requiredOption('--output <path>')
    .option(
      '--file-format <format>',
      localizeText(context.language, 'ndjson, csv, or parquet'),
      'parquet',
    );
  panel.action(async () => {
    const options = panel.opts<{
      start: string;
      end: string;
      output: string;
      fileFormat: string;
    }>();
    // 校验日期格式
    assertDate(options.start);
    assertDate(options.end);
    // 使用 source-policy 确认本地数据源可用
    chooseSource(
      {
        kind: 'panel',
        requested: panel.optsWithGlobals<{ source?: DataSource }>().source ?? 'auto',
      },
      { exists: true, coversWindow: true },
    );
    // 校验文件格式
    if (!['ndjson', 'csv', 'parquet'].includes(options.fileFormat))
      throw new CliError({
        code: 'CLI_BAD_ARGUMENT',
        category: 'validation',
        message: '--file-format must be ndjson, csv, or parquet',
        hint: 'Use --file-format ndjson, --file-format csv, or --file-format parquet.',
        retryable: false,
        exitCode: 2,
      });
    const globals = panel.optsWithGlobals<{ db?: string }>();
    // 打开本地数据库
    const opened = await openDatabase(
      globals.db ?? process.env.HITHINK_FINANCE_DB_PATH ?? fallbackDbPath,
    );
    try {
      // 从前复权每日视图查询全市场面板数据
      const sql = `SELECT * FROM v_daily_qfq WHERE date BETWEEN DATE '${options.start}' AND DATE '${options.end}' ORDER BY date,thscode`;
      const count = await exportQuery(
        opened.connection,
        sql,
        options.output,
        options.fileFormat as 'ndjson' | 'csv' | 'parquet',
      );
      await renderResult(
        successEnvelope(
          'market.panel',
          { path: options.output, format: options.fileFormat },
          { requestId: context.requestId, source: 'local', count },
        ),
        context,
      );
    } finally {
      opened.close();
    }
  });

  // ========== market adjustment-factors ==========
  const factors = market
    .command('adjustment-factors')
    .description(localizeText(context.language, 'Query local daily adjustment factors'))
    .requiredOption('--thscode <code>')
    .option('--start <date>')
    .option('--end <date>');
  factors.action(async () => {
    const options = factors.opts<{ thscode: string; start?: string; end?: string }>();
    // 校验可选的日期参数
    if (options.start !== undefined) assertDate(options.start);
    if (options.end !== undefined) assertDate(options.end);
    // 使用 source-policy 确认本地数据源可用
    chooseSource(
      {
        kind: 'factors',
        requested: factors.optsWithGlobals<{ source?: DataSource }>().source ?? 'auto',
      },
      { exists: true, coversWindow: true },
    );
    // 动态构建 SQL WHERE 条件
    const filters = [`thscode='${quote(options.thscode)}'`];
    if (options.start !== undefined) filters.push(`date >= DATE '${options.start}'`);
    if (options.end !== undefined) filters.push(`date <= DATE '${options.end}'`);
    const globals = factors.optsWithGlobals<{ db?: string }>();
    // 打开本地数据库
    const opened = await openDatabase(
      globals.db ?? process.env.HITHINK_FINANCE_DB_PATH ?? fallbackDbPath,
    );
    try {
      // 从每日复权因子表查询
      const rows = await queryReadOnly(
        opened.connection,
        `SELECT * FROM calc_adjust_factor_daily WHERE ${filters.join(' AND ')} ORDER BY date`,
      );
      await renderResult(
        successEnvelope('market.adjustment-factors', rows, {
          requestId: context.requestId,
          source: 'local',
          count: rows.length,
        }),
        context,
      );
    } finally {
      opened.close();
    }
  });
}
