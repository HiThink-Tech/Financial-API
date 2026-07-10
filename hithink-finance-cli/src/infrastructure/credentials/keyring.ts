/**
 * Keyring 凭据存储模块
 *
 * 基于操作系统原生凭据存储的跨平台秘密管理实现。
 * 在不同平台上的底层实现：
 * - macOS：Keychain（钥匙串访问）
 * - Windows：Credential Manager（凭据管理器）
 * - Linux：Secret Service API（如 gnome-keyring / kwallet）
 *
 * 通过 @napi-rs/keyring 提供 Rust 原生绑定的高性能凭据操作。
 * CredentialStore 接口定义了凭据 CRUD 操作的标准协议，便于测试时 mock 替换。
 *
 * @module credentials/keyring
 */

import { AsyncEntry, findCredentialsAsync } from '@napi-rs/keyring';

/**
 * 凭据存储接口
 *
 * 定义凭据管理的基本操作协议。所有凭据存储实现（包括 mock）都应实现此接口。
 * 每个操作以 `account` 作为标识符，`secret` 作为要保护的秘密值。
 */
export interface CredentialStore {
  /** 根据账户名获取存储的凭据，不存在时返回 undefined */
  get(account: string): Promise<string | undefined>;
  /** 存储或更新指定账户的凭据 */
  set(account: string, secret: string): Promise<void>;
  /** 删除指定账户的凭据，返回是否成功删除 */
  delete(account: string): Promise<boolean>;
  /** 列出所有已存储的账户名 */
  listAccounts(): Promise<string[]>;
}

/**
 * 基于操作系统原生 Keyring 的凭据存储实现
 *
 * 使用 NAPI-RS 封装的 Rust 原生模块直接调用系统 API：
 * - 所有操作都是异步的，不阻塞事件循环
 * - 凭据数据由操作系统加密存储，安全等级高
 * - 按 service（服务名）对凭据进行命名空间隔离
 */
export class KeyringCredentialStore implements CredentialStore {
  /**
   * @param service - 服务名称标识，默认为 'hithink-finance'，用于在凭据存储中隔离不同应用的数据
   */
  constructor(private readonly service = 'hithink-finance') {}

  /**
   * 从系统凭据存储中获取指定账户的密码
   *
   * @param account - 账户标识名
   * @returns 存储的密码，不存在时返回 undefined
   */
  async get(account: string): Promise<string | undefined> {
    return new AsyncEntry(this.service, account).getPassword();
  }

  /**
   * 向系统凭据存储中保存或更新账户密码
   *
   * @param account - 账户标识名
   * @param secret - 要保存的秘密值
   */
  async set(account: string, secret: string): Promise<void> {
    await new AsyncEntry(this.service, account).setPassword(secret);
  }

  /**
   * 从系统凭据存储中删除指定账户
   *
   * @param account - 账户标识名
   * @returns 是否成功删除
   */
  async delete(account: string): Promise<boolean> {
    return new AsyncEntry(this.service, account).deleteCredential();
  }

  /**
   * 列出指定服务下的所有已存储账户
   *
   * 通过 findCredentialsAsync 查询同一 service 下的所有凭据条目，
   * 然后提取其 account 名称。
   *
   * @returns 已存储的账户名数组
   */
  async listAccounts(): Promise<string[]> {
    const credentials = await findCredentialsAsync(this.service);
    // 从凭据对象数组提取 account 字段
    return credentials.map((credential) => credential.account);
  }
}
