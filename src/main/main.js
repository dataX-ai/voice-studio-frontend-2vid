const { app, BrowserWindow, ipcMain, protocol } = require('electron');
const path = require('path');
const DockerManager = require('./runtimes/docker');
const SystemInfoManager = require('./utils/system-info');
const modelService = require('./models/model');
const audioService = require('./services/audio_services');
const { getDataPath } = require('./utils/paths');
const fs = require('fs');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Register custom protocol
function registerProtocols() {
  protocol.registerFileProtocol('media', (request, callback) => {
    let filePath = decodeURIComponent(request.url.replace('media:///', ''));
    
    const allowedBasePath = path.dirname(getDataPath());
    
    const normalizedFilePath = path.normalize(filePath);
    const normalizedAllowedBase = path.normalize(allowedBasePath);
    
    if (!normalizedFilePath.toLowerCase().startsWith(normalizedAllowedBase.toLowerCase())) {
      console.error('Attempted to load a media file outside the allowed directory:', normalizedFilePath);
      return callback({ error: -6 });
    }
    
    callback(normalizedFilePath);
  });
}

// Set up all IPC handlers
function setupIpcHandlers() {
  // Docker IPC handlers
  ipcMain.handle('docker:check', async () => {
    try {
      return await DockerManager.checkInstallation();
    } catch (error) {
      console.error('Docker check failed:', error);
      throw error;
    }
  });

  ipcMain.handle('docker:install', async () => {
    try {
      return await DockerManager.installDocker();
    } catch (error) {
      console.error('Docker installation failed:', error);
      throw error;
    }
  });

  ipcMain.handle('docker:checkModelContainer', async () => {
    try {
      return await DockerManager.checkModelContainer();
    } catch (error) {
      console.error('Model container check failed:', error);
      throw error;
    }
  });

  // System Info IPC handlers
  ipcMain.handle('system:getInfo', async () => {
    try {
      return await SystemInfoManager.getSystemInfo();
    } catch (error) {
      console.error('Failed to get system info:', error);
      throw error;
    }
  });

  ipcMain.handle('system:getPerformanceStats', async () => {
    try {
      return await SystemInfoManager.getPerformanceStats();
    } catch (error) {
      console.error('Failed to get performance stats:', error);
      throw error;
    }
  });

  // Model-related handlers
  ipcMain.handle('fetch-downloaded-models', async () => {
    try {
      return await modelService.fetchDownloadedModels();
    } catch (error) {
      console.error('IPC Error - fetch-downloaded-models:', error);
      throw error;
    }
  });

  ipcMain.handle('fetch-models', async () => {
    try {
      return await modelService.fetchModels();
    } catch (error) {
      console.error('IPC Error - fetch-models:', error);
      throw error;
    }
  });

  ipcMain.handle('start-model-download', async (event, { model_id }) => {
    try {
      const mainWindow = BrowserWindow.getFocusedWindow();
      return await modelService.startModelDownload(model_id, mainWindow);
    } catch (error) {
      console.error('IPC Error - start-model-download:', error);
      throw error;
    }
  });

  ipcMain.handle('fetch-loaded-models', async () => {
    try {
      return await modelService.fetchLoadedModels();
    } catch (error) {
      console.error('IPC Error - fetch-loaded-models:', error);
      throw error;
    }
  });

  ipcMain.handle('fetch-model-details', async (event, { ids }) => {
    try {
      return await modelService.fetchModelDetails(ids);
    } catch (error) {
      console.error('IPC Error - fetch-model-details:', error);
      throw error;
    }
  });

  ipcMain.handle('load-model', async (event, { model_id }) => {
    try {
      return await modelService.loadModel(model_id);
    } catch (error) {
      console.error('IPC Error - load-model:', error);
      throw error;
    }
  });

  ipcMain.handle('unload-model', async (event, { model_id }) => {
    try {
      return await modelService.unloadModel(model_id);
    } catch (error) {
      console.error('IPC Error - unload-model:', error);
      throw error;
    }
  });

  ipcMain.handle('delete-model', async (event, { model_id }) => {
    try {
      return await modelService.deleteModel(model_id);
    } catch (error) {
      console.error('IPC Error - delete-model:', error);
      throw error;
    }
  });

  // Audio-related handlers
  ipcMain.handle('generate-speech', async (event, { text, modelId }) => {
    try {
      return await audioService.generateSpeech(text, modelId);
    } catch (error) {
      console.error('IPC Error - generate-speech:', error);
      throw error;
    }
  });

  ipcMain.handle('get-absolute-audio-path', async (event, { relativePath }) => {
    try {
      const dataPath = getDataPath();
      const absolutePath = path.join(dataPath, relativePath);
      // Convert Windows backslashes to forward slashes and create media URL with three slashes
      return `media:///${absolutePath.replace(/\\/g, '/')}`;
    } catch (error) {
      console.error('IPC Error - get-absolute-audio-path:', error);
      throw error;
    }
  });
}

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY
    }
  });

  // Set proper CSP headers
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' media:;",
          "connect-src 'self' http://127.0.0.1:* http://localhost:* ws://127.0.0.1:* ws://localhost:*;",
          "img-src 'self' data:;",
          "script-src 'self' 'unsafe-eval' 'unsafe-inline';",
          "style-src 'self' 'unsafe-inline';"
        ].join(' ')
      }
    });
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/main_window/index.html'));
  }

  return mainWindow;
}

// Initialize app
app.whenReady().then(() => {
  // Register protocols first
  registerProtocols();
  
  // Set up IPC handlers
  setupIpcHandlers();
  
  // Then create window
  const mainWindow = createWindow();

  // Make ipcMain available globally for the Docker manager
  global.ipcMain = ipcMain;

  // Store main window reference globally
  global.mainWindow = mainWindow;

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  // Clean up any active downloads
  modelService.cleanupDownloads();

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
