'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  LOGIN_ITEM_ARGS,
  LOGIN_ITEM_NAME,
  getLaunchAtLogin,
  normalizeLaunchAtLogin,
  setLaunchAtLogin,
} = require('../src/core/login-item.cjs');

const EXECUTABLE = 'C:\\Users\\Test\\AppData\\Local\\Programs\\Codex Avatars\\Codex Avatars.exe';

class FakeElectronApp {
  constructor(items = []) {
    this.items = items.map((entry) => ({ scope: 'user', enabled: true, ...entry }));
    this.reads = [];
    this.writes = [];
  }

  getLoginItemSettings(options) {
    this.reads.push(options);
    const exact = this.items.filter((entry) => (
      entry.path.toLowerCase() === options.path.toLowerCase()
      && JSON.stringify(entry.args || []) === JSON.stringify(options.args || [])
    ));
    const sameExecutable = this.items.filter((entry) => (
      entry.path.toLowerCase() === options.path.toLowerCase()
    ));
    return {
      openAtLogin: exact.length > 0,
      executableWillLaunchAtLogin: sameExecutable.some((entry) => entry.enabled !== false),
      launchItems: this.items.map((entry) => ({ ...entry, args: [...(entry.args || [])] })),
    };
  }

  setLoginItemSettings(settings) {
    this.writes.push(settings);
    if (!settings.openAtLogin) {
      this.items = this.items.filter((entry) => (
        entry.scope === 'machine' || entry.name.toLowerCase() !== settings.name.toLowerCase()
      ));
      return;
    }
    this.items = this.items.filter((entry) => (
      entry.scope === 'machine' || entry.name.toLowerCase() !== settings.name.toLowerCase()
    ));
    this.items.push({
      name: settings.name,
      path: settings.path,
      args: [...(settings.args || [])],
      scope: 'user',
      enabled: settings.enabled !== false,
    });
  }
}

function item(name, overrides = {}) {
  return {
    name,
    path: EXECUTABLE,
    args: [...LOGIN_ITEM_ARGS],
    scope: 'user',
    enabled: true,
    ...overrides,
  };
}

test('queries Windows with the same executable and arguments used for registration', () => {
  const app = new FakeElectronApp([item(LOGIN_ITEM_NAME)]);
  assert.equal(getLaunchAtLogin(app, EXECUTABLE), true);
  assert.deepEqual(app.reads[0], { path: EXECUTABLE, args: ['--background'] });
});

test('reports a StartupApproved-disabled item as disabled', () => {
  const app = new FakeElectronApp([item(LOGIN_ITEM_NAME, { enabled: false })]);
  assert.equal(getLaunchAtLogin(app, EXECUTABLE), false);
});

test('enabling removes legacy duplicates and writes one enabled canonical item', () => {
  const app = new FakeElectronApp([
    item('Codex Avatars', { enabled: false }),
    item(LOGIN_ITEM_NAME, { enabled: false }),
  ]);
  assert.equal(setLaunchAtLogin(app, EXECUTABLE, true), true);
  assert.deepEqual(app.items, [item(LOGIN_ITEM_NAME)]);
});

test('disabling removes every user entry for the same startup command', () => {
  const otherExecutable = 'C:\\Tools\\Unrelated.exe';
  const app = new FakeElectronApp([
    item('Codex Avatars'),
    item(LOGIN_ITEM_NAME),
    item('User custom Codex entry'),
    { name: 'Unrelated', path: otherExecutable, args: ['--background'] },
  ]);
  assert.equal(setLaunchAtLogin(app, EXECUTABLE, false), false);
  assert.deepEqual(app.items, [{
    name: 'Unrelated', path: otherExecutable, args: ['--background'], scope: 'user', enabled: true,
  }]);
});

test('startup migration collapses duplicate legacy entries without changing enabled state', () => {
  const app = new FakeElectronApp([item('Codex Avatars'), item(LOGIN_ITEM_NAME)]);
  assert.equal(normalizeLaunchAtLogin(app, EXECUTABLE), true);
  assert.deepEqual(app.items, [item(LOGIN_ITEM_NAME)]);
});

test('startup migration preserves a Windows-disabled legacy item', () => {
  const app = new FakeElectronApp([item('Codex Avatars', { enabled: false })]);
  assert.equal(normalizeLaunchAtLogin(app, EXECUTABLE), false);
  assert.deepEqual(app.items, [item(LOGIN_ITEM_NAME, { enabled: false })]);
});

test('startup migration leaves an already canonical registration untouched', () => {
  const app = new FakeElectronApp([item(LOGIN_ITEM_NAME)]);
  assert.equal(normalizeLaunchAtLogin(app, EXECUTABLE), true);
  assert.equal(app.writes.length, 0);
});

test('machine and unrelated executable entries are never removed', () => {
  const app = new FakeElectronApp([
    item('Machine Codex', { scope: 'machine' }),
    { name: 'Codex Avatars', path: 'C:\\Another App\\app.exe', args: ['--background'] },
  ]);
  setLaunchAtLogin(app, EXECUTABLE, false);
  assert.equal(app.items.length, 2);
  assert.equal(app.items.some((entry) => entry.scope === 'machine'), true);
  assert.equal(app.items.some((entry) => entry.path === 'C:\\Another App\\app.exe'), true);
});
