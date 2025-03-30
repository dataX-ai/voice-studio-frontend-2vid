const configManager = require('./utils/config-manager');
const path = require('path');
const fs = require('fs');
// Add dotenv configuration
require('dotenv').config();

const CONFIG = {
    // Runtime configuration
    get RUNTIME_PORT() {
        return configManager.getRuntimePort();
    },
    set RUNTIME_PORT(value) {
        configManager.updateRuntimePort(value);
    },
    DOCKER_IMAGE: process.env.DOCKER_IMAGE || 'voicestudio/model-library:latest',

    // API Endpoints
    get LOCAL_ENDPOINT() {
        return `http://127.0.0.1:${this.RUNTIME_PORT}`;
    },
    // Load from build config first, then env, then fallback
    BACKEND_ENDPOINT: process.env.BACKEND_ENDPOINT || 'http://127.0.0.1:8000',
    get GENERATE_AUDIO_ENDPOINT() {
        return `${this.LOCAL_ENDPOINT}/tts`;
    },
    get DOWNLOAD_ENDPOINT() {
        return `ws://127.0.0.1:${this.RUNTIME_PORT}/ws/download-model`;
    },

    // Download Status Constants
    DOWNLOAD_STATUS: {
        PENDING: -1,
        DOWNLOADING: 0,
        READY: 1
    }
};

// Initialize config
configManager.load().catch(console.error);

module.exports = CONFIG;