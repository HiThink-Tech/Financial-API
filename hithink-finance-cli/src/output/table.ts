/**
 * 表格渲染模块 — 将结果数据格式化为终端可读的表格。
 *
 * 当前实现是一个简化版本：
 * - 基本类型（string/number/boolean）→ 直接转换为字符串
 * - 对象/数组 → JSON.stringify 美化输出（2 空格缩进）
 *
 * 对对象数组会按字段并集生成列，并根据单元格内容计算列宽。
 */

/**
 * 将值渲染为表格字符串。
 *
 * 规则：
 * - 基本类型 → String(value) + '\n'
 * - 复杂类型 → JSON.stringify(value, null, 2) + '\n'
 *
 * @param value - 任意值
 * @returns 格式化的表格字符串
 */
export function renderTable(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return `${String(value)}\n`;
  }

  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return rowsToTable(
      ['key', 'value'],
      Object.entries(value).map(([key, entry]) => [key, cell(entry)]),
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '(empty)\n';
    if (
      value.every((entry) => entry !== null && typeof entry === 'object' && !Array.isArray(entry))
    ) {
      const records = value as Array<Record<string, unknown>>;
      const headers = [...new Set(records.flatMap((record) => Object.keys(record)))];
      return rowsToTable(
        headers,
        records.map((record) => headers.map((header) => cell(record[header]))),
      );
    }
    return rowsToTable(
      ['value'],
      value.map((entry) => [cell(entry)]),
    );
  }

  return `${cell(value)}\n`;
}

function cell(value: unknown): string {
  if (value === null || value === undefined) return '';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

function rowsToTable(headers: string[], rows: string[][]): string {
  const widths = headers.map((header, index) =>
    Math.max(header.length, ...rows.map((row) => row[index]?.length ?? 0)),
  );
  const renderRow = (row: string[]) =>
    `| ${row.map((entry, index) => entry.padEnd(widths[index] ?? 0)).join(' | ')} |`;
  const separator = `| ${widths.map((width) => '-'.repeat(width)).join(' | ')} |`;
  return `${[renderRow(headers), separator, ...rows.map(renderRow)].join('\n')}\n`;
}
