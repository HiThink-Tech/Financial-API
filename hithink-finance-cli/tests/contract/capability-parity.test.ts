import { execa } from 'execa';
import { expect, test } from 'vitest';
import { remoteCapabilities } from '../../src/contracts/remote-capabilities.js';
import { localCapabilities } from '../../src/contracts/local-capabilities.js';

const localCommands = [
  ['data', 'init'],
  ['data', 'sync'],
  ['data', 'status'],
  ['data', 'validate'],
  ['data', 'repair'],
  ['data', 'migrate'],
  ['data', 'clean'],
  ['data', 'remove'],
  ['db', 'describe'],
  ['db', 'query'],
  ['db', 'export'],
  ['market', 'panel'],
  ['market', 'adjustment-factors'],
  ['skills', 'status'],
  ['skills', 'sync'],
  ['skills', 'remove'],
];

test('exposes all remote and local capability paths', async () => {
  expect(remoteCapabilities).toHaveLength(79);
  expect(localCapabilities.map((item) => item.command.join(' ')).sort()).toEqual(
    localCommands.map((item) => item.join(' ')).sort(),
  );
  for (const command of localCommands) {
    const result = await execa('node', ['dist/cli/main.js', 'help', ...command], { reject: false });
    expect(result.exitCode, command.join(' ')).toBe(0);
  }
}, 30_000);

test('local command schemas expose required CLI options', async () => {
  const expected = new Map([
    ['db.query', ['--sql <sql>']],
    ['market.panel', ['--start <date>', '--end <date>', '--output <path>']],
    ['market.adjustment-factors', ['--thscode <code>']],
    ['skills.sync', ['--agent <name>', '--directory <absolute-path>', '--copy', '--repair']],
    ['skills.remove', ['--agent <name>']],
  ]);

  for (const [id, flags] of expected) {
    const result = await execa('node', ['dist/cli/main.js', 'schema', id, '--format', 'json']);
    const schema = JSON.parse(result.stdout) as {
      data: { options?: Array<{ flags: string; required?: boolean }> };
    };
    expect(schema.data.options?.map((option) => option.flags)).toEqual(
      expect.arrayContaining(flags),
    );
    for (const flag of flags) {
      const option = schema.data.options?.find((candidate) => candidate.flags === flag);
      expect(option).toBeDefined();
      if (
        flag === '--sql <sql>' ||
        flag === '--start <date>' ||
        flag === '--end <date>' ||
        flag === '--output <path>' ||
        flag === '--thscode <code>'
      )
        expect(option?.required).toBe(true);
    }
  }
});
