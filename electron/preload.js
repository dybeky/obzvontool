const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  fullscreen: () => ipcRenderer.send('window-fullscreen'),
  isMaximized: () => ipcRenderer.invoke('is-maximized'),
  isFullscreen: () => ipcRenderer.invoke('is-fullscreen'),

  // External links
  openExternal: (url) => ipcRenderer.send('open-external', url),

  // Stats storage
  getStats: () => ipcRenderer.invoke('get-stats'),
  saveStats: (stats) => ipcRenderer.invoke('save-stats', stats),
  updateHighScore: (score) => ipcRenderer.invoke('update-high-score', score),

  // Update checking
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  getUpdateInfo: () => ipcRenderer.invoke('get-update-info'),
  downloadUpdate: () => ipcRenderer.send('download-update'),
  quitApp: () => ipcRenderer.send('quit-app')
});
