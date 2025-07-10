// src/game/components/TurnActions/TurnActions.jsx
import React, { useState, useEffect } from 'react';
import styles from './TurnActions.module.css';
import diceRollingSound from '../../../assets/sounds/dice-rolling.mp3';
import DiceDisplay from '../DiceDisplay/DiceDisplay';

function TurnActions({ onManeuver, onAttack, onStartTurnLogic, onCommanderDecision, shermanUnit, currentScenario, onMoveSherman, onReverseSherman, onTurnSherman }) {
  // State to manage the current phase of the player's turn
  // 'initial' -> 'commander_decision' -> 'sherman_operations'
  const [currentPhase, setCurrentPhase] = useState('initial');
  const [diceResults, setDiceResults] = useState([]);
  const [selectedManeuverAction, setSelectedManeuverAction] = useState(null);
  const [selectedDieIndex, setSelectedDieIndex] = useState(null);
  const [expendedDice, setExpendedDice] = useState([]);
  const [selectedDiceForDoubles, setSelectedDiceForDoubles] = useState([]);
  const [isDoublesActive, setIsDoublesActive] = useState(false);
  const [maneuverExpended, setManeuverExpended] = useState(false);
  const [showTurnButtons, setShowTurnButtons] = useState(false);
  const [showDoublesManeuverOptions, setShowDoublesManeuverOptions] = useState(false);
  const [showEndPhaseButton, setShowEndPhaseButton] = useState(false);

  useEffect(() => {
    if (diceResults.length > 0 && diceResults.length === expendedDice.length) {
      setManeuverExpended(true);
      setTimeout(() => {
        setDiceResults([]);
        setExpendedDice([]);
      }, 500); // 0.5s delay
    }
  }, [expendedDice, diceResults]);

  

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

  const handleDieClick = (roll, index, action) => {
    if (expendedDice.includes(index)) {
      return; // Do nothing if the die is expended
    }

    // Case 1: No die is currently selected (first click)
    if (selectedDieIndex === null && selectedDiceForDoubles.length === 0) {
      setSelectedDieIndex(index);
      setSelectedManeuverAction(action);
      setIsDoublesActive(false); // Ensure doubles is off
      setSelectedDiceForDoubles([]); // Ensure doubles array is empty
    }
    // Case 2: The currently selected single die is clicked again (deselect)
    else if (selectedDieIndex === index) {
      setSelectedDieIndex(null);
      setSelectedManeuverAction(null);
    }
    // Case 3: A different die is clicked when a single die is selected (potential double or new single)
    else if (selectedDieIndex !== null && selectedDieIndex !== index) {
      const firstDieRoll = diceResults[selectedDieIndex];
      if (firstDieRoll === roll) {
        // It's a double!
        setSelectedDiceForDoubles([selectedDieIndex, index]);
        setIsDoublesActive(true);
        setSelectedDieIndex(null); // Clear single selection
        setSelectedManeuverAction(null); // Action will be chosen by doubles buttons
      } else {
        // Not a double, new single selection
        setSelectedDieIndex(index);
        setSelectedManeuverAction(action);
        setIsDoublesActive(false); // Ensure doubles is off
        setSelectedDiceForDoubles([]); // Ensure doubles array is empty
      }
    }
    // Case 4: A die is clicked when doubles are already active (deselect doubles)
    else if (isDoublesActive) {
      setSelectedDiceForDoubles([]);
      setIsDoublesActive(false);
      setSelectedDieIndex(null); // Clear any single selection too
      setSelectedManeuverAction(null);
    }
  };

  // Reset phase when turn starts (e.g., if Game.jsx signals a new turn)
  // For now, onStartTurnLogic will trigger the phase change directly.
  // In a more complex setup, you might pass turnNumber as a prop and reset on change.
  const handleStartTurn = () => {
    setManeuverExpended(false);
    setShowTurnButtons(false);
    setSelectedDiceForDoubles([]);
    setIsDoublesActive(false);
    setShowDoublesManeuverOptions(false);
    setShowEndPhaseButton(false);
    setCurrentPhase('commander_decision'); // Move to commander decision phase
    if (onStartTurnLogic) {
      onStartTurnLogic(); // Call Game.jsx's start turn logic
    }
  };

  const handleEndPhaseClick = () => {
    const allDiceIndices = diceResults.map((_, index) => index);
    const unexpendedDice = allDiceIndices.filter(index => !expendedDice.includes(index));
    setExpendedDice(prev => [...prev, ...unexpendedDice]);
    setSelectedDieIndex(null);
    setSelectedManeuverAction(null);
    setSelectedDiceForDoubles([]);
    setIsDoublesActive(false);
    setShowDoublesManeuverOptions(false);
    setShowTurnButtons(false);
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

  const handleActionClick = (action, isDoublesButton = false) => {
    if (selectedDieIndex === null && !isDoublesActive) return;

    let actionSuccessful = false;

    if (isDoublesButton) {
      setShowDoublesManeuverOptions(true);
      return;
    }

    if (isDoublesActive) {
      if (action === onTurnSherman) {
        setShowTurnButtons(true);
        setShowDoublesManeuverOptions(false); // Hide doubles maneuver options
      } else {
        actionSuccessful = action();
        if (actionSuccessful) {
          setExpendedDice([...expendedDice, ...selectedDiceForDoubles]);
          setSelectedDiceForDoubles([]);
          setIsDoublesActive(false);
          setSelectedManeuverAction(null);
          setSelectedDieIndex(null);
          setShowDoublesManeuverOptions(false); // Reset after action
        }
      }
    } else if (selectedDieIndex !== null) {
      // For single die actions
      if (action === onTurnSherman) {
        setShowTurnButtons(true);
      } else {
        actionSuccessful = action(); // e.g., onMoveSherman()
        if (actionSuccessful) {
          setExpendedDice([...expendedDice, selectedDieIndex]);
          setSelectedManeuverAction(null);
          setSelectedDieIndex(null);
        }
      }
    }
  };

  const handleTurnDirectionClick = (direction) => {
    onTurnSherman(direction);
    if (isDoublesActive) {
      setExpendedDice([...expendedDice, ...selectedDiceForDoubles]);
      setSelectedDiceForDoubles([]);
      setIsDoublesActive(false);
    } else {
      setExpendedDice([...expendedDice, selectedDieIndex]);
    }
    setSelectedManeuverAction(null);
    setSelectedDieIndex(null);
    setShowTurnButtons(false);
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
            className={`${styles.actionButton} ${styles.maneuverButton} ${maneuverExpended ? styles.expended : ''}`}
            onClick={handleManeuverClick}
            title={`Roll ${calculateManeuverDice().totalDice} dice\n${calculateManeuverDice().reasons.join('\n')}`}
            disabled={diceResults.length > 0 || maneuverExpended}
          >
            Maneuver
          </button>
          <DiceDisplay results={diceResults} onDieClick={(roll, index, action) => handleDieClick(roll, index, action)} selectedIndex={selectedDieIndex} expendedDice={expendedDice} selectedDiceForDoubles={selectedDiceForDoubles} />
          {(!diceResults || diceResults.length === 0) && !isDoublesActive && (
            <button className={`${styles.actionButton} ${styles.attackButton}`} onClick={handleAttackClick}>
              Attack
            </button>
          )}

          {/* Single Die Actions */}
          {!isDoublesActive && !showDoublesManeuverOptions && selectedManeuverAction === "MOVE" && (
            <button className={`${styles.actionButton} ${styles.maneuverActionButton}`} onClick={() => handleActionClick(onMoveSherman)}>
              MOVE
            </button>
          )}
          {!isDoublesActive && !showDoublesManeuverOptions && selectedManeuverAction === "REVERSE" && (
            <button className={`${styles.actionButton} ${styles.maneuverActionButton}`} onClick={() => handleActionClick(onReverseSherman)}>
              REVERSE
            </button>
          )}
          {!isDoublesActive && !showDoublesManeuverOptions && selectedManeuverAction === "TURN" && !showTurnButtons && (
            <button className={`${styles.actionButton} ${styles.maneuverActionButton}`} onClick={() => handleActionClick(onTurnSherman)}>
              TURN
            </button>
          )}

          {/* Doubles Button */}
          {isDoublesActive && !showDoublesManeuverOptions && !showTurnButtons && (
            <button className={`${styles.actionButton} ${styles.doublesButton}`} onClick={() => handleActionClick(null, true)}>
              DOUBLES
            </button>
          )}

          {/* Doubles Maneuver Options */}
          {isDoublesActive && showDoublesManeuverOptions && (
            <div className={styles.doublesManeuverOptions}>
              <button className={`${styles.actionButton} ${styles.maneuverActionButton}`} onClick={() => handleActionClick(onMoveSherman)}>
                MOVE
              </button>
              <button className={`${styles.actionButton} ${styles.maneuverActionButton}`} onClick={() => handleActionClick(onReverseSherman)}>
                RVRS
              </button>
              <button className={`${styles.actionButton} ${styles.maneuverActionButton}`} onClick={() => handleActionClick(onTurnSherman)}>
                TURN
              </button>
            </div>
          )}
          {showTurnButtons && (
            <div className={styles.turnButtons}>
              <button className={`${styles.actionButton} ${styles.maneuverActionButton}`} onClick={() => handleTurnDirectionClick(-60)}>
                LEFT
              </button>
              <button className={`${styles.actionButton} ${styles.maneuverActionButton}`} onClick={() => handleTurnDirectionClick(60)}>
                RIGHT
              </button>
            </div>
          )}
          {(diceResults.length > 0 && expendedDice.length < diceResults.length) && (
            <button className={`${styles.actionButton} ${styles.endPhaseButton}`} onClick={handleEndPhaseClick}>
              END PHASE
            </button>
          )}
          {/* Add an "End Turn" button here later */}
        </>
      )}
    </div>
  );
}

export default TurnActions;