// src/game/components/TurnActions/TurnActions.jsx
import React, { useState, useEffect } from 'react';
import styles from './TurnActions.module.css';
import diceRollingSound from '../../../assets/sounds/dice-rolling.mp3';
import DiceDisplay from '../DiceDisplay/DiceDisplay';

function TurnActions({ onManeuver, onAttack, onStartTurnLogic, onCommanderDecision, shermanUnit, currentScenario }) {
  // State to manage the current phase of the player's turn
  // 'initial' -> 'commander_decision' -> 'sherman_operations'
  const [currentPhase, setCurrentPhase] = useState('initial');
  const [diceResults, setDiceResults] = useState([]);
  const [selectedManeuverAction, setSelectedManeuverAction] = useState(null);
  const [selectedDieIndex, setSelectedDieIndex] = useState(null);

  const getDiceAction = (roll) => {
    if (roll === 1) {
      return "REVERSE";
    } else if (roll >= 2 && roll <= 4) {
      return "TURN";
    } else if (roll >= 5 && roll <= 6) {
      return "MOVE";
    }
    return "";
  };

  const calculateManeuverDice = () => {
    let dice = 0;
    const reasons = [];

    if (!shermanUnit || !currentScenario) return { totalDice: 0, reasons: ["Unit or scenario data not available."] };

    const currentHexCoords = shermanUnit.currentHex;
    const currentHex = currentScenario.map.hexes.find(
      hex => hex.q === currentHexCoords.q && hex.r === currentHexCoords.r
    );

    if (currentHex) {
      const terrain = currentHex.terrain;
      if (terrain.includes("road")) {
        dice += 2;
        reasons.push(`+2 (Road terrain)`);
      } else if (terrain.includes("field")) {
        dice += 1;
        reasons.push(`+1 (Field terrain)`);
      } else if (terrain.includes("mud")) {
        reasons.push(`+0 (Mud terrain)`);
      }
    }

    // Crew bonuses
    if (shermanUnit.crew.driver !== "kia") {
      dice += 1;
      reasons.push(`+1 (Driver alive)`);
    } else {
      reasons.push(`+0 (Driver KIA)`);
    }
    if (shermanUnit.crew.assistantDriver !== "kia") {
      dice += 1;
      reasons.push(`+1 (Assistant Driver alive)`);
    } else {
      reasons.push(`+0 (Assistant Driver KIA)`);
    }
    if (shermanUnit.crew.commander === "popped hatch") {
      dice += 1;
      reasons.push(`+1 (Commander popped hatch)`);
    } else {
      reasons.push(`+0 (Commander buttoned up)`);
    }

    return { totalDice: dice, reasons };
  };

  const handleDieClick = (roll, index) => {
    console.log("handleDieClick called with roll:", roll, "and index:", index);
    setSelectedDieIndex(index);
    console.log("selectedDieIndex after update:", index);
    const action = getDiceAction(roll);
    setSelectedManeuverAction(action);
  };

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

    // Play dice rolling sound
    const audio = new Audio(diceRollingSound);
    audio.play();

    const { totalDice } = calculateManeuverDice();
    const newDiceResults = [];
    for (let i = 0; i < totalDice; i++) {
      newDiceResults.push(Math.floor(Math.random() * 6) + 1); // Roll a D6
    }
    setDiceResults(newDiceResults);

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
            onClick={() => handleCommanderDecision('buttoned up')}
            title="Commander is safer, but no bonus action die"
          >
            Buttoned up
          </button>
          <button
            className={`${styles.actionButton} ${styles.commanderButton}`}
            onClick={() => handleCommanderDecision('popped hatch')}
            title="Commander is more exposed, but you get a bonus action die"
          >
            Popped hatch
          </button>
        </>
      )}

      {currentPhase === 'sherman_operations' && (
        <>
          <button
            className={`${styles.actionButton} ${styles.maneuverButton}`}
            onClick={handleManeuverClick}
            title={`Roll ${calculateManeuverDice().totalDice} dice\n${calculateManeuverDice().reasons.join('\n')}`}
          >
            Maneuver
          </button>
          <DiceDisplay results={diceResults} onDieClick={handleDieClick} selectedIndex={selectedDieIndex} />
          {(!diceResults || diceResults.length === 0) && (
            <button className={`${styles.actionButton} ${styles.attackButton}`} onClick={handleAttackClick}>
              Attack
            </button>
          )}
          {selectedManeuverAction && (
            <button className={`${styles.actionButton} ${styles.maneuverActionButton}`}>
              {selectedManeuverAction}
            </button>
          )}
          {/* Add an "End Turn" button here later */}
        </>
      )}
    </div>
  );
}

export default TurnActions;