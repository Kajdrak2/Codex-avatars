import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  hooksStatus,
  installHooks,
  uninstallHooks,
} = require('../src/core/hook-config-service.cjs');

const directory = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.join(directory, 'codex-hook.ps1');
const action = process.argv[2] || 'status';

let result;
switch (action) {
  case 'install':
    result = await installHooks(scriptPath);
    break;
  case 'uninstall':
    result = await uninstallHooks();
    break;
  case 'status':
    result = await hooksStatus();
    break;
  default:
    throw new Error(`Unknown action: ${action}`);
}

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
