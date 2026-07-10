/**
 * 敏感信息脱敏模块
 *
 * 提供文本和结构化数据中的秘密信息自动脱敏功能。
 * 支持两种脱敏方式：
 * 1. 正则匹配 — 自动识别 key=value / key:value 格式中的敏感赋值
 * 2. 已知秘密替换 — 对预知的秘密字符串进行全量替换
 *
 * 用于日志输出、错误报告等场景，防止 API Key、Token 等敏感信息泄露。
 *
 * @module credentials/redact
 */

/** 对象脱敏时需检查的敏感键名集合（所有键名已标准化为纯小写字母） */
const SECRET_KEYS = new Set(['apikey', 'token', 'authorization', 'cookie', 'secret', 'password']);

/**
 * 识别敏感赋值的正则表达式
 *
 * 匹配模式：敏感键名 + 可选分隔符 + 等号/冒号 + 值部分
 * - 键名匹配：api-key / apikey / token / authorization / cookie / secret / password
 * - 分隔符：匹配 `=` 或 `:`，捕获到 separator 分组
 * - 值部分：匹配到下一个空格、逗号、分号或行末
 * - 使用全局 + 不区分大小写 + Unicode 模式
 */
const SECRET_ASSIGNMENT =
  /\b(api[-_ ]?key|apikey|token|authorization|cookie|secret|password)\s*([=:])\s*([^\s,;]+)/giu;

/**
 * 对字符串文本中的敏感赋值进行脱敏处理
 *
 * 处理流程：
 * 1. 使用正则匹配所有 `key=value` 或 `key:value` 形式的敏感赋值
 * 2. 将值部分替换为 `[REDACTED]`
 * 3. 对已知的秘密字符串进行全量替换（直接字符串替换）
 *
 * @param value - 要处理的原始文本
 * @param knownSecrets - 预知的需要完全替换的秘密字符串列表
 * @returns 脱敏后的文本
 */
export function redactText(value: string, knownSecrets: readonly string[] = []): string {
  // 第一步：正则替换所有敏感赋值（如 apiKey=abc123 → apiKey=[REDACTED]）
  let redacted = value.replace(SECRET_ASSIGNMENT, (_match, key: string, separator: string) => {
    return `${key}${separator}[REDACTED]`;
  });
  // 第二步：替换所有已知的秘密字符串（直接字符串匹配，非正则）
  for (const secret of knownSecrets) {
    if (secret.length > 0) redacted = redacted.replaceAll(secret, '[REDACTED]');
  }
  return redacted;
}

/**
 * 对任意值进行递归脱敏处理
 *
 * 支持的数据类型处理策略：
 * - string：调用 {@link redactText} 进行文本脱敏
 * - Array：对每个元素递归脱敏
 * - object：遍历属性，对敏感键名（如 apikey、token 等）直接替换为 [REDACTED]，
 *   非敏感键则递归脱敏其值
 * - 其他原始类型（number、boolean、null 等）：直接返回原值
 *
 * @param value - 要脱敏的任意值
 * @param knownSecrets - 预知的需要完全替换的秘密字符串列表
 * @returns 脱敏后的值，保持原始类型结构
 */
export function redactValue(value: unknown, knownSecrets: readonly string[] = []): unknown {
  // 字符串：文本脱敏
  if (typeof value === 'string') return redactText(value, knownSecrets);
  // 数组：递归处理每个元素
  if (Array.isArray(value)) return value.map((entry) => redactValue(entry, knownSecrets));
  // 对象：检查键名是否敏感，递归处理值
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => {
        // 将键名标准化（去除非字母字符后转小写），与敏感键名集合比对
        const normalized = key.toLowerCase().replaceAll(/[^a-z]/g, '');
        return [key, SECRET_KEYS.has(normalized) ? '[REDACTED]' : redactValue(entry, knownSecrets)];
      }),
    );
  }
  // 其他原始类型直接返回
  return value;
}
