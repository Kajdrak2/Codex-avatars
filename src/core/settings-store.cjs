'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const DEFAULT_SETTINGS = Object.freeze({
  schemaVersion: 2,
  passive: true,
  enabledAvatarIds: [],
  avatarSelectionInitialized: false,
  autoEnableNewAvatars: true,
  avatarSize: 118,
  showLabels: true,
  reducedMotion: false,
  zone: {
    mode: 'all',
    displayIds: [],
    custom: null,
  },
});

function clampInteger(value, minimum, maximum, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.round(parsed)));
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean))];
}

function normalizeCustomRect(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return {
    x: clampInteger(value.x, -100_000, 100_000, 0),
    y: clampInteger(value.y, -100_000, 100_000, 0),
    width: clampInteger(value.width, 160, 100_000, 960),
    height: clampInteger(value.height, 120, 100_000, 540),
  };
}

function normalizeZone(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const mode = ['all', 'displays', 'custom'].includes(source.mode) ? source.mode : 'all';
  return {
    mode,
    displayIds: normalizeStringArray(source.displayIds),
    custom: normalizeCustomRect(source.custom),
  };
}

function normalizeSettings(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    schemaVersion: DEFAULT_SETTINGS.schemaVersion,
    passive: source.passive === undefined ? DEFAULT_SETTINGS.passive : Boolean(source.passive),
    enabledAvatarIds: normalizeStringArray(source.enabledAvatarIds),
    avatarSelectionInitialized: Boolean(source.avatarSelectionInitialized),
    autoEnableNewAvatars: source.autoEnableNewAvatars === undefined
      ? DEFAULT_SETTINGS.autoEnableNewAvatars
      : Boolean(source.autoEnableNewAvatars),
    avatarSize: clampInteger(source.avatarSize, 72, 180, DEFAULT_SETTINGS.avatarSize),
    showLabels: source.showLabels === undefined ? DEFAULT_SETTINGS.showLabels : Boolean(source.showLabels),
    reducedMotion: source.reducedMotion === undefined
      ? DEFAULT_SETTINGS.reducedMotion
      : Boolean(source.reducedMotion),
    zone: normalizeZone(source.zone),
  };
}

function mergeSettings(current, patch) {
  const source = patch && typeof patch === 'object' && !Array.isArray(patch) ? patch : {};
  const merged = {
    ...current,
    ...source,
    zone: source.zone ? { ...current.zone, ...source.zone } : current.zone,
  };
  return normalizeSettings(merged);
}

class SettingsStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.value = normalizeSettings(DEFAULT_SETTINGS);
    this.loadError = null;
  }

  async load() {
    try {
      const source = await fs.readFile(this.filePath, 'utf8');
      this.value = normalizeSettings(JSON.parse(source));
      this.loadError = null;
    } catch (error) {
      if (error.code !== 'ENOENT') this.loadError = error.message;
      this.value = normalizeSettings(DEFAULT_SETTINGS);
    }
    return this.snapshot();
  }

  async update(patch) {
    this.value = mergeSettings(this.value, patch);
    await this.#write();
    return this.snapshot();
  }

  snapshot() {
    return structuredClone(this.value);
  }

  async #write() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.${process.pid}.tmp`;
    await fs.writeFile(temporaryPath, `${JSON.stringify(this.value, null, 2)}\n`, 'utf8');
    await fs.rename(temporaryPath, this.filePath);
  }
}

module.exports = {
  DEFAULT_SETTINGS,
  SettingsStore,
  mergeSettings,
  normalizeSettings,
  normalizeZone,
};
