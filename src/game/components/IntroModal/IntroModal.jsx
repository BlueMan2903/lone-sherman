// src/components/IntroModal/IntroModal.jsx
import React, { useState, useEffect } from 'react';
import styles from './IntroModal.module.css';

function IntroModal({ onGoClick }) {
  const [isVisible, setIsVisible] = useState(true); // State to control modal visibility

  // Optional: If you want to force it to show every time for testing,
  // or add more complex logic (e.g., check localStorage for 'introShown')
  useEffect(() => {
    // You could check localStorage here to only show it once per user
    // const hasSeenIntro = localStorage.getItem('hasSeenIntro');
    // if (hasSeenIntro) {
    //   setIsVisible(false);
    // }
  }, []);

  const handleGoClick = () => {
    setIsVisible(false); // Hide the modal
    if (onGoClick) {
      onGoClick();
    }
    // Optional: Set a flag in localStorage so it doesn't show again
    // localStorage.setItem('hasSeenIntro', 'true');
  };

  if (!isVisible) {
    return null; // Don't render anything if not visible
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2>Mission 1: The village</h2>
        <p>
          "France, July 1944 — Your Sherman tank advances cautiously through mist-covered fields toward two quiet farming villages now scarred by war. Intelligence reports place two Panzer IVs along the main road that runs between Beaupré and Leforet, their guns trained and waiting. The trees and ruins offer both cover and danger as you push forward. Your mission is clear: destroy both enemy tanks, then break through and exit the map along the road ahead. The crew is tense, the silence heavy — this village may look peaceful, but death waits behind every wall."
        </p>
        <button className={styles.goButton} onClick={handleGoClick}>
          GO!
        </button>
      </div>
    </div>
  );
}

export default IntroModal;