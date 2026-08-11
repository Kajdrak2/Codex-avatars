'use strict';

const path = require('node:path');

const LOGIN_ITEM_NAME = 'dev.codexavatars.desktop';
const LOGIN_ITEM_ARGS = Object.freeze(['--background']);
const LEGACY_LOGIN_ITEM_NAMES = Object.freeze(['Codex Avatars']);

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

function sameArguments(left, right) {
  const leftArgs = normalizedArgs(left);
  const rightArgs = normalizedArgs(right);
  return leftArgs.length === rightArgs.length
    && leftArgs.every((argument, index) => argument === rightArgs[index]);
}

function isUserLaunchItem(item) {
  return item && (!item.scope || item.scope === 'user');
}

function inspectLaunchAtLogin(electronApp, executablePath) {
  const query = loginItemQuery(executablePath);
  const status = electronApp.getLoginItemSettings(query) || {};
  const launchItems = Array.isArray(status.launchItems) ? status.launchItems : [];
  const executable = normalizedExecutablePath(executablePath);
  const ownedNames = new Set([LOGIN_ITEM_NAME, ...LEGACY_LOGIN_ITEM_NAMES].map(normalizedName));
  const relevantItems = launchItems.filter((item) => {
    if (normalizedExecutablePath(item?.path) !== executable) return false;
    return ownedNames.has(normalizedName(item.name)) || sameArguments(item.args, query.args);
  });

  const enabled = relevantItems.length
    ? relevantItems.some((item) => item.enabled !== false)
    : Boolean(status.openAtLogin && status.executableWillLaunchAtLogin !== false);

  return { enabled, query, relevantItems, status };
}

function getLaunchAtLogin(electronApp, executablePath) {
  return inspectLaunchAtLogin(electronApp, executablePath).enabled;
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

function setLaunchAtLogin(electronApp, executablePath, enabled) {
  const before = inspectLaunchAtLogin(electronApp, executablePath);
  removeUserLoginItems(electronApp, before.relevantItems, before.query);
  if (enabled) writeCanonicalLoginItem(electronApp, before.query, true);
  return getLaunchAtLogin(electronApp, executablePath);
}

function normalizeLaunchAtLogin(electronApp, executablePath) {
  const before = inspectLaunchAtLogin(electronApp, executablePath);
  const userItems = before.relevantItems.filter(isUserLaunchItem);
  if (!userItems.length) return before.enabled;

  const canonicalItems = userItems.filter((item) => (
    normalizedName(item.name) === normalizedName(LOGIN_ITEM_NAME)
    && sameArguments(item.args, before.query.args)
  ));
  if (userItems.length === 1 && canonicalItems.length === 1) return before.enabled;

  const enabled = userItems.some((item) => item.enabled !== false);
  removeUserLoginItems(electronApp, userItems, before.query);
  writeCanonicalLoginItem(electronApp, before.query, enabled);
  return getLaunchAtLogin(electronApp, executablePath);
}

module.exports = {
  LEGACY_LOGIN_ITEM_NAMES,
  LOGIN_ITEM_ARGS,
  LOGIN_ITEM_NAME,
  getLaunchAtLogin,
  inspectLaunchAtLogin,
  loginItemQuery,
  normalizeLaunchAtLogin,
  setLaunchAtLogin,
};
