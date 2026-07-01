'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('yana', {
  getVersion:      () => ipcRenderer.invoke('yana:version'),
  getServerUrl:    () => ipcRenderer.invoke('yana:server-url'),
  getAuthFilePath: () => ipcRenderer.invoke('yana:auth-file-path'),
  revealAuthFile:  () => ipcRenderer.invoke('yana:reveal-auth-file'),
});
