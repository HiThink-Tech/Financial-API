/**
 * 系统诊断命令模块
 *
 * 注册 `doctor` 顶级命令，输出运行时环境的关键诊断信息：
 * - Node.js 版本
 * - 操作系统平台
 * - CPU 架构
 * - API Key 是否已配置（检查 `HITHINK_FINANCE_API_KEY` 环境变量）
 *
 * 用于故障排查和问题报告。
 */

import type { Command } from 'commander';
import type { CliContext } from '../../cli/context.js';
import { localizeText } from '../../cli/i18n.js';
import { successEnvelope } from '../../contracts/envelope.js';
import { renderResult } from '../../output/renderer.js';

/**
 * 注册 doctor 诊断命令
 *
 * 输出 Node.js 运行环境、平台信息和 API Key 配置状态。
 *
 * @param program - Commander 根程序实例
 * @param context - CLI 上下文
 */
export function registerDoctorCommand(program: Command, context: CliContext): void {
  program
    .command('doctor')
    .description(localizeText(context.language, 'Run local environment diagnostics'))
    .action(async () =>
      renderResult(
        successEnvelope(
          'doctor',
          {
            nodeVersion: process.versions.node,
            platform: process.platform,
            arch: process.arch,
            apiKeyPresent: Boolean(process.env.HITHINK_FINANCE_API_KEY),
          },
          { requestId: context.requestId },
        ),
        context,
      ),
    );
}
