'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const pluginRoot = path.join(root, 'plugins', 'codex-avatars');

test('repo marketplace and plugin identifiers match', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(pluginRoot, '.codex-plugin', 'plugin.json')));
  const marketplace = JSON.parse(fs.readFileSync(path.join(root, '.agents', 'plugins', 'marketplace.json')));
  const entry = marketplace.plugins.find((plugin) => plugin.name === manifest.name);
  assert.ok(entry);
  assert.equal(entry.source.path, './plugins/codex-avatars');
  const packageManifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json')));
  assert.equal(manifest.version.split('+')[0], packageManifest.version);
  assert.match(manifest.version, /^0\.4\.7\+codex\.[a-z0-9-]+$/);
});

test('plugin bundles every lifecycle hook and the privacy-minimized bridge', () => {
  const hooks = JSON.parse(fs.readFileSync(path.join(pluginRoot, 'hooks', 'hooks.json')));
  const expected = [
    'SessionStart',
    'SessionEnd',
    'UserPromptSubmit',
    'Stop',
    'PermissionRequest',
    'SubagentStart',
    'SubagentStop',
  ];
  assert.deepEqual(Object.keys(hooks.hooks), expected);
  const commands = Object.values(hooks.hooks)
    .flatMap((groups) => groups)
    .flatMap((group) => group.hooks)
    .map((hook) => hook.command);
  assert.ok(commands.every((command) => command.includes('CODEX_AVATARS_HOOK_V1')));
  const pluginBridge = fs.readFileSync(path.join(pluginRoot, 'scripts', 'codex-hook.ps1'), 'utf8');
  const sourceBridge = fs.readFileSync(path.join(root, 'scripts', 'codex-hook.ps1'), 'utf8');
  assert.equal(pluginBridge, sourceBridge);
});
