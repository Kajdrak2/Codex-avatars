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
  assert.equal(settings.mainAvatarSize, 180);
  assert.equal(settings.subagentAvatarSize, 180);
  assert.equal(settings.schemaVersion, 7);
  assert.equal(settings.language, 'en');
  assert.equal(settings.overlayEnabled, true);
  assert.equal(settings.showAgentDetails, true);
  assert.equal(settings.showDormantAgents, false);
  assert.equal(settings.onboardingCompleted, false);
  assert.equal(settings.pluginOnboardingShown, false);
  assert.deepEqual(settings.enabledAvatarIds, ['minuit']);
  assert.deepEqual(settings.zone.custom, { x: -50, y: 12, width: 160, height: 120 });
});

test('defaults to English and accepts only the supported French alternative', () => {
  assert.equal(normalizeSettings({ language: 'de' }).language, 'en');
  assert.equal(normalizeSettings({ language: 'fr' }).language, 'fr');
});

test('persists a deep zone patch atomically', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-avatars-settings-'));
  const filePath = path.join(directory, 'settings.json');
  const store = new SettingsStore(filePath);
  await store.load();
  await store.update({ zone: { mode: 'displays', displayIds: ['2'] }, passive: false, overlayEnabled: false });
  await store.update({ mainAvatarSize: 132, subagentAvatarSize: 96 });

  const reloaded = new SettingsStore(filePath);
  const settings = await reloaded.load();
  assert.equal(settings.passive, false);
  assert.equal(settings.overlayEnabled, false);
  assert.equal(settings.zone.mode, 'displays');
  assert.deepEqual(settings.zone.displayIds, ['2']);
  assert.equal(settings.mainAvatarSize, 132);
  assert.equal(settings.subagentAvatarSize, 96);
  await fs.rm(directory, { recursive: true, force: true });
});

test('serializes concurrent updates without losing either setting', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-avatars-settings-race-'));
  const filePath = path.join(directory, 'settings.json');
  const store = new SettingsStore(filePath);
  await store.load();
  await Promise.all([
    store.update({ language: 'fr' }),
    store.update({ mainAvatarSize: 146 }),
    store.update({ showAgentDetails: false }),
  ]);
  const reloaded = new SettingsStore(filePath);
  const settings = await reloaded.load();
  assert.equal(settings.language, 'fr');
  assert.equal(settings.mainAvatarSize, 146);
  assert.equal(settings.showAgentDetails, false);
  const files = await fs.readdir(directory);
  assert.deepEqual(files, ['settings.json']);
  await fs.rm(directory, { recursive: true, force: true });
});

test('migrates the former shared avatar size to both agent roles', () => {
  const settings = normalizeSettings({ schemaVersion: 4, avatarSize: 126 });
  assert.equal(settings.mainAvatarSize, 126);
  assert.equal(settings.subagentAvatarSize, 126);
  assert.equal('avatarSize' in settings, false);
});

test('persists the dormant-agent visibility preference', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-avatars-dormant-setting-'));
  const filePath = path.join(directory, 'settings.json');
  const store = new SettingsStore(filePath);
  await store.load();
  await store.update({ showDormantAgents: true });
  const reloaded = new SettingsStore(filePath);
  assert.equal((await reloaded.load()).showDormantAgents, true);
  await fs.rm(directory, { recursive: true, force: true });
});
