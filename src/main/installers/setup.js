const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function setupDev() {
    if (process.platform === 'linux') {
        const rulesPath = '/etc/polkit-1/rules.d/50-docker.rules';
        const sourceRules = path.join(__dirname, '50-docker.rules');
        const currentUser = process.env.SUDO_USER || process.env.USER;
        
        try {
            // Ensure script has correct line endings
            const scriptPath = path.join(__dirname, '../runtimes/scripts/docker_install_linux.sh');
            let scriptContent = fs.readFileSync(scriptPath, 'utf8');
            scriptContent = scriptContent.replace(/\r\n/g, '\n');
            fs.writeFileSync(scriptPath, scriptContent, 'utf8');
            fs.chmodSync(scriptPath, '755');

            // Install polkit rules
            execSync(`pkexec bash -c '
                mkdir -p /etc/polkit-1/rules.d/
                cp "${sourceRules}" "${rulesPath}"
                chmod 644 "${rulesPath}"
                chown root:root "${rulesPath}"
                
                # Ensure the rules directory has correct permissions
                chmod 755 /etc/polkit-1/rules.d
                
                # Restart polkit to load new rules
                systemctl restart polkit

                # Ensure docker group exists and user is in it
                getent group docker || groupadd docker
                usermod -aG docker ${currentUser}
                
                # Set proper permissions for Docker socket if it exists
                if [ -e /var/run/docker.sock ]; then
                    chmod 666 /var/run/docker.sock
                fi
            '`);
            console.log('Polkit rules and docker group setup completed successfully');
            
            // Notify about group changes
            console.log('Note: You may need to log out and back in for group changes to take effect');
        } catch (error) {
            console.error('Failed to setup docker permissions:', error);
        }
    }
}

setupDev(); 