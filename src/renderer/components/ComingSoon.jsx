import React from 'react';
import styles from './ComingSoon.module.css';
import { FaTools } from 'react-icons/fa';

const ComingSoon = ({ pageName }) => {
  return (
    <div className={styles.comingSoon}>
      <div className={styles.content}>
        <FaTools className={styles.icon} />
        <h1>{pageName}</h1>
        <p>This feature is coming soon!</p>
        <p className={styles.subtext}>We're actively developing new features to enhance your experience.</p>
      </div>
    </div>
  );
};

export default ComingSoon; 