/**
 * 技能版本漂移检测模块
 *
 * 检测已安装的技能文件是否与规范版本（canonical）存在差异（即"漂移"）。
 * 漂移可能由以下原因引起：
 * - 用户手动修改了技能文件
 * - 文件损坏或部分写入
 * - 更新不完整
 *
 * 检测原理：
 * 1. 为已安装的技能目录重新构建清单（计算每个文件的当前 SHA-256 哈希）
 * 2. 将当前哈希与规范清单中的哈希逐文件比对
 * 3. 收集所有哈希不匹配的文件路径
 *
 * @module skills/drift
 */

import { buildSkillManifest, type ManagedSkillManifest } from './manifest.js';

/**
 * 检测技能文件的版本漂移
 *
 * 通过比较已安装技能的当前文件哈希与规范版本的文件哈希，
 * 识别出哪些文件发生了变更（漂移）。
 *
 * @param targetRoot - 已安装技能的目标根目录
 * @param canonical - 规范版本的技能清单（包含正确的文件哈希）
 * @returns 发生漂移的文件路径列表（相对于技能根目录），无漂移时为空数组
 */
export async function detectSkillDrift(
  targetRoot: string,
  canonical: ManagedSkillManifest,
): Promise<string[]> {
  // 重新构建已安装技能的当前清单
  const installed = await buildSkillManifest(targetRoot, canonical.cliVersion);
  // 逐文件比对哈希：过滤出哈希不一致的文件
  return Object.entries(canonical.files)
    .filter(([file, hash]) => installed.files[file] !== hash)
    .map(([file]) => file);
}
