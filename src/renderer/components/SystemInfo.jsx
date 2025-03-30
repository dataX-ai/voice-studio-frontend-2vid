import React, { useState, useEffect } from 'react';
import styles from './SystemInfo.module.css';

const SystemInfo = () => {
  const [systemInfo, setSystemInfo] = useState({
    cpu: { 
      architecture: 'Loading...', 
      instructions: { hasAVX: false, hasAVX2: false },
      model: 'Loading...'
    },
    memory: { total: 0, free: 0, used: 0 },
    gpu: []
  });
  const [performanceStats, setPerformanceStats] = useState({
    cpu: 0,
    memory: { used: 0, total: 0 },
    gpu: [{ usage: 0, memoryUsed: 0, memoryTotal: 0 }]
  });

  useEffect(() => {
    const fetchSystemInfo = async () => {
      try {
        const info = await window.electronAPI.getSystemInfo();
        if (info) {
          setSystemInfo({
            cpu: {
              architecture: info.cpu?.architecture || 'Unknown',
              instructions: {
                hasAVX: info.cpu?.instructions?.hasAVX || false,
                hasAVX2: info.cpu?.instructions?.hasAVX2 || false
              },
              model: info.cpu?.model || 'Unknown'
            },
            memory: {
              total: info.memory?.total || 0,
              free: info.memory?.free || 0,
              used: info.memory?.used || 0
            },
            gpu: info.gpu || []
          });
        }
      } catch (error) {
        console.error('Error fetching system info:', error);
      }
    };

    const updatePerformance = async () => {
      try {
        const stats = await window.electronAPI.getPerformanceStats();
        if (stats) {
          setPerformanceStats({
            cpu: stats.cpu || 0,
            memory: {
              used: stats.memory?.used || 0,
              total: stats.memory?.total || 0
            },
            gpu: stats.gpu || [{ usage: 0, memoryUsed: 0, memoryTotal: 0 }]
          });
        }
      } catch (error) {
        console.error('Error fetching performance stats:', error);
      }
    };

    fetchSystemInfo();
    const performanceInterval = setInterval(updatePerformance, 2000);

    return () => clearInterval(performanceInterval);
  }, []);

  const formatMemory = (bytes) => {
    if (!bytes || bytes === 0) return '0.00 GB';
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.systemInfo}>
        <div className={styles.systemInfoHeader}>
          <h1>System Resources</h1>
        </div>
        <div className={styles.actions}>
          <button onClick={() => navigator.clipboard.writeText(JSON.stringify(systemInfo, null, 2))}>
            Copy Info
          </button>
          <button>Community</button>
        </div>

        <div className={styles.infoGrid}>
          <div className={styles.infoCard}>
            <div className={styles.cardHeader}>
              <h2>CPU</h2>
              <span className={styles.badge}>Compatible</span>
            </div>
            <div className={styles.cardContent}>
              <div className={styles.infoRow}>
                <span>Architecture</span>
                <span className={styles.chip}>{systemInfo.cpu.architecture}</span>
              </div>
              <div className={styles.infoRow}>
                <span>Instructions</span>
                <div className={styles.chipGroup}>
                  {systemInfo.cpu.instructions.hasAVX && (
                    <span className={styles.chip}>AVX</span>
                  )}
                  {systemInfo.cpu.instructions.hasAVX2 && (
                    <span className={styles.chip}>AVX2</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className={styles.infoCard}>
            <div className={styles.cardHeader}>
              <h2>GPUs</h2>
              <span>{systemInfo.gpu.length} GPU detected</span>
            </div>
            <div className={styles.cardContent}>
              {systemInfo.gpu.map((gpu, index) => (
                <div key={index}>
                  <div className={styles.infoRow}>
                    <span>{gpu?.model || 'Unknown GPU'}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span>VRAM Capacity</span>
                    <span>{formatMemory(gpu?.vram || "--")}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.infoCard}>
            <div className={styles.cardHeader}>
              <h2>Memory Capacity</h2>
            </div>
            <div className={styles.cardContent}>
              <div className={styles.infoRow}>
                <span>RAM</span>
                <span>{formatMemory(systemInfo.memory.total)}</span>
              </div>
              <div className={styles.infoRow}>
                <span>VRAM</span>
                <span>
                  {systemInfo.gpu[0] ? formatMemory(systemInfo.gpu[0].vram) : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          <div className={styles.infoCard}>
            <div className={styles.cardHeader}>
              <h2>Guardrails</h2>
            </div>
            <div className={styles.cardContent}>
              <div className={styles.guardrailSelector}>
                <div className={styles.selectedGuardrail}>
                  <span>Strict</span>
                  <span>▼</span>
                </div>
                <p>Strong precautions against system overload</p>
              </div>
            </div>
          </div>

          <div className={`${styles.infoCard} ${styles.fullWidth}`}>
            <div className={styles.cardHeader}>
              <h2>Resource Monitor</h2>
              <span>Best approximation. May differ from other monitors</span>
            </div>
            <div className={styles.monitorGrid}>
              <div className={styles.monitorCard}>
                <span>RAM + VRAM</span>
                <span>{formatMemory(performanceStats.memory.used)}</span>
              </div>
              <div className={styles.monitorCard}>
                <span>CPU</span>
                <span>{performanceStats.cpu}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemInfo; 