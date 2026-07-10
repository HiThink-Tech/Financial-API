/**
 * 配置命令模块
 *
 * 提供 `config show` 子命令，用于查看当前解析后的非敏感配置。
 * 配置来源于环境变量、配置文件、CLI 全局选项等多层合并，
 * 此模块仅暴露可安全公开的配置字段（不包含 API Key 等机密信息）。
 *
 * {@link publicConfig} 函数负责将内部 {@link ResolvedConfig} 过滤为
 * {@link PublicConfig} 对外暴露。
 */

import type { ResolvedConfig } from '../../application/config.js';
import type { Command } from 'commander';
import type { CliContext } from '../../cli/context.js';
import { localizeText } from '../../cli/i18n.js';
import { successEnvelope } from '../../contracts/envelope.js';
import { renderResult } from '../../output/renderer.js';

/**
 * 对外公开的安全配置结构
 *
 * 只包含可安全展示的非敏感字段，不包括 API Key 等机密信息。
 */
export interface PublicConfig {
  /** 本地 DuckDB 数据库文件路径 */
  dbPath: string;
  /** 当前使用的凭据 profile 名称 */
  profile: string;
  /** 输出格式（json / table） */
  format: ResolvedConfig['format'];
  /** 界面语言偏好（如 'zh' / 'en'），可能未设置 */
  language?: ResolvedConfig['language'];
  /** 是否启用更新检查 */
  updateCheck: boolean;
}

/**
 * 将内部 ResolvedConfig 转换为对外公开的 PublicConfig
 *
 * 过滤掉敏感字段（如 API Key），仅保留可安全展示的配置项。
 *
 * @param config - 完整解析后的内部配置对象
 * @returns 过滤后的公开配置对象
 */
export function publicConfig(config: ResolvedConfig): PublicConfig {
  const result: PublicConfig = {
    dbPath: config.dbPath,
    profile: config.profile,
    format: config.format,
    updateCheck: config.updateCheck,
  };
  // language 为可选字段，仅在已设置时包含
  if (config.language !== undefined) result.language = config.language;
  return result;
}

/**
 * 注册配置相关命令
 *
 * 创建 `config` 命令组，当前包含 `config show` 子命令：
 * - 调用 {@link publicConfig} 过滤敏感信息
 * - 以指定格式（json / table）渲染结果
 *
 * @param program - Commander 根程序实例
 * @param context - CLI 上下文
 * @param config - 完整解析后的配置对象
 */
export function registerConfigCommands(
  program: Command,
  context: CliContext,
  config: ResolvedConfig,
): void {
  const command = program
    .command('config')
    .description(localizeText(context.language, 'Inspect resolved non-secret configuration'));
  command
    .command('show')
    .description(localizeText(context.language, 'Show resolved non-secret configuration'))
    .action(async () => {
      await renderResult(
        successEnvelope('config.show', publicConfig(config), { requestId: context.requestId }),
        context,
      );
    });
}
