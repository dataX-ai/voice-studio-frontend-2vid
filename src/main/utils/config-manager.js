const fs = require('fs/promises');
const path = require('path');
const { getDataPath } = require('./paths');

class ConfigManager {
    constructor() {
        this.configPath = path.join(getDataPath(), 'runtime-config.json');
        this.defaultConfig = {
            runtimePort: '3100'
        };
        this.currentConfig = null;
    }

    async load() {
        try {
            await fs.mkdir(path.dirname(this.configPath), { recursive: true });

            try {
                const data = await fs.readFile(this.configPath, 'utf8');
                this.currentConfig = JSON.parse(data);
            } catch (error) {
                if (error.code === 'ENOENT') {
                    this.currentConfig = { ...this.defaultConfig };
                    await this.save();
                } else {
                    throw error;
                }
            }

            return this.currentConfig;
        } catch (error) {
            console.error('Error loading config:', error);
            return { ...this.defaultConfig };
        }
    }

    async save() {
        try {
            await fs.writeFile(this.configPath, JSON.stringify(this.currentConfig, null, 2));
        } catch (error) {
            console.error('Error saving config:', error);
        }
    }

    async updateRuntimePort(port) {
        this.currentConfig = this.currentConfig || { ...this.defaultConfig };
        this.currentConfig.runtimePort = port;
        await this.save();
    }

    getRuntimePort() {
        return this.currentConfig?.runtimePort || this.defaultConfig.runtimePort;
    }
}

module.exports = new ConfigManager(); 