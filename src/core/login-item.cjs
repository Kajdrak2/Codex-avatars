'use strict';

const { execFileSync } = require('node:child_process');
const path = require('node:path');

const LOGIN_ITEM_NAME = 'dev.codexavatars.desktop';
const LOGIN_ITEM_ARGS = Object.freeze(['--background']);
const LEGACY_LOGIN_ITEM_NAMES = Object.freeze(['Codex Avatars']);
const RUN_REGISTRY_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
const STARTUP_APPROVED_REGISTRY_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run';

function loginItemQuery(executablePath) {
  if (typeof executablePath !== 'string' || !executablePath.trim()) {
    throw new TypeError('A login item executable path is required.');
  }
  return { path: executablePath, args: [...LOGIN_ITEM_ARGS] };
}

function normalizedExecutablePath(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim().replace(/^"(.*)"$/, '$1');
  return path.win32.normalize(trimmed).toLocaleLowerCase('en-US');
}

function normalizedName(value) {
  return typeof value === 'string' ? value.trim().toLocaleLowerCase('en-US') : '';
}

function normalizedArgs(value) {
  return Array.isArray(value) ? value.map((argument) => String(argument)) : [];
}

function isUserLaunchItem(item) {
  return item && (!item.scope || item.scope === 'user');
}

function decodeRegistryOutput(output) {
  if (typeof output === 'string') return output;
  if (!Buffer.isBuffer(output)) return '';
  const sampleLength = Math.min(output.length, 128);
  let nullBytes = 0;
  for (let index = 0; index < sampleLength; index += 1) {
    if (output[index] === 0) nullBytes += 1;
  }
  return output.toString(nullBytes > sampleLength / 4 ? 'utf16le' : 'utf8');
}

function parseRegistryQueryOutput(output, valueName) {
  const expectedName = normalizedName(valueName);
  for (const line of decodeRegistryOutput(output).split(/\r?\n/u)) {
    const match = line.match(/^\s*(.+?)\s+(REG_[A-Z0-9_]+)\s+(.*?)\s*$/iu);
    if (!match || normalizedName(match[1]) !== expectedName) continue;
    return { type: match[2].toUpperCase(), data: match[3] };
  }
  return null;
}

function readWindowsRegistryValue(key, valueName) {
  if (process.platform !== 'win32') return null;
  const regExecutable = process.env.SystemRoot
    ? path.win32.join(process.env.SystemRoot, 'System32', 'reg.exe')
    : 'reg.exe';
  try {
    const output = execFileSync(regExecutable, ['query', key, '/v', valueName], {
      encoding: null,
      maxBuffer: 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
      windowsHide: true,
    });
    return parseRegistryQueryOutput(output, valueName);
  } catch {
    return null;
  }
}

function registryCommandExecutable(command) {
  if (typeof command !== 'string') return '';
  const trimmed = command.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('"')) {
    const closingQuote = trimmed.indexOf('"', 1);
    return closingQuote > 1 ? trimmed.slice(1, closingQuote) : '';
  }
  return trimmed.split(/\s+/u, 1)[0] || '';
}

function registryEntryTargetsExecutable(entry, executablePath) {
  return Boolean(entry)
    && normalizedExecutablePath(registryCommandExecutable(entry.data))
      === normalizedExecutablePath(executablePath);
}

function startupApprovalIsEnabled(entry) {
  if (!entry || entry.type !== 'REG_BINARY') return true;
  const compact = String(entry.data || '').replace(/\s+/gu, '');
  if (!/^[0-9a-f]{2}/iu.test(compact)) return true;
  return Number.parseInt(compact.slice(0, 2), 16) !== 0x03;
}

function inspectRegistryItems(executablePath, readRegistryValue) {
  return [LOGIN_ITEM_NAME, ...LEGACY_LOGIN_ITEM_NAMES].map((name) => {
    let registration = null;
    try {
      registration = readRegistryValue(RUN_REGISTRY_KEY, name);
    } catch {
      // Registry inspection is an additional Windows reliability layer. Electron remains the fallback.
    }
    const registered = registryEntryTargetsExecutable(registration, executablePath);
    let startupApproval = null;
    if (registered) {
      try {
        startupApproval = readRegistryValue(STARTUP_APPROVED_REGISTRY_KEY, name);
      } catch {
        // A missing approval value means the Run entry is enabled by Windows' default behavior.
      }
    }
    return {
      name,
      registered,
      enabled: registered && startupApprovalIsEnabled(startupApproval),
      registration,
      startupApproval,
    };
  });
}

function inspectLaunchAtLogin(electronApp, executablePath, options = {}) {
  const query = loginItemQuery(executablePath);
  const status = electronApp.getLoginItemSettings(query) || {};
  const launchItems = Array.isArray(status.launchItems) ? status.launchItems : [];
  const executable = normalizedExecutablePath(executablePath);
  const ownedNames = new Set([LOGIN_ITEM_NAME, ...LEGACY_LOGIN_ITEM_NAMES].map(normalizedName));
  const relevantItems = launchItems.filter((item) => (
    normalizedExecutablePath(item?.path) === executable
    && ownedNames.has(normalizedName(item?.name))
  ));
  const readRegistryValue = options.readRegistryValue || readWindowsRegistryValue;
  const registryItems = inspectRegistryItems(executablePath, readRegistryValue);
  const registeredRegistryItems = registryItems.filter((item) => item.registered);

  let enabled;
  if (registeredRegistryItems.length) {
    enabled = registeredRegistryItems.some((item) => item.enabled);
  } else if (relevantItems.length) {
    enabled = relevantItems.some((item) => item.enabled !== false);
  } else if (launchItems.length) {
    enabled = false;
  } else {
    // Electron 43 can return openAtLogin=true, executableWillLaunchAtLogin=false and no
    // launchItems for an enabled custom-name Run entry. Exact openAtLogin is authoritative here.
    enabled = Boolean(status.openAtLogin);
  }

  return { enabled, query, registryItems, relevantItems, status };
}

function getLaunchAtLogin(electronApp, executablePath, options = {}) {
  return inspectLaunchAtLogin(electronApp, executablePath, options).enabled;
}

function removalTargets(relevantItems, query) {
  const targets = new Map();
  const add = (name, item = null) => {
    const key = normalizedName(name);
    if (!key || targets.has(key)) return;
    targets.set(key, {
      name,
      path: item?.path || query.path,
      args: normalizedArgs(item?.args || query.args),
    });
  };

  add(LOGIN_ITEM_NAME);
  for (const name of LEGACY_LOGIN_ITEM_NAMES) add(name);
  for (const item of relevantItems) {
    if (isUserLaunchItem(item)) add(item.name, item);
  }
  return [...targets.values()];
}

function removeUserLoginItems(electronApp, relevantItems, query) {
  for (const target of removalTargets(relevantItems, query)) {
    electronApp.setLoginItemSettings({
      openAtLogin: false,
      name: target.name,
      path: target.path,
      args: target.args,
    });
  }
}

function writeCanonicalLoginItem(electronApp, query, enabled) {
  electronApp.setLoginItemSettings({
    openAtLogin: true,
    enabled: Boolean(enabled),
    name: LOGIN_ITEM_NAME,
    path: query.path,
    args: [...query.args],
  });
}

function setLaunchAtLogin(electronApp, executablePath, enabled, options = {}) {
  const before = inspectLaunchAtLogin(electronApp, executablePath, options);
  removeUserLoginItems(electronApp, before.relevantItems, before.query);
  if (enabled) writeCanonicalLoginItem(electronApp, before.query, true);
  return getLaunchAtLogin(electronApp, executablePath, options);
}

function normalizeLaunchAtLogin(electronApp, executablePath, options = {}) {
  const before = inspectLaunchAtLogin(electronApp, executablePath, options);
  const userItems = before.relevantItems.filter(isUserLaunchItem);
  const legacyNames = new Set(LEGACY_LOGIN_ITEM_NAMES.map(normalizedName));
  const hasLegacyRegistryItem = before.registryItems.some((item) => (
    item.registered && legacyNames.has(normalizedName(item.name))
  ));
  const hasLegacyElectronItem = userItems.some((item) => legacyNames.has(normalizedName(item.name)));
  if (!hasLegacyRegistryItem && !hasLegacyElectronItem) return before.enabled;

  removeUserLoginItems(electronApp, userItems, before.query);
  writeCanonicalLoginItem(electronApp, before.query, before.enabled);
  return getLaunchAtLogin(electronApp, executablePath, options);
}

module.exports = {
  LEGACY_LOGIN_ITEM_NAMES,
  LOGIN_ITEM_ARGS,
  LOGIN_ITEM_NAME,
  RUN_REGISTRY_KEY,
  STARTUP_APPROVED_REGISTRY_KEY,
  getLaunchAtLogin,
  inspectLaunchAtLogin,
  loginItemQuery,
  normalizeLaunchAtLogin,
  parseRegistryQueryOutput,
  readWindowsRegistryValue,
  setLaunchAtLogin,
};
