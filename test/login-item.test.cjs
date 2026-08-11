'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  LOGIN_ITEM_ARGS,
  LOGIN_ITEM_NAME,
  RUN_REGISTRY_KEY,
  STARTUP_APPROVED_REGISTRY_KEY,
  getLaunchAtLogin,
  normalizeLaunchAtLogin,
  parseRegistryQueryOutput,
  setLaunchAtLogin,
} = require('../src/core/login-item.cjs');

const EXECUTABLE = 'C:\\Users\\Test\\AppData\\Local\\Programs\\Codex Avatars\\Codex Avatars.exe';

class FakeElectronApp {
  constructor(items = [], statusOverrides = {}) {
    this.items = items.map((entry) => ({ scope: 'user', enabled: true, ...entry }));
    this.statusOverrides = statusOverrides;
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
      ...this.statusOverrides,
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

function registryReader(app) {
  return (key, name) => {
    const entry = app.items.find((candidate) => (
      candidate.scope !== 'machine'
      && candidate.name.toLowerCase() === name.toLowerCase()
    ));
    if (!entry) return null;
    if (key === RUN_REGISTRY_KEY) {
      return { type: 'REG_SZ', data: `"${entry.path}" ${(entry.args || []).join(' ')}`.trim() };
    }
    if (key === STARTUP_APPROVED_REGISTRY_KEY) {
      return {
        type: 'REG_BINARY',
        data: entry.enabled === false ? '030000000000000000000000' : '020000000000000000000000',
      };
    }
    return null;
  };
}

function optionsFor(app) {
  return { readRegistryValue: registryReader(app) };
}

test('queries Windows with the same executable and arguments used for registration', () => {
  const app = new FakeElectronApp([item(LOGIN_ITEM_NAME)]);
  assert.equal(getLaunchAtLogin(app, EXECUTABLE, optionsFor(app)), true);
  assert.deepEqual(app.reads[0], { path: EXECUTABLE, args: ['--background'] });
});

test('trusts an exact openAtLogin match when Electron omits launchItems and contradicts itself', () => {
  const app = new FakeElectronApp([], {
    openAtLogin: true,
    executableWillLaunchAtLogin: false,
    launchItems: [],
  });
  assert.equal(getLaunchAtLogin(app, EXECUTABLE, { readRegistryValue: () => null }), true);
});

test('reports a StartupApproved-disabled canonical item as disabled', () => {
  const app = new FakeElectronApp([item(LOGIN_ITEM_NAME, { enabled: false })], {
    openAtLogin: true,
    executableWillLaunchAtLogin: false,
    launchItems: [],
  });
  assert.equal(getLaunchAtLogin(app, EXECUTABLE, optionsFor(app)), false);
});

test('detects an enabled legacy item even when Electron omits launchItems', () => {
  const app = new FakeElectronApp([item('Codex Avatars')], {
    openAtLogin: false,
    executableWillLaunchAtLogin: false,
    launchItems: [],
  });
  assert.equal(getLaunchAtLogin(app, EXECUTABLE, optionsFor(app)), true);
});

test('enabling removes legacy duplicates and writes one enabled canonical item', () => {
  const app = new FakeElectronApp([
    item('Codex Avatars', { enabled: false }),
    item(LOGIN_ITEM_NAME, { enabled: false }),
  ], { launchItems: [] });
  assert.equal(setLaunchAtLogin(app, EXECUTABLE, true, optionsFor(app)), true);
  assert.deepEqual(app.items, [item(LOGIN_ITEM_NAME)]);
});

test('disabling removes only the two Codex Avatars user entries', () => {
  const otherExecutable = 'C:\\Tools\\Unrelated.exe';
  const custom = item('User custom Codex entry');
  const app = new FakeElectronApp([
    item('Codex Avatars'),
    item(LOGIN_ITEM_NAME),
    custom,
    { name: 'Unrelated', path: otherExecutable, args: ['--background'] },
  ]);
  assert.equal(setLaunchAtLogin(app, EXECUTABLE, false, optionsFor(app)), false);
  assert.deepEqual(app.items, [
    custom,
    { name: 'Unrelated', path: otherExecutable, args: ['--background'], scope: 'user', enabled: true },
  ]);
});

test('startup migration detects hidden duplicates and preserves enabled state', () => {
  const app = new FakeElectronApp([item('Codex Avatars'), item(LOGIN_ITEM_NAME)], {
    executableWillLaunchAtLogin: false,
    launchItems: [],
  });
  assert.equal(normalizeLaunchAtLogin(app, EXECUTABLE, optionsFor(app)), true);
  assert.deepEqual(app.items, [item(LOGIN_ITEM_NAME)]);
});

test('startup migration preserves a Windows-disabled legacy item', () => {
  const app = new FakeElectronApp([item('Codex Avatars', { enabled: false })], {
    openAtLogin: true,
    executableWillLaunchAtLogin: false,
    launchItems: [],
  });
  assert.equal(normalizeLaunchAtLogin(app, EXECUTABLE, optionsFor(app)), false);
  assert.deepEqual(app.items, [item(LOGIN_ITEM_NAME, { enabled: false })]);
});

test('startup migration leaves an already canonical registration untouched', () => {
  const app = new FakeElectronApp([item(LOGIN_ITEM_NAME)]);
  assert.equal(normalizeLaunchAtLogin(app, EXECUTABLE, optionsFor(app)), true);
  assert.equal(app.writes.length, 0);
});

test('machine and unrelated executable entries are never removed', () => {
  const app = new FakeElectronApp([
    item('Machine Codex', { scope: 'machine' }),
    { name: 'Codex Avatars Copy', path: 'C:\\Another App\\app.exe', args: ['--background'] },
  ]);
  setLaunchAtLogin(app, EXECUTABLE, false, optionsFor(app));
  assert.equal(app.items.length, 2);
  assert.equal(app.items.some((entry) => entry.scope === 'machine'), true);
  assert.equal(app.items.some((entry) => entry.path === 'C:\\Another App\\app.exe'), true);
});

test('parses REG_SZ and UTF-16 REG_BINARY query output', () => {
  const runOutput = `\r\nHKEY_CURRENT_USER\\Software\\Example\r\n    Codex Avatars    REG_SZ    "${EXECUTABLE}" --background\r\n`;
  assert.deepEqual(parseRegistryQueryOutput(Buffer.from(runOutput, 'utf8'), 'Codex Avatars'), {
    type: 'REG_SZ',
    data: `"${EXECUTABLE}" --background`,
  });
  const approvedOutput = '\r\nHKEY_CURRENT_USER\\Software\\Example\r\n    dev.codexavatars.desktop    REG_BINARY    030000000000000000000000\r\n';
  assert.deepEqual(
    parseRegistryQueryOutput(Buffer.from(approvedOutput, 'utf16le'), LOGIN_ITEM_NAME),
    { type: 'REG_BINARY', data: '030000000000000000000000' },
  );
});
