/**
 * 渲染协调模块 — 根据输出上下文选择渲染策略。
 *
 * ## 自动格式选择逻辑（resolvedFormat）：
 * ```
 * context.format === 'auto' ?
 *   └─ stdout.isTTY === true  →  'table'   (交互式终端，显示表格)
 *   └─ stdout.isTTY === false →  'json'    (管道/重定向，输出 JSON)
 * ```
 *
 * 设计意图：
 * - TTY 终端（人类直接查看）→ 表格格式更易读
 * - 管道/重定向（程序消费）→ JSON 格式便于下游处理
 * - 用户可通过 --format 显式覆盖自动选择
 *
 * ## 错误渲染
 * 非 JSON 格式的错误输出：
 * - 格式：`hithink-finance v{version} — Error ({code}): {message}\n{hint}\n`
 * - 输出到 stderr
 */
import type { CliContext, OutputFormat } from '../cli/context.js';
import type { Envelope } from '../contracts/envelope.js';
import { externalize, renderJson } from './json.js';
import { renderTable } from './table.js';

/**
 * 根据 context 解析实际输出格式。
 *
 * auto 模式下根据 stdout 是否为 TTY 选择 table 或 json。
 *
 * @param context - CLI 运行时上下文
 * @returns 确定的输出格式（非 'auto'）
 */
function resolvedFormat(context: CliContext): Exclude<OutputFormat, 'auto'> {
  if (context.format !== 'auto') {
    return context.format;
  }
  // 自动检测：交互式终端 → 表格，管道 → JSON
  return context.stdout.isTTY === true ? 'table' : 'json';
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text =
    typeof value === 'object' ? JSON.stringify(externalize(value)) : String(externalize(value));
  return /[",\n\r]/u.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function renderCsv(value: unknown): string {
  const external = externalize(value);
  const rows = Array.isArray(external) ? external : [external];
  if (rows.length === 0) return '\n';
  if (rows.every((row) => row !== null && typeof row === 'object' && !Array.isArray(row))) {
    const headers = [
      ...new Set(rows.flatMap((row) => Object.keys(row as Record<string, unknown>))),
    ];
    return `${headers.join(',')}\n${rows
      .map((row) =>
        headers.map((header) => csvEscape((row as Record<string, unknown>)[header])).join(','),
      )
      .join('\n')}\n`;
  }
  return `value\n${rows.map(csvEscape).join('\n')}\n`;
}

/**
 * 将 Envelope 渲染到正确的输出流。
 *
 * 路由规则：
 * - result.ok → stdout
 * - !result.ok → stderr
 *
 * 格式规则：
 * - json/ndjson → renderJson（snake_case 化 + JSON 序列化）
 * - table 且 ok → renderTable（表格或 JSON fallback）
 * - table 且 error → 格式化错误消息（hithink-finance v{ver} — Error ...）
 *
 * @param result  - 结果信封（ok: data 或 error: 错误信息）
 * @param context - CLI 运行时上下文
 */
export async function renderResult(result: Envelope, context: CliContext): Promise<void> {
  // 成功结果输出到 stdout，错误输出到 stderr
  const stream = result.ok ? context.stdout : context.stderr;
  const format = resolvedFormat(context);

  // JSON / NDJSON 模式：统一序列化
  if (format === 'json' || format === 'ndjson') {
    stream.write(renderJson(result));
    return;
  }

  if (format === 'csv' && result.ok) {
    stream.write(renderCsv(result.data));
    return;
  }

  // 表格模式下的错误输出
  if (!result.ok) {
    stream.write(
      `hithink-finance v${result.meta.cliVersion} — Error (${result.error.code}): ${result.error.message}\n${result.error.hint}\n`,
    );
    return;
  }

  // 表格模式下的成功输出
  stream.write(renderTable(result.data));
}
