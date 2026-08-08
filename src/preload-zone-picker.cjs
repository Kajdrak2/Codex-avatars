'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('codexAvatars', {
  completeZoneSelection: (rectangle) => ipcRenderer.invoke('avatars:zone-picker-complete', rectangle),
  cancelZoneSelection: () => ipcRenderer.invoke('avatars:zone-picker-cancel'),
});
