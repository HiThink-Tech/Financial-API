/**
 * DuckDB 数据库连接管理模块
 *
 * 封装 DuckDB 本地数据库的打开与关闭生命周期。
 * DuckDB 是一个嵌入式分析型数据库，运行在进程内，无需独立服务器进程。
 * 每个数据库以单个文件存储，支持完整的 SQL 查询和事务。
 *
 * 使用 @duckdb/node-api 提供的原生绑定与 DuckDB C++ 引擎通信。
 *
 * @module duckdb/connection
 */

import { DuckDBInstance, type DuckDBConnection } from '@duckdb/node-api';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';

/**
 * 打开的数据库描述对象
 *
 * 包含数据库路径、活跃连接和关闭方法。
 * 调用 `close()` 会同步关闭连接和数据库实例，释放文件锁。
 */
export interface OpenDatabase {
  /** 数据库文件的绝对路径 */
  path: string;
  /** DuckDB 活跃连接 */
  connection: DuckDBConnection;
  /** 关闭数据库连接和实例 */
  close(): void;
}

/**
 * 打开指定路径的 DuckDB 数据库
 *
 * 如果目标目录不存在，会自动创建。
 * 返回的 OpenDatabase 对象需在使用完毕后调用 `close()` 释放资源。
 *
 * @param databasePath - 数据库文件路径（相对或绝对）
 * @returns 打开的数据库对象
 */
export async function openDatabase(databasePath: string): Promise<OpenDatabase> {
  // 确保使用绝对路径，避免工作目录变化导致路径错误
  const absolutePath = path.resolve(databasePath);
  // 自动创建数据库文件所在目录
  await mkdir(path.dirname(absolutePath), { recursive: true });
  // 创建 DuckDB 实例（进程内嵌入式数据库引擎）
  const instance = await DuckDBInstance.create(absolutePath);
  // 建立数据库连接
  const connection = await instance.connect();
  return {
    path: absolutePath,
    connection,
    // 同步关闭：先关连接再关实例，释放文件锁
    close() {
      connection.closeSync();
      instance.closeSync();
    },
  };
}
