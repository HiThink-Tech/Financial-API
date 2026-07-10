/**
 * 跨平台路径解析模块
 *
 * 根据操作系统平台和标准规范，计算应用程序的配置、数据、缓存和状态目录。
 * 遵循各平台的文件系统约定：
 *
 * ┌──────────┬──────────────────────────────────────────────────────────────┐
 * │ 平台     │ 路径规则                                                      │
 * ├──────────┼──────────────────────────────────────────────────────────────┤
 * │ Windows  │ %APPDATA%（Roaming）用于配置，%LOCALAPPDATA%（Local）用于数据、│
 * │          │ 缓存和状态。遵循 Microsoft 推荐的 Windows 应用数据布局。       │
 * ├──────────┼──────────────────────────────────────────────────────────────┤
 * │ macOS    │ ~/Library/Application Support 用于配置、数据和状态，         │
 * │          │ ~/Library/Caches 用于缓存。遵循 Apple 沙盒建议。              │
 * ├──────────┼──────────────────────────────────────────────────────────────┤
 * │ Linux    │ XDG Base Directory 规范：                                     │
 * │          │ - XDG_CONFIG_HOME (~/.config)     → 配置                     │
 * │          │ - XDG_DATA_HOME (~/.local/share)  → 数据                     │
 * │          │ - XDG_CACHE_HOME (~/.cache)       → 缓存                     │
 * │          │ - XDG_STATE_HOME (~/.local/state) → 状态                     │
 * └──────────┴──────────────────────────────────────────────────────────────┘
 *
 * 所有路径函数支持依赖注入，方便单元测试中替换平台检测和环境变量。
 *
 * @module filesystem/platform-paths
 */

import os from 'node:os';
import path from 'node:path';

/**
 * 平台路径集合
 *
 * 包含应用程序所需的所有标准化目录和文件路径。
 * 所有路径均为绝对路径，目录可能尚不存在。
 */
export interface PlatformPaths {
  /** 配置目录（存放 config.json 等配置文件） */
  configDir: string;
  /** 数据目录（存放数据库文件等持久数据） */
  dataDir: string;
  /** 缓存目录（可安全删除的临时数据） */
  cacheDir: string;
  /** 状态目录（运行时状态数据） */
  stateDir: string;
  /** 用户配置文件完整路径（configDir/config.json） */
  userConfigFile: string;
  /** 默认数据库文件路径（dataDir/market.duckdb） */
  defaultDbPath: string;
}

/**
 * 平台路径构造输入参数
 *
 * 所有参数均为可选，不传时使用 Node.js 运行时的实际值。
 * 注入不同参数可以实现跨平台路径的单元测试。
 */
export interface PlatformPathInput {
  /** 平台标识（'win32' | 'darwin' | 'linux'等），默认 process.platform */
  platform?: NodeJS.Platform;
  /** 用户主目录路径，默认 os.homedir() */
  homeDir?: string;
  /** 环境变量对象，默认 process.env */
  env?: NodeJS.ProcessEnv;
}

/**
 * 根据平台和参数创建标准化路径集合
 *
 * 路径解析逻辑按平台分支：
 *
 * **Windows (win32)**：
 * - 配置目录 → `%APPDATA%/hithink-finance/`
 *   - %APPDATA% 通常为 `C:\Users\<user>\AppData\Roaming`
 * - 数据目录 → `%LOCALAPPDATA%/hithink-finance/data/`
 * - 缓存目录 → `%LOCALAPPDATA%/hithink-finance/cache/`
 * - 状态目录 → `%LOCALAPPDATA%/hithink-finance/state/`
 *   - %LOCALAPPDATA% 通常为 `C:\Users\<user>\AppData\Local`
 *   - 数据/缓存放在 Local 而非 Roaming 避免域环境下的漫游同步开销
 *
 * **macOS (darwin)**：
 * - 配置目录 → `~/Library/Application Support/hithink-finance/`
 * - 数据目录 → `~/Library/Application Support/hithink-finance/data/`
 * - 缓存目录 → `~/Library/Caches/hithink-finance/`
 * - 状态目录 → `~/Library/Application Support/hithink-finance/state/`
 *   - 缓存放在 Caches 目录，macOS 会在磁盘空间不足时自动清理此目录
 *
 * **Linux 及其他 (默认 XDG 规范)**：
 * - 配置目录 → `$XDG_CONFIG_HOME/hithink-finance/` (默认 ~/.config/hithink-finance/)
 * - 数据目录   → `$XDG_DATA_HOME/hithink-finance/`   (默认 ~/.local/share/hithink-finance/)
 * - 缓存目录   → `$XDG_CACHE_HOME/hithink-finance/`  (默认 ~/.cache/hithink-finance/)
 * - 状态目录   → `$XDG_STATE_HOME/hithink-finance/`  (默认 ~/.local/state/hithink-finance/)
 *   - XDG（X Desktop Group）是 freedesktop.org 制定的 Linux 桌面应用目录规范
 *   - 每个目录都可以通过对应环境变量自定义
 *
 * @param input - 路径构造参数（全部可选）
 * @returns 标准化的平台路径集合
 */
export function createPlatformPaths(input: PlatformPathInput = {}): PlatformPaths {
  // 使用注入值或运行时默认值
  const platform = input.platform ?? process.platform;
  const homeDir = input.homeDir ?? os.homedir();
  const env = input.env ?? process.env;
  // Windows 使用反斜杠路径分隔符，posix 使用正斜杠
  const pathApi = platform === 'win32' ? path.win32 : path.posix;

  let configDir: string;
  let dataDir: string;
  let cacheDir: string;
  let stateDir: string;

  if (platform === 'win32') {
    // ========== Windows 路径解析 ==========
    // APPDATA = Roaming（可在域环境中漫游）, LOCALAPPDATA = Local（仅本地）
    // 配置放在 Roaming 可在多台机器间同步，数据和缓存放在 Local 避免大量同步
    const roaming = env.APPDATA ?? pathApi.join(homeDir, 'AppData', 'Roaming');
    const local = env.LOCALAPPDATA ?? pathApi.join(homeDir, 'AppData', 'Local');
    configDir = pathApi.join(roaming, 'hithink-finance');
    dataDir = pathApi.join(local, 'hithink-finance', 'data');
    cacheDir = pathApi.join(local, 'hithink-finance', 'cache');
    stateDir = pathApi.join(local, 'hithink-finance', 'state');
  } else if (platform === 'darwin') {
    // ========== macOS 路径解析 ==========
    // Application Support 用于应用持久数据，Caches 用于可清理数据
    const applicationSupport = pathApi.join(homeDir, 'Library', 'Application Support');
    configDir = pathApi.join(applicationSupport, 'hithink-finance');
    dataDir = pathApi.join(applicationSupport, 'hithink-finance', 'data');
    // macOS 会在磁盘空间不足时自动清理 ~/Library/Caches 目录内容
    cacheDir = pathApi.join(homeDir, 'Library', 'Caches', 'hithink-finance');
    stateDir = pathApi.join(applicationSupport, 'hithink-finance', 'state');
  } else {
    // ========== Linux / XDG Base Directory 规范 ==========
    // XDG_CONFIG_HOME: 用户配置文件目录，默认 ~/.config
    // XDG_DATA_HOME: 用户数据文件目录，默认 ~/.local/share
    // XDG_CACHE_HOME: 用户缓存目录，默认 ~/.cache
    // XDG_STATE_HOME: 用户状态目录，默认 ~/.local/state
    // 如果环境变量已设置，优先使用环境变量值；否则使用默认值
    configDir = pathApi.join(
      env.XDG_CONFIG_HOME ?? pathApi.join(homeDir, '.config'),
      'hithink-finance',
    );
    dataDir = pathApi.join(
      env.XDG_DATA_HOME ?? pathApi.join(homeDir, '.local', 'share'),
      'hithink-finance',
    );
    cacheDir = pathApi.join(
      env.XDG_CACHE_HOME ?? pathApi.join(homeDir, '.cache'),
      'hithink-finance',
    );
    stateDir = pathApi.join(
      env.XDG_STATE_HOME ?? pathApi.join(homeDir, '.local', 'state'),
      'hithink-finance',
    );
  }

  return {
    configDir,
    dataDir,
    cacheDir,
    stateDir,
    // 配置文件固定为 configDir 下的 config.json
    userConfigFile: pathApi.join(configDir, 'config.json'),
    // 数据库文件固定为 dataDir 下的 market.duckdb
    defaultDbPath: pathApi.join(dataDir, 'market.duckdb'),
  };
}
