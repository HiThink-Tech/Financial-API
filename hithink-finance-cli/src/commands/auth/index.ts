/**
 * 认证命令模块
 *
 * 注册 `auth login`、`auth status`、`auth logout` 三个子命令，
 * 管理 API Key 的存储、查询和删除（基于系统凭据管理器）。
 *
 * 支持三种 API Key 输入方式：
 * 1. `--api-key <key>`：兼容旧调用的弃用输入（有泄露风险）
 * 2. `--api-key-stdin`：从标准输入管道读取（推荐）
 * 3. 交互式隐藏输入：TTY 环境下使用 muted writable stream 遮蔽回显
 *
 * 凭据通过 {@link ApiKeyAuthProvider} 持久化到操作系统的凭据管理器中。
 */

import { createInterface } from 'node:readline/promises';
import type { Readable } from 'node:stream';
import { Writable } from 'node:stream';
import type { Command } from 'commander';
import type { CliContext } from '../../cli/context.js';
import { localizeText, translate } from '../../cli/i18n.js';
import type { PackageMetadata } from '../../cli/program.js';
import { successEnvelope } from '../../contracts/envelope.js';
import { cancelledError, CliError } from '../../contracts/errors.js';
import { renderResult } from '../../output/renderer.js';
import type { ApiKeyAuthProvider } from '../../infrastructure/credentials/api-key-provider.js';
import { readStdin } from '../../infrastructure/filesystem/stdin.js';

interface AuthOptions {
  profile?: string;
  apiKey?: string;
  apiKeyStdin?: boolean;
  input?: boolean;
  all?: boolean;
  replace?: boolean;
}

const apiKeyHint =
  'Get an API key at https://fuyao.aicubes.cn/admin, then run `hithink-finance auth login` and paste it into the hidden prompt. In non-interactive shells, use `hithink-finance auth login --api-key-stdin`.';

/**
 * 交互式隐藏 API Key 输入
 *
 * 仅在 TTY 环境下可用（即用户在终端中直接运行 CLI）。
 * 使用 muted Writable stream 作为 readline 的输出目标，
 * 从而在用户输入时不会在屏幕上回显密钥内容。
 *
 * ### 隐藏输入流程
 * 1. 创建一个空操作的 Writable stream —— 所有写入都被静默丢弃
 * 2. 用 process.stdin 和 muted stream 创建 readline 接口（terminal: true 确保逐字符读取）
 * 3. 向 stderr 输出提示文字 "API key: "（与用户输入隔离）
 * 4. 等待用户输入完成后关闭 readline，并在 stderr 换行
 *
 * 非 TTY 环境（如 CI/Pipe）下调用会直接抛出 {@link CliError}，
 * 要求使用 `--api-key-stdin` 或其他非交互方式。
 *
 * @param context - CLI 上下文，提供 stderr 写入能力
 * @returns 用户隐藏输入的 API Key 字符串
 * @throws {CliError} 如果在非 TTY 环境中调用
 */
export async function readHiddenApiKey(
  context: CliContext,
  input: Readable & { isTTY?: boolean } = process.stdin,
): Promise<string> {
  if (input.isTTY !== true) {
    throw new CliError({
      code: 'CLI_MISSING_ARGUMENT',
      category: 'validation',
      message: 'An API key is required in non-interactive mode.',
      hint: apiKeyHint,
      retryable: false,
      exitCode: 2,
    });
  }

  // 创建一个静默丢弃输出的 Writable stream，实现密码不回显
  const muted = new Writable({
    write(_chunk, _encoding, callback) {
      callback();
    },
  });
  const readline = createInterface({ input, output: muted, terminal: true });
  context.stderr.write(
    context.language === 'zh-CN'
      ? [
          '欢迎使用同花顺金融数据 CLI',
          '',
          '请前往同花顺金融数据服务官网，登录同花顺账号，创建您的 API Key，复制到当前终端后按 Enter 完成登录。',
          '',
          '官网 API Key 获取地址：https://fuyao.aicubes.cn/admin',
          '',
          '下方为隐藏输入模式，粘贴或输入时不会显示在终端中；输入完成后按 Enter。',
          '',
          '在此处填写您的 API Key：',
        ].join('\n')
      : [
          'Welcome to HiThink Finance CLI',
          '',
          'Visit the HiThink Finance Data Service website, sign in with your HiThink account, create an API key, paste it into this terminal, then press Enter to finish login.',
          '',
          'API key page: https://fuyao.aicubes.cn/admin',
          '',
          'The prompt below uses hidden input mode. Typed or pasted characters will not be shown; press Enter when done.',
          '',
          'Paste your API key here:',
        ].join('\n'),
  );
  try {
    return await readline.question('', { signal: context.signal });
  } catch (error) {
    if (context.signal.aborted) throw cancelledError();
    throw error;
  } finally {
    readline.close();
    context.stderr.write('\n');
  }
}

/**
 * 注册认证相关命令
 *
 * 创建 `auth` 命令组及其三个子命令：
 *
 * ### auth login
 * 存储 API Key 到系统凭据管理器。
 * - 输入来源优先级：`--api-key` > `--api-key-stdin` > 交互式隐藏输入
 * - `--api-key` 的统一弃用警告由根命令 preAction 输出
 * - `--no-input` 时若未提供 API Key 则报错
 * - 支持通过 `--profile` 指定凭据配置名称（默认 'default'）
 *
 * ### auth status
 * 检查指定 profile 的 API Key 是否已配置。
 *
 * ### auth logout
 * 删除指定 profile 的 API Key。
 * - `--all` 选项删除所有 hithink-finance 相关的凭据
 *
 * @param program - Commander 根程序实例
 * @param context - CLI 上下文
 * @param metadata - 包元数据（版本号等）
 * @param provider - API Key 认证提供者（封装凭据管理器操作）
 */
export function registerAuthCommands(
  program: Command,
  context: CliContext,
  metadata: PackageMetadata,
  provider: ApiKeyAuthProvider,
): void {
  const auth = program
    .command('auth')
    .description(localizeText(context.language, 'Manage API key authentication'));
  const login = auth
    .command('login')
    .description(localizeText(context.language, 'Store an API key in the system credential store'))
    .option(
      '--replace',
      localizeText(context.language, 'replace the existing API key for this profile'),
    );

  login.action(async () => {
    const options = login.optsWithGlobals<AuthOptions>();
    // 检查冲突：--api-key 和 --api-key-stdin 不能同时使用
    if (options.apiKey !== undefined && options.apiKeyStdin === true) {
      throw new CliError({
        code: 'CLI_CONFLICTING_ARGUMENTS',
        category: 'validation',
        message: '--api-key and --api-key-stdin cannot be used together.',
        hint: 'Choose exactly one API key input method.',
        retryable: false,
        exitCode: 2,
      });
    }

    if (options.apiKey === undefined && options.apiKeyStdin !== true && options.input === false) {
      throw new CliError({
        code: 'CLI_MISSING_ARGUMENT',
        category: 'validation',
        message: 'An API key is required when --no-input is set.',
        hint: apiKeyHint,
        retryable: false,
        exitCode: 2,
      });
    }

    const profile = options.profile ?? 'default';
    const existing = await provider.status(profile);
    if (existing.configured && options.replace !== true) {
      await renderResult(
        successEnvelope(
          'auth.login',
          {
            ...existing,
            alreadyLoggedIn: true,
            nextStep: translate(context.language, 'authLoginAlreadyConfigured'),
          },
          { requestId: context.requestId },
        ),
        context,
      );
      return;
    }

    // API Key 输入来源优先级判断
    let apiKey: string;
    if (options.apiKey !== undefined) {
      // 方式一：兼容旧调用；根命令已输出一次统一弃用警告
      apiKey = options.apiKey;
    } else if (options.apiKeyStdin === true) {
      // 方式二：从标准输入读取（推荐，如 echo $KEY | hithink-finance auth login --api-key-stdin）
      apiKey = await readStdin(process.stdin, {
        stripFinalNewlines: true,
        signal: context.signal,
        maxBytes: 16 * 1024,
      });
    } else {
      // 方式四：交互式隐藏输入（密码风格）
      apiKey = await readHiddenApiKey(context);
    }

    const status = await provider.login({ profile, apiKey });
    await renderResult(
      successEnvelope(
        'auth.login',
        { ...status, replaced: existing.configured },
        { requestId: context.requestId },
      ),
      context,
    );
  });

  const status = auth
    .command('status')
    .description(localizeText(context.language, 'Show whether an API key is configured'));
  status.action(async () => {
    const options = status.optsWithGlobals<AuthOptions>();
    const result = await provider.status(options.profile ?? 'default');
    await renderResult(
      successEnvelope('auth.status', result, { requestId: context.requestId }),
      context,
    );
  });

  const logout = auth
    .command('logout')
    .description(localizeText(context.language, 'Delete API key credentials'))
    .option('--all', localizeText(context.language, 'delete every hithink-finance profile'));
  logout.action(async () => {
    const options = logout.optsWithGlobals<AuthOptions>();
    // 支持 --all 批量删除所有 profile 的凭据
    if (options.all === true) await provider.logoutAll();
    else await provider.logout(options.profile ?? 'default');
    await renderResult(
      successEnvelope(
        'auth.logout',
        { removed: true, all: options.all === true, cliVersion: metadata.version },
        { requestId: context.requestId },
      ),
      context,
    );
  });
}
