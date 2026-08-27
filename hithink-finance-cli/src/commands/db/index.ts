/**
 * 数据库查询命令模块
 *
 * 注册 `db` 命令组，提供对本地 DuckDB 数据库的直接只读查询和导出能力：
 *
 * ### 子命令一览
 * - `db describe` — 列出数据库中所有表名和表类型
 * - `db query`   — 执行只读 SQL 查询并以指定格式输出结果
 * - `db export`  — 执行 SQL 查询并将结果导出为文件（ndjson / csv / parquet）
 *
 * 所有查询均为只读（通过 {@link queryReadOnly} / {@link exportQuery}），
 * 不会对数据库造成任何修改。查询前自动执行 schema 迁移以保持兼容性。
 */

import type { Command } from 'commander';
import type { CliContext } from '../../cli/context.js';
import { localizeText } from '../../cli/i18n.js';
import { exportQuery, queryReadOnly } from '../../application/use-cases/local-query.js';
import { successEnvelope } from '../../contracts/envelope.js';
import { CliError } from '../../contracts/errors.js';
import { openDatabase } from '../../infrastructure/duckdb/connection.js';
import { applyMigrations } from '../../infrastructure/duckdb/migrations.js';
import { renderResult } from '../../output/renderer.js';

/**
 * 解析数据库文件路径
 *
 * 优先级：`--db` CLI 参数 > `HITHINK_FINANCE_DB_PATH` 环境变量 > fallback 默认路径
 *
 * @param command - 当前 Commander 命令实例
 * @param fallback - 默认数据库文件路径
 * @returns 最终使用的数据库文件路径
 */
function databasePath(command: Command, fallback: string): string {
  return (
    command.optsWithGlobals<{ db?: string }>().db ?? process.env.HITHINK_FINANCE_DB_PATH ?? fallback
  );
}

/**
 * 注册数据库查询命令组
 *
 * 创建 `db` 命令组，提供本地 DuckDB 的只读查询和导出功能。
 *
 * @param program - Commander 根程序实例
 * @param context - CLI 上下文
 * @param fallback - 默认数据库文件路径
 */
export function registerDbCommands(program: Command, context: CliContext, fallback: string): void {
  const db = program
    .command('db')
    .description(localizeText(context.language, 'Query the local DuckDB'));

  // ========== db describe ==========
  db.command('describe')
    .description(localizeText(context.language, 'Describe local database objects'))
    .action(async () => {
      const opened = await openDatabase(databasePath(db, fallback));
      try {
        await applyMigrations(opened.connection);
        // 查询 main schema 下所有表名和类型
        const rows = await queryReadOnly(
          opened.connection,
          "SELECT table_name,table_type FROM information_schema.tables WHERE table_schema='main' ORDER BY table_name",
          context.signal,
        );
        await renderResult(
          successEnvelope('db.describe', rows, {
            requestId: context.requestId,
            count: rows.length,
          }),
          context,
        );
      } finally {
        opened.close();
      }
    });

  // ========== db query ==========
  const query = db
    .command('query')
    .description(localizeText(context.language, 'Run a read-only SQL query'))
    .requiredOption('--sql <sql>');
  query.action(async () => {
    const opened = await openDatabase(databasePath(query, fallback));
    try {
      // 执行用户提供的只读 SQL 查询
      const rows = await queryReadOnly(
        opened.connection,
        query.opts<{ sql: string }>().sql,
        context.signal,
      );
      await renderResult(
        successEnvelope('db.query', rows, { requestId: context.requestId, count: rows.length }),
        context,
      );
    } finally {
      opened.close();
    }
  });

  // ========== db export ==========
  const exportCommand = db
    .command('export')
    .description(localizeText(context.language, 'Export a read-only SQL query'))
    .requiredOption('--sql <sql>')
    .requiredOption('--output <path>')
    .option(
      '--file-format <format>',
      localizeText(context.language, 'ndjson, csv, or parquet'),
      'ndjson',
    );
  exportCommand.action(async () => {
    const options = exportCommand.opts<{ sql: string; output: string; fileFormat: string }>();
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
    const opened = await openDatabase(databasePath(exportCommand, fallback));
    try {
      // 执行查询并将结果导出为指定格式的文件
      const count = await exportQuery(
        opened.connection,
        options.sql,
        options.output,
        options.fileFormat as 'ndjson' | 'csv' | 'parquet',
        context.signal,
      );
      await renderResult(
        successEnvelope(
          'db.export',
          { path: options.output, format: options.fileFormat, count },
          { requestId: context.requestId },
        ),
        context,
      );
    } finally {
      opened.close();
    }
  });
}
