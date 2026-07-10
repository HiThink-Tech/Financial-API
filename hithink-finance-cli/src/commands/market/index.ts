/**
 * 行情命令组注册模块
 *
 * 作为薄包装层，从 {@link remoteCapabilities} 中过滤出 `command[0] === 'market'` 的能力，
 * 通过 {@link registerRemoteCapabilityGroup} 将它们注册为 `market` 命令组的子命令。
 *
 * 同时提供 {@link registerLocalMarketCommands} 注册纯本地命令
 * （如 `market panel`、`market adjustment-factors`）。
 */

import type { Command } from 'commander';
import type { CliContext } from '../../cli/context.js';
import { remoteCapabilities } from '../../contracts/remote-capabilities.js';
import { registerRemoteCapabilityGroup, type RemoteCommandDependencies } from '../remote.js';

/**
 * 注册 market 命令组的所有远程命令
 *
 * 从全局 {@link remoteCapabilities} 中筛选 command[0] === 'market' 的能力，
 * 委托给 {@link registerRemoteCapabilityGroup} 完成子命令注册。
 *
 * @param program - Commander 根程序实例
 * @param context - CLI 上下文
 * @param dependencies - 远程命令所需依赖项
 */
export function registerMarketCommands(
  program: Command,
  context: CliContext,
  dependencies: RemoteCommandDependencies,
): void {
  registerRemoteCapabilityGroup(
    program,
    'market',
    remoteCapabilities.filter((item) => item.command[0] === 'market'),
    context,
    dependencies,
  );
}
