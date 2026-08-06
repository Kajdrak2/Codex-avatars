'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('codexAvatars', {
  getState: () => ipcRenderer.invoke('avatars:get-state'),
  getSettings: () => ipcRenderer.invoke('avatars:get-settings'),
  setPassive: (value) => ipcRenderer.invoke('avatars:set-passive', Boolean(value)),
  setLaunchAtLogin: (value) => ipcRenderer.invoke('avatars:set-launch-at-login', Boolean(value)),
  installHooks: () => ipcRenderer.invoke('avatars:install-hooks'),
  uninstallHooks: () => ipcRenderer.invoke('avatars:uninstall-hooks'),
  hooksStatus: () => ipcRenderer.invoke('avatars:hooks-status'),
  runDemo: () => ipcRenderer.invoke('avatars:demo'),
  quit: () => ipcRenderer.invoke('avatars:quit'),
  onState: (callback) => {
    const listener = (_event, snapshot) => callback(snapshot);
    ipcRenderer.on('avatars:state', listener);
    return () => ipcRenderer.removeListener('avatars:state', listener);
  },
  onPassive: (callback) => {
    const listener = (_event, value) => callback(value);
    ipcRenderer.on('avatars:passive', listener);
    return () => ipcRenderer.removeListener('avatars:passive', listener);
  },
});
