import React, { useState, useEffect } from 'react';
import { 
  FaBrain, 
  FaPlay, 
  FaStop, 
  FaTrash, 
  FaRedo, 
  FaSearch 
} from 'react-icons/fa';
import styles from './MyModels.module.css';

const MyModels = () => {
  const [models, setModels] = useState([]);
  const [filterText, setFilterText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchModels = async () => {
    setLoading(true);
    try {
      // These will be handled by the main process through IPC
      const downloadedModels = await window.electronAPI.fetchDownloadedModels();
      const loadedModels = await window.electronAPI.fetchLoadedModels();
      const loadedModelIds = new Set(loadedModels);

      // Get detailed model information
      const modelDetails = await window.electronAPI.fetchModelDetails(
        downloadedModels
          .filter(model => model.download_status === window.electronAPI.DOWNLOAD_STATUS.READY)
          .map(model => model.model_id)
      );

      setModels(modelDetails.models.map(model => ({
        ...model,
        isRunning: loadedModelIds.has(model.model_id)
      })));
      setError(null);
    } catch (err) {
      setError('Failed to load models. Please try again.');
      console.error('Error fetching models:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const handleStartStop = async (modelId, isRunning) => {
    try {
      if (isRunning) {
        await window.electronAPI.unloadModel(modelId);
      } else {
        await window.electronAPI.loadModel(modelId);
      }
      fetchModels(); // Refresh the list
    } catch (err) {
      console.error('Error updating model status:', err);
      alert('Failed to update model status. Please try again.');
    }
  };

  const handleDelete = async (modelId) => {
    if (window.confirm(`Are you sure you want to delete ${modelId}?`)) {
      try {
        await window.electronAPI.deleteModel(modelId);
        fetchModels(); // Refresh the list
      } catch (err) {
        console.error('Error deleting model:', err);
        alert('Failed to delete model. Please try again.');
      }
    }
  };

  const filteredModels = models.filter(model => 
    model.model_id.toLowerCase().includes(filterText.toLowerCase())
  );

  if (loading) {
    return <div className={styles.loadingMessage}>Loading your models...</div>;
  }

  if (error) {
    return <div className={styles.errorMessage}>{error}</div>;
  }

  return (
    <div className={styles.myModels}>
      <div className={styles.modelsHeader}>
        <div className={styles.searchContainer}>
          <div className={styles.searchBar}>
            <FaSearch className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Filter models..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className={styles.modelsList}>
        {filteredModels.length === 0 ? (
          <div className={styles.noModelsMessage}>No downloaded models found.</div>
        ) : (
          filteredModels.map(model => (
            <div key={model.model_id} className={styles.modelItem}>
              <div className={styles.modelInfo}>
                <div className={styles.modelIcon}>
                  <FaBrain />
                </div>
                <div className={styles.modelDetails}>
                  <h3>{model.model_id}</h3>
                  <span className={`${styles.modelStatus} ${styles[model.isRunning ? 'running' : 'downloaded']}`}>
                    {model.isRunning ? 'Running' : 'Downloaded'}
                  </span>
                  <span className={styles.modelMeta}>
                    {model.isRunning 
                      ? 'Port: 3000 • Memory: 7GB'
                      : `Size: ${model.size || 'N/A'} • Modified: ${new Date(model.last_modified).toLocaleDateString()}`
                    }
                  </span>
                </div>
              </div>
              <div className={styles.modelActions}>
                <button
                  className={`${styles.actionBtn} ${model.isRunning ? styles.stopBtn : styles.startBtn}`}
                  onClick={() => handleStartStop(model.model_id, model.isRunning)}
                >
                  {model.isRunning ? <FaStop /> : <FaPlay />}
                  <span>{model.isRunning ? 'Stop' : 'Start'}</span>
                </button>
                {model.isRunning && (
                  <button className={`${styles.actionBtn} ${styles.restartBtn}`}>
                    <FaRedo />
                    <span>Restart</span>
                  </button>
                )}
                <button
                  className={`${styles.actionBtn} ${styles.deleteBtn}`}
                  onClick={() => handleDelete(model.model_id)}
                >
                  <FaTrash />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MyModels; 