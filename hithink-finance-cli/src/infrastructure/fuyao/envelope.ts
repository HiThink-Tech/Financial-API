/**
 * Fuyao API 响应信封格式定义模块
 *
 * 定义 Fuyao API 的标准响应信封（Envelope）结构。
 * 所有 Fuyao API 调用返回的 HTTP 响应体都被包装在一个统一信封中：
 *
 * {
 *   code: number;       // 业务状态码：0=成功, 1xxx=参数错误, 2xxx=认证错误, 4xxx/5xxx=服务器错误
 *   message: string;    // 状态描述信息（中文）
 *   request_id?: string; // 可选请求追踪 ID（用于问题排查）
 *   data: unknown;      // 业务数据载荷（结构取决于具体接口）
 * }
 *
 * 使用 Zod schema 进行运行时格式校验，确保上游 API 返回的数据结构符合预期。
 *
 * @module fuyao/envelope
 */

import { z } from 'zod';

/**
 * Fuyao API 标准响应信封的 Zod 校验模式
 *
 * - code：整数类型的业务状态码
 * - message：字符串类型的描述信息
 * - request_id：可选的请求追踪 ID
 * - data：未知类型的业务数据（由具体接口 schema 进一步校验）
 */
export const fuyaoEnvelopeSchema = z.object({
  code: z.number().int(),
  message: z.string(),
  request_id: z.string().optional(),
  data: z.unknown(),
});

/**
 * Fuyao 响应信封类型（从 Zod schema 自动推导）
 *
 * @see {@link fuyaoEnvelopeSchema}
 */
export type FuyaoEnvelope = z.infer<typeof fuyaoEnvelopeSchema>;
