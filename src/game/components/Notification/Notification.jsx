// src/game/components/Notification/Notification.jsx
import React from 'react';
import styles from './Notification.module.css';

function Notification({ message, onClose }) {
  if (!message) {
    return null;
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <p>{message}</p>
        <button className={styles.closeButton} onClick={onClose}>
          OK
        </button>
      </div>
    </div>
  );
}

export default Notification;
