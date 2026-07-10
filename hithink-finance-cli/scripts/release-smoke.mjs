import { execFileSync } from 'node:child_process';

const options = { stdio: 'inherit', shell: process.platform === 'win32' };
execFileSync('npm', ['run', 'verify'], options);
execFileSync('npm', ['pack', '--dry-run', '--ignore-scripts'], options);
