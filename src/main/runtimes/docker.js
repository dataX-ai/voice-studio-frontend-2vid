const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const Docker = require('dockerode');
const CONFIG = require('../config.js');
const { getDataPath } = require('../utils/paths');

class DockerManager {
    // Class-level mutex flag
    static isCheckingContainer = false;
    static checkContainerPromise = null;

    static runPrivilegedCommand(command, callback) {
        if (process.platform === 'linux') {
            // Linux: Use pkexec for GUI password prompt
            exec(`pkexec ${command}`, (error, stdout, stderr) => {
                callback(error, stdout, stderr);
            });
        } else if (process.platform === 'darwin') {
            // Make the script executable first
            exec(`osascript -e 'do shell script "\\"${command.replace(/"/g, '\\\\"')}\\"" with administrator privileges'`, (error, stdout, stderr) => {
                callback(error, stdout, stderr);
            });
        } else if (process.platform === 'win32') {
            // Windows: Execute normally as the script handles elevation internally
            exec(command, callback);
        }
    }

    static async getScriptPath(scriptName) {
        let scriptsPath;
        console.log('Current directory:', __dirname);
        console.log('Process working directory:', process.cwd());
        console.log('Is development?', process.env.NODE_ENV === 'development');
        
        if (process.env.NODE_ENV === 'development') {
            // In development, use the scripts from the source directory
            // Go up from .webpack/main to the project root, then to src/main/runtimes/scripts
            scriptsPath = path.join(process.cwd(), 'src', 'main', 'runtimes', 'scripts');
            console.log('Development scripts path:', scriptsPath);
        } else {
            // In production, use the scripts from the resources directory
            scriptsPath = path.join(process.resourcesPath, 'scripts');
            console.log('Production scripts path:', scriptsPath);
        }
        
        const scriptPath = path.join(scriptsPath, scriptName);
        console.log('Full script path:', scriptPath);
        
        try {
            // Verify the script exists
            await fs.access(scriptPath);
            console.log('Script exists at:', scriptPath);
            
            // Set executable permissions for Unix systems
            if (process.platform !== 'win32') {
                try {
                    await fs.chmod(scriptPath, '755');
                } catch (error) {
                    console.warn(`Warning: Could not set executable permissions on ${scriptPath}`, error);
                }
            }
            
            return scriptPath;
        } catch (error) {
            console.error(`Failed to prepare script ${scriptName}:`, error);
            console.error('Attempted script path was:', scriptPath);
            throw new Error(`Script not found: ${scriptName}. Make sure all required files are included in your project.`);
        }
    }

    static async getInstallScript() {
        const scriptName = (() => {
            switch (process.platform) {
                case 'win32': return 'docker_install_win.bat';
                case 'darwin': return 'docker_install_macos.sh';
                case 'linux': return 'docker_install_linux.sh';
                default: throw new Error('Unsupported platform');
            }
        })();
        
        return this.getScriptPath(scriptName);
    }

    static async getDockerCheckScript() {
        const scriptName = (() => {
            switch (process.platform) {
                case 'win32': return 'docker_check_win.bat';
                case 'darwin': return 'docker_check_macos.sh';
                case 'linux': return 'docker_check_linux.sh';
                default: throw new Error('Unsupported platform');
            }
        })();
        
        return this.getScriptPath(scriptName);
    }

    // Check if Docker is installed
    static async checkInstallation() {
        try {
            const scriptPath = await this.getDockerCheckScript();
            let installed = false;
            let running = false;

            return new Promise((resolve, reject) => {
                const command = process.platform === 'win32'
                    ? scriptPath
                    : `sh "${scriptPath}"`;

                const proc = exec(command, (error, stdout, stderr) => {
                    if (error) {
                        reject(new Error(`Docker check failed: ${error.message}`));
                        return;
                    }
                    console.log('Docker check output:', stdout);
                    const lines = stdout.trim().split('\n');

                    lines.forEach(line => {
                        line = line.trim();
                        if (line === 'NOT INSTALLED') {
                            installed = false;
                            running = false;
                        } else if (line === 'NOT RUNNING') {
                            installed = true;
                            running = false;
                        } else if (line === 'RUNNING') {
                            installed = true;
                            running = true;
                        }
                    });

                    console.log('Docker status:', { installed, running });
                    resolve({ installed, running });
                });

                // Log real-time output
                proc.stdout.on('data', (data) => {
                    console.log('Docker check output:', data);
                    const lines = data.toString().split('\n');
                    lines.forEach(line => {
                        line = line.trim();
                        if (line === 'NOT INSTALLED') {
                            installed = false;
                            running = false;
                        } else if (line === 'NOT RUNNING') {
                            installed = true;
                            running = false;
                        } else if (line === 'RUNNING') {
                            installed = true;
                            running = true;
                        }
                    });
                });

                proc.on('close', (code) => {
                    console.log('Docker status:', { installed, running });
                    resolve({ installed, running });
                });
            });
        } catch (error) {
            throw new Error(`Failed to execute Docker check script: ${error.message}`);
        }
    }

    // Install Docker using platform-specific scripts
    static async installDocker() {
        try {
            const scriptPath = await this.getInstallScript();

            return new Promise((resolve, reject) => {
                const command = process.platform === 'win32' || process.platform === 'darwin' 
                    ? scriptPath
                    : `sh "${scriptPath}"`;

                this.runPrivilegedCommand(command, (error, stdout, stderr) => {
                    if (error) {
                        reject(new Error(`Docker installation failed: ${error.message}`));
                        return;
                    }
                    console.log('Installation output:', stdout);
                    if (stderr) console.error('Installation warnings:', stderr);
                    resolve(true);
                });
            });
        } catch (error) {
            throw new Error(`Failed to execute installation script: ${error.message}`);
        }
    }

    // Check Docker service status
    static checkServiceStatus() {
        return new Promise((resolve) => {
            const command = process.platform === 'win32'
                ? 'docker info'
                : 'systemctl is-active docker';

            exec(command, (error) => {
                resolve(!error);
            });
        });
    }

    // Get Docker version info
    static getVersionInfo() {
        return new Promise((resolve, reject) => {
            exec('docker version --format json', (error, stdout) => {
                if (error) {
                    reject(new Error('Failed to get Docker version'));
                    return;
                }
                try {
                    resolve(JSON.parse(stdout));
                } catch (e) {
                    reject(new Error('Failed to parse Docker version info'));
                }
            });
        });
    }

    static async checkModelContainer() {
        // If already running, return the existing promise
        if (this.isCheckingContainer) {
            console.log('Container check already in progress, waiting for existing operation...');
            return this.checkContainerPromise;
        }

        try {
            // Set mutex flag and create new promise
            this.isCheckingContainer = true;
            this.checkContainerPromise = this._checkModelContainerImpl();
            return await this.checkContainerPromise;
        } finally {
            // Always release the mutex when done
            this.isCheckingContainer = false;
            this.checkContainerPromise = null;
        }
    }

    // Implementation moved to private method
    static async _checkModelContainerImpl() {
        try {
            // Validate Docker image configuration first
            if (!CONFIG.DOCKER_IMAGE) {
                throw new Error('Docker image configuration is missing');
            }

            const docker = new Docker();
            console.log("Docker Image: " + CONFIG.DOCKER_IMAGE);
            const imageHash = await this.getImageHash(CONFIG.DOCKER_IMAGE);
            const containerName = `voice-studio-models-${imageHash}`;
            console.log('Checking for existing containers...');
            
            // List ALL containers including stopped ones
            const containers = await docker.listContainers({
                all: true,
                filters: { 
                    name: [containerName],
                    ancestor: [CONFIG.DOCKER_IMAGE]
                }
            });

            if (containers.length > 0) {
                const container = containers[0];
                console.log('Found existing container:', container.Id);
                console.log('Container state:', container.State);
                
                const containerInstance = docker.getContainer(container.Id);
                
                // Get detailed container info
                const containerInfo = await containerInstance.inspect();
                const ports = containerInfo.NetworkSettings.Ports['8000/tcp'] || [];
                const portMapping = ports[0]?.HostPort;

                if (portMapping) {
                    console.log('Found existing port mapping:', portMapping);
                    
                    // Check if the existing port is available or if this container is already using it
                    const portInUseByOther = await this.isPortInUseByOtherContainer(portMapping, container.Id);
                    
                    if (!portInUseByOther) {
                        CONFIG.RUNTIME_PORT = portMapping;
                        
                        // If container exists but not running, start it
                        if (container.State !== 'running') {
                            console.log('Container exists but not running, starting it...');
                            try {
                                await containerInstance.start();
                                console.log('Container started successfully');
                                
                                // Add a delay to allow container to fully start
                                await new Promise(resolve => setTimeout(resolve, 2000));
                                
                                // Verify container is actually running
                                const updatedInfo = await containerInstance.inspect();
                                if (!updatedInfo.State.Running) {
                                    throw new Error('Container failed to start properly');
                                }
                            } catch (startError) {
                                console.error('Failed to start container:', startError);
                                console.log('Removing container and creating new one...');
                                await containerInstance.remove({ force: true });
                                return await this.pullAndStartContainer();
                            }
                        } else {
                            console.log('Container is already running');
                        }
                        return true;
                    } else {
                        console.log('Port is in use by another container, finding new port...');
                        const newPort = await this.findAvailablePort();
                        CONFIG.RUNTIME_PORT = newPort;
                        
                        // Stop and remove the existing container
                        console.log('Stopping and removing existing container...');
                        await containerInstance.stop();
                        await containerInstance.remove();
                        
                        // Create new container with the new port
                        return await this.pullAndStartContainer();
                    }
                } else {
                    // If container exists but has no port mapping, remove and recreate
                    console.log('Existing container has no port mapping, recreating...');
                    await containerInstance.remove({ force: true });
                    return await this.pullAndStartContainer();
                }
            }

            console.log('No existing container found, creating new one...');
            return await this.pullAndStartContainer();

        } catch (error) {
            console.error('Detailed error in checkModelContainer:', error);
            throw new Error(`Failed to manage model container: ${error.message}`);
        }
    }

    static async getImageHash(imageName) {
        try {
            if (!imageName || typeof imageName !== 'string') {
                throw new Error('Invalid image name provided to getImageHash');
            }

            return require('crypto')
                .createHash('sha256')
                .update(imageName)
                .digest('hex')
                .substring(0, 12);
        } catch (error) {
            console.error('Error getting image hash:', error);
            throw new Error(`Failed to generate image hash: ${error.message}`);
        }
    }

    static async isPortAvailable(port) {
        const docker = new Docker();
        const containers = await docker.listContainers();
        // Check if any container is using this port
        for (const container of containers) {
            const ports = container.Ports || [];
            if (ports.some(p => p.PublicPort === parseInt(port))) {
                return false;
            }
        }
        
        return true;
    }

    static async findAvailablePort() {
        // Try ports from 3100 to 3110
        for (let port = 3100; port <= 3110; port++) {
            if (await this.isPortAvailable(port.toString())) {
                return port.toString();
            }
        }
        throw new Error('No available ports found in range 3100-3110');
    }

    static async pullAndStartContainer() {
        const docker = new Docker();
        const { BrowserWindow } = require('electron');
        const mainWindow = BrowserWindow.getAllWindows()[0];
        
        try {
            // Validate image name format
            if (!CONFIG.DOCKER_IMAGE || typeof CONFIG.DOCKER_IMAGE !== 'string') {
                throw new Error('Invalid Docker image configuration');
            }

            console.log('Attempting to work with image:', CONFIG.DOCKER_IMAGE);

            // First check if image exists locally
            const images = await docker.listImages({
                filters: {
                    reference: [CONFIG.DOCKER_IMAGE]
                }
            });
            
            // Only pull if image doesn't exist locally
            if (images.length === 0) {
                console.log(`Image not found locally. Pulling image: ${CONFIG.DOCKER_IMAGE}`);
                
                // Split image name and tag
                const [imageName, tag] = CONFIG.DOCKER_IMAGE.split(':');
                const pullOpts = {
                    fromImage: imageName,
                    tag: tag || 'latest'
                };

                // Send initial status to renderer
                if (mainWindow) {
                    mainWindow.webContents.send('docker-pull-status', {
                        status: 'started',
                        progress: 0,
                        image: CONFIG.DOCKER_IMAGE
                    });
                }

                const stream = await docker.pull(`${pullOpts.fromImage}:${pullOpts.tag}`);
                
                // Wait for the pull to complete and track progress
                await new Promise((resolve, reject) => {
                    let layers = {};
                    
                    docker.modem.followProgress(
                        stream,
                        (err, res) => {
                            if (err) {
                                // Send error to renderer
                                if (mainWindow) {
                                    mainWindow.webContents.send('docker-pull-status', {
                                        status: 'error',
                                        error: err.message,
                                        image: CONFIG.DOCKER_IMAGE
                                    });
                                }
                                reject(err);
                            } else {
                                // Send completion to renderer
                                if (mainWindow) {
                                    mainWindow.webContents.send('docker-pull-status', {
                                        status: 'completed',
                                        progress: 100,
                                        image: CONFIG.DOCKER_IMAGE
                                    });
                                }
                                resolve(res);
                            }
                        },
                        (event) => {
                            // Process progress events during download
                            if (event.id && (event.status === 'Downloading' || event.status === 'Extracting')) {
                                layers[event.id] = event;
                                
                                // Calculate overall progress across all layers
                                let totalProgress = 0;
                                let totalLayers = 0;
                                
                                for (const layerId in layers) {
                                    const layer = layers[layerId];
                                    if (layer.progressDetail && layer.progressDetail.total) {
                                        const layerProgress = layer.progressDetail.current / layer.progressDetail.total;
                                        totalProgress += layerProgress;
                                        totalLayers++;
                                    }
                                }
                                
                                const overallProgress = totalLayers > 0 ? totalProgress / totalLayers : 0;
                                const progressPercent = Math.round(overallProgress * 100);
                                
                                // Send progress to renderer
                                if (mainWindow) {
                                    mainWindow.webContents.send('docker-pull-status', {
                                        status: 'downloading',
                                        progress: progressPercent,
                                        details: `${event.status} layer ${event.id.substring(0, 12)}`,
                                        image: CONFIG.DOCKER_IMAGE
                                    });
                                }
                            }
                        }
                    );
                });
            } else {
                console.log('Image already exists locally');
                // Notify renderer that image already exists
                if (mainWindow) {
                    mainWindow.webContents.send('docker-pull-status', {
                        status: 'exists',
                        image: CONFIG.DOCKER_IMAGE
                    });
                }
            }

            // Get image hash for container name
            const imageHash = await this.getImageHash(CONFIG.DOCKER_IMAGE);
            const containerName = `voice-studio-models-${imageHash}`;

            // Create output directory if it doesn't exist
            const outputPath = path.join(getDataPath(), 'output');
            console.log('Using data directory:', outputPath);
            await fs.mkdir(outputPath, { recursive: true });

            // Find an available port

            let port = CONFIG.RUNTIME_PORT;
            if (port === null || ! (await this.isPortAvailable(port))){
                port = await this.findAvailablePort();
                CONFIG.RUNTIME_PORT = port;
            }
             // This will persist through the setter
            
            // Create and start the container
            console.log('Creating container...');
            const container = await docker.createContainer({
                Image: CONFIG.DOCKER_IMAGE,
                name: containerName,
                ExposedPorts: {
                    '8000/tcp': {}
                },
                HostConfig: {
                    PortBindings: {
                        '8000/tcp': [{ HostPort: port }]
                    },
                    Binds: [
                        `${outputPath}:/app/output`
                    ]
                }
            });

            console.log('Starting container...');
            await container.start();
            console.log('Container started successfully');
            return true;

        } catch (error) {
            console.error('Detailed error in pullAndStartContainer:', error);
            throw new Error(`Failed to pull/start container: ${error.message}`);
        }
    }

    // New helper method to check if a port is in use by containers other than the specified one
    static async isPortInUseByOtherContainer(port, excludeContainerId) {
        const docker = new Docker();
        const containers = await docker.listContainers();
        
        // Check if any OTHER container is using this port
        for (const container of containers) {
            if (container.Id !== excludeContainerId) {
                const ports = container.Ports || [];
                if (ports.some(p => p.PublicPort === parseInt(port))) {
                    return true;
                }
            }
        }
        
        return false;
    }
}

module.exports = DockerManager; 