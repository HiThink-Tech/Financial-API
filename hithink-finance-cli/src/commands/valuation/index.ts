import type { Command } from 'commander';
import type { CliContext } from '../../cli/context.js';
import { remoteCapabilities } from '../../contracts/remote-capabilities.js';
import { registerRemoteCapabilityGroup, type RemoteCommandDependencies } from '../remote.js';

/** Register current A-share valuation snapshot commands. */
export function registerValuationCommands(
  program: Command,
  context: CliContext,
  dependencies: RemoteCommandDependencies,
): void {
  registerRemoteCapabilityGroup(
    program,
    'valuation',
    remoteCapabilities.filter((item) => item.command[0] === 'valuation'),
    context,
    dependencies,
  );
}
