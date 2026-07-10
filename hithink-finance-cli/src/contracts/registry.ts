/**
 * Command registry contract — defines how commands are described and registered.
 *
 * 命令注册契约模块 — 定义命令如何被描述和注册到 Commander 程序树上。
 *
 * Every command module exports a descriptor that the program builder iterates
 * over to attach sub-commands, enabling a lazy / decoupled registration pattern.
 * 每个命令模块导出一个描述符，程序构建器遍历这些描述符来挂载子命令，
 * 从而实现延迟/解耦的注册模式。
 */

import type { Command } from 'commander';

/**
 * Descriptor that a command module must export so the CLI builder can
 * discover and mount it on the Commander program tree.
 * 命令模块必须导出的描述符，CLI 构建器据此发现并挂载到 Commander 程序树上。
 */
export interface CommandDescriptor {
  /** Unique identifier for this command (e.g. `'symbol.search'`).
   *  命令的唯一标识符（例如 `'symbol.search'`）。 */
  id: string;
  /** Ordered segments that form the sub-command path (e.g. `['symbol', 'search']`).
   *  构成子命令路径的有序分段（例如 `['symbol', 'search']`）。 */
  path: readonly string[];
  /**
   * Returns a human-readable description of the command in the requested language.
   * 返回命令在请求语言下的人类可读描述。
   *
   * @param language - The user's preferred language (`'zh-CN'` or `'en'`).
   *                   用户的首选语言（`'zh-CN'` 或 `'en'`）。
   * @returns Localized command description.
   *          本地化的命令描述文本。
   */
  describe: (language: 'zh-CN' | 'en') => string;
  /**
   * Mutates the given Commander `Command` instance by adding this
   * command as a sub-command.
   * 通过将当前命令作为子命令添加到给定的 Commander `Command` 实例上来修改它。
   *
   * @param program - The parent Commander `Command` node.
   *                  Commander 父级 `Command` 节点。
   */
  register: (program: Command) => void;
}

/**
 * Joins the path segments of a command descriptor into a dot-separated string.
 * 将命令描述符的路径分段拼接为以点分隔的字符串。
 *
 * Example: `['symbol', 'search']` → `'symbol.search'`
 *
 * @param descriptor - Any object that carries a `path` property.
 *                     任意携带 `path` 属性的对象。
 * @returns Dot-separated command path (e.g. `'symbol.search'`).
 *          以点分隔的命令路径（例如 `'symbol.search'`）。
 */
export function commandPath(descriptor: Pick<CommandDescriptor, 'path'>): string {
  return descriptor.path.join('.');
}
