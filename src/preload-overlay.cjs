'use strict';

const { contextBridge, ipcRenderer } = require('electron');

function subscribe(channel, callback) {
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld('codexAvatars', {
  getBootstrap: () => ipcRenderer.invoke('avatars:get-overlay-bootstrap'),
  setOverlayHitTest: (value) => ipcRenderer.invoke('avatars:overlay-hit-test', Boolean(value)),
  onState: (callback) => subscribe('avatars:state', callback),
  onSettings: (callback) => subscribe('avatars:settings', callback),
  onLibrary: (callback) => subscribe('avatars:library', callback),
});
