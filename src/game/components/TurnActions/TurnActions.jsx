// src/game/components/TurnActions/TurnActions.jsx
import React, { useState } from 'react';
import styles from './TurnActions.module.css';

// TurnActions component will manage the state of the turn buttons
// It can optionally receive callbacks for maneuver/attack actions if needed by parent
function TurnActions({ onManeuver, onAttack }) { // Added props for potential future callbacks
  // State to manage which set of buttons is displayed
  const [turnStarted, setTurnStarted] = useState(false);

  // Handler for "Start turn" button click
  const handleStartTurn = () => {
    setTurnStarted(true); // Switch to maneuver/attack buttons
  };

  // Handlers for "Maneuver" and "Attack" button clicks
  const handleManeuverClick = () => {
    console.log("Maneuver button clicked in TurnActions!");
    // If a callback was provided, call it
    if (onManeuver) {
      onManeuver();
    }
  };

  const handleAttackClick = () => {
    console.log("Attack button clicked in TurnActions!");
    // If a callback was provided, call it
    if (onAttack) {
      onAttack();
    }
  };

  return (
    <div className={styles.actionButtonsContainer}>
      {!turnStarted ? (
        // Display "Start turn" button initially
        <button className={styles.startButton} onClick={handleStartTurn}>
          Start turn
        </button>
      ) : (
        // Display "Maneuver" and "Attack" buttons once turn starts
        <>
          <button className={`${styles.actionButton} ${styles.maneuverButton}`} onClick={handleManeuverClick}>
            Maneuver
          </button>
          <button className={`${styles.actionButton} ${styles.attackButton}`} onClick={handleAttackClick}>
            Attack
          </button>
        </>
      )}
    </div>
  );
}

export default TurnActions;