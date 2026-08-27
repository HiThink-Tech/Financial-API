/**
 * 本地只读查询用例 — 对本地 DuckDB 执行安全的只读 SQL 查询。
 *
 * ## 只读 SQL 强制策略
 *
 * 所有本地查询通过双重防护确保只读：
 *
 * ### 第一层：运行环境加固
 * - `SET enable_external_access=false`     — 禁止外部文件访问
 * - `SET autoinstall_known_extensions=false` — 禁止自动安装扩展
 * - `SET autoload_known_extensions=false`   — 禁止自动加载扩展
 *
 * ### 第二层：SQL 解析验证
 * - `extractStatements()` — 提取 SQL 语句，必须恰好 1 条
 * - `statementType !== 1` — DuckDB 中 type=1 表示 SELECT，拒绝任何非 SELECT 语句
 *
 * ### exportQuery 额外防护
 * - `assertReadOnly()` 在 COPY 之前对 SQL 做正则黑名单检查：
 *   禁止关键词：ATTACH, COPY, INSTALL, LOAD, READ_CSV, READ_JSON,
 *   READ_PARQUET, HTTPFS, SQLITE_SCAN
 *   （这些可能通过 DuckDB 内置函数绕过只读限制）
 * - 然后复用 extractStatements + statementType 验证
 *
 * ## 原子导出机制
 * `exportQuery` 使用 "先写临时文件，再 rename" 的策略保证原子性：
 * 1. 写入 `{outputPath}.{pid}.tmp`
 * 2. 成功后 `rename(temporary, absolute)`
 * 3. 失败时删除临时文件
 * 这种方案避免了断点续传问题，确保导出的文件要么完整，要么不存在。
 */
import type { DuckDBConnection } from '@duckdb/node-api';
import { withDuckDbInterrupt } from '../../infrastructure/duckdb/connection.js';
import { CliError, throwIfCancelled } from '../../contracts/errors.js';
import { mkdir, rename, rm } from 'node:fs/promises';
import path from 'node:path';

/** 构造只读违规的 CliError（exitCode=2, retryable=false） */
function readOnlyViolation(): CliError {
  return new CliError({
    code: 'DB_READ_ONLY_VIOLATION',
    category: 'validation',
    message: 'db query accepts exactly one read-only SELECT statement.',
    hint: 'Use SELECT or WITH ... SELECT. Database writes are available only through managed data commands.',
    retryable: false,
    exitCode: 2,
  });
}

/**
 * 执行只读 SQL 查询并返回 JSON 行对象数组。
 *
 * ## 安全加固步骤：
 * 1. 关闭外部访问和扩展加载（防止沙箱逃逸）
 * 2. 提取 SQL 语句 — 必须恰好 1 条
 * 3. 检查 statementType — 必须是 SELECT（type === 1）
 * 4. 执行查询并返回结果
 *
 * @param connection - DuckDB 数据库连接
 * @param sql        - 待执行的 SQL 字符串
 * @returns 查询结果行数组
 * @throws {CliError} 如果 SQL 不是单条 SELECT
 */
export async function queryReadOnly(
  connection: DuckDBConnection,
  sql: string,
  signal?: AbortSignal,
): Promise<Record<string, unknown>[]> {
  // 运行时安全加固：关闭外部访问和扩展能力
  await connection.run(
    'SET enable_external_access=false; SET autoinstall_known_extensions=false; SET autoload_known_extensions=false',
  );
  let extracted;
  try {
    // 提取 SQL 语句
    extracted = await connection.extractStatements(sql);
  } catch {
    throw readOnlyViolation();
  }
  // 必须恰好 1 条 SQL 语句
  if (extracted.count !== 1) throw readOnlyViolation();
  let prepared;
  try {
    // 准备执行计划
    prepared = await extracted.prepare(0);
  } catch {
    throw readOnlyViolation();
  }
  return withDuckDbInterrupt(connection, signal, async () => {
    try {
      // statementType === 1 表示 SELECT
      if (prepared.statementType !== 1) throw readOnlyViolation();
      const reader = await prepared.runAndReadAll();
      return reader.getRowObjectsJson() as Record<string, unknown>[];
    } finally {
      prepared.destroySync();
    }
  });
}

/**
 * 对 SQL 做深度只读验证（用于 COPY 导出前的安全检查）。
 *
 * 验证策略：
 * 1. 正则黑名单：阻止包含危险关键词的 SQL
 * 2. extractStatements + statementType：确保是单条 SELECT
 *
 * 与 queryReadOnly 的区别：
 * - assertReadOnly 不执行 SQL，仅做安全验证
 * - 用于 COPY 场景：需要在 COPY 前确认 SQL 安全，因为 COPY 本身是写操作
 *
 * @param connection - DuckDB 数据库连接
 * @param sql        - 待验证的 SQL
 * @throws {CliError} 如果 SQL 不安全
 */
async function assertReadOnly(connection: DuckDBConnection, sql: string): Promise<void> {
  // 正则黑名单：阻止包含危险关键词的 SQL
  // 这些关键词可能通过 DuckDB 内置函数实现外部访问或数据写入
  if (
    /\b(?:attach|copy|install|load|read_csv|read_json|read_parquet|httpfs|sqlite_scan)\b/iu.test(
      sql,
    )
  )
    throw readOnlyViolation();
  let extracted;
  try {
    extracted = await connection.extractStatements(sql);
    if (extracted.count !== 1) throw readOnlyViolation();
    const prepared = await extracted.prepare(0);
    try {
      if (prepared.statementType !== 1) throw readOnlyViolation();
    } finally {
      prepared.destroySync();
    }
  } catch (error) {
    if (error instanceof CliError) throw error;
    throw readOnlyViolation();
  }
}

/**
 * 将只读 SQL 查询结果导出为文件。
 *
 * ## 原子写入机制：
 * ```
 * COPY TO '{path}.{pid}.tmp' (FORMAT ...)
 *      ↓ 成功
 * rename('{path}.{pid}.tmp', '{path}')
 *      ↓ 失败
 * rm('{path}.{pid}.tmp')
 * ```
 * 使用临时文件 + rename 确保导出的文件要么完整，要么不存在。
 *
 * 支持的格式：ndjson（JSON Lines）、csv、parquet
 *
 * @param connection - DuckDB 数据库连接
 * @param sql        - 只读 SELECT 语句
 * @param outputPath - 目标输出文件路径
 * @param format     - 导出格式（ndjson/csv/parquet）
 * @returns 导出的行数
 * @throws {CliError} 如果 SQL 不安全
 */
export async function exportQuery(
  connection: DuckDBConnection,
  sql: string,
  outputPath: string,
  format: 'ndjson' | 'csv' | 'parquet',
  signal?: AbortSignal,
): Promise<number> {
  // 安全验证：确保 SQL 是只读的 SELECT
  await assertReadOnly(connection, sql);
  const absolute = path.resolve(outputPath);
  // 临时文件路径：{output}.{pid}.tmp（使用 PID 避免并发冲突）
  const temporary = `${absolute}.${process.pid}.tmp`;
  // 确保输出目录存在
  await mkdir(path.dirname(absolute), { recursive: true });
  // 转义路径中的单引号（防止 COPY 语句注入）
  const escaped = temporary.replaceAll("'", "''");
  // 根据格式选择 COPY 选项
  const copyOptions =
    format === 'parquet'
      ? 'FORMAT PARQUET'
      : format === 'csv'
        ? 'FORMAT CSV, HEADER true'
        : 'FORMAT JSON, ARRAY false';
  try {
    const count = await withDuckDbInterrupt(connection, signal, async () => {
      // 先写入临时文件
      await connection.run(`COPY (${sql}) TO '${escaped}' (${copyOptions})`);
      // 查询导出行数
      const countReader = await connection.runAndReadAll(`SELECT count(*) FROM (${sql}) q`);
      return Number(countReader.getRowsJson()[0]?.[0] ?? 0);
    });
    // rename 是提交边界：提交前响应取消，提交后晚到的取消不再反转成功结果。
    throwIfCancelled(signal);
    await rename(temporary, absolute);
    return count;
  } catch (error) {
    // 失败时清理临时文件；最终文件仅可能由成功的原子 rename 产生。
    await rm(temporary, { force: true });
    throw error;
  }
}
