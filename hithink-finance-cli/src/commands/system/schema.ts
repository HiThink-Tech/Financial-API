/**
 * 命令 Schema 查询模块
 *
 * 注册 `schema <command>` 顶级命令，按命令 ID 或完整命令路径查找对应能力的
 * 输入/输出 schema 定义。支持查询远程能力（包含 endpoint / options / paging / window）
 * 和本地能力（包含 id / command / description）。
 */

import type { Command } from 'commander';
import type { CliContext } from '../../cli/context.js';
import { localizeText } from '../../cli/i18n.js';
import {
  remoteCapabilities,
  type RemoteCapabilityDescriptor,
} from '../../contracts/remote-capabilities.js';
import { localCapabilities } from '../../contracts/local-capabilities.js';
import { successEnvelope } from '../../contracts/envelope.js';
import { CliError } from '../../contracts/errors.js';
import { renderResult } from '../../output/renderer.js';

const remoteOutputOption = {
  flags: '--output <path>',
  description: 'write the full JSON response envelope to a file',
  type: 'string' as const,
};

/**
 * 注册 schema 查询命令
 *
 * 接受一个命令 ID（如 'market.history'）或命令路径（如 'market.history'）作为参数，
 * 在远程和本地能力列表中查找匹配项并返回其 schema。
 *
 * @param program - Commander 根程序实例
 * @param context - CLI 上下文
 */
export function registerSchemaCommand(program: Command, context: CliContext): void {
  program
    .command('schema <command>')
    .description(localizeText(context.language, 'Show a command contract'))
    .action(async (id: string) => {
      // 在远程和本地能力中搜索匹配的命令
      const capability = [...remoteCapabilities, ...localCapabilities].find(
        (item) => item.id === id || item.command.join('.') === id,
      );
      if (capability === undefined)
        throw new CliError({
          code: 'CLI_UNKNOWN_COMMAND_SCHEMA',
          category: 'validation',
          message: `No schema exists for ${id}.`,
          hint: 'Run capabilities first.',
          retryable: false,
          exitCode: 2,
        });
      // 根据能力类型返回不同的 schema 结构
      await renderResult(
        successEnvelope(
          'schema',
          isRemote(capability)
            ? {
                id: capability.id,
                command: capability.command,
                options: [...capability.options, remoteOutputOption],
                paging: capability.paging,
                window: capability.window,
              }
            : {
                id: capability.id,
                command: capability.command,
                description: capability.description,
                options: capability.options,
                source: 'local',
              },
          { requestId: context.requestId },
        ),
        context,
      );
    });
}

/**
 * 类型守卫：判断能力描述符是否为远程能力
 *
 * 远程能力包含 `endpoint` 字段，本地能力不包含。
 *
 * @param capability - 远程或本地能力描述符
 * @returns 如果是远程能力返回 true
 */
function isRemote(
  capability: RemoteCapabilityDescriptor | (typeof localCapabilities)[number],
): capability is RemoteCapabilityDescriptor {
  return 'endpoint' in capability;
}
