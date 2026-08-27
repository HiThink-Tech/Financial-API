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
  const isWindowsScript = process.platform === 'win32' && /\.(cmd|bat)$/iu.test(npmExecutable);
  const command = isWindowsScript ? (process.env.ComSpec ?? 'cmd.exe') : npmExecutable;
  const args = isWindowsScript
    ? // /d: 禁用 AutoRun 命令（安全考虑）
      // /s: 之后是单个命令字符串
      // /c: 执行命令后退出
      ['/d', '/s', '/c', npmExecutable, ...npmArgs]
    : npmArgs;

  const child = spawn(command, args, {
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
): Promise<number> {
  // Windows .cmd/.bat 脚本需通过 cmd.exe 间接执行
  const isWindowsScript = process.platform === 'win32' && /\.(cmd|bat)$/iu.test(executable);
  const command = isWindowsScript ? (process.env.ComSpec ?? 'cmd.exe') : executable;
  const args = isWindowsScript ? ['/d', '/s', '/c', executable, ...executableArgs] : executableArgs;

  const child = spawn(command, args, {
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
