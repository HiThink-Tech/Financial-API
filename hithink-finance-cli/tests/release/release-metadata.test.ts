import { access, readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';

test('declares public monorepo release metadata and an explicit license gate', async () => {
  const pkg = JSON.parse(await readFile('package.json', 'utf8')) as {
    repository: unknown;
    bin: unknown;
    engines: { node: string };
    publishConfig: { access: string };
    license: string;
    scripts: {
      prepublishOnly: string;
      test: string;
      'test:built': string;
      verify: string;
      pretest?: string;
    };
  };
  expect(pkg.repository).toEqual({
    type: 'git',
    url: 'git+https://github.com/HiThink-Tech/Financial-API.git',
    directory: 'hithink-finance-cli',
  });
  expect(pkg.bin).toEqual({ 'hithink-finance': './dist/cli/main.js' });
  expect(pkg.engines.node).toBe('>=22.12.0');
  expect(pkg.publishConfig.access).toBe('public');
  expect(pkg.license).toBe('MIT');
  expect(pkg.scripts.prepublishOnly).toContain('check-license');
  expect(pkg.scripts.pretest).toBeUndefined();
  expect(pkg.scripts.test).toBe('npm run build && vitest run');
  expect(pkg.scripts['test:built']).toBe('vitest run');
  expect(pkg.scripts.verify).toContain('npm run build && npm run test:built');
  await expect(access('LICENSE')).resolves.toBeUndefined();
  await expect(access('CHANGELOG.md')).resolves.toBeUndefined();
  await expect(access('SECURITY.md')).resolves.toBeUndefined();
  await expect(access('docs/maintainers/npm-publishing.md')).resolves.toBeUndefined();
  const releaseWorkflow = await readFile(
    '../.github/workflows/hithink-finance-cli-release.yml',
    'utf8',
  );
  expect(releaseWorkflow).toContain('tags: ["v*"]');
  expect(releaseWorkflow).toContain('ref: ${{ inputs.tag || github.ref_name }}');
  expect(releaseWorkflow).toContain('tag/version mismatch');
  expect(releaseWorkflow).toContain('id-token: write');
  expect(releaseWorkflow).toContain('gh release create');
  expect(releaseWorkflow).not.toMatch(/NPM_TOKEN|NODE_AUTH_TOKEN/u);
});
