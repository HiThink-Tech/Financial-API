/**
 * Fuyao 数据转储下载客户端模块
 *
 * 负责从 Fuyao 远程服务下载 Parquet 格式的数据转储文件（Dump）。
 * 支持两种转储类型：
 * - daily-k：完整日K线数据
 * - daily-k-10d：近10天日K线数据
 * - adjustment-factors：除权除息事件数据
 *
 * 下载流程：
 * 1. signDump — 调用 API 获取预签名下载 URL（时效性签名）
 * 2. downloadDump — 通过预签名 URL 下载文件，并进行 SHA-256 完整性校验
 * 3. 使用临时文件下载 + 重命名的方式确保原子性
 *
 * @module duckdb/dump-client
 */

import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import { cancelledError, throwIfCancelled } from '../../contracts/errors.js';

/**
 * 支持的转储数据类型
 */
export type DumpKind = 'daily-k' | 'daily-k-10d' | 'adjustment-factors';

/** 单个转储下载过程中的字节进度事件。 */
export interface DownloadProgressEvent {
  phase: 'started' | 'progress' | 'completed';
  downloadedBytes: number;
  totalBytes?: number;
}

/** 带转储类型的下载进度事件，供调用方区分连续下载的文件。 */
export interface DumpDownloadProgressEvent extends DownloadProgressEvent {
  kind: DumpKind;
}

/**
 * Fuyao 数据转储下载选项
 */
export interface FetchFuyaoDumpOptions {
  /** Fuyao API 基础 URL */
  baseUrl: string;
  /** API 认证密钥 */
  apiKey: string;
  /** 转储数据类型 */
  kind: DumpKind;
  /** 本地缓存目录 */
  cacheDir: string;
  /** 可注入的 fetch 实现（用于测试） */
  fetch?: typeof globalThis.fetch;
  /** 可注入的 sleep 实现（用于重试退避） */
  sleep?: (milliseconds: number) => Promise<void>;
  /** 可选的下载进度回调；未提供时下载行为保持安静。 */
  onProgress?: (event: DumpDownloadProgressEvent) => void;
  /** Optional caller cancellation signal. */
  signal?: AbortSignal;
}

/**
 * 下载完成的数据转储文件描述
 */
export interface FetchedDump {
  /** 本地文件路径 */
  path: string;
  /** Fuyao 发布版本 ID */
  releaseId: string;
  /** 文件 SHA-256 哈希值 */
  sha256: string;
}

/**
 * 从 URL 下载数据转储文件到本地
 *
 * 使用原子下载策略保证文件完整性：
 * 1. 创建临时文件（{target}.{pid}.download）
 * 2. 流式下载到临时文件
 * 3. 计算 SHA-256 并与预期值比对
 * 4. 校验通过后重命名为最终文件名
 * 5. 任何步骤失败自动清理临时文件
 *
 * 使用 `flag: 'wx'`（排他创建）防止并发写入同一临时文件。
 *
 * @param url - 下载地址（预签名 URL）
 * @param targetPath - 目标文件路径
 * @param expectedSha256 - 可选的预期 SHA-256 校验和
 * @param fetchImplementation - fetch 实现（默认为 globalThis.fetch）
 * @returns 文件路径和 SHA-256 哈希值
 * @throws 下载失败或校验和不匹配时抛出 Error
 */
export async function downloadDump(
  url: URL,
  targetPath: string,
  expectedSha256?: string,
  fetchImplementation: typeof globalThis.fetch = globalThis.fetch,
  onProgress?: (event: DownloadProgressEvent) => void,
  signal?: AbortSignal,
): Promise<{ path: string; sha256: string }> {
  const absoluteTarget = path.resolve(targetPath);
  // 临时文件名 = 目标文件 + PID + .download 后缀，避免并发冲突
  const temporary = `${absoluteTarget}.${process.pid}.download`;
  // 确保目标目录存在
  await mkdir(path.dirname(absoluteTarget), { recursive: true });

  const response = await fetchImplementation(url, signal === undefined ? undefined : { signal });
  // HTTP 非 200 或无响应体 = 下载失败
  if (!response.ok || response.body === null)
    throw new Error(`Dump download failed: HTTP ${response.status}`);

  const declaredLength = Number(response.headers.get('content-length'));
  const totalBytes =
    Number.isSafeInteger(declaredLength) && declaredLength >= 0 ? declaredLength : undefined;
  let downloadedBytes = 0;
  const hash = createHash('sha256');
  onProgress?.({
    phase: 'started',
    downloadedBytes,
    ...(totalBytes === undefined ? {} : { totalBytes }),
  });

  const progressStream = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      downloadedBytes += chunk.length;
      hash.update(chunk);
      onProgress?.({
        phase: 'progress',
        downloadedBytes,
        ...(totalBytes === undefined ? {} : { totalBytes }),
      });
      callback(null, chunk);
    },
  });

  try {
    // 流式下载：从 Web Stream 转换为 Node.js 可读流，通过 pipeline 写入文件
    const source = Readable.fromWeb(
      response.body as unknown as import('node:stream/web').ReadableStream<Uint8Array>,
    );
    const target = createWriteStream(temporary, { flags: 'wx' });
    if (signal === undefined) await pipeline(source, progressStream, target);
    else await pipeline(source, progressStream, target, { signal });
    // 哈希在下载管线中按 chunk 增量计算，避免把完整 dump 再次读入内存。
    const sha256 = hash.digest('hex');

    // 校验和比对
    if (expectedSha256 !== undefined && sha256 !== expectedSha256)
      throw new Error('Dump checksum mismatch');

    // 原子重命名：从临时文件到目标文件
    await rename(temporary, absoluteTarget);
    onProgress?.({
      phase: 'completed',
      downloadedBytes,
      ...(totalBytes === undefined ? {} : { totalBytes }),
    });
    return { path: absoluteTarget, sha256 };
  } catch (error) {
    // 清理临时文件（force 忽略文件不存在的错误）
    await rm(temporary, { force: true });
    if (signal?.aborted === true) throw cancelledError();
    throw error;
  }
}

/**
 * 从 URL 提取发布版本 ID
 *
 * 版本 ID 取自 URL 路径的最后两段，
 * 例如 /api/dump/releases/abc123/parquet → "abc123/parquet"
 *
 * @param url - 预签名 URL
 * @returns 发布版本标识符
 */
function releaseId(url: URL): string {
  const segments = url.pathname.split('/').filter(Boolean);
  return segments.slice(-2).join('/');
}

/**
 * 调用 Fuyao API 获取预签名下载 URL
 *
 * 预签名 URL 是一种时效性下载链接，无需在下载请求中重复携带 API Key。
 * 请求头中携带 X-api-key 用于服务端认证。
 * 请求超时时间 30 秒。
 *
 * @param options - Fuyao 下载选项
 * @param fetchImplementation - fetch 实现
 * @returns 预签名下载 URL
 * @throws 签名请求失败时抛出 Error
 */
async function signDump(
  options: FetchFuyaoDumpOptions,
  fetchImplementation: typeof globalThis.fetch,
): Promise<URL> {
  // 构造签名 API 请求 URL
  const url = new URL(`/api/dump/market-dumps/${options.kind}/download-url`, options.baseUrl);
  const response = await fetchImplementation(url, {
    headers: { 'X-api-key': options.apiKey, accept: 'application/json' },
    signal:
      options.signal === undefined
        ? AbortSignal.timeout(30_000)
        : AbortSignal.any([options.signal, AbortSignal.timeout(30_000)]),
  });

  if (!response.ok) throw new Error(`Dump signing failed: HTTP ${response.status}`);

  // 解析响应：code 必须为 0，data.presigned_url 必须存在
  const envelope = (await response.json()) as {
    code?: number;
    message?: string;
    data?: { presigned_url?: string };
  };
  if (envelope.code !== 0 || envelope.data?.presigned_url === undefined)
    throw new Error(`Dump signing failed: ${envelope.code ?? 'invalid'} ${envelope.message ?? ''}`);

  return new URL(envelope.data.presigned_url);
}

/**
 * 从 Fuyao 服务获取数据转储文件
 *
 * 支持内置重试：首次失败后等待 250ms 再重试一次。
 * 下载的文件保存在 cacheDir 下，名称为 {kind}.parquet。
 *
 * @param options - 下载选项
 * @returns 下载完成的文件描述
 * @throws 两次尝试都失败时抛出最后一次的错误
 */
export async function fetchFuyaoDump(options: FetchFuyaoDumpOptions): Promise<FetchedDump> {
  // 支持依赖注入（测试时可替换 fetch 和 sleep 实现）
  const fetchImplementation = options.fetch ?? globalThis.fetch;
  const sleep =
    options.sleep ??
    ((milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds)));

  let lastError: unknown;
  // 最多尝试 2 次
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      throwIfCancelled(options.signal);
      // 第一步：获取预签名下载 URL
      const signedUrl = await signDump(options, fetchImplementation);
      // 第二步：下载文件，保存为 {kind}.parquet
      const target = path.join(options.cacheDir, `${options.kind}.parquet`);
      const downloaded = await downloadDump(
        signedUrl,
        target,
        undefined,
        fetchImplementation,
        options.onProgress === undefined
          ? undefined
          : (event) => options.onProgress?.({ ...event, kind: options.kind }),
        options.signal,
      );
      return { ...downloaded, releaseId: releaseId(signedUrl) };
    } catch (error) {
      if (options.signal?.aborted === true) throw cancelledError();
      lastError = error;
      // 第一次失败后等待 250ms 再重试
      if (attempt === 0) {
        await sleep(250);
        throwIfCancelled(options.signal);
      }
    }
  }
  throw lastError;
}
