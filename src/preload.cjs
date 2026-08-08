'use strict';

const { contextBridge, ipcRenderer } = require('electron');

function subscribe(channel, callback) {
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld('codexAvatars', {
  getBootstrap: () => ipcRenderer.invoke('avatars:get-settings-bootstrap'),
  updateSettings: (patch) => ipcRenderer.invoke('avatars:update-settings', patch),
  setLaunchAtLogin: (value) => ipcRenderer.invoke('avatars:set-launch-at-login', Boolean(value)),
  installHooks: () => ipcRenderer.invoke('avatars:install-hooks'),
  uninstallHooks: () => ipcRenderer.invoke('avatars:uninstall-hooks'),
  hooksStatus: () => ipcRenderer.invoke('avatars:hooks-status'),
  refreshLibrary: () => ipcRenderer.invoke('avatars:refresh-library'),
  createAvatar: (brief) => ipcRenderer.invoke('avatars:create-avatar', brief),
  copyCreatePrompt: (brief) => ipcRenderer.invoke('avatars:copy-create-prompt', brief),
  pickCustomZone: () => ipcRenderer.invoke('avatars:pick-zone'),
  importPet: () => ipcRenderer.invoke('avatars:import-pet'),
  exportPet: (avatarId) => ipcRenderer.invoke('avatars:export-pet', avatarId),
  openPlugin: () => ipcRenderer.invoke('avatars:open-plugin'),
  openPetsDocs: () => ipcRenderer.invoke('avatars:open-pets-doc'),
  openPetDirectory: () => ipcRenderer.invoke('avatars:open-pet-directory'),
  runDemo: () => ipcRenderer.invoke('avatars:demo'),
  onState: (callback) => subscribe('avatars:state', callback),
  onSettings: (callback) => subscribe('avatars:settings', callback),
  onLibrary: (callback) => subscribe('avatars:library', callback),
  onDemo: (callback) => subscribe('avatars:demo', callback),
});
