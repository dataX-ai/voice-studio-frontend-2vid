const { contextBridge, ipcRenderer } = require('electron');

// Only expose what's needed for the renderer
const DOWNLOAD_STATUS = {
    PENDING: -1,
    DOWNLOADING: 0,
    READY: 1
};

// Helper function for IPC invocation with error handling
async function invokeIPC(channel, ...args) {
    try {
        return await ipcRenderer.invoke(channel, ...args);
    } catch (error) {
        console.error(`IPC invocation error for channel '${channel}':`, error);
        throw error;
    }
}

contextBridge.exposeInMainWorld('electronAPI', {
    // Constants
    DOWNLOAD_STATUS,
    
    // Docker methods
    checkDocker: () => invokeIPC('docker:check'),
    installDocker: () => invokeIPC('docker:install'),
    checkModelContainer: () => invokeIPC('docker:checkModelContainer'),
    
    // System info methods
    getSystemInfo: () => invokeIPC('system:getInfo'),
    getPerformanceStats: () => invokeIPC('system:getPerformanceStats'),

    // Model methods
    fetchDownloadedModels: () => invokeIPC('fetch-downloaded-models'),
    fetchModels: () => invokeIPC('fetch-models'),
    startModelDownload: (modelId) => invokeIPC('start-model-download', { model_id: modelId }),
    fetchLoadedModels: () => invokeIPC('fetch-loaded-models'),
    fetchModelDetails: (ids) => invokeIPC('fetch-model-details', { ids }),
    loadModel: (modelId) => invokeIPC('load-model', { model_id: modelId }),
    unloadModel: (modelId) => invokeIPC('unload-model', { model_id: modelId }),
    deleteModel: (modelId) => invokeIPC('delete-model', { model_id: modelId }),

    // Audio methods
    generateSpeech: (text, modelId) => invokeIPC('generate-speech', { text, modelId }),
    getAbsoluteAudioPath: (relativePath) => invokeIPC('get-absolute-audio-path', { relativePath }),

    // Event listeners
    on: (channel, func) => {
        const validChannels = ['download-progress'];
        if (validChannels.includes(channel)) {
            // Strip event as it includes `sender`
            ipcRenderer.on(channel, (event, ...args) => func(...args));
        } else {
            console.warn(`Invalid channel '${channel}' for IPC listener`);
        }
    },
    removeListener: (channel, func) => {
        const validChannels = ['download-progress'];
        if (validChannels.includes(channel)) {
            ipcRenderer.removeListener(channel, func);
        } else {
            console.warn(`Invalid channel '${channel}' for IPC listener removal`);
        }
    },

});
