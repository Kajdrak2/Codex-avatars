'use strict';

const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {
  app,
  BrowserWindow,
  clipboard,
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
const { discoverAvatars, readWebpDimensions } = require('./core/avatar-library.cjs');
const { normalizeHookEvent } = require('./core/event-normalizer.cjs');
const { createEventServer } = require('./core/pipe-server.cjs');
const { resolveRoamingZone, serializeDisplay } = require('./core/roaming-zone.cjs');
const { SettingsStore } = require('./core/settings-store.cjs');
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
const eventServer = createEventServer(handlePayload);
const captureArgument = findArgument('--capture=');
const settingsCaptureArgument = findArgument('--capture-settings=');
const capturePath = captureArgument ? path.resolve(process.cwd(), captureArgument) : null;
const settingsCapturePath = settingsCaptureArgument
  ? path.resolve(process.cwd(), settingsCaptureArgument)
  : null;
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
let tray = null;
let cleanupTimer = null;
let avatarRefreshTimer = null;
let avatarRecords = [];
let avatarErrors = [];
let assetPaths = new Map();
let overlayHitTest = false;
let isQuitting = false;

function findArgument(prefix) {
  const argument = process.argv.find((value) => value.startsWith(prefix));
  return argument ? argument.slice(prefix.length) : null;
}

function hookScriptPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'hooks', 'codex-hook.ps1')
    : path.join(__dirname, '..', 'scripts', 'codex-hook.ps1');
}

function codexHomePath() {
  return process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
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
    assetUrl: `codex-avatar://asset/${encodeURIComponent(record.id)}`,
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

async function refreshAvatarLibrary(options = {}) {
  const previousIds = new Set(avatarRecords.map((avatar) => avatar.id));
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
    let enabledIds = settings.enabledAvatarIds.filter((id) => allIds.includes(id));
    let shouldPersist = enabledIds.length !== settings.enabledAvatarIds.length;

    if (!settings.avatarSelectionInitialized && allIds.length > 0) {
      enabledIds = allIds;
      shouldPersist = true;
      settings = await settingsStore.update({
        enabledAvatarIds: enabledIds,
        avatarSelectionInitialized: true,
      });
    } else if (!options.initial && settings.autoEnableNewAvatars) {
      const added = allIds.filter((id) => !previousIds.has(id));
      if (added.length > 0) {
        enabledIds = [...new Set([...enabledIds, ...added])];
        shouldPersist = true;
      }
    }

    if (shouldPersist && settings.enabledAvatarIds.join('\0') !== enabledIds.join('\0')) {
      settings = await settingsStore.update({ enabledAvatarIds: enabledIds });
    }
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
  broadcast('avatars:settings', {
    settings,
    zone: currentZone(),
    displays: currentDisplays(),
  });
}

function handlePayload(payload) {
  const event = normalizeHookEvent(payload);
  if ((capturePath || settingsCapturePath) && event) process.stderr.write(`[avatars] event=${event.kind}\n`);
  if (event && store.apply(event)) broadcastState();
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
  const ignore = settings.passive || !overlayHitTest;
  overlayWindow.setIgnoreMouseEvents(ignore, { forward: true });
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
  }
  return settings;
}

function createOverlayWindow() {
  const resolved = currentZone();
  const bounds = capturePath
    ? { x: resolved.windowBounds.x, y: resolved.windowBounds.y, width: 1200, height: 700 }
    : resolved.windowBounds;

  overlayWindow = new BrowserWindow({
    ...bounds,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    show: false,
    roundedCorners: false,
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
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
  attachWindowDiagnostics(overlayWindow, 'overlay');
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  overlayWindow.loadFile(path.join(__dirname, 'renderer', 'overlay.html'));
  overlayWindow.once('ready-to-show', () => {
    if (!overlayWindow || overlayWindow.isDestroyed()) return;
    overlayWindow.showInactive();
    overlayWindow.setAlwaysOnTop(true, 'screen-saver');
    overlayWindow.moveTop();
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
    if (!backgroundLaunch && !capturePath) settingsWindow.show();
    if (settingsCapturePath) {
      settingsWindow.show();
      setTimeout(() => void captureAndQuit(settingsWindow, settingsCapturePath), 900);
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
  const french = app.getLocale().toLowerCase().startsWith('fr');
  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: french ? 'Ouvrir les réglages' : 'Open settings',
      click: showSettingsWindow,
    },
    {
      label: french ? 'Mode passif (clics traversants)' : 'Passive mode (click-through)',
      type: 'checkbox',
      checked: settings.passive,
      click: (item) => void applySettingsPatch({ passive: item.checked }),
    },
    { type: 'separator' },
    {
      label: french ? 'Lancer la démo' : 'Run demo',
      click: runDemo,
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
  const sessionId = `demo-${Date.now()}`;
  const base = { session_id: sessionId, cwd: 'C:\\Projects\\tiny-space-station' };
  const emit = (delay, event) => setTimeout(() => handlePayload({ ...base, ...event }), delay);

  emit(0, { hook_event_name: 'SessionStart' });
  emit(160, { hook_event_name: 'SubagentStart', agent_id: `${sessionId}-1`, agent_type: 'explorer' });
  emit(360, { hook_event_name: 'SubagentStart', agent_id: `${sessionId}-2`, agent_type: 'ui_builder' });
  emit(560, { hook_event_name: 'SubagentStart', agent_id: `${sessionId}-3`, agent_type: 'test_runner' });
  emit(5_500, { hook_event_name: 'PermissionRequest' });
  emit(7_000, { hook_event_name: 'UserPromptSubmit' });
  emit(10_000, { hook_event_name: 'SubagentStop', agent_id: `${sessionId}-1`, agent_type: 'explorer' });
  emit(10_400, { hook_event_name: 'SubagentStop', agent_id: `${sessionId}-2`, agent_type: 'ui_builder' });
  emit(10_800, { hook_event_name: 'SubagentStop', agent_id: `${sessionId}-3`, agent_type: 'test_runner' });
  emit(11_200, { hook_event_name: 'Stop' });
}

async function bootstrapPayload() {
  return {
    state: store.snapshot(),
    settings,
    avatars: publicAvatars(),
    avatarErrors,
    displays: currentDisplays(),
    zone: currentZone(),
    launchAtLogin: app.getLoginItemSettings().openAtLogin,
    hooks: await hooksStatus(),
    shortcut: 'Ctrl+Alt+A',
    version: app.getVersion(),
    petDirectory: path.join(codexHomePath(), 'pets'),
  };
}

function registerIpc() {
  ipcMain.handle('avatars:get-bootstrap', bootstrapPayload);
  ipcMain.handle('avatars:get-state', () => store.snapshot());
  ipcMain.handle('avatars:get-settings', () => settings);
  ipcMain.handle('avatars:update-settings', (_event, patch) => applySettingsPatch(patch));
  ipcMain.handle('avatars:set-passive', (_event, value) => applySettingsPatch({ passive: Boolean(value) }));
  ipcMain.handle('avatars:set-launch-at-login', (_event, value) => {
    app.setLoginItemSettings({
      openAtLogin: Boolean(value),
      args: ['--background'],
    });
    return app.getLoginItemSettings().openAtLogin;
  });
  ipcMain.handle('avatars:install-hooks', () => installHooks(hookScriptPath()));
  ipcMain.handle('avatars:uninstall-hooks', () => uninstallHooks());
  ipcMain.handle('avatars:hooks-status', () => hooksStatus());
  ipcMain.handle('avatars:refresh-library', () => refreshAvatarLibrary());
  ipcMain.handle('avatars:show-settings', () => showSettingsWindow());
  ipcMain.handle('avatars:overlay-hit-test', (event, value) => {
    if (!overlayWindow || event.sender !== overlayWindow.webContents) return false;
    overlayHitTest = Boolean(value);
    updateOverlayInputMode();
    return !settings.passive && overlayHitTest;
  });
  ipcMain.handle('avatars:copy-create-prompt', () => {
    const prompt = 'Utilise $create-codex-avatar pour créer un nouvel avatar Codex Avatars, puis installe-le dans ma bibliothèque locale.';
    clipboard.writeText(prompt);
    return prompt;
  });
  ipcMain.handle('avatars:open-pets-doc', () => shell.openExternal('https://learn.chatgpt.com/docs/pets'));
  ipcMain.handle('avatars:open-pet-directory', () => shell.openPath(path.join(codexHomePath(), 'pets')));
  ipcMain.handle('avatars:demo', () => runDemo());
  ipcMain.handle('avatars:quit', () => {
    isQuitting = true;
    app.quit();
  });
}

async function startApplication() {
  app.setAppUserModelId('dev.codexavatars.desktop');
  settingsStore = new SettingsStore(path.join(app.getPath('userData'), 'settings.json'));
  settings = await settingsStore.load();

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
  await refreshAvatarLibrary({ initial: true });
  await eventServer.listen();
  createTray();
  createOverlayWindow();
  createSettingsWindow();

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
  globalShortcut.unregisterAll();
  void eventServer.close();
});
