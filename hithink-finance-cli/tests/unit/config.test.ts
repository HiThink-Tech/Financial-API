import { mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { loadConfig, parseConfigFile } from '../../src/application/config.js';
import { writeJsonAtomic } from '../../src/infrastructure/filesystem/atomic-file.js';
import { createPlatformPaths } from '../../src/infrastructure/filesystem/platform-paths.js';

const tempDirectories: string[] = [];

async function tempDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), 'hithink-finance-config-'));
  tempDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  const { rm } = await import('node:fs/promises');
  await Promise.all(
    tempDirectories.splice(0).map((directory) => rm(directory, { recursive: true })),
  );
});

describe('configuration', () => {
  test('applies CLI over environment over project over user over defaults', async () => {
    const root = await tempDirectory();
    const projectDir = path.join(root, 'project');
    const paths = createPlatformPaths({
      platform: 'linux',
      homeDir: root,
      env: {
        XDG_CONFIG_HOME: path.join(root, 'config'),
        XDG_DATA_HOME: path.join(root, 'data'),
        XDG_CACHE_HOME: path.join(root, 'cache'),
        XDG_STATE_HOME: path.join(root, 'state'),
      },
    });
    await writeJsonAtomic(paths.userConfigFile, { dbPath: 'user.duckdb', profile: 'user' });
    await writeJsonAtomic(path.join(projectDir, 'hithink-finance.config.json'), {
      dbPath: 'project.duckdb',
      profile: 'project',
    });

    const config = await loadConfig({
      cwd: projectDir,
      paths,
      env: {
        HITHINK_FINANCE_DB_PATH: 'environment.duckdb',
        HITHINK_FINANCE_PROFILE: 'environment',
      },
      cli: {
        dbPath: 'cli.duckdb',
      },
    });

    expect(config.dbPath).toBe(path.join(projectDir, 'cli.duckdb'));
    expect(config.profile).toBe('environment');
  });

  test('rejects secrets in configuration files', () => {
    expect(() => parseConfigFile({ apiKey: 'forbidden' }, 'config.json')).toThrowError(
      /CONFIG_SECRET_FORBIDDEN/,
    );
    expect(() => parseConfigFile({ token: 'forbidden' }, 'config.json')).toThrowError(
      /CONFIG_SECRET_FORBIDDEN/,
    );
  });

  test('atomically replaces only the requested JSON file', async () => {
    const root = await tempDirectory();
    const target = path.join(root, 'nested', 'config.json');
    await writeJsonAtomic(target, { value: 1 });
    await writeJsonAtomic(target, { value: 2 });

    expect(JSON.parse(await readFile(target, 'utf8'))).toEqual({ value: 2 });
    expect(await readdir(path.dirname(target))).toEqual(['config.json']);
  });

  test('rejects malformed JSON with a trackable error code', async () => {
    const root = await tempDirectory();
    const configPath = path.join(root, 'broken.json');
    await writeFile(configPath, '{broken', 'utf8');

    await expect(
      loadConfig({ cwd: root, env: { HITHINK_FINANCE_CONFIG: configPath } }),
    ).rejects.toThrowError(/CONFIG_INVALID/);
  });
});
