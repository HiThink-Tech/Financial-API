import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import type { Command } from 'commander';
import type { ResolvedConfig } from '../../application/config.js';
import type { PackageMetadata } from '../../cli/program.js';
import type { CliContext } from '../../cli/context.js';
import { localizeText } from '../../cli/i18n.js';
import { successEnvelope } from '../../contracts/envelope.js';
import { CliError } from '../../contracts/errors.js';
import type { ApiKeyAuthProvider } from '../../infrastructure/credentials/api-key-provider.js';
import type { PlatformPaths } from '../../infrastructure/filesystem/platform-paths.js';
import { readBundledSkillsStatus } from '../../infrastructure/skills/status.js';
import { renderResult } from '../../output/renderer.js';

interface DoctorDependencies {
  metadata: PackageMetadata;
  authProvider: ApiKeyAuthProvider;
  packageRoot: string;
  platformPaths: PlatformPaths;
  resolvedConfig: ResolvedConfig;
}

async function fileExists(file: string): Promise<boolean> {
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
}

async function authenticationStatus(
  authProvider: ApiKeyAuthProvider,
  profile: string,
): Promise<{ configured: boolean; source?: string; checkError?: string }> {
  try {
    const session = await authProvider.resolve(profile);
    return { configured: true, source: session.source };
  } catch (error) {
    if (error instanceof CliError && error.code === 'AUTH_API_KEY_MISSING') {
      return { configured: false };
    }
    return {
      configured: false,
      checkError: error instanceof CliError ? error.code : 'AUTH_STATUS_CHECK_FAILED',
    };
  }
}

async function dataLockStatus(stateDir: string): Promise<Record<string, unknown>> {
  const lockPath = path.join(stateDir, 'data.lock');
  try {
    const value = JSON.parse(await readFile(lockPath, 'utf8')) as Record<string, unknown>;
    return {
      present: true,
      path: lockPath,
      pid: typeof value.pid === 'number' ? value.pid : undefined,
      command: typeof value.command === 'string' ? value.command : undefined,
      startedAt: typeof value.startedAt === 'string' ? value.startedAt : undefined,
    };
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
      return { present: false, path: lockPath };
    }
    return { present: true, path: lockPath, readable: false };
  }
}

async function duckdbStatus(): Promise<{ available: boolean; errorCode?: string }> {
  try {
    await import('@duckdb/node-api');
    return { available: true };
  } catch {
    return { available: false, errorCode: 'DUCKDB_NATIVE_UNAVAILABLE' };
  }
}

export async function collectDoctorReport(dependencies: DoctorDependencies): Promise<unknown> {
  const { metadata, authProvider, packageRoot, platformPaths, resolvedConfig } = dependencies;
  const [authentication, databaseExists, dataLock, duckdb, skills] = await Promise.all([
    authenticationStatus(authProvider, resolvedConfig.profile),
    fileExists(resolvedConfig.dbPath),
    dataLockStatus(platformPaths.stateDir),
    duckdbStatus(),
    readBundledSkillsStatus(packageRoot),
  ]);

  return {
    runtime: {
      package: metadata.name,
      packageVersion: metadata.version,
      nodeVersion: process.versions.node,
      platform: process.platform,
      arch: process.arch,
    },
    config: {
      profile: resolvedConfig.profile,
      explicitConfigPath: resolvedConfig.configPath,
      userConfigPath: platformPaths.userConfigFile,
      database: { path: resolvedConfig.dbPath, exists: databaseExists },
    },
    authentication,
    dataLock,
    duckdb,
    skills,
  };
}

export function registerDoctorCommand(
  program: Command,
  context: CliContext,
  dependencies: DoctorDependencies,
): void {
  program
    .command('doctor')
    .description(localizeText(context.language, 'Run local environment diagnostics'))
    .action(async () =>
      renderResult(
        successEnvelope('doctor', await collectDoctorReport(dependencies), {
          requestId: context.requestId,
        }),
        context,
      ),
    );
}
