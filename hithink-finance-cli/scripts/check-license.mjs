import { access } from 'node:fs/promises';

try {
  await access(new URL('../LICENSE', import.meta.url));
} catch {
  process.stderr.write(
    'LICENSE_APPROVAL_REQUIRED: an approved LICENSE is required before public npm publishing.\n',
  );
  process.exitCode = 1;
}
