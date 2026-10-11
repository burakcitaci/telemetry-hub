import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

// Resolve uv's installed tool even when the parent application's PATH is stale.
const windowsPython = join(
  process.env.APPDATA ?? join(homedir(), 'AppData', 'Roaming'),
  'uv', 'tools', 'graphifyy', 'Scripts', 'python.exe',
);
const usePython = process.platform === 'win32' && existsSync(windowsPython);
const command = usePython ? windowsPython : 'graphify';
const args = [...(usePython ? ['-m', 'graphify'] : []), ...process.argv.slice(2)];
const result = spawnSync(command, args, { stdio: 'inherit' });

if (result.error) {
  console.error(`Unable to start Graphify: ${result.error.message}`);
  console.error('Install it with: uv tool install graphifyy');
}
process.exit(result.status ?? 1);
