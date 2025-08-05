import React, { useState } from 'react';
import styles from './WelcomeModal.module.css';

function WelcomeModal({ onPlayClick }) {
  const [isVisible, setIsVisible] = useState(true);

  const handlePlayClick = () => {
    setIsVisible(false);
    if (onPlayClick) {
      onPlayClick();
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2>Welcome to Mike Lambo's Lone Sherman</h2>
        <button className={styles.playButton} onClick={handlePlayClick}>
          PLAY
        </button>
      </div>
    </div>
  );
}

export default WelcomeModal;