'use strict';

const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  globalShortcut,
  ipcMain,
  Menu,
  nativeImage,
  protocol,
  screen,
  shell,
  Tray,
} = require('electron');
const { AgentStore } = require('./core/agent-store.cjs');
const { AgentMetadataResolver, ThreadTitleMonitor } = require('./core/agent-metadata.cjs');
const { discoverAvatars, readWebpDimensions } = require('./core/avatar-library.cjs');
const { reconcileAvatarSelection } = require('./core/avatar-selection.cjs');
const { buildAvatarPrompt, codexNewThreadUrl } = require('./core/codex-launch.cjs');
const { normalizeHookEvent } = require('./core/event-normalizer.cjs');
const { createEventServer } = require('./core/pipe-server.cjs');
const {
  marketplacePath: resolvePluginMarketplacePath,
  pluginDeepLink,
} = require('./core/plugin-integration.cjs');
const {
  bootstrapWindowBounds,
  localRectToVirtual,
  resolveRoamingZone,
  serializeDisplay,
} = require('./core/roaming-zone.cjs');
const { exportPetPackage, importPetPackage } = require('./core/pet-packages.cjs');
const { mergeSettings, SettingsStore } = require('./core/settings-store.cjs');
const { checkForUpdate } = require('./core/update-check.cjs');
const {
  hooksStatus,
  installHooks,
  uninstallHooks,
} = require('./core/hook-config-service.cjs');

protocol.registerSchemesAsPrivileged([{
  scheme: 'codex-avatar',
  privileges: {
    standard: true,
    secure: true,
    supportFetchAPI: true,
  },
}]);

const store = new AgentStore();
const captureArgument = findArgument('--capture=');
const settingsCaptureArgument = findArgument('--capture-settings=');
const settingsScrollArgument = findArgument('--settings-scroll=');
const onboardingCapture = process.argv.includes('--capture-onboarding');
const zonePickerCaptureArgument = findArgument('--capture-zone-picker=');
const profileArgument = findArgument('--profile=');
const capturePath = captureArgument ? path.resolve(process.cwd(), captureArgument) : null;
const settingsCapturePath = settingsCaptureArgument
  ? path.resolve(process.cwd(), settingsCaptureArgument)
  : null;
const zonePickerCapturePath = zonePickerCaptureArgument
  ? path.resolve(process.cwd(), zonePickerCaptureArgument)
  : null;
if (profileArgument) app.setPath('userData', path.resolve(process.cwd(), profileArgument));
const eventServer = createEventServer(handlePayload, profileArgument
  ? { pipeName: `codex-avatars-preview-${process.pid}` }
  : undefined);
const backgroundLaunch = process.argv.includes('--background');
const commandLineAction = process.argv.includes('--install-hooks')
  ? 'install'
  : process.argv.includes('--uninstall-hooks')
    ? 'uninstall'
    : null;

let settingsStore = null;
let settings = null;
let overlayWindow = null;
let settingsWindow = null;
let zonePickerWindow = null;
let zonePickerResolve = null;
let zonePickerBounds = null;
let tray = null;
let cleanupTimer = null;
let avatarRefreshTimer = null;
let avatarRecords = [];
let avatarErrors = [];
let assetPaths = new Map();
let overlayHitTest = false;
let isQuitting = false;
let metadataResolver = null;
let threadTitleMonitor = null;
const pendingMetadata = new Set();
let demoSessionId = null;
const demoTimers = new Set();
let updateCheckStarted = false;

function findArgument(prefix) {
  const argument = process.argv.find((value) => value.startsWith(prefix));
  return argument ? argument.slice(prefix.length) : null;
}

async function promptForUpdate() {
  if (!app.isPackaged || updateCheckStarted) return;
  updateCheckStarted = true;
  let update = null;
  try {
    update = await checkForUpdate({
      currentVersion: app.getVersion(),
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    return;
  }
  if (!update) return;
  const french = settings?.language === 'fr';
  const result = await dialog.showMessageBox(settingsWindow, {
    type: 'info',
    title: 'Codex Avatars',
    message: french
      ? `Une mise à jour de Codex Avatars (${update.version}) est disponible.`
      : `A Codex Avatars update (${update.version}) is available.`,
    detail: french
      ? 'Téléchargez l’installateur, puis exécutez-le pour mettre à jour sans perdre vos réglages ni vos Pets.'
      : 'Download and run the installer to update without losing your settings or Pets.',
    buttons: french ? ['Télécharger la mise à jour', 'Plus tard'] : ['Download update', 'Later'],
    defaultId: 0,
    cancelId: 1,
    noLink: true,
  });
  if (result.response === 0) await shell.openExternal(update.downloadUrl);
}

function hookScriptPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'hooks', 'codex-hook.ps1')
    : path.join(__dirname, '..', 'scripts', 'codex-hook.ps1');
}

function codexHomePath() {
  return process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
}

function pluginMarketplacePath() {
  return resolvePluginMarketplacePath({
    isPackaged: app.isPackaged,
    resourcesPath: process.resourcesPath,
    appPath: path.join(__dirname, '..'),
  });
}

async function openPluginInCodex() {
  const marketplace = pluginMarketplacePath();
  try {
    await fs.access(marketplace);
    const url = pluginDeepLink(marketplace);
    await shell.openExternal(url);
    return { opened: true, url };
  } catch (error) {
    return { opened: false, message: error.message };
  }
}

function publicAvatar(record) {
  return {
    id: record.id,
    displayName: record.displayName,
    description: record.description,
    spriteVersionNumber: record.spriteVersionNumber,
    columns: record.columns,
    rows: record.rows,
    source: record.source,
    // `codex-avatar:` works in development but packaged Windows renderers can
    // reject a local WebP response from that custom protocol. Every record has
    // already passed the local Pet path and dimension checks, so a file URL is
    // the reliable renderer-only delivery path for this validated asset.
    assetUrl: pathToFileURL(record.spritesheetPath).toString(),
  };
}

function publicAvatars() {
  return avatarRecords.map(publicAvatar);
}

function currentDisplays() {
  const primaryId = String(screen.getPrimaryDisplay().id);
  return screen.getAllDisplays().map((display, index) => serializeDisplay({
    ...display,
    primary: String(display.id) === primaryId,
  }, index));
}

function currentZone() {
  return resolveRoamingZone(settings?.zone, currentDisplays());
}

async function refreshAvatarLibrary() {
  const result = await discoverAvatars([
    { path: path.join(codexHomePath(), 'pets'), source: 'codex-pet' },
    { path: path.join(app.getAppPath(), 'assets', 'avatars'), source: 'bundled' },
  ]);

  const valid = [];
  const validationErrors = [];
  for (const record of result.avatars) {
    const size = await readWebpDimensions(record.spritesheetPath);
    const expectedHeight = record.spriteVersionNumber === 2 ? 2288 : 1872;
    if (!size || size.width !== 1536 || size.height !== expectedHeight) {
      validationErrors.push({
        path: record.manifestPath,
        message: `Expected a 1536x${expectedHeight} atlas, received ${size ? `${size.width}x${size.height}` : 'an unreadable WebP'}.`,
      });
      continue;
    }
    valid.push(record);
  }

  avatarRecords = valid;
  avatarErrors = [...result.errors, ...validationErrors];
  assetPaths = new Map(valid.map((record) => [record.id, record.spritesheetPath]));
  if (capturePath || settingsCapturePath) {
    process.stderr.write(`[avatars] discovered=${result.avatars.length} valid=${valid.length} errors=${JSON.stringify(avatarErrors)}\n`);
  }

  if (settingsStore && settings) {
    const allIds = valid.map((avatar) => avatar.id);
    const patch = reconcileAvatarSelection(settings, allIds);
    if (Object.keys(patch).length > 0) settings = await settingsStore.update(patch);
  }

  broadcast('avatars:library', { avatars: publicAvatars(), errors: avatarErrors });
  broadcastSettings();
  return { avatars: publicAvatars(), errors: avatarErrors };
}

function broadcast(channel, payload) {
  for (const window of [overlayWindow, settingsWindow]) {
    if (window && !window.isDestroyed() && !window.webContents.isDestroyed()) {
      window.webContents.send(channel, payload);
    }
  }
}

function broadcastState() {
  broadcast('avatars:state', store.snapshot());
}

function broadcastSettings() {
  if (!settings) return;
  broadcast('avatars:settings', settingsPayload(settings));
}

function settingsPayload(value) {
  const displays = currentDisplays();
  return {
    settings: value,
    zone: resolveRoamingZone(value?.zone, displays),
    displays,
  };
}

function previewAvatarSizes(patch) {
  if (!settings || !overlayWindow || overlayWindow.isDestroyed() || overlayWindow.webContents.isDestroyed()) return;
  const source = patch && typeof patch === 'object' && !Array.isArray(patch) ? patch : {};
  const sizes = {};
  if (Object.hasOwn(source, 'mainAvatarSize')) sizes.mainAvatarSize = source.mainAvatarSize;
  if (Object.hasOwn(source, 'subagentAvatarSize')) sizes.subagentAvatarSize = source.subagentAvatarSize;
  if (Object.keys(sizes).length === 0) return;
  const preview = mergeSettings(settings, sizes);
  overlayWindow.webContents.send('avatars:settings', settingsPayload(preview));
}

function metadataTarget(event) {
  if (event.kind === 'agent.started' || event.kind === 'agent.stopped') {
    return { id: event.agentId, isRoot: false };
  }
  if (event.kind.startsWith('session.')) return { id: event.sessionId, isRoot: true };
  return null;
}

function enrichMetadata(event) {
  if (!metadataResolver || event.sessionId.startsWith('demo-')) return;
  const target = metadataTarget(event);
  if (!target || !target.id) return;
  const key = `${event.sessionId}:${target.id}`;
  if (pendingMetadata.has(key)) return;
  pendingMetadata.add(key);
  void metadataResolver.resolve(target.id, { isRoot: target.isRoot, refresh: true }).then((metadata) => {
    if (!metadata) return;
    const applied = store.apply({
      kind: 'agent.metadata',
      sessionId: event.sessionId,
      agentId: target.id,
      isRoot: target.isRoot,
      // Root labels are owned exclusively by ThreadTitleMonitor so a slower
      // enrichment read can never overwrite a newer task rename.
      agentLabel: target.isRoot ? null : metadata.label,
      agentNickname: metadata.nickname,
      // A lifecycle event is the freshest source when Codex provides these
      // fields. The local rollout fills only values absent from that event.
      model: event.model ? null : metadata.model,
      effort: event.effort ? null : metadata.effort,
      timestamp: Date.now(),
    });
    if (applied) {
      broadcastState();
    }
  }).finally(() => pendingMetadata.delete(key));
}

function activeThreadIds() {
  return store.snapshot().sessions.map((session) => session.id);
}

function applyThreadTitles(titles) {
  if (!(titles instanceof Map) || titles.size === 0) return;
  const sessions = new Map(store.snapshot().sessions.map((session) => [session.id, session]));
  let changed = false;
  for (const [sessionId, label] of titles) {
    const session = sessions.get(sessionId);
    const root = session?.agents.find((agent) => agent.isRoot);
    if (!root || !label || root.label === label) continue;
    changed = store.apply({
      kind: 'agent.metadata',
      sessionId,
      agentId: sessionId,
      isRoot: true,
      agentLabel: label,
      timestamp: Date.now(),
    }) || changed;
  }
  if (changed) broadcastState();
}

function handlePayload(payload) {
  const event = normalizeHookEvent(payload);
  if ((capturePath || settingsCapturePath) && event) process.stderr.write(`[avatars] event=${event.kind}\n`);
  const rootKnown = event
    ? store.hasAgent(event.sessionId, event.sessionId, true)
    : true;
  if (event && store.apply(event)) {
    broadcastState();
    enrichMetadata(event);
    if (!rootKnown) void threadTitleMonitor?.refresh();
  }
}

function attachWindowDiagnostics(window, label) {
  if (!capturePath && !settingsCapturePath && !process.argv.includes('--dev')) return;
  window.webContents.on('console-message', (...args) => {
    const detail = args.find((argument) => argument && typeof argument === 'object' && 'message' in argument);
    const message = detail?.message || args.find((argument) => typeof argument === 'string');
    if (message) process.stderr.write(`[${label}] ${message}\n`);
  });
  window.webContents.on('did-fail-load', (_event, code, description) => {
    process.stderr.write(`[${label}] load failed ${code}: ${description}\n`);
  });
  window.webContents.on('render-process-gone', (_event, details) => {
    process.stderr.write(`[${label}] renderer gone: ${details.reason}\n`);
  });
}

function updateOverlayInputMode() {
  if (!overlayWindow || overlayWindow.isDestroyed() || !settings) return;
  const ignore = !settings.overlayEnabled || settings.passive || !overlayHitTest;
  overlayWindow.setIgnoreMouseEvents(ignore, { forward: true });
}

function sameBounds(left, right) {
  return left.x === right.x
    && left.y === right.y
    && left.width === right.width
    && left.height === right.height;
}

function lockWindowToBounds(window, bounds, label) {
  if (!window || window.isDestroyed()) return false;
  window.setBounds(bounds, false);
  window.setResizable(false);
  window.setMovable(false);
  const actual = window.getBounds();
  if (!sameBounds(actual, bounds)) {
    process.stderr.write(`[${label}] requested bounds ${JSON.stringify(bounds)}, received ${JSON.stringify(actual)}\n`);
    return false;
  }
  return true;
}

function syncOverlayVisibility() {
  if (!overlayWindow || overlayWindow.isDestroyed() || !settings) return;
  if (!settings.overlayEnabled) {
    overlayWindow.hide();
    updateOverlayInputMode();
    return;
  }
  overlayWindow.showInactive();
  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  overlayWindow.moveTop();
  updateOverlayInputMode();
}

async function applySettingsPatch(patch, options = {}) {
  const previousZone = JSON.stringify(settings?.zone);
  settings = await settingsStore.update(patch);
  overlayHitTest = false;
  updateOverlayInputMode();
  rebuildTrayMenu();
  broadcastSettings();

  if (options.rebuildOverlay || previousZone !== JSON.stringify(settings.zone)) {
    await rebuildOverlayWindow();
  } else {
    syncOverlayVisibility();
  }
  return settings;
}

function createOverlayWindow() {
  const displays = currentDisplays();
  const resolved = resolveRoamingZone(settings?.zone, displays);
  const targetBounds = capturePath
    ? { x: resolved.windowBounds.x, y: resolved.windowBounds.y, width: 1200, height: 700 }
    : resolved.windowBounds;
  const initialBounds = bootstrapWindowBounds(targetBounds, displays);

  overlayWindow = new BrowserWindow({
    ...initialBounds,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    resizable: true,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    show: false,
    roundedCorners: false,
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload-overlay.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  });

  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  overlayWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlayWindow.setWindowButtonVisibility?.(false);
  overlayWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  overlayWindow.webContents.on('will-navigate', (event) => event.preventDefault());
  attachWindowDiagnostics(overlayWindow, 'overlay');
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  overlayWindow.loadFile(path.join(__dirname, 'renderer', 'overlay.html'));
  overlayWindow.once('ready-to-show', () => {
    if (!overlayWindow || overlayWindow.isDestroyed()) return;
    lockWindowToBounds(overlayWindow, targetBounds, 'overlay');
    syncOverlayVisibility();
    broadcastState();
    broadcastSettings();

    if (capturePath) {
      runDemo();
      setTimeout(() => void captureAndQuit(overlayWindow, capturePath), 2_400);
    }
  });
  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });
}

async function rebuildOverlayWindow() {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.destroy();
    overlayWindow = null;
  }
  createOverlayWindow();
}

function settleZonePicker(rectangle) {
  if (!zonePickerResolve) return;
  const resolve = zonePickerResolve;
  const bounds = zonePickerBounds;
  zonePickerResolve = null;
  zonePickerBounds = null;
  if (zonePickerWindow && !zonePickerWindow.isDestroyed()) zonePickerWindow.destroy();
  zonePickerWindow = null;
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show();
    settingsWindow.focus();
  }
  if (!rectangle || !bounds) {
    resolve(null);
    return;
  }
  resolve(localRectToVirtual(rectangle, bounds));
}

function selectCustomZone() {
  if (zonePickerWindow && !zonePickerWindow.isDestroyed()) {
    zonePickerWindow.focus();
    return Promise.resolve(null);
  }
  const displays = currentDisplays();
  const allDisplays = resolveRoamingZone({ mode: 'all' }, displays);
  zonePickerBounds = allDisplays.windowBounds;
  const initialBounds = bootstrapWindowBounds(zonePickerBounds, displays);
  if (settingsWindow && !settingsWindow.isDestroyed()) settingsWindow.hide();

  zonePickerWindow = new BrowserWindow({
    ...initialBounds,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    resizable: true,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    show: false,
    roundedCorners: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload-zone-picker.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  zonePickerWindow.setAlwaysOnTop(true, 'screen-saver');
  zonePickerWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  zonePickerWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  zonePickerWindow.webContents.on('will-navigate', (event) => event.preventDefault());
  attachWindowDiagnostics(zonePickerWindow, 'zone-picker');
  zonePickerWindow.loadFile(path.join(__dirname, 'renderer', 'zone-picker.html'), {
    query: { language: settings.language },
  });
  zonePickerWindow.once('ready-to-show', () => {
    if (!zonePickerWindow || zonePickerWindow.isDestroyed()) return;
    lockWindowToBounds(zonePickerWindow, zonePickerBounds, 'zone-picker');
    zonePickerWindow.show();
    zonePickerWindow.focus();
  });
  zonePickerWindow.on('closed', () => {
    zonePickerWindow = null;
    if (zonePickerResolve) settleZonePicker(null);
  });
  return new Promise((resolve) => {
    zonePickerResolve = resolve;
  });
}

function createSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) return settingsWindow;
  settingsWindow = new BrowserWindow({
    width: 860,
    height: 780,
    minWidth: 720,
    minHeight: 620,
    title: 'Codex Avatars',
    autoHideMenuBar: true,
    backgroundColor: '#0b0b10',
    show: false,
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  settingsWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url);
    return { action: 'deny' };
  });
  settingsWindow.webContents.on('will-navigate', (event) => event.preventDefault());
  attachWindowDiagnostics(settingsWindow, 'settings');
  settingsWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  settingsWindow.on('close', (event) => {
    if (isQuitting) return;
    event.preventDefault();
    settingsWindow.hide();
  });
  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
  settingsWindow.once('ready-to-show', () => {
    if (!backgroundLaunch && !capturePath && !zonePickerCapturePath) settingsWindow.show();
    if (settingsCapturePath) {
      settingsWindow.show();
      setTimeout(async () => {
        const scroll = Math.max(0, Math.min(10_000, Number(settingsScrollArgument) || 0));
        if (scroll > 0) await settingsWindow.webContents.executeJavaScript(`window.scrollTo(0, ${scroll})`);
        setTimeout(() => void captureAndQuit(settingsWindow, settingsCapturePath), 120);
      }, 780);
    }
  });
  return settingsWindow;
}

function showSettingsWindow() {
  const window = createSettingsWindow();
  if (window.isMinimized()) window.restore();
  window.show();
  window.focus();
}

async function captureAndQuit(window, outputPath) {
  try {
    const image = await window.webContents.capturePage();
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, image.toPNG());
  } finally {
    isQuitting = true;
    app.quit();
  }
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, '..', 'assets', 'icon.png'))
    .resize({ width: 20, height: 20 });
  tray = new Tray(icon);
  tray.setToolTip('Codex Avatars');
  tray.on('click', showSettingsWindow);
  rebuildTrayMenu();
}

function rebuildTrayMenu() {
  if (!tray || !settings) return;
  const french = settings.language === 'fr';
  tray.setToolTip(settings.overlayEnabled
    ? 'Codex Avatars'
    : (french ? 'Codex Avatars — désactivés' : 'Codex Avatars — disabled'));
  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: french ? 'Ouvrir les réglages' : 'Open settings',
      click: showSettingsWindow,
    },
    {
      label: settings.overlayEnabled
        ? (french ? 'Désactiver les avatars' : 'Disable avatars')
        : (french ? 'Activer les avatars' : 'Enable avatars'),
      click: () => void applySettingsPatch({ overlayEnabled: !settings.overlayEnabled }),
    },
    {
      label: french ? 'Mode passif (clics traversants)' : 'Passive mode (click-through)',
      type: 'checkbox',
      checked: settings.passive,
      click: (item) => void applySettingsPatch({ passive: item.checked }),
    },
    { type: 'separator' },
    {
      label: demoSessionId
        ? (french ? 'Arrêter la démo' : 'Stop demo')
        : (french ? 'Lancer la démo' : 'Run demo'),
      click: toggleDemo,
    },
    {
      label: french ? 'Actualiser les avatars' : 'Refresh avatars',
      click: () => void refreshAvatarLibrary(),
    },
    { type: 'separator' },
    {
      label: french ? 'Quitter' : 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]));
}

function runDemo() {
  if (demoSessionId) return { running: true, sessionId: demoSessionId };
  const sessionId = `demo-${Date.now()}`;
  demoSessionId = sessionId;
  const base = { session_id: sessionId, cwd: 'C:\\Projects\\tiny-space-station' };
  const emit = (delay, event) => {
    const timer = setTimeout(() => {
      demoTimers.delete(timer);
      if (demoSessionId === sessionId) handlePayload({ ...base, ...event });
    }, delay);
    demoTimers.add(timer);
  };

  emit(0, { hook_event_name: 'SessionStart', agent_name: 'Tiny Space Station', model: 'gpt-5.6-sol', reasoning_effort: 'high' });
  emit(80, { hook_event_name: 'SubagentStart', agent_id: `${sessionId}-1`, agent_type: 'default', agent_name: 'Explorer', model: 'gpt-5.6-terra', reasoning_effort: 'medium' });
  emit(240, { hook_event_name: 'SubagentStart', agent_id: `${sessionId}-2`, agent_type: 'default', agent_name: 'UI builder', model: 'gpt-5.6-terra', reasoning_effort: 'high' });
  emit(400, { hook_event_name: 'SubagentStart', agent_id: `${sessionId}-3`, agent_type: 'default', agent_name: 'Test runner', model: 'gpt-5.6-terra', reasoning_effort: 'medium' });
  const dormantTimer = setTimeout(() => {
    demoTimers.delete(dormantTimer);
    if (demoSessionId !== sessionId) return;
    const timestamp = Date.now();
    const dormantId = `${sessionId}-sleeping`;
    store.apply({
      kind: 'agent.started', sessionId, agentId: dormantId, agentType: 'default',
      agentLabel: 'Dormant architect', model: 'gpt-5.6-terra', effort: 'low', timestamp: timestamp - 8_000,
    });
    store.apply({
      kind: 'agent.stopped', sessionId, agentId: dormantId, agentType: 'default',
      agentLabel: 'Dormant architect', model: 'gpt-5.6-terra', effort: 'low', timestamp: timestamp - 7_500,
    });
    if (store.cleanup(timestamp)) broadcastState();
  }, 620);
  demoTimers.add(dormantTimer);
  emit(5_500, { hook_event_name: 'PermissionRequest' });
  emit(7_000, { hook_event_name: 'UserPromptSubmit' });
  emit(10_000, { hook_event_name: 'SubagentStop', agent_id: `${sessionId}-1`, agent_type: 'explorer' });
  emit(10_400, { hook_event_name: 'SubagentStop', agent_id: `${sessionId}-2`, agent_type: 'ui_builder' });
  emit(10_800, { hook_event_name: 'SubagentStop', agent_id: `${sessionId}-3`, agent_type: 'test_runner' });
  emit(11_200, { hook_event_name: 'Stop' });
  const endTimer = setTimeout(() => {
    demoTimers.delete(endTimer);
    if (demoSessionId === sessionId) stopDemo();
  }, 13_000);
  demoTimers.add(endTimer);
  broadcast('avatars:demo', { running: true, sessionId });
  rebuildTrayMenu();
  return { running: true, sessionId };
}

function stopDemo() {
  for (const timer of demoTimers) clearTimeout(timer);
  demoTimers.clear();
  const sessionId = demoSessionId;
  demoSessionId = null;
  if (sessionId) store.removeSession(sessionId);
  broadcastState();
  broadcast('avatars:demo', { running: false, sessionId: null });
  rebuildTrayMenu();
  return { running: false, sessionId: null };
}

function toggleDemo() {
  return demoSessionId ? stopDemo() : runDemo();
}

async function settingsBootstrapPayload() {
  let pluginAvailable = true;
  try {
    await fs.access(pluginMarketplacePath());
  } catch {
    pluginAvailable = false;
  }
  return {
    state: store.snapshot(),
    settings,
    avatars: publicAvatars(),
    displays: currentDisplays(),
    zone: currentZone(),
    launchAtLogin: app.getLoginItemSettings().openAtLogin,
    hooks: await hooksStatus(),
    version: app.getVersion(),
    settingsCapture: Boolean(settingsCapturePath) && !onboardingCapture,
    demo: { running: Boolean(demoSessionId), sessionId: demoSessionId },
    plugin: {
      available: pluginAvailable,
      onboardingCompleted: settings.onboardingCompleted,
    },
  };
}

function overlayBootstrapPayload() {
  return {
    state: store.snapshot(),
    settings,
    avatars: publicAvatars(),
    zone: currentZone(),
  };
}

function isWindowSender(event, window) {
  return Boolean(
    window
    && !window.isDestroyed()
    && !window.webContents.isDestroyed()
    && event.sender === window.webContents,
  );
}

function requireWindowSender(event, window, role) {
  if (!isWindowSender(event, window)) throw new Error(`IPC access denied for ${role}.`);
}

function registerIpc() {
  ipcMain.handle('avatars:get-settings-bootstrap', (event) => {
    requireWindowSender(event, settingsWindow, 'settings');
    return settingsBootstrapPayload();
  });
  ipcMain.handle('avatars:get-overlay-bootstrap', (event) => {
    requireWindowSender(event, overlayWindow, 'overlay');
    return overlayBootstrapPayload();
  });
  ipcMain.handle('avatars:update-settings', (event, patch) => {
    requireWindowSender(event, settingsWindow, 'settings');
    return applySettingsPatch(patch);
  });
  ipcMain.on('avatars:preview-avatar-sizes', (event, patch) => {
    if (!isWindowSender(event, settingsWindow)) return;
    previewAvatarSizes(patch);
  });
  ipcMain.handle('avatars:set-launch-at-login', (event, value) => {
    requireWindowSender(event, settingsWindow, 'settings');
    app.setLoginItemSettings({
      openAtLogin: Boolean(value),
      path: process.execPath,
      args: ['--background'],
    });
    return app.getLoginItemSettings().openAtLogin;
  });
  ipcMain.handle('avatars:install-hooks', (event) => {
    requireWindowSender(event, settingsWindow, 'settings');
    return installHooks(hookScriptPath());
  });
  ipcMain.handle('avatars:uninstall-hooks', (event) => {
    requireWindowSender(event, settingsWindow, 'settings');
    return uninstallHooks();
  });
  ipcMain.handle('avatars:hooks-status', (event) => {
    requireWindowSender(event, settingsWindow, 'settings');
    return hooksStatus();
  });
  ipcMain.handle('avatars:refresh-library', (event) => {
    requireWindowSender(event, settingsWindow, 'settings');
    return refreshAvatarLibrary();
  });
  ipcMain.handle('avatars:overlay-hit-test', (event, value) => {
    requireWindowSender(event, overlayWindow, 'overlay');
    overlayHitTest = Boolean(value);
    updateOverlayInputMode();
    return settings.overlayEnabled && !settings.passive && overlayHitTest;
  });
  ipcMain.handle('avatars:create-avatar', async (event, brief) => {
    requireWindowSender(event, settingsWindow, 'settings');
    const prompt = buildAvatarPrompt(brief, settings.language);
    const url = codexNewThreadUrl(prompt);
    try {
      await shell.openExternal(url);
      return { opened: true, copied: false, url };
    } catch (error) {
      clipboard.writeText(prompt);
      return { opened: false, copied: true, message: error.message };
    }
  });
  ipcMain.handle('avatars:copy-create-prompt', (event, brief) => {
    requireWindowSender(event, settingsWindow, 'settings');
    const prompt = buildAvatarPrompt(brief, settings.language);
    clipboard.writeText(prompt);
    return prompt;
  });
  ipcMain.handle('avatars:pick-zone', async (event) => {
    requireWindowSender(event, settingsWindow, 'settings');
    const rectangle = await selectCustomZone();
    if (!rectangle) return { cancelled: true };
    const next = await applySettingsPatch({ zone: { mode: 'custom', custom: rectangle } }, { rebuildOverlay: true });
    return { cancelled: false, rectangle, settings: next };
  });
  ipcMain.handle('avatars:zone-picker-complete', (event, rectangle) => {
    requireWindowSender(event, zonePickerWindow, 'zone picker');
    settleZonePicker(rectangle);
    return true;
  });
  ipcMain.handle('avatars:zone-picker-cancel', (event) => {
    requireWindowSender(event, zonePickerWindow, 'zone picker');
    settleZonePicker(null);
    return true;
  });
  ipcMain.handle('avatars:import-pet', async (event) => {
    requireWindowSender(event, settingsWindow, 'settings');
    const options = {
      title: settings.language === 'fr' ? 'Importer un Pet' : 'Import a Pet',
      properties: ['openFile'],
      filters: [
        { name: 'Codex Pet package', extensions: ['codexpet', 'zip'] },
        { name: 'All files', extensions: ['*'] },
      ],
    };
    const result = settingsWindow && !settingsWindow.isDestroyed()
      ? await dialog.showOpenDialog(settingsWindow, options)
      : await dialog.showOpenDialog(options);
    if (result.canceled || !result.filePaths[0]) return { cancelled: true };
    const imported = await importPetPackage(result.filePaths[0], path.join(codexHomePath(), 'pets'));
    await refreshAvatarLibrary();
    return { cancelled: false, imported };
  });
  ipcMain.handle('avatars:export-pet', async (event, avatarId) => {
    requireWindowSender(event, settingsWindow, 'settings');
    const record = avatarRecords.find((avatar) => avatar.id === avatarId);
    if (!record) throw new Error('The selected Pet is no longer available.');
    const options = {
      title: settings.language === 'fr' ? 'Partager ce Pet' : 'Share this Pet',
      defaultPath: `${record.id}.codexpet`,
      filters: [{ name: 'Codex Pet package', extensions: ['codexpet'] }],
    };
    const result = settingsWindow && !settingsWindow.isDestroyed()
      ? await dialog.showSaveDialog(settingsWindow, options)
      : await dialog.showSaveDialog(options);
    if (result.canceled || !result.filePath) return { cancelled: true };
    await exportPetPackage(record, result.filePath);
    return { cancelled: false, filePath: result.filePath };
  });
  ipcMain.handle('avatars:open-pets-doc', (event) => {
    requireWindowSender(event, settingsWindow, 'settings');
    return shell.openExternal('https://learn.chatgpt.com/docs/pets');
  });
  ipcMain.handle('avatars:open-plugin', (event) => {
    requireWindowSender(event, settingsWindow, 'settings');
    return openPluginInCodex();
  });
  ipcMain.handle('avatars:open-pet-directory', (event) => {
    requireWindowSender(event, settingsWindow, 'settings');
    return shell.openPath(path.join(codexHomePath(), 'pets'));
  });
  ipcMain.handle('avatars:demo', (event) => {
    requireWindowSender(event, settingsWindow, 'settings');
    return toggleDemo();
  });
}

async function startApplication() {
  app.setAppUserModelId('dev.codexavatars.desktop');
  settingsStore = new SettingsStore(path.join(app.getPath('userData'), 'settings.json'));
  settings = await settingsStore.load();
  metadataResolver = new AgentMetadataResolver(path.join(codexHomePath(), 'sessions'));
  threadTitleMonitor = new ThreadTitleMonitor(metadataResolver.threadIndexPath, {
    getThreadIds: activeThreadIds,
    readTitles: (threadIds) => metadataResolver.refreshThreadNames(threadIds),
    onTitles: applyThreadTitles,
  });
  threadTitleMonitor.start();

  protocol.handle('codex-avatar', async (request) => {
    try {
      const url = new URL(request.url);
      if (url.hostname !== 'asset') return new Response('Not found', { status: 404 });
      const id = decodeURIComponent(url.pathname.replace(/^\//, ''));
      const assetPath = assetPaths.get(id);
      if (!assetPath) return new Response('Not found', { status: 404 });
      const data = await fs.readFile(assetPath);
      return new Response(data, { headers: { 'content-type': 'image/webp', 'cache-control': 'no-store' } });
    } catch {
      return new Response('Not found', { status: 404 });
    }
  });

  registerIpc();
  await refreshAvatarLibrary();
  await eventServer.listen();
  createTray();
  createOverlayWindow();
  createSettingsWindow();
  void promptForUpdate();

  if (zonePickerCapturePath) {
    void selectCustomZone();
    setTimeout(() => {
      if (zonePickerWindow && !zonePickerWindow.isDestroyed()) {
        void captureAndQuit(zonePickerWindow, zonePickerCapturePath);
      }
    }, 850);
  }

  globalShortcut.register('CommandOrControl+Alt+A', () => {
    void applySettingsPatch({ passive: !settings.passive });
  });

  const handleDisplayChange = () => {
    broadcastSettings();
    void rebuildOverlayWindow();
  };
  screen.on('display-added', handleDisplayChange);
  screen.on('display-removed', handleDisplayChange);
  screen.on('display-metrics-changed', handleDisplayChange);

  cleanupTimer = setInterval(() => {
    if (store.cleanup()) broadcastState();
  }, 1_000);
  avatarRefreshTimer = setInterval(() => void refreshAvatarLibrary(), 5_000);
}

if (commandLineAction) {
  app.whenReady().then(async () => {
    try {
      if (commandLineAction === 'install') await installHooks(hookScriptPath());
      else await uninstallHooks();
      app.exit(0);
    } catch {
      app.exit(1);
    }
  });
} else {
  const hasLock = app.requestSingleInstanceLock();
  if (!hasLock) app.quit();

  if (hasLock) {
    app.on('second-instance', showSettingsWindow);
    app.on('activate', showSettingsWindow);
    app.whenReady().then(startApplication);
  }
}

app.on('window-all-closed', () => {
  // The tray owns the process lifetime. Closing settings never removes the avatars.
});
app.on('before-quit', () => {
  isQuitting = true;
});
app.on('will-quit', () => {
  if (cleanupTimer) clearInterval(cleanupTimer);
  if (avatarRefreshTimer) clearInterval(avatarRefreshTimer);
  if (threadTitleMonitor) threadTitleMonitor.close();
  for (const timer of demoTimers) clearTimeout(timer);
  demoTimers.clear();
  globalShortcut.unregisterAll();
  void eventServer.close();
});
