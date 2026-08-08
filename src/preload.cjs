'use strict';

const { contextBridge, ipcRenderer } = require('electron');

function subscribe(channel, callback) {
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld('codexAvatars', {
  getBootstrap: () => ipcRenderer.invoke('avatars:get-bootstrap'),
  getState: () => ipcRenderer.invoke('avatars:get-state'),
  getSettings: () => ipcRenderer.invoke('avatars:get-settings'),
  updateSettings: (patch) => ipcRenderer.invoke('avatars:update-settings', patch),
  setPassive: (value) => ipcRenderer.invoke('avatars:set-passive', Boolean(value)),
  setLaunchAtLogin: (value) => ipcRenderer.invoke('avatars:set-launch-at-login', Boolean(value)),
  installHooks: () => ipcRenderer.invoke('avatars:install-hooks'),
  uninstallHooks: () => ipcRenderer.invoke('avatars:uninstall-hooks'),
  hooksStatus: () => ipcRenderer.invoke('avatars:hooks-status'),
  refreshLibrary: () => ipcRenderer.invoke('avatars:refresh-library'),
  showSettings: () => ipcRenderer.invoke('avatars:show-settings'),
  setOverlayHitTest: (value) => ipcRenderer.invoke('avatars:overlay-hit-test', Boolean(value)),
  copyCreatePrompt: () => ipcRenderer.invoke('avatars:copy-create-prompt'),
  openPlugin: () => ipcRenderer.invoke('avatars:open-plugin'),
  openPetsDocs: () => ipcRenderer.invoke('avatars:open-pets-doc'),
  openPetDirectory: () => ipcRenderer.invoke('avatars:open-pet-directory'),
  runDemo: () => ipcRenderer.invoke('avatars:demo'),
  quit: () => ipcRenderer.invoke('avatars:quit'),
  onState: (callback) => subscribe('avatars:state', callback),
  onSettings: (callback) => subscribe('avatars:settings', callback),
  onLibrary: (callback) => subscribe('avatars:library', callback),
});
