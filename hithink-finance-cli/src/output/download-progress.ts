import type { CliContext } from '../cli/context.js';
import type { DumpDownloadProgressEvent } from '../infrastructure/duckdb/dump-client.js';

const TTY_RENDER_INTERVAL_MS = 100;
const LOG_RENDER_INTERVAL_MS = 5_000;
const LOG_RENDER_BYTES = 8 * 1024 * 1024;

interface DownloadState {
  startedAt: number;
  lastRenderedAt: number;
  lastRenderedBytes: number;
}

export interface DownloadProgressReporterOptions {
  now?: () => number;
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  const units = ['KiB', 'MiB', 'GiB', 'TiB'];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)) - 1, units.length - 1);
  return `${(value / 1024 ** (index + 1)).toFixed(1)} ${units[index]}`;
}

function formatProgress(
  event: DumpDownloadProgressEvent,
  state: DownloadState,
  timestamp: number,
): string {
  const transferred = formatBytes(event.downloadedBytes);
  const total = event.totalBytes === undefined ? '' : ` / ${formatBytes(event.totalBytes)}`;
  const percent =
    event.totalBytes === undefined || event.totalBytes === 0
      ? ''
      : ` (${Math.round((event.downloadedBytes / event.totalBytes) * 100)}%)`;
  const elapsedSeconds = Math.max((timestamp - state.startedAt) / 1_000, 0.001);
  return `${transferred}${total}${percent} ${formatBytes(event.downloadedBytes / elapsedSeconds)}/s`;
}

function message(
  event: DumpDownloadProgressEvent,
  state: DownloadState,
  timestamp: number,
  language: CliContext['language'],
): string {
  const detail = formatProgress(event, state, timestamp);
  if (language === 'zh-CN') {
    if (event.phase === 'started') return `正在下载 ${event.kind}: ${detail}`;
    if (event.phase === 'completed') return `下载完成 ${event.kind}: ${detail}`;
    return `下载进度 ${event.kind}: ${detail}`;
  }
  if (event.phase === 'started') return `Downloading ${event.kind}: ${detail}`;
  if (event.phase === 'completed') return `Download complete ${event.kind}: ${detail}`;
  return `Download progress ${event.kind}: ${detail}`;
}

/**
 * Creates a stderr-only renderer for dump-byte events.
 * TTY streams redraw a single line; redirected streams receive bounded log lines.
 */
export function createDownloadProgressReporter(
  context: CliContext,
  options: DownloadProgressReporterOptions = {},
): (event: DumpDownloadProgressEvent) => void {
  const now = options.now ?? Date.now;
  const states = new Map<string, DownloadState>();

  return (event) => {
    const timestamp = now();
    const state =
      states.get(event.kind) ??
      ({
        startedAt: timestamp,
        lastRenderedAt: timestamp,
        lastRenderedBytes: 0,
      } satisfies DownloadState);
    states.set(event.kind, state);

    if (context.stderr.isTTY === true) {
      const shouldRender =
        event.phase !== 'progress' || timestamp - state.lastRenderedAt >= TTY_RENDER_INTERVAL_MS;
      if (!shouldRender) return;
      context.stderr.write(`\r${message(event, state, timestamp, context.language)}`);
      state.lastRenderedAt = timestamp;
      state.lastRenderedBytes = event.downloadedBytes;
      if (event.phase === 'completed') {
        context.stderr.write('\n');
        states.delete(event.kind);
      }
      return;
    }

    if (event.phase === 'progress') {
      const elapsed = timestamp - state.lastRenderedAt;
      const byteDelta = event.downloadedBytes - state.lastRenderedBytes;
      if (elapsed < LOG_RENDER_INTERVAL_MS || byteDelta < LOG_RENDER_BYTES) return;
    }
    context.stderr.write(`${message(event, state, timestamp, context.language)}\n`);
    state.lastRenderedAt = timestamp;
    state.lastRenderedBytes = event.downloadedBytes;
    if (event.phase === 'completed') states.delete(event.kind);
  };
}
