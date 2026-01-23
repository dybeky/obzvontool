import { SavedStats, UpdateInfo } from './index';

export interface ElectronAPI {
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  fullscreen: () => void;
  isMaximized: () => Promise<boolean>;
  isFullscreen: () => Promise<boolean>;
  openExternal: (url: string) => void;
  getStats: () => Promise<SavedStats>;
  saveStats: (stats: Partial<SavedStats>) => Promise<boolean>;
  updateHighScore: (score: number) => Promise<boolean>;
  checkForUpdates: () => Promise<UpdateInfo>;
  getUpdateInfo: () => Promise<UpdateInfo>;
  downloadUpdate: () => void;
  quitApp: () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
