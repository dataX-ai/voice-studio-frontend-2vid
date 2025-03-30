import React, { useEffect, useState, useRef } from 'react';
import styles from './InitializationPage.module.css';

// Import the same keys used in TextToSpeech
const STORAGE_KEYS = {
  TEXT: 'tts-text',
  SELECTED_MODEL: 'tts-selected-model',
  SHOW_AUDIO_CONTROLS: 'tts-show-audio-controls',
  AUDIO_PATH: 'tts-audio-path',
  IS_GENERATING: 'tts-is-generating',
  GENERATION_START_TIME: 'tts-generation-start-time'
};

// Clear all TTS-related localStorage data
const clearStoredData = () => {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
};

const InitializationPage = ({ onInitializationComplete }) => {
    const [status, setStatus] = useState('checking');
    const [error, setError] = useState(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const [fadeOut, setFadeOut] = useState(false);
    // Add initialization flag to prevent multiple execution
    const initializationInProgress = useRef(false);
    // Add download progress tracking
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadDetails, setDownloadDetails] = useState('');

    // Add event listener for Docker pull status updates
    useEffect(() => {
        // Handler function for Docker pull status events
        const handleDockerPullStatus = (data) => {
            console.log('Docker pull status update:', data);
            
            switch (data.status) {
                case 'started':
                    setIsDownloading(true);
                    setDownloadProgress(0);
                    setDownloadDetails(`Starting download of ${data.image}`);
                    break;
                
                case 'downloading':
                    setIsDownloading(true);
                    setDownloadProgress(data.progress);
                    setDownloadDetails(`${data.details}`);
                    break;
                
                case 'completed':
                    setIsDownloading(false);
                    setDownloadProgress(100);
                    setDownloadDetails('Download completed');
                    break;
                
                case 'error':
                    setIsDownloading(false);
                    setError(`Docker image download failed: ${data.error}`);
                    break;
                
                case 'exists':
                    setDownloadDetails('Using existing Docker image');
                    break;
            }
        };

        // Register the event listener
        if (window.electronAPI && window.electronAPI.onDockerPullStatus) {
            window.electronAPI.onDockerPullStatus(handleDockerPullStatus);
        }

        // Clean up the event listener when component unmounts
        return () => {
            if (window.electronAPI && window.electronAPI.removeDockerPullStatusListener) {
                window.electronAPI.removeDockerPullStatusListener();
            }
        };
    }, []);

    const checkDocker = async () => {
        // Return early if initialization is already in progress
        if (initializationInProgress.current) {
            console.log("Initialization already in progress, skipping duplicate request");
            return;
        }
        
        // Set flag to prevent multiple executions
        initializationInProgress.current = true;
        
        try {
            // Clear all stored TTS data on app initialization
            clearStoredData();
            
            // Check if Docker is installed and running
            const dockerStatus = await window.electronAPI.checkDocker();
            
            if (!dockerStatus.installed) {
                setStatus('installing');
                // Attempt to install Docker
                await window.electronAPI.installDocker();
                // Recheck Docker status after installation
                const newStatus = await window.electronAPI.checkDocker();
                
                if (!newStatus.installed || !newStatus.running) {
                    throw new Error('Docker installation failed or Docker is not running');
                }
            } else if (!dockerStatus.running) {
                setStatus('starting');
                // Attempt to start Docker service
                await window.electronAPI.installDocker();
                // Wait for Docker to start
                const retryCheck = await window.electronAPI.checkDocker();
                if (!retryCheck.running) {
                    throw new Error('Docker is installed but not running');
                }
            }

            // Check if model container is ready
            setStatus('preparing');
            await window.electronAPI.checkModelContainer();

            // Show success state briefly before completing
            setShowSuccess(true);
            setTimeout(() => {
                setFadeOut(true);
                setTimeout(() => {
                    if (onInitializationComplete) {
                        onInitializationComplete();
                    }
                }, 500);
            }, 1000);

        } catch (error) {
            console.error('Initialization error:', error);
            setError(error.message);
        } finally {
            // Always reset the flag when done
            initializationInProgress.current = false;
        }
    };

    useEffect(() => {
        checkDocker();
    }, []);

    const getStatusMessage = () => {
        if (isDownloading) {
            return 'Downloading Docker image...';
        }

        switch (status) {
            case 'checking':
                return 'Checking Docker installation...';
            case 'installing':
                return 'Installing Docker...';
            case 'starting':
                return 'Starting Docker service...';
            case 'preparing':
                return 'Preparing model runtime...';
            default:
                return 'Initializing...';
        }
    };

    const handleRetry = () => {
        setError(null);
        setStatus('checking');
        setIsDownloading(true);
        setDownloadProgress(0);
        checkDocker();
    };

    return (
        <div className={`${styles.container} ${fadeOut ? styles.fadeOut : ''}`}>
            <div className={styles.content}>
                <div className={styles.logo}>
                    {/* Add your logo here */}
                    <h1>Voice Studio</h1>
                </div>

                {error ? (
                    <div className={styles.error}>
                        <p>{error}</p>
                        <button 
                            className={styles.retryButton}
                            onClick={handleRetry}
                        >
                            Retry
                        </button>
                    </div>
                ) : showSuccess ? (
                    <div className={styles.success}>
                        <div className={styles.checkmark}>✓</div>
                        <p>Ready to go!</p>
                    </div>
                ) : (
                    <div className={styles.status}>
                        <div className={styles.spinner}></div>
                        <p>{getStatusMessage()}</p>
                        
                        {isDownloading && (
                            <div className={styles.downloadProgress}>
                                <div className={styles.progressBar}>
                                    <div 
                                        className={styles.progressFill} 
                                        style={{width: `${downloadProgress}%`}}
                                    ></div>
                                </div>
                                <p className={styles.progressText}>
                                    {downloadProgress}% - {downloadDetails}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default InitializationPage; 