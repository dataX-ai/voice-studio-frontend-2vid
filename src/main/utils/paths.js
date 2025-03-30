const path = require('path');

const getDataPath = () => {
    const appName = 'voice-studio';
    switch (process.platform) {
        case 'win32': {
            // Use LocalAppData instead of AppData to avoid roaming profiles
            const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE, 'AppData', 'Local');
            return path.join(localAppData, appName, 'data');
        }
        case 'darwin': {
            // Use ~/Library/Application Support for user data
            const userHome = process.env.HOME;
            return path.join(userHome, 'Library', 'Application Support', appName, 'data');
        }
        case 'linux': {
            // Use XDG_DATA_HOME if available, fallback to ~/.local/share
            const xdgDataHome = process.env.XDG_DATA_HOME || path.join(process.env.HOME, '.local', 'share');
            return path.join(xdgDataHome, appName, 'data');
        }
        default:
            throw new Error('Unsupported platform');
    }
};

module.exports = { getDataPath }; 