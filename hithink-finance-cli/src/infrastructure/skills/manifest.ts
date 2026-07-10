/**
 * 技能包清单管理模块
 *
 * 管理技能包的清单（Manifest）文件，用于追踪和管理已安装技能的文件列表和版本。
 * 清单是一个 JSON 文件，记录每个技能文件相对于技能根目录的路径及其 SHA-256 哈希值。
 *
 * 核心功能：
 * 1. 构建清单 — 扫描技能目录，为每个文件计算 SHA-256 哈希，生成清单
 * 2. 协调同步 — 比较新版和当前版清单，执行增量更新（复制/备份/删除）
 * 3. 卸载清理 — 根据清单删除所有已托管技能文件
 *
 * 协调同步策略（reconcileManagedSkills）：
 * ```
 * 对于新清单中的每个文件：
 *   ├─ 复制源文件到目标位置
 *   ├─ 目标文件已存在？
 *   │   ├─ 存在旧版本清单？
 *   │   │   ├─ 目标文件哈希 ≠ 旧清单中的哈希？
 *   │   │   │   └─ 目标文件哈希 ≠ 新清单中的哈希？
 *   │   │   │       └─ 用户手动修改了文件！→ 创建备份
 *   │   │   └─ 目标文件哈希 = 旧清单中的哈希 → 无用户修改，直接覆盖
 *   │   │   └─ 无旧清单 → 直接覆盖
 *   │   └─ 目标文件不存在 → 全新创建
 * 对于旧清单中存在但新清单中不存在的文件：
 *   └─ 删除目标文件（该文件已从新版技能中移除）
 * ```
 *
 * @module skills/manifest
 */

import { createHash } from 'node:crypto';
import { copyFile, mkdir, readdir, readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';

/**
 * 被管理的技能清单
 *
 * 协议版本 '1' 的清单格式：
 * - protocolVersion：固定为 '1'（当前协议版本）
 * - cliVersion：创建清单的 CLI 版本
 * - files：文件相对路径 → SHA-256 哈希值的映射
 */
export interface ManagedSkillManifest {
  /** 清单协议版本，当前为 '1' */
  protocolVersion: '1';
  /** 生成清单的 CLI 版本号 */
  cliVersion: string;
  /** 文件相对路径 → SHA-256 哈希 的映射表 */
  files: Record<string, string>;
}

/**
 * 递归列出目录下所有文件的相对路径
 *
 * 遍历所有子目录，收集所有文件的路径（相对于根目录，使用正斜杠分隔），
 * 并按字母序排序以保证确定性。
 *
 * @param root - 技能根目录（用于计算相对路径）
 * @param current - 当前遍历的目录（递归用）
 * @returns 排序后的相对文件路径数组
 */
async function files(root: string, current = root): Promise<string[]> {
  const output: string[] = [];
  // 遍历当前目录下的所有条目
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory())
      // 递归进入子目录
      output.push(...(await files(root, absolute)));
    else if (entry.isFile())
      // 计算相对于 root 的路径，统一使用正斜杠
      output.push(path.relative(root, absolute).replaceAll(path.sep, '/'));
  }
  // 排序保证确定性输出
  return output.sort();
}

/**
 * 计算文件的 SHA-256 哈希值
 *
 * @param file - 文件绝对路径
 * @returns 64 位十六进制哈希字符串
 */
async function hash(file: string): Promise<string> {
  return createHash('sha256')
    .update(await readFile(file))
    .digest('hex');
}

/**
 * 扫描技能目录并构建清单
 *
 * 遍历指定目录下的所有文件，为每个文件计算 SHA-256 哈希，
 * 生成包含所有文件路径和哈希值的 {@link ManagedSkillManifest}。
 *
 * @param root - 技能源根目录的绝对路径
 * @param cliVersion - 当前 CLI 版本号
 * @returns 完整的技能清单
 */
export async function buildSkillManifest(
  root: string,
  cliVersion: string,
): Promise<ManagedSkillManifest> {
  const entries: Record<string, string> = {};
  // 遍历所有文件并计算哈希
  for (const relative of await files(root))
    entries[relative] = await hash(path.join(root, ...relative.split('/')));
  return { protocolVersion: '1', cliVersion, files: entries };
}

/**
 * 检查文件是否存在
 *
 * @param file - 文件路径
 * @returns 文件是否存在且为普通文件
 */
async function exists(file: string): Promise<boolean> {
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
}

/**
 * 根据新旧清单将技能文件同步到目标位置
 *
 * 协调策略（负责处理文件冲突和用户修改保护）：
 *
 * 新增/更新的文件：
 * - 如果目标文件已存在且旧清单中有记录：
 *   - 如果目标文件哈希与旧清单中的哈希不同（说明文件被修改过）：
 *     - 如果目标文件哈希也与新清单不同（不是最新版本）：
 *       → 创建备份文件（{path}.backup-{timestamp}），保护用户修改
 *   - 覆盖为目标新版本
 * - 如果目标文件不存在 → 直接复制
 *
 * 删除的文件：
 * - 旧清单中存在但新清单中不存在的文件 → 从目标位置删除
 *
 * @param source - 新版技能文件的源目录
 * @param target - 技能安装目标目录
 * @param next - 新版技能清单（要安装的版本）
 * @param previous - 可选的旧版技能清单（当前已安装的版本）
 * @returns 创建的备份文件路径列表
 */
export async function reconcileManagedSkills(
  source: string,
  target: string,
  next: ManagedSkillManifest,
  previous?: ManagedSkillManifest,
): Promise<{ backups: string[] }> {
  const backups: string[] = [];

  // ===== 处理新增或更新的文件 =====
  for (const [relative, nextHash] of Object.entries(next.files)) {
    // 将相对路径（使用正斜杠）转换为操作系统路径
    const sourceFile = path.join(source, ...relative.split('/'));
    const targetFile = path.join(target, ...relative.split('/'));

    // 确保目标目录存在
    await mkdir(path.dirname(targetFile), { recursive: true });

    if (await exists(targetFile)) {
      // 目标文件已存在：检查是否需要备份（用户修改保护）
      const currentHash = await hash(targetFile);
      const oldHash = previous?.files[relative];

      if (oldHash !== undefined && currentHash !== oldHash && currentHash !== nextHash) {
        // 文件已被用户手动修改（不等于旧版本也不等于新版本）
        // 创建带时间戳的备份，保护用户修改
        const backup = `${targetFile}.backup-${Date.now()}`;
        await copyFile(targetFile, backup);
        backups.push(backup);
      }
      // 注意：如果 currentHash === oldHash，说明文件未被修改，直接覆盖
    }

    // 从源位置复制新版文件到目标位置
    await copyFile(sourceFile, targetFile);
  }

  // ===== 处理已删除的文件（旧清单有但新清单没有） =====
  if (previous !== undefined) {
    for (const relative of Object.keys(previous.files))
      if (!(relative in next.files))
        // 该文件在新版本中已被删除，从目标位置移除
        await rm(path.join(target, ...relative.split('/')), { force: true });
  }

  return { backups };
}

/**
 * 根据清单删除所有已托管的技能文件
 *
 * 遍历清单中记录的所有文件路径，逐个从目标位置删除。
 * 使用 `force: true` 忽略文件不存在的错误。
 *
 * @param target - 技能安装目标目录
 * @param manifest - 要删除的技能清单
 */
export async function removeManagedSkills(
  target: string,
  manifest: ManagedSkillManifest,
): Promise<void> {
  // 遍历清单中的所有文件并删除
  for (const relative of Object.keys(manifest.files))
    await rm(path.join(target, ...relative.split('/')), { force: true });
}
