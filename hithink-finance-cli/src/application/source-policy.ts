/**
 * 数据源路由策略模块 — 决定每个请求使用本地数据库还是远程 API。
 *
 * ## 自动路由逻辑（`chooseSource`）：
 *
 * 请求按 RequestKind 分为三类：
 *
 *   **远程独占（remote-only）**：
 *   snapshot, financials, index, special, calendar
 *   → 这些数据总是从远程 API 获取，本地数据库不存储
 *
 *   **本地独占（local-only）**：
 *   panel, factors, db, maintenance
 *   → 这些操作涉及本地数据库管理，不接受远程回退
 *
 *   **历史数据 + 自动回退（history）**：
 *   - 本地数据存在 且 覆盖时间窗口 → 使用本地
 *   - 请求单个 symbol → 使用远程（低延迟）
 *   - 批量 symbol 但本地数据不足 → 报错，要求先初始化/同步数据
 *
 * ## 数据源选择决策矩阵：
 * ```
 * requested \ kind   remote-only   local-only   history
 * ─────────────────────────────────────────────────────
 * remote              直接远程      报错         直接远程
 * local               报错          直接本地      直接本地
 * auto                远程          本地         本地>远程>报错
 * ```
 */
import { CliError } from '../contracts/errors.js';

/** 用户可选择的数据源策略 */
export type DataSource = 'auto' | 'local' | 'remote';

/** 请求类型 — 决定该请求属于远程独占、本地独占还是可自动路由 */
export type RequestKind =
  | 'snapshot'
  | 'financials'
  | 'index'
  | 'special'
  | 'calendar'
  | 'panel'
  | 'factors'
  | 'db'
  | 'maintenance'
  | 'history';

/** 描述一个数据请求的完整上下文 */
export interface SourceRequest {
  /** 请求类型，用于判断远程/本地路由 */
  kind: RequestKind;
  /** 用户显式指定的数据源（auto / local / remote） */
  requested: DataSource;
  /** symbol 数量，用于批量请求的自动路由决策 */
  symbolCount?: number;
}

/** 本地缓存状态快照 */
export interface LocalState {
  /** 本地数据库是否已初始化 */
  exists: boolean;
  /** 本地数据是否覆盖请求的时间窗口 */
  coversWindow: boolean;
}

/**
 * 构造 local-data 类别的 CliError。
 * exitCode = 5，retryable = false。
 */
function sourceError(code: string, message: string): never {
  throw new CliError({
    code,
    category: 'local-data',
    message: `${code}: ${message}`,
    hint: 'Initialize/sync local data or choose a supported --source.',
    retryable: false,
    exitCode: 5,
  });
}

/**
 * 根据请求特性选择最佳数据源。
 *
 * ## 决策流程：
 * 1. 用户显式指定 remote 但请求是 local-only → 报错
 * 2. 用户显式指定 local 但请求是 remote-only → 报错
 * 3. 用户显式指定 → 直接使用
 * 4. auto 模式：
 *    a. remote-only 请求 → 远程
 *    b. local-only 请求 → 本地
 *    c. history 请求：
 *       - 本地数据充足 → 本地
 *       - 单 symbol → 远程（远程查询一个 symbol 成本低）
 *       - 批量 symbol 但本地覆盖不足 → 报错（要求先初始化数据）
 *
 * @param request - 包含请求类型和用户选择的数据源请求
 * @param local   - 本地数据缓存的状态快照
 * @returns 确定的数据源（'local' 或 'remote'）
 */
export function chooseSource(
  request: SourceRequest,
  local: LocalState,
): Exclude<DataSource, 'auto'> {
  // 远程独占请求类型：这些数据始终从远程 API 拉取
  const remoteOnly = ['snapshot', 'financials', 'index', 'special', 'calendar'].includes(
    request.kind,
  );
  // 本地独占请求类型：数据库管理操作，不接受远程回退
  const localOnly = ['panel', 'factors', 'db', 'maintenance'].includes(request.kind);
  // 用户选择 'local' 但请求是 remote-only → 不支持的组合
  if (request.requested === 'local' && remoteOnly)
    return sourceError('SOURCE_NOT_SUPPORTED', `${request.kind} is remote-only.`);
  // 用户选择 'remote' 但请求是 local-only → 不支持的组合
  if (request.requested === 'remote' && localOnly)
    return sourceError('SOURCE_NOT_SUPPORTED', `${request.kind} is local-only.`);
  // 用户显式指定了数据源 → 直接使用，不做自动路由
  if (request.requested !== 'auto') return request.requested;
  // === 以下为 auto 模式的自动路由 ===
  if (remoteOnly) return 'remote';
  if (localOnly) return 'local';
  // history 类型：本地数据存在且覆盖时间窗口 → 优先使用本地
  if (local.exists && local.coversWindow) return 'local';
  // 单个 symbol → 远程查询成本低，直接用远程
  if ((request.symbolCount ?? 1) === 1) return 'remote';
  // 批量 symbol 但本地数据不覆盖 → 报错，要求先初始化数据
  return sourceError('DATA_INITIALIZATION_REQUIRED', 'Bulk history requires covered local data.');
}
