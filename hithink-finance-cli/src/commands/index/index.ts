/**
 * 指数数据命令组注册模块
 *
 * 薄包装层：从 {@link remoteCapabilities} 中过滤出
 * `command[0] === 'index'` 的能力（如指数行情、指数成分股、指数估值等），
 * 通过 {@link registerRemoteCapabilityGroup} 将它们注册为 `index` 命令组的子命令。
 *
 * 所有指数数据查询由远程 Fuyao API 提供。
 */

import type { Command } from 'commander';
import type { CliContext } from '../../cli/context.js';
import { remoteCapabilities } from '../../contracts/remote-capabilities.js';
import { registerRemoteCapabilityGroup, type RemoteCommandDependencies } from '../remote.js';

/**
 * 注册 index 命令组的所有远程命令
 *
 * 过滤 command[0] === 'index' 的能力并委托注册。
 *
 * @param program - Commander 根程序实例
 * @param context - CLI 上下文
 * @param dependencies - 远程命令所需依赖项
 */
export function registerIndexCommands(
  program: Command,
  context: CliContext,
  dependencies: RemoteCommandDependencies,
): void {
  registerRemoteCapabilityGroup(
    program,
    'index',
    remoteCapabilities.filter((item) => item.command[0] === 'index'),
    context,
    dependencies,
  );
}
