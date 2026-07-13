import { execa } from 'execa';
import { describe, expect, test } from 'vitest';

test('shows help when invoked without arguments', async () => {
  const result = await execa('node', ['dist/cli/main.js']);
  expect(result.stdout).toContain('Usage: hithink-finance');
});

test('renders human help in Chinese for a Chinese system locale', async () => {
  const result = await execa('node', ['dist/cli/main.js', '--help'], {
    env: { LC_ALL: 'zh_CN.UTF-8' },
  });

  expect(result.stdout).toContain('面向人类与 AI Agent 的企业级金融数据命令行工具');
  expect(result.stdout).toContain('管理 API Key 认证');
  expect(result.stdout).toContain('管理本地 DuckDB 数据');
});

describe.each([
  ['en', 'Enterprise financial data CLI', 'Print the installed CLI version'],
  ['zh-CN', '企业级金融数据命令行工具', '显示已安装的 CLI 版本'],
] as const)('help locale %s', (language, rootDescription, versionDescription) => {
  test('renders localized root help while preserving protocol identifiers', async () => {
    const result = await execa('node', ['dist/cli/main.js', '--lang', language, '--help']);

    expect(result.stdout).toContain(rootDescription);
    expect(result.stdout).toContain('--format <format>');
    expect(result.stdout).toContain('--lang <lang>');
    expect(result.stdout).toContain('version');
  });

  test('supports help command and localized leaf help', async () => {
    const result = await execa('node', ['dist/cli/main.js', '--lang', language, 'help', 'version']);

    expect(result.stdout).toContain('Usage: hithink-finance version');
    expect(result.stdout).toContain(versionDescription);
  });
});

test('renders localized auth and remote command help in Chinese', async () => {
  const auth = await execa('node', ['dist/cli/main.js', '--lang', 'zh-CN', 'auth', '--help']);
  expect(auth.stdout).toContain('管理 API Key 认证');
  expect(auth.stdout).toContain('保存 API Key 到系统凭据库');

  const market = await execa('node', [
    'dist/cli/main.js',
    '--lang',
    'zh-CN',
    'market',
    'history',
    '--help',
  ]);
  expect(market.stdout).toContain('查询 A 股日线历史行情');
  expect(market.stdout).toContain('单只 A 股 thscode');
});
