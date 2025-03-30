// Add these to your existing electronAPI exposed functions
contextBridge.exposeInMainWorld('electronAPI', {
    // ... your existing exposed functions
    
    // For Docker pull status updates
    onDockerPullStatus: (callback) => {
        ipcRenderer.on('docker-pull-status', (_, data) => callback(data));
    },
    
    removeDockerPullStatusListener: () => {
        ipcRenderer.removeAllListeners('docker-pull-status');
    }
}); 