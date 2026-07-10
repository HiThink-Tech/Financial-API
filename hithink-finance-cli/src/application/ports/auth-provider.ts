/**
 * 认证端口模块 — 定义认证能力的抽象接口。
 *
 * AuthProvider 是应用层对认证基础设施的依赖抽象。
 * 具体实现（环境变量、keyring、stdin）在 infrastructure 层提供，
 * 通过依赖注入满足此接口。
 */

/** 已解析的认证会话 — 包含实际 API Key */
export interface AuthSession {
  /** 认证方式，当前仅支持 api-key */
  method: 'api-key';
  /** 认证 profile 名称 */
  profile: string;
  /** 解析后的 API Key（已脱敏前可用的原始值） */
  apiKey: string;
  /** API Key 来源：explicit（命令行） / environment（环境变量） / keyring（系统密钥环） */
  source: 'explicit' | 'environment' | 'keyring';
}

/** 登录操作的输入参数 */
export interface LoginInput {
  /** 目标 profile 名称 */
  profile: string;
  /** 用户提供的 API Key */
  apiKey: string;
}

/** 认证状态快照，用于 status 命令展示 */
export interface AuthStatus {
  /** 认证方式 */
  method: 'api-key';
  /** profile 名称 */
  profile: string;
  /** 该 profile 是否已配置 API Key */
  configured: boolean;
}

/**
 * 认证提供者接口 — 所有认证实现必须遵循此协议。
 *
 * 方法职责：
 * - `resolve()`   — 按优先级查找 API Key，构造 AuthSession
 * - `login()`      — 将 API Key 写入 keyring 并返回状态
 * - `logout()`     — 从 keyring 删除指定 profile 的 API Key
 * - `status()`     — 查询指定 profile 的认证配置状态
 */
export interface AuthProvider {
  /** 认证方式标识符 */
  readonly method: string;
  /**
   * 解析 API Key。
   * 查找优先级：explicit 参数 > 环境变量 > keyring
   *
   * @param profile  - 目标 profile
   * @param explicit - 用户显式传入的 API Key（可选）
   */
  resolve(profile: string, explicit?: string): Promise<AuthSession>;
  /** 登录 — 将 API Key 持久化到系统密钥环 */
  login(input: LoginInput): Promise<AuthStatus>;
  /** 登出 — 从密钥环中删除指定 profile */
  logout(profile: string): Promise<void>;
  /** 查询认证状态 */
  status(profile: string): Promise<AuthStatus>;
}
