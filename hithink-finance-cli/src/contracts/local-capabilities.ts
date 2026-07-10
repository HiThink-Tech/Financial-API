/**
 * Local capability descriptors — define commands that work fully offline.
 *
 * 本地能力描述符模块 — 定义完全离线工作的命令。
 *
 * These commands operate against the local DuckDB database without requiring
 * network access or authentication. They are surfaced in the `capabilities`
 * output so AI agents can discover what offline operations are available.
 * 这些命令针对本地 DuckDB 数据库运行，无需网络访问或认证。
 * 它们在 `capabilities` 输出中呈现，使 AI Agent 可以发现可用的离线操作。
 */

/**
 * Descriptor for a single local-only (offline) command.
 * 单个纯本地（离线）命令的描述符。
 */
export interface LocalCapabilityDescriptor {
  /** Unique capability ID (e.g. `'data.sync'`).
   *  唯一的能力 ID（例如 `'data.sync'`）。 */
  id: string;
  /** Commander command segments: `[group, leaf]`.
   *  Commander 命令分段：`[分组, 叶子命令]`。 */
  command: readonly [string, string];
  /** Human-readable description of the capability.
   *  该能力的人类可读描述。 */
  description: string;
  /** Command-line option contract for machine users. */
  options?: readonly LocalCapabilityOption[];
}

export interface LocalCapabilityOption {
  flags: string;
  required?: boolean;
  description?: string;
}

/**
 * Registry of all local-only (offline) capabilities.
 * 所有纯本地（离线）能力的注册表。
 *
 * Each entry represents a command that can execute without network access,
 * either by reading from the local DuckDB database or by performing local
 * file-system operations.
 * 每个条目代表一个无需网络即可执行的命令，通过读取本地 DuckDB 数据库
 * 或执行本地文件系统操作来完成。
 *
 * The array is frozen at module load time — it never changes at runtime.
 * 该数组在模块加载时冻结 — 运行时不会变化。
 */
export const localCapabilities: readonly LocalCapabilityDescriptor[] = [
  // ---- data 数据管理命令 ----
  descriptor('data.init', 'data', 'init'),
  descriptor('data.sync', 'data', 'sync'),
  descriptor('data.status', 'data', 'status'),
  descriptor('data.validate', 'data', 'validate'),
  descriptor('data.repair', 'data', 'repair'),
  descriptor('data.migrate', 'data', 'migrate'),
  descriptor('data.clean', 'data', 'clean'),
  descriptor('data.remove', 'data', 'remove'),
  // ---- db 数据库查询命令 ----
  descriptor('db.describe', 'db', 'describe'),
  descriptor('db.query', 'db', 'query', [{ flags: '--sql <sql>', required: true }]),
  descriptor('db.export', 'db', 'export', [
    { flags: '--sql <sql>', required: true },
    { flags: '--output <path>', required: true },
    { flags: '--file-format <format>', required: false },
  ]),
  // ---- market 本地市场数据命令 ----
  descriptor('market.panel', 'market', 'panel', [
    { flags: '--start <date>', required: true },
    { flags: '--end <date>', required: true },
    { flags: '--output <path>', required: true },
    { flags: '--file-format <format>', required: false },
  ]),
  descriptor('market.adjustment-factors', 'market', 'adjustment-factors', [
    { flags: '--thscode <code>', required: true },
    { flags: '--start <date>', required: false },
    { flags: '--end <date>', required: false },
  ]),
];

function descriptor(
  id: string,
  group: string,
  leaf: string,
  options?: readonly LocalCapabilityOption[],
): LocalCapabilityDescriptor {
  return {
    id,
    command: [group, leaf],
    description: `Local capability ${id}`,
    ...(options === undefined ? {} : { options }),
  };
}
