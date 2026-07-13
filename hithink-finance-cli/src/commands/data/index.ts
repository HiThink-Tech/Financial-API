/**
 * 数据管理命令模块
 *
 * 注册 `data` 命令组，管理本地 DuckDB 数据库的完整生命周期：
 *
 * ### 子命令一览
 * - `data init`   — 初始化本地数据（本地文件或远程 Fuyao API）
 * - `data sync`   — 从 Fuyao API 同步增量数据
 * - `data status` — 查看数据库状态和 schema 兼容性
 * - `data validate` — 校验本地数据质量
 * - `data repair` — 重建衍生因子（如前复权因子）
 * - `data migrate` — 计划或执行 schema 迁移
 * - `data clean` — 清理托管下载缓存
 * - `data remove` — 删除数据库文件
 *
 * ### 排他锁机制
 * 所有会修改数据的操作（init / sync / repair / migrate / remove）都通过
 * {@link withDataLock} 获取进程级排他锁，防止并发操作导致数据损坏。
 *
 * ### 初始化流程（data init）
 * 两种路径：
 * 1. **本地文件初始化**：通过 `--kline` / `--events` 传入本地 CSV/Parquet 文件路径
 * 2. **远程初始化**：不传本地文件时，从 Fuyao API 拉取数据
 *
 * ### 同步流程（data sync）
 * 从 Fuyao API 增量拉取最新数据并合并到本地数据库。
 *
 * ### 迁移流程（data migrate）
 * 默认仅查看迁移计划（plan），需要 `--apply` 标志才实际执行。
 * 重量级迁移需要额外 `--allow-heavy` 确认。
 *
 * ### 清理流程（data clean）
 * 删除托管下载缓存目录。
 *
 * ### 删除流程（data remove）
 * 需要全局 `--yes` 确认，`--plan` 仅查看计划不执行。
 */

import type { Command } from 'commander';
import type { CliContext } from '../../cli/context.js';
import { localizeText } from '../../cli/i18n.js';
import { successEnvelope } from '../../contracts/envelope.js';
import { CliError } from '../../contracts/errors.js';
import { openDatabase } from '../../infrastructure/duckdb/connection.js';
import {
  applyMigrations,
  assertSchemaCompatibility,
  planMigrations,
} from '../../infrastructure/duckdb/migrations.js';
import { rebuildAdjustmentFactors } from '../../infrastructure/duckdb/factors.js';
import { validateDatabase } from '../../infrastructure/duckdb/quality.js';
import { renderResult } from '../../output/renderer.js';
import { initializeData } from '../../application/use-cases/data-init.js';
import { syncDataFromFuyao } from '../../application/use-cases/data-sync.js';
import { cleanManagedCache } from '../../application/use-cases/data-clean.js';
import { removeDatabase } from '../../application/use-cases/data-remove.js';
import type { PlatformPaths } from '../../infrastructure/filesystem/platform-paths.js';
import type { ApiKeyAuthProvider } from '../../infrastructure/credentials/api-key-provider.js';
import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { withExclusiveDataLock } from '../../infrastructure/filesystem/process-lock.js';
import { createDownloadProgressReporter } from '../../output/download-progress.js';

/**
 * 解析数据库文件路径
 *
 * 优先级：`--db` CLI 参数 > `HITHINK_FINANCE_DB_PATH` 环境变量 > fallback 默认路径
 *
 * @param command - 当前 Commander 命令实例
 * @param fallback - 默认数据库文件路径
 * @returns 最终使用的数据库文件路径
 */
function dbPath(command: Command, fallback: string): string {
  return (
    command.optsWithGlobals<{ db?: string }>().db ?? process.env.HITHINK_FINANCE_DB_PATH ?? fallback
  );
}

/**
 * 使用排他锁包装异步操作
 *
 * 确保 data 命令写入时不会并发冲突。
 * 先创建 stateDir（如不存在），再以文件锁保护 action 的执行。
 *
 * ### 排他锁机制
 * 锁文件路径为 `{stateDir}/data.lock`，同一时间只有一个进程能持有该锁。
 * 其他进程尝试获取锁时会阻塞等待，直到锁被释放或超时。
 *
 * @param paths - 平台路径配置
 * @param command - 当前正在执行的命令名称（用于锁备注）
 * @param cliVersion - CLI 版本号
 * @param action - 受锁保护的异步操作
 * @returns action 的返回值
 */
async function withDataLock<T>(
  paths: PlatformPaths,
  command: string,
  cliVersion: string,
  action: () => Promise<T>,
): Promise<T> {
  await mkdir(paths.stateDir, { recursive: true });
  return withExclusiveDataLock(
    path.join(paths.stateDir, 'data.lock'),
    { command, cliVersion },
    action,
  );
}

/**
 * 从标准输入读取文本内容
 *
 * 用于 `--api-key-stdin` 与 `data init` / `data sync` 配合使用的场景。
 *
 * @returns 去除首尾空白后的 stdin 文本
 */
async function stdinText(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin)
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  return Buffer.concat(chunks).toString('utf8').trim();
}

/**
 * 注册数据管理命令组
 *
 * 创建 `data` 命令及其所有子命令。修改性操作均使用 {@link withDataLock} 保护。
 *
 * @param program - Commander 根程序实例
 * @param context - CLI 上下文
 * @param paths - 平台文件系统路径配置
 * @param remote - 远程 API 连接所需的认证和 URL 配置
 */
export function registerDataCommands(
  program: Command,
  context: CliContext,
  paths: PlatformPaths,
  remote: { authProvider: ApiKeyAuthProvider; baseUrl: string; cliVersion: string },
): void {
  const data = program
    .command('data')
    .description(localizeText(context.language, 'Manage local DuckDB data'));

  // ========== data init ==========
  const init = data
    .command('init')
    .description(localizeText(context.language, 'Initialize local data from a verified dump'))
    .option('--kline <path>')
    .option('--events <path>')
    .option('--symbols <path>');
  init.action(async () =>
    withDataLock(paths, 'data.init', remote.cliVersion, async () => {
      await mkdir(paths.dataDir, { recursive: true });
      const db = await openDatabase(dbPath(init, paths.defaultDbPath));
      try {
        const options = init.opts<{ kline?: string; events?: string; symbols?: string }>();
        // --kline 和 --events 必须成对提供
        const hasKline = options.kline !== undefined;
        const hasEvents = options.events !== undefined;
        if (hasKline !== hasEvents)
          throw new CliError({
            code: 'CLI_BAD_ARGUMENT',
            category: 'validation',
            message: '--kline and --events must be provided together.',
            hint: 'Provide both local dump files, or omit both to initialize from Fuyao.',
            retryable: false,
            exitCode: 2,
          });
        // 初始化路径决策：
        //   有本地文件 → 从本地文件初始化（FULL 模式）
        //   无本地文件 → 从 Fuyao 远程 API 同步数据
        const result =
          options.kline !== undefined && options.events !== undefined
            ? {
                decision: 'FULL',
                factorRows: await initializeData(db.connection, {
                  klinePath: options.kline,
                  eventsPath: options.events,
                  ...(options.symbols === undefined ? {} : { symbolsPath: options.symbols }),
                  batchId: `local-${Date.now()}`,
                  source: 'local-files',
                }),
              }
            : await syncDataFromFuyao(db.connection, {
                baseUrl: remote.baseUrl,
                apiKey: (
                  await remote.authProvider.resolve(
                    init.optsWithGlobals<{ profile?: string }>().profile ?? 'default',
                    init.optsWithGlobals<{ apiKey?: string; apiKeyStdin?: boolean }>()
                      .apiKeyStdin === true
                      ? await stdinText()
                      : init.optsWithGlobals<{ apiKey?: string }>().apiKey,
                  )
                ).apiKey,
                cacheDir: paths.cacheDir,
                onProgress: createDownloadProgressReporter(context),
              });
        await renderResult(
          successEnvelope(
            'data.init',
            { initialized: true, path: db.path, ...result },
            { requestId: context.requestId },
          ),
          context,
        );
      } finally {
        db.close();
      }
    }),
  );

  // ========== data sync ==========
  const sync = data
    .command('sync')
    .description(localizeText(context.language, 'Synchronize local data'));
  sync.action(async () =>
    withDataLock(paths, 'data.sync', remote.cliVersion, async () => {
      await mkdir(paths.dataDir, { recursive: true });
      const db = await openDatabase(dbPath(sync, paths.defaultDbPath));
      try {
        const globals = sync.optsWithGlobals<{
          profile?: string;
          apiKey?: string;
          apiKeyStdin?: boolean;
        }>();
        const auth = await remote.authProvider.resolve(
          globals.profile ?? 'default',
          globals.apiKeyStdin === true ? await stdinText() : globals.apiKey,
        );
        // 从 Fuyao API 增量同步数据
        const result = await syncDataFromFuyao(db.connection, {
          baseUrl: remote.baseUrl,
          apiKey: auth.apiKey,
          cacheDir: paths.cacheDir,
          onProgress: createDownloadProgressReporter(context),
        });
        await renderResult(
          successEnvelope('data.sync', result, { requestId: context.requestId }),
          context,
        );
      } finally {
        db.close();
      }
    }),
  );

  // ========== data status ==========
  data
    .command('status')
    .description(localizeText(context.language, 'Show local database status'))
    .action(async () => {
      const db = await openDatabase(dbPath(data, paths.defaultDbPath));
      try {
        // 检查 schema 兼容性，返回当前版本信息
        const schema = await assertSchemaCompatibility(db.connection);
        await renderResult(
          successEnvelope(
            'data.status',
            { path: db.path, ...schema },
            { requestId: context.requestId },
          ),
          context,
        );
      } finally {
        db.close();
      }
    });

  // ========== data validate ==========
  data
    .command('validate')
    .description(localizeText(context.language, 'Validate local data quality'))
    .action(async () => {
      const db = await openDatabase(dbPath(data, paths.defaultDbPath));
      try {
        // 先确保 schema 是最新的，再进行质量校验
        await applyMigrations(db.connection);
        await renderResult(
          successEnvelope('data.validate', await validateDatabase(db.connection), {
            requestId: context.requestId,
          }),
          context,
        );
      } finally {
        db.close();
      }
    });

  // ========== data repair ==========
  data
    .command('repair')
    .description(localizeText(context.language, 'Rebuild derived factors'))
    .action(async () =>
      withDataLock(paths, 'data.repair', remote.cliVersion, async () => {
        const db = await openDatabase(dbPath(data, paths.defaultDbPath));
        try {
          await applyMigrations(db.connection);
          // 重建调整因子表（如前复权因子）
          const factorRows = await rebuildAdjustmentFactors(db.connection);
          await renderResult(
            successEnvelope('data.repair', { factorRows }, { requestId: context.requestId }),
            context,
          );
        } finally {
          db.close();
        }
      }),
    );

  // ========== data migrate ==========
  const migrate = data
    .command('migrate')
    .description(localizeText(context.language, 'Plan or apply schema migrations'))
    .option('--apply')
    .option('--allow-heavy');
  migrate.action(async () =>
    withDataLock(paths, 'data.migrate', remote.cliVersion, async () => {
      const db = await openDatabase(dbPath(migrate, paths.defaultDbPath));
      try {
        const options = migrate.opts<{ apply?: boolean; allowHeavy?: boolean }>();
        // 默认仅查看迁移计划，不执行
        const plan = await planMigrations(db.connection);
        // --apply 标志才实际执行迁移
        if (options.apply === true)
          await applyMigrations(db.connection, undefined, {
            allowHeavy: options.allowHeavy === true,
          });
        await renderResult(
          successEnvelope(
            'data.migrate',
            { applied: options.apply === true, versions: plan.map((item) => item.version) },
            { requestId: context.requestId },
          ),
          context,
        );
      } finally {
        db.close();
      }
    }),
  );

  // ========== data clean ==========
  const clean = data
    .command('clean')
    .description(localizeText(context.language, 'Clean managed download caches'))
    .option('--cache');
  clean.action(async () => {
    // 清理托管下载缓存目录
    await cleanManagedCache(paths.cacheDir, paths.cacheDir);
    await renderResult(
      successEnvelope(
        'data.clean',
        { cacheRemoved: true, path: paths.cacheDir },
        { requestId: context.requestId },
      ),
      context,
    );
  });

  // ========== data remove ==========
  const remove = data
    .command('remove')
    .description(localizeText(context.language, 'Remove the explicitly confirmed database'))
    .option('--plan');
  remove.action(async () =>
    withDataLock(paths, 'data.remove', remote.cliVersion, async () => {
      const target = dbPath(remove, paths.defaultDbPath);
      const globals = remove.optsWithGlobals<{ yes?: boolean }>();
      // 获取数据库文件大小（用于展示信息）
      const size = await stat(target)
        .then((value) => value.size)
        .catch(() => 0);
      // --plan 仅查看计划不执行，否则需要全局 --yes 确认
      if (remove.opts<{ plan?: boolean }>().plan !== true)
        await removeDatabase(target, target, globals.yes === true);
      await renderResult(
        successEnvelope(
          'data.remove',
          { path: target, size, removed: remove.opts<{ plan?: boolean }>().plan !== true },
          { requestId: context.requestId },
        ),
        context,
      );
    }),
  );
}
