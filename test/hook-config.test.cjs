'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  EVENTS,
  hasInstalledHooks,
  mergeHooksConfig,
  removeHooksConfig,
} = require('../src/core/hook-config.cjs');

test('merges hooks without replacing unrelated user handlers', () => {
  const existing = {
    description: 'My hooks',
    hooks: {
      Stop: [{ hooks: [{ type: 'command', command: 'my-existing-command' }] }],
    },
    customField: true,
  };

  const merged = mergeHooksConfig(existing, 'C:\\Program Files\\Codex Avatars\\codex-hook.ps1');
  assert.equal(merged.description, 'My hooks');
  assert.equal(merged.customField, true);
  assert.equal(merged.hooks.Stop[0].hooks[0].command, 'my-existing-command');
  assert.equal(merged.hooks.Stop.length, 2);
  assert.equal(hasInstalledHooks(merged), true);
  for (const [eventName] of EVENTS) assert.ok(merged.hooks[eventName]);
  assert.equal(Object.hasOwn(merged.hooks.SessionEnd.at(-1).hooks[0], 'timeout'), false);
});

test('installation is idempotent and removal preserves other hooks', () => {
  const first = mergeHooksConfig({}, 'C:\\first\\codex-hook.ps1');
  const second = mergeHooksConfig(first, 'C:\\second\\codex-hook.ps1');
  for (const [eventName] of EVENTS) assert.equal(second.hooks[eventName].length, 1);

  second.hooks.Stop.unshift({ hooks: [{ type: 'command', command: 'keep-me' }] });
  const removed = removeHooksConfig(second);
  assert.equal(hasInstalledHooks(removed), false);
  assert.equal(removed.hooks.Stop[0].hooks[0].command, 'keep-me');
});
