/**
 * Agent Skills 安装与卸载模块
 *
 * 管理 AI Agent 扩展技能包的安装、同步和卸载操作。
 * 技能包是预置的金融数据分析工具集，通过 skills CLI 工具进行全局安装。
 *
 * 技能包分类：
 * - hithink-finance-shared：共享基础工具
 * - hithink-finance-symbol：股票代码/名称查询
 * - hithink-finance-market：行情/市场数据
 * - hithink-finance-special-data：特殊数据（龙虎榜、涨停板等）
 * - hithink-finance-financials：财务报表分析
 * - hithink-finance-index：指数数据
 * - hithink-finance-data：通用数据查询
 * - hithink-finance-research：研报查询
 *
 * 实现方式：通过 spawn 子进程调用 `skills` CLI 工具（位于 node_modules/skills/bin/cli.mjs）
 *
 * @module skills/installer
 */

import { spawn } from 'node:child_process';
import path from 'node:path';

/**
 * 同步（安装/更新）所有预置技能包
 *
 * 调用 `skills add <source> --global --copy --all --full-depth` 将
 * 技能源目录下的所有技能安装到全局位置。
 *
 * @param packageRoot - npm 包的根路径（包含 node_modules 和 skills 目录）
 * @returns 子进程退出码 { code: number }
 */
export async function syncSkills(packageRoot: string): Promise<{ code: number }> {
  const invocation = skillsCliArguments(packageRoot);
  return run(invocation);
}

/**
 * 卸载所有预置技能包
 *
 * 调用 `skills remove <names...> --global --yes` 删除所有已安装的技能。
 *
 * @param packageRoot - npm 包的根路径
 * @returns 子进程退出码 { code: number }
 */
export async function removeSkills(packageRoot: string): Promise<{ code: number }> {
  return run(skillsRemoveArguments(packageRoot));
}

/**
 * 启动子进程运行 skills CLI 命令
 *
 * 子进程配置：
 * - stdio：忽略 stdin，pipe stdout/stderr
 * - windowsHide：Windows 上隐藏控制台窗口
 * - 监听 'error'（进程启动失败）和 'exit'（进程结束）事件
 *
 * @param invocation - CLI 调用参数
 * @returns Promise 包装的子进程退出码
 */
function run(invocation: ReturnType<typeof skillsCliArguments>): Promise<{ code: number }> {
  return new Promise((resolve, reject) => {
    // spawn 创建子进程，不会创建 shell 中间层，安全性更高
    const child = spawn(invocation.command, invocation.args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: invocation.env,
      windowsHide: true,
    });
    // 进程启动失败（如找不到可执行文件）
    child.once('error', reject);
    // 进程正常退出，code 为 null 时默认返回 1
    child.once('exit', (code) => resolve({ code: code ?? 1 }));
  });
}

/**
 * 所有预置技能的名称列表
 *
 * 每个技能对应一个 skill 包，涵盖金融数据分析的不同领域。
 */
const skillNames = [
  'hithink-finance-shared',
  'hithink-finance-symbol',
  'hithink-finance-market',
  'hithink-finance-special-data',
  'hithink-finance-financials',
  'hithink-finance-index',
  'hithink-finance-fund',
  'hithink-finance-valuation',
  'hithink-finance-data',
  'hithink-finance-research',
];

/**
 * 构造技能移除命令参数
 *
 * 命令格式：
 * `node <cli.mjs> remove <skill1> <skill2> ... --global --yes`
 *
 * --global：全局范围移除
 * 不指定 --agent 时，skills CLI 会遍历所有 agent 目标。
 * --yes：跳过确认提示
 *
 * @param packageRoot - npm 包的根路径
 * @returns CLI 调用的命令、参数和环境变量
 */
export function skillsRemoveArguments(packageRoot: string): ReturnType<typeof skillsCliArguments> {
  // skills CLI 入口脚本路径
  const cli = path.join(packageRoot, 'node_modules', 'skills', 'bin', 'cli.mjs');
  return {
    command: process.execPath,
    args: [cli, 'remove', ...skillNames, '--global', '--yes'],
    // 禁用遥测数据上报
    env: { ...process.env, DISABLE_TELEMETRY: '1' },
  };
}

/**
 * 构造技能安装命令参数
 *
 * 命令格式：
 * `node <cli.mjs> add <source> --global --copy --all --full-depth`
 *
 * --global：全局范围安装
 * --copy：复制文件（而非创建符号链接）
 * --all：安装所有技能
 * --full-depth：完全深度导航
 *
 * @param packageRoot - npm 包的根路径
 * @returns CLI 调用的命令、参数和环境变量
 */
export function skillsCliArguments(packageRoot: string): {
  command: string;
  args: string[];
  env: NodeJS.ProcessEnv;
} {
  // skills CLI 入口脚本路径
  const cli = path.join(packageRoot, 'node_modules', 'skills', 'bin', 'cli.mjs');
  // 技能源文件目录（相对于 packageRoot 的 skills 目录）
  const source = path.join(packageRoot, 'skills');
  return {
    command: process.execPath,
    args: [cli, 'add', source, '--global', '--copy', '--all', '--full-depth'],
    // 禁用遥测数据上报
    env: { ...process.env, DISABLE_TELEMETRY: '1' },
  };
}
