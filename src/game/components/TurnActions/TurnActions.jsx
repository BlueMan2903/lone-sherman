// src/game/components/TurnActions/TurnActions.jsx
import React, { useState, useEffect } from 'react'; // Added useEffect
import styles from './TurnActions.module.css';

// TurnActions component will manage the state of the turn buttons
// NEW: Added onCommanderDecision prop
function TurnActions({ onManeuver, onAttack, onStartTurnLogic, onCommanderDecision }) {
  // State to manage the current phase of the player's turn
  // 'initial' -> 'commander_decision' -> 'sherman_operations'
  const [currentPhase, setCurrentPhase] = useState('initial');

  // Reset phase when turn starts (e.g., if Game.jsx signals a new turn)
  // For now, onStartTurnLogic will trigger the phase change directly.
  // In a more complex setup, you might pass turnNumber as a prop and reset on change.
  const handleStartTurn = () => {
    setCurrentPhase('commander_decision'); // Move to commander decision phase
    if (onStartTurnLogic) {
      onStartTurnLogic(); // Call Game.jsx's start turn logic
    }
  };

  const handleCommanderDecision = (position) => {
    if (onCommanderDecision) {
      onCommanderDecision(position); // Pass the chosen position ('Buttoned Up' or 'Popped Hatch')
    }
    setCurrentPhase('sherman_operations'); // Move to Sherman operations phase
  };

  const handleManeuverClick = () => {
    console.log("Maneuver button clicked in TurnActions!");
    if (onManeuver) {
      onManeuver();
    }
  };

  const handleAttackClick = () => {
    console.log("Attack button clicked in TurnActions!");
    if (onAttack) {
      onAttack();
    }
  };

  return (
    <div className={styles.actionButtonsContainer}>
      {currentPhase === 'initial' && (
        <button className={styles.startButton} onClick={handleStartTurn}>
          Start turn
        </button>
      )}

      {currentPhase === 'commander_decision' && (
        <>
          <p className={styles.phaseInstruction}>Position the commander!</p> {/* NEW TEXT */}
          <button
            className={`${styles.actionButton} ${styles.commanderButton}`}
            onClick={() => handleCommanderDecision('Buttoned Up')}
          >
            Buttoned Up
          </button>
          <button
            className={`${styles.actionButton} ${styles.commanderButton}`}
            onClick={() => handleCommanderDecision('Popped Hatch')}
          >
            Popped Hatch
          </button>
        </>
      )}

      {currentPhase === 'sherman_operations' && (
        <>
          <button className={`${styles.actionButton} ${styles.maneuverButton}`} onClick={handleManeuverClick}>
            Maneuver
          </button>
          <button className={`${styles.actionButton} ${styles.attackButton}`} onClick={handleAttackClick}>
            Attack
          </button>
          {/* Add an "End Turn" button here later */}
        </>
      )}
    </div>
  );
}

export default TurnActions;