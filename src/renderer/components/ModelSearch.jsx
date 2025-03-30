import React, { useState, useEffect, useRef } from 'react';
import styles from './ModelSearch.module.css';

const ModelSearch = () => {
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);
  const [downloadedModels, setDownloadedModels] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const downloadingSockets = useRef(new Map());

  useEffect(() => {
    fetchDownloadedModels();
    fetchAndDisplayModels();

    // Cleanup function to close any active WebSocket connections
    return () => {
      downloadingSockets.current.forEach((socket) => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.close();
        }
      });
    };
  }, []);

  const fetchDownloadedModels = async () => {
    try {
      const data = await window.electronAPI.fetchDownloadedModels();
      console.log('Downloaded models:', data);
      
      // Convert array of objects to Map and update state
      const modelMap = new Map(
        data.map(model => [model.model_id, model.download_status])
      );
      setDownloadedModels(modelMap);
    } catch (error) {
      console.error('Error fetching downloaded models:', error);
      setDownloadedModels(new Map());
    }
  };

  const fetchAndDisplayModels = async () => {
    setLoading(true);
    try {
      // Fetch downloaded models first
      await fetchDownloadedModels();
      
      // Then fetch and display models
      const data = await window.electronAPI.fetchModels();
      
      if (data?.models && data.models.length > 0) {
        setModels(data.models);
      } else {
        setModels([]);
      }
    } catch (error) {
      console.error('Error fetching models:', error);
      setError('Failed to load models. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleModelSelect = (model) => {
    setSelectedModel(model);
  };

  const handleModelDownload = (modelId) => {
    const { DOWNLOAD_STATUS } = window.electronAPI;
    console.log('Attempting to download model:', modelId);
    
    // If already downloading, return
    if (downloadingSockets.current.has(modelId)) {
      console.log('Download already in progress');
      return;
    }

    // Set up download progress listener
    window.electronAPI.on('download-progress', (data) => {
      if (data.model_id === modelId) {
        setDownloadedModels(prev => {
          const newMap = new Map(prev);
          newMap.set(modelId, data.status);
          return newMap;
        });

        if (data.status === DOWNLOAD_STATUS.READY) {
          downloadingSockets.current.delete(modelId);
        }
      }
    });

    // Start the download
    window.electronAPI.startModelDownload(modelId)
      .catch(error => {
        console.error('Error starting download:', error);
        setDownloadedModels(prev => {
          const newMap = new Map(prev);
          newMap.delete(modelId);
          return newMap;
        });
        downloadingSockets.current.delete(modelId);
      });

    // Set initial downloading status
    setDownloadedModels(prev => {
      const newMap = new Map(prev);
      newMap.set(modelId, DOWNLOAD_STATUS.DOWNLOADING);
      return newMap;
    });
    
    downloadingSockets.current.set(modelId, true);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(2)} GB`;
  };

  return (
    <div className={styles.modelSearch}>
      <div className={styles.searchContainer}>
        <div className={styles.searchBar}>
          <div className={styles.searchInputContainer}>
            <input 
              type="text" 
              placeholder="Search for models on Hugging Face..." 
              className={styles.modelSearchInput} 
            />
            <button className={styles.clearSearch}>×</button>
          </div>
          <label className={styles.ggufCheckbox}>
            <input type="checkbox" defaultChecked />
            <span>GGUF</span>
            <span className={styles.infoIcon}>ℹ️</span>
          </label>
          <button className={styles.expandButton}>⤢</button>
          <button className={styles.closeButton}>×</button>
        </div>
      </div>

      <div className={styles.modelSearchContent}>
        <div className={styles.modelListSection}>
          <div className={styles.listHeader}>
            <span>Showing staff picks</span>
            <div className={styles.filterControls}>
              <select className={styles.sortSelect}>
                <option>Best Match</option>
                <option>Most Recent</option>
                <option>Most Downloaded</option>
              </select>
              <button className={styles.downloadBtn}>⬇</button>
            </div>
          </div>
          
          <div className={styles.modelList}>
            {loading ? (
              <div className={styles.loadingMessage}>Loading models...</div>
            ) : error ? (
              <div className={styles.errorMessage}>{error}</div>
            ) : models.length === 0 ? (
              <div className={styles.noModelsMessage}>No models found.</div>
            ) : (
              models.map((model) => (
                <div 
                  key={model.model_id}
                  className={`${styles.modelListItem} ${selectedModel?.model_id === model.model_id ? styles.selected : ''}`}
                  onClick={() => handleModelSelect(model)}
                >
                  <div className={styles.modelListHeader}>
                    <div className={styles.modelIcon}>🤖</div>
                    <div className={styles.modelTitle}>{model.model_id}</div>
                    <div className={styles.modelTag}>{model.tags?.[0] || 'GGUF'}</div>
                  </div>
                  <p className={styles.modelDescription}>
                    {model.description || 'No description available.'}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {selectedModel && (
          <div className={styles.modelDetailsSection}>
            <div className={styles.staffPickBanner}>
              <h3>{selectedModel.model_id}</h3>
              <p>{selectedModel.description || 'No description available.'}</p>
            </div>

            <div className={styles.modelMetadata}>
              <div className={styles.metaRow}>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Architecture:</span>
                  <span className={styles.qwenTag}>{selectedModel.architecture || 'N/A'}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Params:</span>
                  <span className={styles.paramValue}>{selectedModel.parameters || 'N/A'}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Stats:</span>
                  <div className={styles.statsGroup}>
                    <span>❤️ {selectedModel.likes || 0}</span>
                    <span>⬇️ {selectedModel.downloads || 0}</span>
                  </div>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Last updated:</span>
                  <span>{new Date(selectedModel.last_modified).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className={styles.downloadSection}>
              <div className={styles.downloadHeader}>
                <span>4 download options available</span>
                <span className={styles.infoIcon}>ℹ️</span>
              </div>
              <div className={styles.downloadItem}>
                <div className={styles.fileInfo}>
                  <span className={styles.fileName}>Q4_K_M</span>
                  <span className={styles.modelName}>{selectedModel.model_id}</span>
                </div>
                <div className={styles.fileActions}>
                  <button className={styles.copyBtn}>📋</button>
                  <button className={styles.likeBtn}>👍</button>
                  <button 
                    className={`${styles.actionBtn} ${
                      downloadedModels.get(selectedModel.model_id) === window.electronAPI.DOWNLOAD_STATUS.READY 
                        ? styles.downloadedBtn 
                        : styles.downloadBtn
                    }`}
                    onClick={() => handleModelDownload(selectedModel.model_id)}
                    disabled={
                      downloadedModels.get(selectedModel.model_id) === window.electronAPI.DOWNLOAD_STATUS.DOWNLOADING ||
                      downloadedModels.get(selectedModel.model_id) === window.electronAPI.DOWNLOAD_STATUS.READY
                    }
                  >
                    {downloadedModels.get(selectedModel.model_id) === window.electronAPI.DOWNLOAD_STATUS.READY ? '✓ Downloaded' :
                     downloadedModels.get(selectedModel.model_id) === window.electronAPI.DOWNLOAD_STATUS.DOWNLOADING ? '⏳ Downloading...' : '⬇️ Download'}
                  </button>
                  <span className={styles.fileSize}>{formatFileSize(selectedModel.size)}</span>
                  <button className={styles.expandBtn}>▼</button>
                </div>
              </div>
            </div>

            <div className={styles.modelReadme}>
              <div className={styles.readmeHeader}>
                <h3>Model Readme</h3>
                <span className={styles.sourceText}>Pulled from the model's repository</span>
              </div>
              <div className={styles.readmeContent}>
                <h2>🤖 Community Model: {selectedModel.model_id}</h2>
                <div className={styles.modelInfo}>
                  <p><strong>Model creator:</strong> {selectedModel.author || 'Unknown'}</p>
                  <p><strong>Original model:</strong> {selectedModel.original_model || selectedModel.model_id}</p>
                  <p><strong>GGUF quantization:</strong> provided by community</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModelSearch; 