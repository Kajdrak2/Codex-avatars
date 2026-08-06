'use strict';

const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  hooksStatus,
  installHooks,
  uninstallHooks,
} = require('../src/core/hook-config-service.cjs');

test('install and uninstall round-trip a temporary hook configuration', async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-avatars-hooks-'));
  const hooksPath = path.join(directory, 'hooks.json');
  context.after(() => fs.rm(directory, { recursive: true, force: true }));

  await fs.writeFile(hooksPath, JSON.stringify({
    hooks: {
      Stop: [{ hooks: [{ type: 'command', command: 'keep-this' }] }],
    },
  }), 'utf8');

  const installed = await installHooks('C:\\Codex Avatars\\codex-hook.ps1', hooksPath);
  assert.equal(installed.installed, true);
  assert.ok(installed.backupPath);
  assert.equal((await hooksStatus(hooksPath)).installed, true);

  const uninstalled = await uninstallHooks(hooksPath);
  assert.equal(uninstalled.changed, true);
  assert.equal((await hooksStatus(hooksPath)).installed, false);

  const finalConfig = JSON.parse(await fs.readFile(hooksPath, 'utf8'));
  assert.equal(finalConfig.hooks.Stop[0].hooks[0].command, 'keep-this');
});

test('invalid existing JSON is never overwritten', async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-avatars-invalid-'));
  const hooksPath = path.join(directory, 'hooks.json');
  context.after(() => fs.rm(directory, { recursive: true, force: true }));
  await fs.writeFile(hooksPath, '{ invalid', 'utf8');

  await assert.rejects(() => installHooks('C:\\hook.ps1', hooksPath), /existing JSON is invalid/);
  assert.equal(await fs.readFile(hooksPath, 'utf8'), '{ invalid');
});
