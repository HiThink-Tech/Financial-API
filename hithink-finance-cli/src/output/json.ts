/**
 * JSON / NDJSON 输出渲染模块。
 *
 * ## 职责
 * - 将内部 camelCase 的 JS 对象键转换为 snake_case（适配外部约定）
 * - 递归处理嵌套对象和数组
 * - 序列化为 JSON 并添加换行符
 */

/**
 * 将 camelCase 字符串转换为 snake_case。
 *
 * 例如：thscode → thscode，periodEnd → period_end，dateMs → date_ms
 */
function snakeCase(key: string): string {
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * 递归地将对象的所有键从 camelCase 转换为 snake_case。
 *
 * 处理规则：
 * - 数组 → 递归转换每个元素
 * - 对象 → 转换所有键 + 递归转换每个值
 * - 原始值（string/number/boolean/null）→ 原样返回
 *
 * @param value - 任意 JS 值
 * @returns 键已 snake_case 化的值
 */
export function externalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(externalize);
  }

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [snakeCase(key), externalize(entry)]),
    );
  }

  return value;
}

/**
 * 将值渲染为 JSON 字符串（键 snake_case 化），末尾带换行。
 *
 * @param value - 任意 JS 值
 * @returns JSON 字符串 + '\n'
 */
export function renderJson(value: unknown): string {
  return `${JSON.stringify(externalize(value))}\n`;
}
