'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  screen,
} = require('electron');
const { AgentStore } = require('./core/agent-store.cjs');
const { normalizeHookEvent } = require('./core/event-normalizer.cjs');
const { createEventServer } = require('./core/pipe-server.cjs');
const {
  hooksStatus,
  installHooks,
  uninstallHooks,
} = require('./core/hook-config-service.cjs');

const store = new AgentStore();
const eventServer = createEventServer(handlePayload);
let mainWindow = null;
let passive = false;
let cleanupTimer = null;
const captureArgument = process.argv.find((argument) => argument.startsWith('--capture='));
const capturePath = captureArgument
  ? path.resolve(process.cwd(), captureArgument.slice('--capture='.length))
  : null;
const backgroundLaunch = process.argv.includes('--background');
const commandLineAction = process.argv.includes('--install-hooks')
  ? 'install'
  : process.argv.includes('--uninstall-hooks')
    ? 'uninstall'
    : null;

function hookScriptPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'hooks', 'codex-hook.ps1')
    : path.join(__dirname, '..', 'scripts', 'codex-hook.ps1');
}

function positionWindow(window) {
  const pointer = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(pointer);
  const [width, height] = window.getSize();
  const x = Math.round(display.workArea.x + (display.workArea.width - width) / 2);
  const y = Math.round(display.workArea.y + display.workArea.height - height - 18);
  window.setPosition(x, y, false);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 980,
    height: 270,
    minWidth: 560,
    minHeight: 210,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    resizable: true,
    fullscreenable: false,
    show: false,
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.setAlwaysOnTop(true, 'floating');
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  mainWindow.setWindowButtonVisibility?.(false);
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.once('ready-to-show', () => {
    positionWindow(mainWindow);
    if (backgroundLaunch) mainWindow.showInactive();
    else mainWindow.show();
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.moveTop();
    if (capturePath) {
      runDemo();
      setTimeout(async () => {
        try {
          const image = await mainWindow.webContents.capturePage();
          await fs.mkdir(path.dirname(capturePath), { recursive: true });
          await fs.writeFile(capturePath, image.toPNG());
        } finally {
          app.quit();
        }
      }, 1_800);
    }
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function broadcastState() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('avatars:state', store.snapshot());
  }
}

function handlePayload(payload) {
  const event = normalizeHookEvent(payload);
  if (event && store.apply(event)) broadcastState();
}

function setPassiveMode(nextValue) {
  passive = Boolean(nextValue);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setIgnoreMouseEvents(passive, { forward: true });
    mainWindow.webContents.send('avatars:passive', passive);
  }
  return passive;
}

function runDemo() {
  const sessionId = `demo-${Date.now()}`;
  const base = { session_id: sessionId, cwd: 'C:\\Projects\\tiny-space-station' };
  const emit = (delay, event) => setTimeout(() => handlePayload({ ...base, ...event }), delay);

  emit(0, { hook_event_name: 'SessionStart' });
  emit(250, { hook_event_name: 'SubagentStart', agent_id: `${sessionId}-1`, agent_type: 'explorer' });
  emit(650, { hook_event_name: 'SubagentStart', agent_id: `${sessionId}-2`, agent_type: 'ui_builder' });
  emit(1_050, { hook_event_name: 'SubagentStart', agent_id: `${sessionId}-3`, agent_type: 'test_runner' });
  emit(3_500, { hook_event_name: 'PermissionRequest' });
  emit(5_200, { hook_event_name: 'UserPromptSubmit' });
  emit(7_500, { hook_event_name: 'SubagentStop', agent_id: `${sessionId}-1`, agent_type: 'explorer' });
  emit(8_300, { hook_event_name: 'SubagentStop', agent_id: `${sessionId}-2`, agent_type: 'ui_builder' });
  emit(9_100, { hook_event_name: 'SubagentStop', agent_id: `${sessionId}-3`, agent_type: 'test_runner' });
  emit(9_800, { hook_event_name: 'Stop' });
}

function registerIpc() {
  ipcMain.handle('avatars:get-state', () => store.snapshot());
  ipcMain.handle('avatars:get-settings', async () => ({
    passive,
    launchAtLogin: app.getLoginItemSettings().openAtLogin,
    hooks: await hooksStatus(),
    shortcut: 'Ctrl+Alt+A',
    version: app.getVersion(),
  }));
  ipcMain.handle('avatars:set-passive', (_event, value) => setPassiveMode(value));
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
  ipcMain.handle('avatars:demo', () => runDemo());
  ipcMain.handle('avatars:quit', () => app.quit());
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
    app.on('second-instance', () => {
      if (!mainWindow) createWindow();
      mainWindow.show();
      mainWindow.focus();
    });

    app.whenReady().then(async () => {
      registerIpc();
      await eventServer.listen();
      createWindow();
      globalShortcut.register('CommandOrControl+Alt+A', () => setPassiveMode(!passive));
      cleanupTimer = setInterval(() => {
        if (store.cleanup()) broadcastState();
      }, 1_000);
    });
  }
}

app.on('window-all-closed', () => app.quit());
app.on('will-quit', () => {
  if (cleanupTimer) clearInterval(cleanupTimer);
  globalShortcut.unregisterAll();
  void eventServer.close();
});
