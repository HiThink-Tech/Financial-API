import { Writable } from 'node:stream';
import { Readable } from 'node:stream';
import { describe, expect, test } from 'vitest';
import { createProgram } from '../../src/cli/program.js';
import type { CliContext } from '../../src/cli/context.js';
import type { CredentialStore } from '../../src/infrastructure/credentials/keyring.js';
import { ApiKeyAuthProvider } from '../../src/infrastructure/credentials/api-key-provider.js';
import { createPlatformPaths } from '../../src/infrastructure/filesystem/platform-paths.js';
import { readHiddenApiKey } from '../../src/commands/auth/index.js';

class MemoryWriteStream extends Writable {
  readonly chunks: string[] = [];
  isTTY = false;

  _write(
    chunk: string | Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    this.chunks.push(Buffer.isBuffer(chunk) ? chunk.toString('utf8') : chunk);
    callback();
  }

  text(): string {
    return this.chunks.join('');
  }
}

class MemoryCredentialStore implements CredentialStore {
  readonly values = new Map<string, string>();

  async get(account: string): Promise<string | undefined> {
    return this.values.get(account);
  }

  async set(account: string, secret: string): Promise<void> {
    this.values.set(account, secret);
  }

  async delete(account: string): Promise<boolean> {
    return this.values.delete(account);
  }

  async listAccounts(): Promise<string[]> {
    return [...this.values.keys()];
  }
}

describe('auth login command', () => {
  test('explains the API key source and hidden input before reading interactively', async () => {
    const stderr = new MemoryWriteStream();
    const input = Readable.from(['interactive-secret\n']) as Readable & { isTTY?: boolean };
    input.isTTY = true;
    const context = {
      language: 'zh-CN',
      stderr: stderr as unknown as NodeJS.WriteStream,
    } as CliContext;

    await expect(readHiddenApiKey(context, input)).resolves.toBe('interactive-secret');

    expect(stderr.text()).toContain('欢迎使用同花顺金融数据 CLI');
    expect(stderr.text()).toContain('官网 API Key 获取地址：https://fuyao.aicubes.cn/admin');
    expect(stderr.text()).toContain('下方为隐藏输入模式');
    expect(stderr.text()).toContain('在此处填写您的 API Key：');
  });

  test('keeps the English interactive login guidance aligned with the Chinese prompt', async () => {
    const stderr = new MemoryWriteStream();
    const input = Readable.from(['interactive-secret\n']) as Readable & { isTTY?: boolean };
    input.isTTY = true;
    const context = {
      language: 'en-US',
      stderr: stderr as unknown as NodeJS.WriteStream,
    } as CliContext;

    await expect(readHiddenApiKey(context, input)).resolves.toBe('interactive-secret');

    expect(stderr.text()).toContain('Welcome to HiThink Finance CLI');
    expect(stderr.text()).toContain('API key page: https://fuyao.aicubes.cn/admin');
    expect(stderr.text()).toContain('hidden input mode');
    expect(stderr.text()).toContain('Paste your API key here:');
  });

  test('does not prompt or overwrite when the selected profile is already logged in', async () => {
    const stdout = new MemoryWriteStream();
    const stderr = new MemoryWriteStream();
    const paths = createPlatformPaths({ homeDir: process.cwd(), env: {} });
    const store = new MemoryCredentialStore();
    store.values.set('profile:default', 'existing-secret');
    const context: CliContext = {
      format: 'json',
      language: 'zh-CN',
      color: false,
      requestId: 'req-test',
      stdout: stdout as unknown as NodeJS.WriteStream,
      stderr: stderr as unknown as NodeJS.WriteStream,
    };

    const program = createProgram(
      { name: '@hithink-tech/hithink-finance-cli', version: '0.1.0' },
      context,
      {
        authProvider: new ApiKeyAuthProvider(store, {}),
        fuyaoBaseUrl: 'https://fuyao.aicubes.cn',
        packageRoot: process.cwd(),
        platformPaths: paths,
        resolvedConfig: {
          dbPath: paths.defaultDbPath,
          profile: 'default',
          format: 'json',
          language: 'zh-CN',
          updateCheck: false,
        },
      },
    );

    await program.parseAsync(['auth', 'login'], { from: 'user' });

    expect(store.values.get('profile:default')).toBe('existing-secret');
    expect(stderr.text()).toBe('');
    expect(JSON.parse(stdout.text())).toMatchObject({
      ok: true,
      command: 'auth.login',
      data: {
        configured: true,
        already_logged_in: true,
        next_step: expect.stringContaining('auth logout'),
      },
    });
  });
});
