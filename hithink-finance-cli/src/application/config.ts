/**
 * 配置解析模块 — 构建最终生效的运行时配置。
 *
 * 配置优先级链（从低到高，后者覆盖前者）：
 *   1. 内置默认值（defaults）
 *   2. 用户级配置文件（user config）  ~/.config/hithink-finance/config.json
 *   3. 项目级配置文件（project config）hithink-finance.config.json（或通过 --config 指定）
 *   4. 环境变量（env）HITHINK_FINANCE_*
 *   5. CLI 参数（overrides）--db-path / --profile / --format 等
 *
 * 安全约束：
 *   - 配置文件内容通过 Zod schema 严格校验，拒绝未知字段
 *   - 敏感字段检测（SECRET_KEYS + containsSecret）阻止密钥被写入配置文件
 *   - 配置路径通过 resolveFrom 统一解析，防止路径遍历
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { CliError } from '../contracts/errors.js';
import {
  createPlatformPaths,
  type PlatformPaths,
} from '../infrastructure/filesystem/platform-paths.js';

/**
 * Zod schema — 定义配置文件中允许的字段及其类型约束。
 * `.strict()` 确保额外字段会被拒绝，防止配置漂移。
 */
const configFileSchema = z
  .object({
    /** 数据库文件路径（相对或绝对） */
    dbPath: z.string().min(1).optional(),
    /** 认证 profile 名称 */
    profile: z.string().min(1).optional(),
    /** 输出格式：auto（自动检测 TTY）/ json / ndjson / csv / table */
    format: z.enum(['auto', 'json', 'ndjson', 'csv', 'table']).optional(),
    /** 界面语言 */
    language: z.enum(['zh-CN', 'en']).optional(),
    /** 是否在启动时检查 CLI 版本更新 */
    updateCheck: z.boolean().optional(),
  })
  .strict();

/** 从配置文件（JSON）解析出的类型安全配置对象 */
export type ConfigFile = z.infer<typeof configFileSchema>;

/**
 * CLI 层运行时覆盖项。
 * 由命令行解析器传入，优先级最高。
 */
export interface ConfigOverrides {
  dbPath?: string;
  profile?: string;
  format?: ConfigFile['format'];
  language?: ConfigFile['language'];
  /** 显式指定配置文件路径（仅通过 --config 或 HITHINK_FINANCE_CONFIG 设置） */
  configPath?: string;
}

/**
 * 合并所有层级后的最终配置。
 * 所有可选字段在此处已被解析为确定值。
 */
export interface ResolvedConfig {
  /** 已解析为绝对路径的数据库文件路径 */
  dbPath: string;
  profile: string;
  /** 非 null 的输出格式（auto 保留用于 renderer 运行时判断） */
  format: NonNullable<ConfigFile['format']>;
  language?: ConfigFile['language'];
  updateCheck: boolean;
  /** 如果使用了自定义配置文件路径，记录在此处 */
  configPath?: string;
}

/** loadConfig() 的入参，聚合所有可覆盖来源 */
export interface LoadConfigInput {
  cli?: ConfigOverrides;
  env?: NodeJS.ProcessEnv;
  cwd?: string;
  paths?: PlatformPaths;
}

/**
 * 敏感字段关键词集合 — 用于阻止密钥/令牌被写入配置文件。
 * 匹配逻辑：将 key 转小写并移除非字母字符后，与集合中的关键词比对。
 */
const SECRET_KEYS = new Set(['apikey', 'token', 'authorization', 'cookie', 'secret']);

/**
 * 递归检测值中是否包含敏感字段（如 apikey、token、secret 等）。
 * 用于防止密钥被意外写入配置文件。
 *
 * @param value - 待检测的值（可以是原始值、数组或对象）
 * @returns 如果 value 或其任意嵌套子对象包含敏感字段 key，则返回 true
 */
function containsSecret(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsSecret);
  if (value === null || typeof value !== 'object') return false;
  // 遍历对象的每个 key：将 key 规范化（去除非字母字符 + 小写）后与 SECRET_KEYS 比对
  return Object.entries(value).some(([key, entry]) => {
    const normalized = key.toLowerCase().replaceAll(/[^a-z]/g, '');
    return SECRET_KEYS.has(normalized) || containsSecret(entry);
  });
}

/**
 * 构造一个配置相关的 CliError。
 * category 固定为 'validation'，retryable 为 false，exitCode 为 2。
 */
function configError(code: string, message: string, hint: string): CliError {
  return new CliError({
    code,
    category: 'validation',
    message: `${code}: ${message}`,
    hint,
    retryable: false,
    exitCode: 2,
  });
}

/**
 * 解析并校验配置文件内容。
 *
 * 安全检查流程：
 *   1. 先调用 containsSecret() 阻止密钥被写入配置文件
 *   2. 再通过 Zod schema 校验字段类型和完整性
 *
 * @param value  — 从 JSON 解析出的原始值
 * @param source — 配置文件路径（仅用于错误消息，便于定位问题来源）
 * @returns 经过 Zod 校验的 ConfigFile
 * @throws {CliError} 如果包含敏感字段或不符合 schema
 */
export function parseConfigFile(value: unknown, source: string): ConfigFile {
  if (containsSecret(value)) {
    throw configError(
      'CONFIG_SECRET_FORBIDDEN',
      `Secrets are not allowed in ${source}.`,
      'Use HITHINK_FINANCE_API_KEY, --api-key-stdin, or the system credential store.',
    );
  }

  const parsed = configFileSchema.safeParse(value);
  if (!parsed.success) {
    throw configError(
      'CONFIG_INVALID',
      `Configuration in ${source} does not match the supported schema.`,
      parsed.error.issues.map((issue) => issue.message).join('; '),
    );
  }
  return parsed.data;
}

/**
 * 从指定路径读取并解析配置文件。
 * 文件不存在（ENOENT）返回 undefined，JSON 语法错误抛 CliError。
 *
 * @param configPath - 配置文件的绝对路径
 * @returns 解析后的 ConfigFile，文件不存在时返回 undefined
 */
async function readConfig(configPath: string): Promise<ConfigFile | undefined> {
  let content: string;
  try {
    content = await readFile(configPath, 'utf8');
  } catch (error) {
    // 文件不存在是正常情况 — 配置文件是可选的
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }

  try {
    return parseConfigFile(JSON.parse(content) as unknown, configPath);
  } catch (error) {
    if (error instanceof CliError) throw error;
    throw configError(
      'CONFIG_INVALID',
      `Configuration in ${configPath} is not valid JSON.`,
      'Fix the JSON syntax or remove the file.',
    );
  }
}

/**
 * 相对路径解析器。
 * - 如果 value 已是绝对路径 → 直接 normalize
 * - 如果 value 是相对路径 → 基于 baseDirectory resolve
 *
 * 设计意图：配置文件中的路径字段（如 dbPath）允许相对于配置文件所在目录。
 * 例如项目配置中 dbPath: "./data/hithink.db" → 相对于项目根目录解析。
 *
 * @param baseDirectory - 相对路径的基准目录
 * @param value          - 待解析的路径值
 */
function resolveFrom(baseDirectory: string, value: string): string {
  return path.isAbsolute(value) ? path.normalize(value) : path.resolve(baseDirectory, value);
}

/**
 * 加载完整的运行时配置 — 按优先级链合并所有层级。
 *
 * ## 配置优先级链（从低到高）：
 * ```
 * 默认值  →  用户配置  →  项目配置  →  环境变量  →  CLI 参数
 * ```
 *
 * ### dbPath 的逐层覆盖：
 *   1. 默认：平台默认路径（~/.local/share/hithink-finance/hithink-finance.db）
 *   2. 用户配置中的 dbPath → 相对于用户配置目录 resolve
 *   3. 项目配置中的 dbPath → 相对于项目目录 resolve
 *   4. HITHINK_FINANCE_DB_PATH 环境变量
 *   5. --db-path CLI 参数
 *
 * ### profile 的逐层覆盖：
 *   1. 用户配置 .profile
 *   2. 项目配置 .profile
 *   3. HITHINK_FINANCE_PROFILE 环境变量
 *   4. --profile CLI 参数
 *   5. 兜底：'default'
 *
 * @param input - 可选覆盖项集合
 * @returns 解析完成的配置对象
 */
export async function loadConfig(input: LoadConfigInput = {}): Promise<ResolvedConfig> {
  const cwd = input.cwd ?? process.cwd();
  const env = input.env ?? process.env;
  const paths = input.paths ?? createPlatformPaths({ env });
  const cli = input.cli ?? {};
  // 确定配置文件路径：--config CLI 参数 > HITHINK_FINANCE_CONFIG 环境变量
  const explicitConfigPath = cli.configPath ?? env.HITHINK_FINANCE_CONFIG;
  // 如果未指定配置文件，默认查找当前目录下的 hithink-finance.config.json
  const projectConfigPath = resolveFrom(cwd, explicitConfigPath ?? 'hithink-finance.config.json');

  // 并行读取用户级和项目级配置文件
  const [userConfig, projectConfig] = await Promise.all([
    readConfig(paths.userConfigFile),
    readConfig(projectConfigPath),
  ]);

  // === dbPath 逐层覆盖：默认 → 用户配置 → 项目配置 → env → CLI ===
  let dbPath = paths.defaultDbPath;
  if (userConfig?.dbPath !== undefined) {
    dbPath = resolveFrom(path.dirname(paths.userConfigFile), userConfig.dbPath);
  }
  if (projectConfig?.dbPath !== undefined) {
    dbPath = resolveFrom(path.dirname(projectConfigPath), projectConfig.dbPath);
  }
  if (env.HITHINK_FINANCE_DB_PATH !== undefined) {
    dbPath = resolveFrom(cwd, env.HITHINK_FINANCE_DB_PATH);
  }
  if (cli.dbPath !== undefined) {
    dbPath = resolveFrom(cwd, cli.dbPath);
  }

  // language 使用简单优先级：CLI > 项目配置 > 用户配置
  const language = cli.language ?? projectConfig?.language ?? userConfig?.language;
  const result: ResolvedConfig = {
    dbPath,
    // profile：CLI > env > 项目配置 > 用户配置 > 'default'
    profile:
      cli.profile ??
      env.HITHINK_FINANCE_PROFILE ??
      projectConfig?.profile ??
      userConfig?.profile ??
      'default',
    // format：CLI > 项目配置 > 用户配置 > 'auto'
    format: cli.format ?? projectConfig?.format ?? userConfig?.format ?? 'auto',
    // updateCheck：如果设置了 HITHINK_FINANCE_NO_UPDATE_CHECK 则禁用，
    //              否则由配置文件控制，默认为 true
    updateCheck:
      env.HITHINK_FINANCE_NO_UPDATE_CHECK === undefined &&
      (projectConfig?.updateCheck ?? userConfig?.updateCheck ?? true),
  };
  if (language !== undefined) result.language = language;
  if (explicitConfigPath !== undefined) result.configPath = projectConfigPath;
  return result;
}
