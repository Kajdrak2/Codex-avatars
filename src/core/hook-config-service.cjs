'use strict';

const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {
  hasInstalledHooks,
  mergeHooksConfig,
  removeHooksConfig,
} = require('./hook-config.cjs');

function defaultHooksPath() {
  const codexBase = process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
  return path.join(codexBase, 'hooks.json');
}

async function readConfig(hooksPath = defaultHooksPath()) {
  try {
    const source = await fs.readFile(hooksPath, 'utf8');
    return { exists: true, config: JSON.parse(source) };
  } catch (error) {
    if (error.code === 'ENOENT') return { exists: false, config: {} };
    if (error instanceof SyntaxError) {
      throw new Error(`Cannot update ${hooksPath}: the existing JSON is invalid.`);
    }
    throw error;
  }
}

async function writeConfig(hooksPath, config, shouldBackup) {
  await fs.mkdir(path.dirname(hooksPath), { recursive: true });
  let backupPath = null;

  if (shouldBackup) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    backupPath = `${hooksPath}.backup-${stamp}`;
    await fs.copyFile(hooksPath, backupPath);
  }

  const serialized = `${JSON.stringify(config, null, 2)}\n`;
  await fs.writeFile(hooksPath, serialized, 'utf8');
  return backupPath;
}

async function installHooks(scriptPath, hooksPath = defaultHooksPath()) {
  const current = await readConfig(hooksPath);
  const next = mergeHooksConfig(current.config, scriptPath);
  const backupPath = await writeConfig(hooksPath, next, current.exists);
  return { hooksPath, backupPath, installed: true };
}

async function uninstallHooks(hooksPath = defaultHooksPath()) {
  const current = await readConfig(hooksPath);
  if (!current.exists || !hasInstalledHooks(current.config)) {
    return { hooksPath, backupPath: null, installed: false, changed: false };
  }

  const next = removeHooksConfig(current.config);
  const backupPath = await writeConfig(hooksPath, next, true);
  return { hooksPath, backupPath, installed: false, changed: true };
}

async function hooksStatus(hooksPath = defaultHooksPath()) {
  const current = await readConfig(hooksPath);
  return { hooksPath, installed: current.exists && hasInstalledHooks(current.config) };
}

module.exports = {
  defaultHooksPath,
  hooksStatus,
  installHooks,
  readConfig,
  uninstallHooks,
};
