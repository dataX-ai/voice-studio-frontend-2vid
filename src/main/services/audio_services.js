const fetch = require('node-fetch').default;
const CONFIG = require('../config');

class AudioService {
    async generateSpeech(text, modelId) {
        try {
            const response = await fetch(`${CONFIG.LOCAL_ENDPOINT}/tts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    text,
                    model_id: modelId 
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return {
                success: true,
                audioPath: data.filename
            };
        } catch (error) {
            console.error('Error generating speech:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

}

module.exports = new AudioService();
