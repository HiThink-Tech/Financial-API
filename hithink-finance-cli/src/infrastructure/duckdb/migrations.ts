/**
 * 数据库迁移管理模块
 *
 * 提供数据库版本管理功能，支持安全、重量级和破坏性三种级别的迁移操作。
 * 迁移系统基于 manifest.json 描述文件和 SQL 迁移脚本：
 * - manifest.json 记录迁移版本、类型、文件名和 SHA-256 校验和
 * - 每个迁移脚本是独立的 SQL 文件
 * - _meta 表存储当前数据库的实际 schema 版本
 *
 * 迁移类型说明：
 * - safe：安全迁移，创建表/索引/视图，不修改或删除已有数据
 * - heavy：重量级迁移，可能涉及大量数据处理（需显式确认）
 * - destructive：破坏性迁移，可能删除数据（需显式确认）
 *
 * @module duckdb/migrations
 */

import type { DuckDBConnection } from '@duckdb/node-api';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { CliError } from '../../contracts/errors.js';
import { SUPPORTED_SCHEMA_VERSION } from './schema.js';

function normalizeLineEndings(value: string): string {
  return value.replaceAll('\r\n', '\n');
}

/**
 * 单个数据库迁移的定义
 */
export interface Migration {
  /** 迁移版本号（正整数，递增） */
  version: number;
  /** 迁移名称 */
  name: string;
  /** 迁移类型：safe（安全）/ heavy（重量级）/ destructive（破坏性） */
  type: 'safe' | 'heavy' | 'destructive';
  /** SQL 脚本的 SHA-256 校验和 */
  checksum: string;
  /** SQL 脚本内容 */
  sql: string;
}

/** manifest.json 的 Zod 验证模式 */
const manifestSchema = z.object({
  schemaVersion: z.number().int().positive(),
  migrations: z.array(
    z.object({
      version: z.number().int().positive(),
      name: z.string().min(1),
      type: z.enum(['safe', 'heavy', 'destructive']),
      file: z.string().min(1),
      checksum: z.string().regex(/^[a-f0-9]{64}$/u),
    }),
  ),
});

/**
 * 获取迁移文件根目录
 *
 * 迁移文件相对于当前模块位置存放在 `../../../migrations` 目录下。
 *
 * @returns 迁移目录的绝对路径
 */
function migrationRoot(): string {
  return path.resolve(import.meta.dirname, '../../../migrations');
}

/**
 * 加载并验证所有打包的迁移脚本
 *
 * 从 migrations 目录读取 manifest.json 和对应的 SQL 文件，
 * 并对每个文件进行 SHA-256 校验，确保文件未被篡改。
 *
 * @returns 已验证的迁移对象数组
 * @throws 校验和不匹配时抛出错误
 */
async function bundledMigrations(): Promise<Migration[]> {
  const root = migrationRoot();
  // 解析 manifest.json 中的迁移描述
  const manifest = manifestSchema.parse(
    JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8')) as unknown,
  );
  const migrations: Migration[] = [];
  for (const entry of manifest.migrations) {
    // 读取对应的 SQL 脚本文件
    const sql = normalizeLineEndings(await readFile(path.join(root, entry.file), 'utf8'));
    // 计算 SQL 内容的 SHA-256 校验和
    const checksum = createHash('sha256').update(sql).digest('hex');
    // 校验和比对，防止文件损坏或被篡改
    if (checksum !== entry.checksum) {
      throw new Error(`Migration checksum mismatch for ${entry.file}`);
    }
    migrations.push({ ...entry, sql });
  }
  return migrations;
}

/**
 * 查询当前数据库的 schema 版本
 *
 * 通过 _meta 表读取 schema_version 键的值：
 * - _meta 表不存在 → 版本号为 0（表示全新的空数据库）
 * - _meta 表存在但无 schema_version 记录 → 版本号为 0
 *
 * @param connection - DuckDB 数据库连接
 * @returns 当前的 schema 版本号，0 表示未初始化
 */
async function schemaVersion(connection: DuckDBConnection): Promise<number> {
  // 检查 _meta 表是否存在
  const tableReader = await connection.runAndReadAll(
    "SELECT count(*) FROM information_schema.tables WHERE table_schema='main' AND table_name='_meta'",
  );
  // _meta 表不存在，数据库未初始化
  if (Number(tableReader.getRowsJson()[0]?.[0] ?? 0) === 0) return 0;
  // 读取 schema_version
  const reader = await connection.runAndReadAll(
    "SELECT value FROM _meta WHERE key='schema_version' LIMIT 1",
  );
  const value = reader.getRowsJson()[0]?.[0];
  return value === undefined ? 0 : Number(value);
}

/**
 * 规划待执行的迁移列表
 *
 * 比较当前数据库版本和可用迁移列表，筛选出版本号大于当前版本的迁移，
 * 并按版本号升序排列。
 *
 * @param connection - DuckDB 数据库连接
 * @param available - 可选的可用迁移列表，不传则加载打包的迁移
 * @returns 待执行的迁移数组（已按版本号排序）
 */
export async function planMigrations(
  connection: DuckDBConnection,
  available?: readonly Migration[],
): Promise<Migration[]> {
  // 获取当前数据库的 schema 版本
  const current = await schemaVersion(connection);
  // 使用传入的迁移列表或加载打包的迁移
  const migrations = available === undefined ? await bundledMigrations() : [...available];
  // 筛选需要执行的迁移（版本号 > 当前版本），按版本号升序
  return migrations
    .filter((migration) => migration.version > current)
    .sort((a, b) => a.version - b.version);
}

/**
 * 按顺序执行待迁移操作
 *
 * 对 heavy 和 destructive 类型的迁移，需要显式传入允许标志，
 * 否则抛出 DATA_MIGRATION_CONFIRMATION_REQUIRED 错误要求用户确认。
 *
 * 每个迁移在独立事务中执行：成功则提交 + 更新 _meta 记录，失败则回滚。
 *
 * @param connection - DuckDB 数据库连接
 * @param available - 可选的可用迁移列表
 * @param options - 迁移选项
 * @param options.allowHeavy - 是否允许执行重量级迁移
 * @param options.allowDestructive - 是否允许执行破坏性迁移
 * @throws {CliError} 需要确认重量级/破坏性迁移时抛出
 */
export async function applyMigrations(
  connection: DuckDBConnection,
  available?: readonly Migration[],
  options: { allowHeavy?: boolean; allowDestructive?: boolean } = {},
): Promise<void> {
  const pending = await planMigrations(connection, available);
  for (const migration of pending) {
    // 重量级或破坏性迁移需要显式授权
    if (
      (migration.type === 'heavy' && options.allowHeavy !== true) ||
      (migration.type === 'destructive' && options.allowDestructive !== true)
    ) {
      throw new CliError({
        code: 'DATA_MIGRATION_CONFIRMATION_REQUIRED',
        category: 'local-data',
        message: `Migration ${migration.version} (${migration.name}) requires explicit confirmation.`,
        hint: 'Run `hithink-finance data migrate --apply --yes` after reviewing the plan.',
        retryable: false,
        exitCode: 5,
      });
    }
    // 每个迁移在独立事务中执行
    await connection.run('BEGIN TRANSACTION');
    try {
      // 执行迁移 SQL
      await connection.run(migration.sql);
      // 更新 _meta 表中的版本号和校验和记录
      await connection.run(
        "INSERT OR REPLACE INTO _meta(key, value) VALUES ('schema_version', $version), ('schema_checksum', $checksum)",
        { version: String(migration.version), checksum: migration.checksum },
      );
      await connection.run('COMMIT');
    } catch (error) {
      // 回滚失败时忽略错误，保留原始异常
      await connection.run('ROLLBACK').catch(() => undefined);
      throw error;
    }
  }
}

/**
 * 检查数据库 schema 版本兼容性
 *
 * 如果数据库版本高于当前支持的版本，抛出 DATA_SCHEMA_TOO_NEW 错误，
 * 提示用户升级 CLI 工具后再操作数据库。
 *
 * @param connection - DuckDB 数据库连接
 * @param supportedVersion - 当前 CLI 支持的 schema 版本，默认使用 SUPPORTED_SCHEMA_VERSION
 * @returns 包含当前数据库版本号的对象
 * @throws {CliError} 数据库版本过新时抛出
 */
export async function assertSchemaCompatibility(
  connection: DuckDBConnection,
  supportedVersion = SUPPORTED_SCHEMA_VERSION,
): Promise<{ version: number }> {
  const version = await schemaVersion(connection);
  // 数据库版本高于 CLI 支持版本，提示升级
  if (version > supportedVersion) {
    throw new CliError({
      code: 'DATA_SCHEMA_TOO_NEW',
      category: 'local-data',
      message: `Database schema ${version} is newer than supported schema ${supportedVersion}.`,
      hint: 'Upgrade hithink-finance before writing to this database.',
      retryable: false,
      exitCode: 5,
    });
  }
  return { version };
}
