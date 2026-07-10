/**
 * API Key 认证提供者模块
 *
 * 实现基于 API Key 的用户认证流程，包括认证解析、登录、登出和状态查询。
 * API Key 的优先级策略：
 * 1. 显式传入的 key（命令行参数）
 * 2. 环境变量 HITHINK_FINANCE_API_KEY
 * 3. 操作系统凭据存储（Keyring）
 *
 * 该模块实现了 AuthProvider 接口，是认证系统的基础设施层实现。
 *
 * @module credentials/api-key-provider
 */

import type {
  AuthProvider,
  AuthSession,
  AuthStatus,
  LoginInput,
} from '../../application/ports/auth-provider.js';
import { CliError } from '../../contracts/errors.js';
import type { CredentialStore } from './keyring.js';

/** 凭据存储中 profile 键名的前缀 */
const PROFILE_PREFIX = 'profile:';
const API_KEY_RECOVERY_HINT =
  'Get an API key at https://fuyao.aicubes.cn/admin, then run `hithink-finance auth login`. For non-interactive use, pipe it to `hithink-finance auth login --api-key-stdin`, or set HITHINK_FINANCE_API_KEY for the current process.';

/**
 * 为指定的 profile 构造凭据存储中的完整键名
 *
 * @param profile - 用户配置文件名
 * @returns 带前缀的完整存储键名，格式为 "profile:{profile}"
 */
function account(profile: string): string {
  return `${PROFILE_PREFIX}${profile}`;
}

/**
 * 构造凭据存储不可用时的标准错误对象
 *
 * 针对 Linux 和 macOS/Windows 提供不同的修复提示：
 * - Linux 需要启动 Secret Service 守护进程（如 gnome-keyring）
 * - macOS/Windows 需要解锁系统钥匙串/凭据管理器
 *
 * @returns 包含平台特定提示信息的 CliError
 */
function credentialStoreError(): CliError {
  return new CliError({
    code: 'AUTH_CREDENTIAL_STORE_UNAVAILABLE',
    category: 'authentication',
    message: 'The system credential store is unavailable.',
    hint:
      process.platform === 'linux'
        ? `Start a Secret Service provider, or use HITHINK_FINANCE_API_KEY for this process. ${API_KEY_RECOVERY_HINT}`
        : `Unlock the system credential store, or use HITHINK_FINANCE_API_KEY for this process. ${API_KEY_RECOVERY_HINT}`,
    retryable: false,
    exitCode: 3,
  });
}

/**
 * 基于 API Key 的认证提供者实现
 *
 * 支持三种 API Key 来源（按优先级从高到低）：
 * 1. explicit — 通过 `explicit` 参数直接传入
 * 2. environment — 从环境变量 HITHINK_FINANCE_API_KEY 读取
 * 3. keyring — 从操作系统凭据存储中读取
 *
 * 凭据存储通过 {@link CredentialStore} 接口抽象，支持跨平台（Keychain / Credential Manager / Secret Service）。
 */
export class ApiKeyAuthProvider implements AuthProvider {
  readonly method = 'api-key';

  /**
   * @param store - 操作系统凭据存储实现
   * @param env - 环境变量访问对象，默认使用 process.env，便于测试注入
   */
  constructor(
    private readonly store: CredentialStore,
    private readonly env: NodeJS.ProcessEnv = process.env,
  ) {}

  /**
   * 按优先级策略解析并返回认证会话
   *
   * 查找顺序：
   * 1. explicit 参数非空 → 直接使用
   * 2. HITHINK_FINANCE_API_KEY 环境变量存在 → 使用环境变量
   * 3. 查询 Keyring 凭据存储 → 使用已存储的 key
   * 4. 以上均无 → 抛出 AUTH_API_KEY_MISSING 错误
   *
   * @param profile - 用户配置文件名
   * @param explicit - 可选的显式传入 API Key
   * @returns 包含 API Key 及来源信息的认证会话
   * @throws {CliError} 凭据存储不可用或未配置 API Key 时抛出
   */
  async resolve(profile: string, explicit?: string): Promise<AuthSession> {
    // 优先级 1：使用显式传入的 key
    if (explicit !== undefined && explicit.length > 0) {
      return { method: 'api-key', profile, apiKey: explicit, source: 'explicit' };
    }
    // 优先级 2：从环境变量读取
    const environmentKey = this.env.HITHINK_FINANCE_API_KEY;
    if (environmentKey !== undefined && environmentKey.length > 0) {
      return { method: 'api-key', profile, apiKey: environmentKey, source: 'environment' };
    }

    // 优先级 3：从凭据存储读取
    let stored: string | null | undefined;
    try {
      stored = await this.store.get(account(profile));
    } catch {
      throw credentialStoreError();
    }
    if (stored != null && stored.length > 0) {
      return { method: 'api-key', profile, apiKey: stored, source: 'keyring' };
    }

    // 优先级 4：所有来源均无可用 key
    throw new CliError({
      code: 'AUTH_API_KEY_MISSING',
      category: 'authentication',
      message: 'No API key is configured for the selected profile.',
      hint: API_KEY_RECOVERY_HINT,
      retryable: false,
      exitCode: 3,
    });
  }

  /**
   * 登录：将 API Key 保存到操作系统凭据存储中
   *
   * 会先验证 key 非空，然后将 key 安全存储到系统钥匙串中。
   *
   * @param input - 包含 profile 名称和 API Key 的登录输入
   * @returns 认证状态，包含 profile 名称和配置完成标志
   * @throws {CliError} API Key 为空或凭据存储不可用时抛出
   */
  async login(input: LoginInput): Promise<AuthStatus> {
    // 验证 API Key 不为空
    if (input.apiKey.length === 0) {
      throw new CliError({
        code: 'AUTH_API_KEY_EMPTY',
        category: 'validation',
        message: 'The API key cannot be empty.',
        hint: 'Provide the key through hidden input, --api-key-stdin, or --api-key.',
        retryable: false,
        exitCode: 2,
      });
    }
    // 将 key 安全存储到系统凭据存储
    try {
      await this.store.set(account(input.profile), input.apiKey);
    } catch {
      throw credentialStoreError();
    }
    return { method: 'api-key', profile: input.profile, configured: true };
  }

  /**
   * 登出：从凭据存储中删除指定 profile 的 API Key
   *
   * @param profile - 要登出的用户配置文件名
   * @throws {CliError} 凭据存储不可用时抛出
   */
  async logout(profile: string): Promise<void> {
    try {
      await this.store.delete(account(profile));
    } catch {
      throw credentialStoreError();
    }
  }

  /**
   * 批量登出：删除凭据存储中所有以 profile 前缀开头的账户
   *
   * 遍历存储中的所有账户，筛选出 profile 前缀的条目并并行删除。
   *
   * @throws {CliError} 凭据存储不可用时抛出
   */
  async logoutAll(): Promise<void> {
    try {
      const accounts = await this.store.listAccounts();
      // 筛选出所有 profile 前缀的账户，并行删除
      await Promise.all(
        accounts
          .filter((candidate) => candidate.startsWith(PROFILE_PREFIX))
          .map((candidate) => this.store.delete(candidate)),
      );
    } catch {
      throw credentialStoreError();
    }
  }

  /**
   * 查询指定 profile 的认证状态
   *
   * 通过检查凭据存储中是否存在对应 key 来判断是否已配置。
   *
   * @param profile - 用户配置文件名
   * @returns 认证状态，`configured` 为 true 表示已配置 API Key
   * @throws {CliError} 凭据存储不可用时抛出
   */
  async status(profile: string): Promise<AuthStatus> {
    try {
      const key = await this.store.get(account(profile));
      // 检查 key 是否存在且非空
      return { method: 'api-key', profile, configured: key != null && key.length > 0 };
    } catch {
      throw credentialStoreError();
    }
  }
}
