import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: (): void => ipcRenderer.send('window-minimize'),
  maximize: (): void => ipcRenderer.send('window-maximize'),
  close: (): void => ipcRenderer.send('window-close'),
  fullscreen: (): void => ipcRenderer.send('window-fullscreen'),
  isMaximized: (): Promise<boolean> => ipcRenderer.invoke('is-maximized'),
  isFullscreen: (): Promise<boolean> => ipcRenderer.invoke('is-fullscreen'),

  // External links
  openExternal: (url: string): void => ipcRenderer.send('open-external', url),

  // Stats storage
  getStats: () => ipcRenderer.invoke('get-stats'),
  saveStats: (stats: Record<string, unknown>) => ipcRenderer.invoke('save-stats', stats),
  updateHighScore: (score: number) => ipcRenderer.invoke('update-high-score', score),

  // Update checking
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  getUpdateInfo: () => ipcRenderer.invoke('get-update-info'),
  downloadUpdate: (): void => ipcRenderer.send('download-update'),
  quitApp: (): void => ipcRenderer.send('quit-app')
});
