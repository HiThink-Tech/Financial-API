import { describe, expect, test } from 'vitest';
import { ApiKeyAuthProvider } from '../../src/infrastructure/credentials/api-key-provider.js';
import type { CredentialStore } from '../../src/infrastructure/credentials/keyring.js';

class MemoryCredentialStore implements CredentialStore {
  readonly values = new Map<string, string>();
  failure: Error | undefined;

  async get(account: string): Promise<string | undefined> {
    if (this.failure !== undefined) throw this.failure;
    return this.values.get(account);
  }

  async set(account: string, secret: string): Promise<void> {
    if (this.failure !== undefined) throw this.failure;
    this.values.set(account, secret);
  }

  async delete(account: string): Promise<boolean> {
    if (this.failure !== undefined) throw this.failure;
    return this.values.delete(account);
  }

  async listAccounts(): Promise<string[]> {
    if (this.failure !== undefined) throw this.failure;
    return [...this.values.keys()];
  }
}

describe('API key authentication', () => {
  test('resolves explicit input over environment over Keyring', async () => {
    const store = new MemoryCredentialStore();
    store.values.set('profile:default', 'keyring-key');
    const provider = new ApiKeyAuthProvider(store, { HITHINK_FINANCE_API_KEY: 'environment-key' });

    await expect(provider.resolve('default', 'explicit-key')).resolves.toMatchObject({
      apiKey: 'explicit-key',
      source: 'explicit',
    });
    await expect(provider.resolve('default')).resolves.toMatchObject({
      apiKey: 'environment-key',
      source: 'environment',
    });
    await expect(new ApiKeyAuthProvider(store, {}).resolve('default')).resolves.toMatchObject({
      apiKey: 'keyring-key',
      source: 'keyring',
    });
  });

  test('persists only through login and supports profile logout', async () => {
    const store = new MemoryCredentialStore();
    const provider = new ApiKeyAuthProvider(store, {});

    await provider.login({ profile: 'research', apiKey: 'secret-value' });
    expect(store.values.get('profile:research')).toBe('secret-value');
    await expect(provider.status('research')).resolves.toMatchObject({ configured: true });

    await provider.logout('research');
    await expect(provider.status('research')).resolves.toMatchObject({ configured: false });
  });

  test('deletes every CLI-owned profile without touching foreign accounts', async () => {
    const store = new MemoryCredentialStore();
    store.values.set('profile:default', 'one');
    store.values.set('profile:research', 'two');
    store.values.set('foreign', 'keep');
    const provider = new ApiKeyAuthProvider(store, {});

    await provider.logoutAll();

    expect([...store.values.keys()]).toEqual(['foreign']);
  });

  test('maps an unavailable credential store to an actionable error', async () => {
    const store = new MemoryCredentialStore();
    store.failure = new Error('Secret Service unavailable');
    const provider = new ApiKeyAuthProvider(store, {});

    await expect(provider.resolve('default')).rejects.toMatchObject({
      code: 'AUTH_CREDENTIAL_STORE_UNAVAILABLE',
      exitCode: 3,
    });
  });

  test('treats null native Keyring reads as a missing API key', async () => {
    const store: CredentialStore = {
      async get() {
        return null as unknown as string | undefined;
      },
      async set() {},
      async delete() {
        return false;
      },
      async listAccounts() {
        return [];
      },
    };
    const provider = new ApiKeyAuthProvider(store, {});

    await expect(provider.resolve('default')).rejects.toMatchObject({
      code: 'AUTH_API_KEY_MISSING',
      exitCode: 3,
      hint: expect.stringContaining('https://fuyao.aicubes.cn/admin'),
    });
  });
});
