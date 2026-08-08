'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { SettingsStore, normalizeSettings } = require('../src/core/settings-store.cjs');

test('normalizes unsafe or out-of-range settings', () => {
  const settings = normalizeSettings({
    avatarSize: 999,
    enabledAvatarIds: ['minuit', 'minuit', '', 42],
    zone: { mode: 'custom', custom: { x: -50, y: 12, width: 20, height: 9 } },
  });
  assert.equal(settings.avatarSize, 180);
  assert.deepEqual(settings.enabledAvatarIds, ['minuit']);
  assert.deepEqual(settings.zone.custom, { x: -50, y: 12, width: 160, height: 120 });
});

test('persists a deep zone patch atomically', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-avatars-settings-'));
  const filePath = path.join(directory, 'settings.json');
  const store = new SettingsStore(filePath);
  await store.load();
  await store.update({ zone: { mode: 'displays', displayIds: ['2'] }, passive: false });
  await store.update({ avatarSize: 132 });

  const reloaded = new SettingsStore(filePath);
  const settings = await reloaded.load();
  assert.equal(settings.passive, false);
  assert.equal(settings.zone.mode, 'displays');
  assert.deepEqual(settings.zone.displayIds, ['2']);
  assert.equal(settings.avatarSize, 132);
  await fs.rm(directory, { recursive: true, force: true });
});
