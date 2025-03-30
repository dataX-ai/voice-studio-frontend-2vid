const WebSocket = require('ws');
const fetch = require('node-fetch').default;
const CONFIG = require('../config');

// Keep track of active downloads
const activeDownloads = new Map();

// Model-related functions
const modelService = {
  // Fetch downloaded models
  async fetchDownloadedModels() {
    try {
      const response = await fetch(`${CONFIG.LOCAL_ENDPOINT}/models/download`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching downloaded models:', error);
      throw error;
    }
  },

  // Fetch loaded/running models
  async fetchLoadedModels() {
    try {
      const response = await fetch(`${CONFIG.LOCAL_ENDPOINT}/models/load`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching loaded models:', error);
      throw error;
    }
  },

  // Fetch model details in batch
  async fetchModelDetails(modelIds) {
    try {
      const response = await fetch(`${CONFIG.BACKEND_ENDPOINT}/models/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids: modelIds })
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching model details:', error);
      throw error;
    }
  },

  // Load a model
  async loadModel(modelId) {
    try {
      const response = await fetch(`${CONFIG.LOCAL_ENDPOINT}/models/load`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model_id: modelId })
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error loading model:', error);
      throw error;
    }
  },

  // Unload a model
  async unloadModel(modelId) {
    try {
      const response = await fetch(`${CONFIG.LOCAL_ENDPOINT}/models/unload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model_id: modelId })
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error unloading model:', error);
      throw error;
    }
  },

  // Delete a model
  async deleteModel(modelId) {
    try {
      const response = await fetch(`${CONFIG.LOCAL_ENDPOINT}/models/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model_id: modelId })
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error deleting model:', error);
      throw error;
    }
  },

  // Fetch available models
  async fetchModels() {
    try {
      const response = await fetch(`${CONFIG.BACKEND_ENDPOINT}/models`, {
        method: 'POST'
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching models:', error);
      throw error;
    }
  },

  // Start model download
  startModelDownload(model_id, mainWindow) {
    return new Promise((resolve, reject) => {
      try {
        // If already downloading, return
        if (activeDownloads.has(model_id)) {
          resolve();
          return;
        }

        const ws = new WebSocket(CONFIG.DOWNLOAD_ENDPOINT);

        ws.on('open', () => {
          ws.send(JSON.stringify({ model_id }));
        });

        ws.on('message', (data) => {
          const parsedData = JSON.parse(data);
          mainWindow.webContents.send('download-progress', parsedData);
        });

        ws.on('error', (error) => {
          console.error('WebSocket Error:', error);
          mainWindow.webContents.send('download-progress', {
            model_id,
            status: CONFIG.DOWNLOAD_STATUS.PENDING,
            error: error.message
          });
          activeDownloads.delete(model_id);
          reject(error);
        });

        ws.on('close', () => {
          activeDownloads.delete(model_id);
        });

        activeDownloads.set(model_id, ws);
        resolve();
      } catch (error) {
        console.error('Error starting download:', error);
        reject(error);
      }
    });
  },

  // Clean up all active downloads
  cleanupDownloads() {
    activeDownloads.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    });
    activeDownloads.clear();
  }
};

module.exports = modelService; 