import type { Command } from 'commander';
import type { CliContext } from '../../cli/context.js';
import { remoteCapabilities } from '../../contracts/remote-capabilities.js';
import { registerRemoteCapabilityGroup, type RemoteCommandDependencies } from '../remote.js';

/** Register all remote fund profile, performance, holder, and market commands. */
export function registerFundCommands(
  program: Command,
  context: CliContext,
  dependencies: RemoteCommandDependencies,
): void {
  registerRemoteCapabilityGroup(
    program,
    'fund',
    remoteCapabilities.filter((item) => item.command[0] === 'fund'),
    context,
    dependencies,
  );
}
