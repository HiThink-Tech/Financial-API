import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { createPlatformPaths } from '../../src/infrastructure/filesystem/platform-paths.js';

describe('platform paths', () => {
  test('uses XDG directories on Linux', () => {
    const paths = createPlatformPaths({
      platform: 'linux',
      homeDir: '/home/tester',
      env: {
        XDG_CONFIG_HOME: '/xdg/config',
        XDG_DATA_HOME: '/xdg/data',
        XDG_CACHE_HOME: '/xdg/cache',
        XDG_STATE_HOME: '/xdg/state',
      },
    });

    expect(paths.configDir).toBe('/xdg/config/hithink-finance');
    expect(paths.dataDir).toBe('/xdg/data/hithink-finance');
    expect(paths.cacheDir).toBe('/xdg/cache/hithink-finance');
    expect(paths.stateDir).toBe('/xdg/state/hithink-finance');
    expect(paths.defaultDbPath).toBe('/xdg/data/hithink-finance/market.duckdb');
  });

  test('uses roaming config and local data on Windows', () => {
    const paths = createPlatformPaths({
      platform: 'win32',
      homeDir: 'C:\\Users\\tester',
      env: {
        APPDATA: 'D:\\Roaming',
        LOCALAPPDATA: 'D:\\Local',
      },
    });

    expect(paths.configDir).toBe(path.win32.join('D:\\Roaming', 'hithink-finance'));
    expect(paths.dataDir).toBe(path.win32.join('D:\\Local', 'hithink-finance', 'data'));
    expect(paths.cacheDir).toBe(path.win32.join('D:\\Local', 'hithink-finance', 'cache'));
  });

  test('uses Application Support and Caches on macOS', () => {
    const paths = createPlatformPaths({
      platform: 'darwin',
      homeDir: '/Users/tester',
      env: {},
    });

    expect(paths.configDir).toBe('/Users/tester/Library/Application Support/hithink-finance');
    expect(paths.cacheDir).toBe('/Users/tester/Library/Caches/hithink-finance');
  });
});
