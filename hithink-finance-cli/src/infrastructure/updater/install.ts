/**
 * npm 包安装与卸载模块
 *
 * 提供通过 npm 进行全局包安装、卸载和执行任意可执行文件的功能。
 * 通过 spawn 子进程调用 npm CLI 命令，支持跨平台兼容。
 *
 * Windows 特殊处理：
 * 当 npmExecutable 路径以 .cmd/.bat 结尾时，需要通过 cmd.exe 来执行：
 * ```
 * cmd.exe /d /s /c "<npmExecutable> install -g <package>@<version>"
 * ```
 * 这是因为 Node.js 的 child_process.spawn 不能直接执行 .cmd/.bat 文件，
 * 需要通过 Windows 命令解释器来启动批处理脚本。
 *
 * 平台差异处理：
 * - Unix/macOS：直接 spawn npmExecutable
 * - Windows .cmd/.bat：通过 cmd.exe 间接执行
 * - Windows .exe：直接 spawn（与 Unix 一致）
 *
 * @module updater/install
 */

import { spawn } from 'node:child_process';
import { forwardChildDiagnostics, waitForChild } from '../process/child-diagnostics.js';

const NPM_CHILD_TIMEOUT_MS = 15 * 60_000;
const NPM_QUERY_TIMEOUT_MS = 30_000;
const MAX_NPM_QUERY_OUTPUT_BYTES = 64 * 1024;

function executableInvocation(
  executable: string,
  executableArgs: string[],
): { command: string; args: string[] } {
  const isWindowsScript = process.platform === 'win32' && /\.(cmd|bat)$/iu.test(executable);
  return {
    command: isWindowsScript ? (process.env.ComSpec ?? 'cmd.exe') : executable,
    args: isWindowsScript ? ['/d', '/s', '/c', executable, ...executableArgs] : executableArgs,
  };
}

/** Resolve the exact version behind the npm `latest` dist-tag. */
export async function resolveLatestPackageVersion(
  npmExecutable: string,
  packageName: string,
  signal?: AbortSignal,
): Promise<string> {
  const invocation = executableInvocation(npmExecutable, [
    'view',
    packageName,
    'version',
    '--json',
  ]);
  const child = spawn(invocation.command, invocation.args, {
    stdio: ['ignore', 'pipe', 'ignore'],
    windowsHide: true,
    env: process.env,
    detached: process.platform !== 'win32',
  });
  let stdout = '';
  let outputTooLarge = false;
  child.stdout.on('data', (chunk: Buffer) => {
    if (Buffer.byteLength(stdout) + chunk.byteLength > MAX_NPM_QUERY_OUTPUT_BYTES) {
      outputTooLarge = true;
      return;
    }
    stdout += chunk.toString();
  });
  const code = await waitForChild(child, {
    ...(signal === undefined ? {} : { signal }),
    timeoutMs: NPM_QUERY_TIMEOUT_MS,
    processGroup: process.platform !== 'win32',
    operation: 'npm view',
  });
  if (code !== 0 || outputTooLarge) throw new Error('Unable to query the latest npm version.');
  try {
    const version = JSON.parse(stdout) as unknown;
    if (typeof version === 'string') return version;
  } catch {
    // Normalize malformed npm output to the same stable caller-facing error.
  }
  throw new Error('The npm registry returned an invalid latest version.');
}

/**
 * 通过 npm 安装指定版本的全局包
 *
 * 使用 `npm install -g <package>@<version>` 命令进行全局安装。
 * 子进程 stdio 设为 inherit，让安装日志直接输出到终端。
 *
 * @param npmExecutable - npm 可执行文件的路径（如 /usr/bin/npm 或 C:\Program Files\nodejs\npm.cmd）
 * @param packageName - 要安装的 npm 包名
 * @param version - 要安装的版本号
 * @returns 子进程退出码
 */
export async function installGlobalPackage(
  npmExecutable: string,
  packageName: string,
  version: string,
  signal?: AbortSignal,
): Promise<number> {
  // 构造 npm install 命令参数
  const npmArgs = ['install', '-g', `${packageName}@${version}`];

  // Windows .cmd/.bat 文件需要通过 cmd.exe 执行
  // 原因：spawn 在 Windows 上不能直接执行批处理脚本
  const invocation = executableInvocation(npmExecutable, npmArgs);

  const child = spawn(invocation.command, invocation.args, {
    // 子进程日志统一转发到 stderr，避免破坏父 CLI 的结构化 stdout
    stdio: ['inherit', 'pipe', 'pipe'],
    windowsHide: true,
    env: process.env,
    detached: process.platform !== 'win32',
  });
  forwardChildDiagnostics(child);
  return waitForChild(child, {
    ...(signal === undefined ? {} : { signal }),
    timeoutMs: NPM_CHILD_TIMEOUT_MS,
    processGroup: process.platform !== 'win32',
    operation: 'npm install',
  });
}

/**
 * 执行任意可执行文件
 *
 * 通用的可执行文件调用封装，自动处理 Windows .cmd/.bat 脚本的兼容性。
 *
 * @param executable - 可执行文件路径
 * @param executableArgs - 命令行参数数组
 * @returns 子进程退出码
 */
export async function runExecutable(
  executable: string,
  executableArgs: string[],
  signal?: AbortSignal,
  env: NodeJS.ProcessEnv = process.env,
): Promise<number> {
  // Windows .cmd/.bat 脚本需通过 cmd.exe 间接执行
  const invocation = executableInvocation(executable, executableArgs);

  const child = spawn(invocation.command, invocation.args, {
    stdio: ['inherit', 'pipe', 'pipe'],
    windowsHide: true,
    env,
    detached: process.platform !== 'win32',
  });
  forwardChildDiagnostics(child);
  return waitForChild(child, {
    ...(signal === undefined ? {} : { signal }),
    timeoutMs: NPM_CHILD_TIMEOUT_MS,
    processGroup: process.platform !== 'win32',
    operation: 'npm command',
  });
}

/**
 * 卸载全局安装的 npm 包
 *
 * 使用 `npm uninstall -g <package>` 命令进行全局卸载。
 * 实际通过 {@link runExecutable} 执行命令。
 *
 * @param npmExecutable - npm 可执行文件路径
 * @param packageName - 要卸载的 npm 包名
 * @returns 子进程退出码
 */
export async function uninstallGlobalPackage(
  npmExecutable: string,
  packageName: string,
  signal?: AbortSignal,
): Promise<number> {
  return runExecutable(npmExecutable, ['uninstall', '-g', packageName], signal);
}
