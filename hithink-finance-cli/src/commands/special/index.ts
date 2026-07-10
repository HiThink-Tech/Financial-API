/**
 * 特色数据命令组注册模块
 *
 * 薄包装层：从 {@link remoteCapabilities} 中过滤出
 * `command[0] === 'special'` 的能力（如龙虎榜、涨停板、人气榜等特色数据），
 * 通过 {@link registerRemoteCapabilityGroup} 将它们注册为 `special` 命令组的子命令。
 *
 * 所有特色数据查询由远程 Fuyao API 提供。
 */

import type { Command } from 'commander';
import type { CliContext } from '../../cli/context.js';
import { remoteCapabilities } from '../../contracts/remote-capabilities.js';
import { registerRemoteCapabilityGroup, type RemoteCommandDependencies } from '../remote.js';

/**
 * 注册 special 命令组的所有远程命令
 *
 * 过滤 command[0] === 'special' 的能力并委托注册。
 *
 * @param program - Commander 根程序实例
 * @param context - CLI 上下文
 * @param dependencies - 远程命令所需依赖项
 */
export function registerSpecialCommands(
  program: Command,
  context: CliContext,
  dependencies: RemoteCommandDependencies,
): void {
  registerRemoteCapabilityGroup(
    program,
    'special',
    remoteCapabilities.filter((item) => item.command[0] === 'special'),
    context,
    dependencies,
  );
}
