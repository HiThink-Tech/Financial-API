/**
 * 命令能力清单模块
 *
 * 注册 `capabilities` 顶级命令，输出所有远程和本地命令能力的机器可读清单。
 * 合并 {@link remoteCapabilities} 和 {@link localCapabilities}，
 * 为每个能力标注 source（remote / local），用于程序化发现可用命令。
 */

import type { Command } from 'commander';
import type { CliContext } from '../../cli/context.js';
import { localizeText } from '../../cli/i18n.js';
import { remoteCapabilities } from '../../contracts/remote-capabilities.js';
import { localCapabilities } from '../../contracts/local-capabilities.js';
import { successEnvelope } from '../../contracts/envelope.js';
import { renderResult } from '../../output/renderer.js';

/**
 * 注册 capabilities 命令
 *
 * 输出所有注册的远程和本地命令能力的结构化清单。
 * 远程能力提取 id / command / endpoint / paging / window 字段，标注 source: 'remote'。
 * 本地能力完整输出，标注 source: 'local'。
 *
 * @param program - Commander 根程序实例
 * @param context - CLI 上下文
 */
export function registerCapabilitiesCommand(program: Command, context: CliContext): void {
  program
    .command('capabilities')
    .description(localizeText(context.language, 'List machine-readable command capabilities'))
    .action(async () => {
      await renderResult(
        successEnvelope(
          'capabilities',
          [
            // 远程能力列表
            ...remoteCapabilities.map(({ id, command, endpoint, paging, window }) => ({
              id,
              command,
              endpoint,
              paging,
              window,
              source: 'remote',
            })),
            // 本地能力列表
            ...localCapabilities.map((item) => ({ ...item, source: 'local' })),
          ],
          { requestId: context.requestId },
        ),
        context,
      );
    });
}
