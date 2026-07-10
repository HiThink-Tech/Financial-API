/**
 * 更新缓存状态管理模块
 *
 * 管理 CLI 版本更新检查的缓存状态和决策逻辑。
 * 避免频繁检查更新造成的性能开销和 API 请求压力。
 *
 * 缓存状态管理策略：
 * - 成功检查后 24 小时内不重复检查（状态：fresh）
 * - 失败检查后 6 小时内不重试（状态：cooldown）
 * - 正在刷新时 5 分钟内不发起新请求（状态：refreshing）
 * - 无缓存或缓存过期时触发新的检查（状态：refresh）
 *
 * 时间窗口设计原理：
 * - 24 小时新鲜期：对于稳定版 CLI，版本发布频率较低，24 小时检查一次已足够
 * - 6 小时冷却期：避免在 API 临时故障时造成请求雪崩
 * - 5 分钟刷新保护：防止并发进程同时启动多个更新检查
 *
 * @module updater/cache
 */

/**
 * 更新缓存状态
 *
 * 持久化在缓存文件中，记录最后一次更新检查的元数据。
 */
export interface UpdateCacheState {
  /** 最后一次检查的时间戳（毫秒） */
  checkedAt: number;
  /** 最后一次检查的结果：success（成功）/ failure（失败） */
  status: 'success' | 'failure';
  /** 后台刷新任务的启动时间戳（用于防止并发刷新） */
  refreshStartedAt?: number;
  /** 最近一次提示用户更新的时间戳 */
  promptedAt?: number;
  /** 最近一次提示时的已安装版本 */
  promptedCurrentVersion?: string;
  /** 最近一次提示时的最新版本 */
  promptedLatestVersion?: string;
  /** 最新版本号（检查成功时记录） */
  latestVersion?: string;
}

/**
 * 更新缓存决策结果
 *
 * - `disabled`：更新检查已禁用
 * - `fresh`：缓存仍然有效，无需重新检查
 * - `cooldown`：处于冷却期，暂时不检查（上一次检查失败）
 * - `refreshing`：后台正在刷新中，等待完成
 * - `refresh`：需要发起新的检查
 */
export type UpdateCacheDecision = 'disabled' | 'fresh' | 'cooldown' | 'refreshing' | 'refresh';
export type UpdatePromptDecision = 'none' | 'prompt';

const PROMPT_TTL_MS = 24 * 3_600_000;

/**
 * 根据缓存状态计算是否需要发起新的更新检查
 *
 * 决策优先级（从高到低）：
 * 1. 更新已禁用 → `disabled`
 * 2. 后台正在刷新中（开始时间在5分钟内）→ `refreshing`
 * 3. 无缓存记录 → `refresh`
 * 4. 上次成功且在 24 小时内 → `fresh`
 * 5. 上次失败且在 6 小时内 → `cooldown`
 * 6. 缓存过期 → `refresh`
 *
 * @param state - 当前的缓存状态（undefined 表示无缓存）
 * @param now - 当前时间戳（毫秒）
 * @param disabled - 是否禁用更新检查
 * @returns 更新检查决策
 */
export function updateCacheDecision(
  state: UpdateCacheState | undefined,
  now: number,
  disabled = false,
): UpdateCacheDecision {
  // 优先级 1：更新检查已禁用
  if (disabled) return 'disabled';

  // 优先级 2：后台刷新进行中（5 分钟内启动的刷新任务）
  if (state?.refreshStartedAt !== undefined && now - state.refreshStartedAt < 5 * 60_000)
    return 'refreshing';

  // 优先级 3：无缓存 → 需要检查
  if (state === undefined) return 'refresh';

  const age = now - state.checkedAt;

  // 优先级 4：成功且新鲜（24 小时 = 24 × 3600 × 1000 毫秒）
  if (state.status === 'success' && age < 24 * 3_600_000) return 'fresh';

  // 优先级 5：失败且有冷却（6 小时冷却期）
  if (state.status === 'failure' && age < 6 * 3_600_000) return 'cooldown';

  // 优先级 6：缓存过期 → 需要刷新
  return 'refresh';
}

interface ParsedSemver {
  major: number;
  minor: number;
  patch: number;
  prerelease: string[];
}

function parseSemver(value: string): ParsedSemver | undefined {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/u.exec(value);
  if (match === null) return undefined;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4]?.split('.') ?? [],
  };
}

function comparePrerelease(left: string[], right: string[]): number {
  if (left.length === 0 && right.length === 0) return 0;
  if (left.length === 0) return 1;
  if (right.length === 0) return -1;

  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const leftPart = left[index];
    const rightPart = right[index];
    if (leftPart === undefined) return -1;
    if (rightPart === undefined) return 1;
    if (leftPart === rightPart) continue;

    const leftNumeric = /^\d+$/u.test(leftPart);
    const rightNumeric = /^\d+$/u.test(rightPart);
    if (leftNumeric && rightNumeric) return Number(leftPart) - Number(rightPart);
    if (leftNumeric) return -1;
    if (rightNumeric) return 1;
    return leftPart.localeCompare(rightPart);
  }
  return 0;
}

export function compareSemver(leftVersion: string, rightVersion: string): number {
  const left = parseSemver(leftVersion);
  const right = parseSemver(rightVersion);
  if (left === undefined || right === undefined) return 0;

  const core = left.major - right.major || left.minor - right.minor || left.patch - right.patch;
  return core === 0 ? comparePrerelease(left.prerelease, right.prerelease) : core;
}

export function updatePromptDecision(
  state: UpdateCacheState | undefined,
  currentVersion: string,
  now: number,
  disabled = false,
): UpdatePromptDecision {
  if (disabled || state?.status !== 'success' || state.latestVersion === undefined) return 'none';
  if (compareSemver(state.latestVersion, currentVersion) <= 0) return 'none';
  if (
    state.promptedAt !== undefined &&
    state.promptedCurrentVersion === currentVersion &&
    state.promptedLatestVersion === state.latestVersion &&
    now - state.promptedAt < PROMPT_TTL_MS
  )
    return 'none';
  return 'prompt';
}
