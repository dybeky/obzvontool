import { app, BrowserWindow, ipcMain, shell } from 'electron';
import * as path from 'path';
import * as https from 'https';
import Store from 'electron-store';

interface StoreSchema {
  highScore: number;
  totalHits: number;
  totalMisses: number;
  gamesPlayed: number;
}

interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  needsUpdate: boolean;
  releaseUrl?: string;
  downloadUrl?: string;
  releaseName?: string;
  releaseBody?: string;
  error?: string;
}

interface GitHubRelease {
  tag_name: string;
  html_url: string;
  name: string;
  body: string;
  assets?: Array<{
    name: string;
    browser_download_url: string;
  }>;
}

const store = new Store<StoreSchema>({
  defaults: {
    highScore: 0,
    totalHits: 0,
    totalMisses: 0,
    gamesPlayed: 0
  }
});

const GITHUB_OWNER = 'dybeky';
const GITHUB_REPO = 'obzvontool';

let mainWindow: BrowserWindow | null = null;
let updateInfo: UpdateInfo | null = null;
const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;

function getCurrentVersion(): string {
  return app.getVersion();
}

function compareVersions(current: string, latest: string): boolean {
  const currentParts = current.replace(/^v/, '').split('.').map(Number);
  const latestParts = latest.replace(/^v/, '').split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const curr = currentParts[i] || 0;
    const lat = latestParts[i] || 0;
    if (lat > curr) return true;
    if (lat < curr) return false;
  }
  return false;
}

function checkForUpdates(): Promise<UpdateInfo> {
  return new Promise((resolve) => {
    const options: https.RequestOptions = {
      hostname: 'api.github.com',
      path: `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
      method: 'GET',
      headers: {
        'User-Agent': 'OBZVON-UpdateChecker',
        'Accept': 'application/vnd.github.v3+json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk: Buffer) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const release: GitHubRelease = JSON.parse(data);
            const latestVersion = release.tag_name.replace(/^v/, '');
            const currentVersion = getCurrentVersion();
            const needsUpdate = compareVersions(currentVersion, latestVersion);

            const exeAsset = release.assets?.find(a => a.name.endsWith('.exe'));

            updateInfo = {
              currentVersion,
              latestVersion,
              needsUpdate,
              releaseUrl: release.html_url,
              downloadUrl: exeAsset?.browser_download_url || release.html_url,
              releaseName: release.name,
              releaseBody: release.body
            };

            resolve(updateInfo);
          } else {
            resolve({
              currentVersion: getCurrentVersion(),
              latestVersion: getCurrentVersion(),
              needsUpdate: false,
              error: 'Could not check for updates'
            });
          }
        } catch {
          resolve({
            currentVersion: getCurrentVersion(),
            latestVersion: getCurrentVersion(),
            needsUpdate: false,
            error: 'Parse error'
          });
        }
      });
    });

    req.on('error', () => {
      resolve({
        currentVersion: getCurrentVersion(),
        latestVersion: getCurrentVersion(),
        needsUpdate: false,
        error: 'Network error'
      });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve({
        currentVersion: getCurrentVersion(),
        latestVersion: getCurrentVersion(),
        needsUpdate: false,
        error: 'Timeout'
      });
    });

    req.end();
  });
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    transparent: false,
    backgroundColor: '#0a0a0f',
    icon: path.join(__dirname, '../obzvonico.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5174');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC handlers for window controls
ipcMain.on('window-minimize', () => {
  mainWindow?.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.on('window-close', () => {
  mainWindow?.close();
});

ipcMain.on('window-fullscreen', () => {
  mainWindow?.setFullScreen(!mainWindow.isFullScreen());
});

ipcMain.handle('is-maximized', () => {
  return mainWindow?.isMaximized() || false;
});

ipcMain.handle('is-fullscreen', () => {
  return mainWindow?.isFullScreen() || false;
});

// IPC handler for opening external links
ipcMain.on('open-external', (_event, url: string) => {
  shell.openExternal(url);
});

// IPC handlers for stats storage
ipcMain.handle('get-stats', () => {
  return {
    highScore: store.get('highScore'),
    totalHits: store.get('totalHits'),
    totalMisses: store.get('totalMisses'),
    gamesPlayed: store.get('gamesPlayed')
  };
});

ipcMain.handle('save-stats', (_event, stats: Partial<StoreSchema>) => {
  if (stats.highScore !== undefined) store.set('highScore', stats.highScore);
  if (stats.totalHits !== undefined) store.set('totalHits', stats.totalHits);
  if (stats.totalMisses !== undefined) store.set('totalMisses', stats.totalMisses);
  if (stats.gamesPlayed !== undefined) store.set('gamesPlayed', stats.gamesPlayed);
  return true;
});

ipcMain.handle('update-high-score', (_event, score: number) => {
  const currentHigh = store.get('highScore');
  if (score > currentHigh) {
    store.set('highScore', score);
    return true;
  }
  return false;
});

// IPC handlers for update checking
ipcMain.handle('check-for-updates', async () => {
  return await checkForUpdates();
});

ipcMain.handle('get-update-info', () => {
  return updateInfo || {
    currentVersion: getCurrentVersion(),
    latestVersion: getCurrentVersion(),
    needsUpdate: false
  };
});

// Opens download page or direct .exe link
ipcMain.on('download-update', () => {
  if (updateInfo?.downloadUrl) {
    shell.openExternal(updateInfo.downloadUrl);
  } else {
    shell.openExternal(`https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`);
  }
});

ipcMain.on('quit-app', () => {
  app.quit();
});
