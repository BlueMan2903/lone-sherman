// src/game/components/TurnActions/TurnActions.jsx
import React, { useState, useEffect, useCallback } from 'react';
import styles from './TurnActions.module.css';
import { playSound } from '../../logic/audioManager';
import diceRollingSound from '../../../assets/sounds/dice-rolling.mp3';
import tankReloadSound from '../../../assets/sounds/tank-reload.mp3';
import DiceDisplay from '../DiceDisplay/DiceDisplay';

import { getDistance } from '../../logic/hexUtils';

function TurnActions({ onManeuver, onAttack, onStartTurnLogic, onCommanderDecision, shermanUnit, currentScenario, onMoveSherman, onReverseSherman, onTurnSherman, onUpdateUnit, onSetNotification, getHexesInLine, onFireMainGun, targetingMessage, selectedTargetUnitId, onRemoveGermanSmoke, onFireLevelCheck, endPlayerTurn, turnNumber, onHullDown }) {
  // State to manage the current phase of the player's turn
  // 'initial' -> 'commander_decision' -> 'sherman_operations'
  const [currentPhase, setCurrentPhase] = useState('initial');
  const [diceResults, setDiceResults] = useState([]);
  const [selectedAction, setSelectedAction] = useState(null);
  const [selectedDieIndex, setSelectedDieIndex] = useState(null);
  const [expendedDice, setExpendedDice] = useState([]);
  const [selectedDiceForDoubles, setSelectedDiceForDoubles] = useState([]);
  const [isDoublesActive, setIsDoublesActive] = useState(false);
  const [maneuverExpended, setManeuverExpended] = useState(false);
  const [attackExpended, setAttackExpended] = useState(false);
  const [showTurnButtons, setShowTurnButtons] = useState(false);
  const [showDoublesManeuverOptions, setShowDoublesManeuverOptions] = useState(false);
  const [showDoublesAttackOptions, setShowDoublesAttackOptions] = useState(false);
  const [showDoublesMiscOptions, setShowDoublesMiscOptions] = useState(false);
  const [currentActionType, setCurrentActionType] = useState(null); // 'maneuver' or 'attack'
  const [miscellaneousExpended, setMiscellaneousExpended] = useState(false);
  const [germanSmokeRemoved, setGermanSmokeRemoved] = useState(false);

  useEffect(() => {
    if (turnNumber > 1) {
      // Reset all relevant states for the new turn to start fresh
      setCurrentPhase('commander_decision');
      setManeuverExpended(false);
      setAttackExpended(false);
      setMiscellaneousExpended(false);
      setGermanSmokeRemoved(false);
      setDiceResults([]);
      setExpendedDice([]);
      setSelectedAction(null);
      setSelectedDieIndex(null);
      setSelectedDiceForDoubles([]);
      setIsDoublesActive(false);
      setShowTurnButtons(false);
      setShowDoublesManeuverOptions(false);
      setShowDoublesAttackOptions(false);
      setShowDoublesMiscOptions(false);
      setCurrentActionType(null);

      // Also call the start turn logic from the parent to handle things like smoke clearing
      if (onStartTurnLogic) {
        onStartTurnLogic();
      }
    }
  }, [turnNumber, onStartTurnLogic]);

  useEffect(() => {
    if (diceResults.length > 0 && diceResults.length === expendedDice.length) {
      if (currentActionType === 'maneuver') {
        setManeuverExpended(true);
      } else if (currentActionType === 'attack') {
        setAttackExpended(true);
      } else if (currentActionType === 'miscellaneous') {
        setMiscellaneousExpended(true);
      }
      setTimeout(() => {
        setDiceResults([]);
        setExpendedDice([]);
        setCurrentActionType(null);
      }, 500); // 0.5s delay
    }
  }, [expendedDice, diceResults, currentActionType]);

  useEffect(() => {
    if (miscellaneousExpended && !germanSmokeRemoved) {
      onRemoveGermanSmoke();
      setGermanSmokeRemoved(true);
      setTimeout(() => {
        endPlayerTurn();
      }, 1000); // Short delay before calling endPlayerTurn
    }
  }, [miscellaneousExpended, germanSmokeRemoved, onRemoveGermanSmoke, endPlayerTurn]);

  

  

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

  const calculateAttackDice = () => {
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
        dice += 2;
        reasons.push(`+2 (Field terrain)`);
      } else if (terrain.includes("mud")) {
        dice += 1;
        reasons.push(`+1 (Mud terrain)`);
      }
    }

    // Crew bonuses
    if (shermanUnit.crew.gunner !== "kia") {
      dice += 1;
      reasons.push(`+1 (Gunner alive)`);
    } else {
      reasons.push(`+0 (Gunner KIA)`);
    }
    if (shermanUnit.crew.loader !== "kia") {
      dice += 1;
      reasons.push(`+1 (Loader alive)`);
    } else {
      reasons.push(`+0 (Loader KIA)`);
    }
    if (shermanUnit.crew.commander === "popped hatch") {
      dice += 1;
      reasons.push(`+1 (Commander popped hatch)`);
    } else {
      reasons.push(`+0 (Commander buttoned up)`);
    }

    return { totalDice: dice, reasons };
  };

  const calculateMiscellaneousDice = () => {
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
        dice += 1;
        reasons.push(`+1 (Road terrain)`);
      } else if (terrain.includes("field")) {
        dice += 2;
        reasons.push(`+2 (Field terrain)`);
      } else if (terrain.includes("mud")) {
        dice += 1;
        reasons.push(`+1 (Mud terrain)`);
      }
    }

    // Crew bonuses
    if (shermanUnit.crew.commander !== "kia") {
      dice += 1;
      reasons.push(`+1 (Commander alive)`);
    }

    return { totalDice: dice, reasons };
  };

  const getManeuverActionForRoll = (roll) => {
    if (roll === 1) return "REVERSE";
    if (roll >= 2 && roll <= 4) return "TURN";
    if (roll >= 5 && roll <= 6) return "MOVE";
    return null;
  };

  const getAttackActionForRoll = (roll) => {
    if (roll >= 1 && roll <= 2) return "LOAD";
    if (roll >= 3 && roll <= 4) return "FIRE MACHINE GUN";
    if (roll >= 5 && roll <= 6) return "FIRE MAIN GUN";
    return null;
  };

  const handleDieClick = (roll, index) => {
    if (expendedDice.includes(index)) {
      return; // Do nothing if the die is expended
    }

    // Always reset doubles options when a die is clicked
    setShowDoublesManeuverOptions(false);
    setShowDoublesAttackOptions(false);

    const action = currentActionType === 'maneuver' 
      ? getManeuverActionForRoll(roll) 
      : getAttackActionForRoll(roll);

    // Case 1: No die is currently selected (first click)
    if (selectedDieIndex === null && selectedDiceForDoubles.length === 0) {
      setSelectedDieIndex(index);
      setSelectedAction(action);
      setIsDoublesActive(false); // Ensure doubles is off
      setSelectedDiceForDoubles([]); // Ensure doubles array is empty
    }
    // Case 2: The currently selected single die is clicked again (deselect)
    else if (selectedDieIndex === index) {
      setSelectedDieIndex(null);
      setSelectedAction(null);
    }
    // Case 3: A different die is clicked when a single die is selected (potential double or new single)
    else if (selectedDieIndex !== null && selectedDieIndex !== index) {
      const firstDieRoll = diceResults[selectedDieIndex];
      if (firstDieRoll === roll) {
        // It's a double!
        if (currentActionType === 'maneuver' &&
            shermanUnit.crew.driver === 'kia' &&
            shermanUnit.crew.assistantDriver === 'kia') {
          onSetNotification("Doubles for Maneuver are not allowed if both Driver and Assistant Driver are KIA.");
          // Do not activate doubles, keep the single die selected
          setSelectedDieIndex(index); // Select the newly clicked die as a single
          setSelectedAction(action);
          setIsDoublesActive(false);
          setSelectedDiceForDoubles([]);
        } else if (currentActionType === 'attack' &&
                   shermanUnit.crew.gunner === 'kia' &&
                   shermanUnit.crew.loader === 'kia') {
          onSetNotification("Doubles for Attack are not allowed if both Gunner and Loader are KIA.");
          setSelectedDieIndex(index);
          setSelectedAction(action);
          setIsDoublesActive(false);
          setSelectedDiceForDoubles([]);
        } else {
          setSelectedDiceForDoubles([selectedDieIndex, index]);
          setIsDoublesActive(true);
          setSelectedDieIndex(null); // Clear single selection
          setSelectedAction(null); // Action will be chosen by doubles buttons
        }
      } else {
        // Not a double, new single selection
        setSelectedDieIndex(index);
        setSelectedAction(action);
        setIsDoublesActive(false); // Ensure doubles is off
        setSelectedDiceForDoubles([]); // Ensure doubles array is empty
      }
    }
    // Case 4: A die is clicked when doubles are already active (deselect doubles)
    else if (isDoublesActive) {
      setSelectedDiceForDoubles([]);
      setIsDoublesActive(false);
      setSelectedDieIndex(index); // Clear any single selection too
      setSelectedAction(action);
    }
  };

  // Reset phase when turn starts (e.g., if Game.jsx signals a new turn)
  // For now, onStartTurnLogic will trigger the phase change directly.
  // In a more complex setup, you might pass turnNumber as a prop and reset on change.
  const handleStartTurn = () => {
    setManeuverExpended(false);
    setAttackExpended(false);
    setMiscellaneousExpended(false);
    setShowTurnButtons(false);
    setSelectedDiceForDoubles([]);
    setIsDoublesActive(false);
    setShowDoublesManeuverOptions(false);
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
    setSelectedAction(null);
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
    setCurrentActionType('maneuver');

    // Play dice rolling sound
    playSound(diceRollingSound, 0.4);

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
    setCurrentActionType('attack');

    // Play dice rolling sound
    playSound(diceRollingSound, 0.4);

    const { totalDice } = calculateAttackDice();
    const newDiceResults = [];
    for (let i = 0; i < totalDice; i++) {
      newDiceResults.push(Math.floor(Math.random() * 6) + 1); // Roll a D6
    }
    setDiceResults(newDiceResults);

    if (onAttack) {
      onAttack();
    }
  };

  const handleMiscellaneousClick = () => {
    setCurrentActionType('miscellaneous');

    // Play dice rolling sound
    playSound(diceRollingSound, 0.4);

    const { totalDice } = calculateMiscellaneousDice();
    const newDiceResults = [];
    for (let i = 0; i < totalDice; i++) {
      newDiceResults.push(Math.floor(Math.random() * 6) + 1); // Roll a D6
    }
    setDiceResults(newDiceResults);
  };

  const handleLoadAction = () => {
    if (shermanUnit.mainGunStatus === 'loaded') {
      onSetNotification("Main Gun is already loaded");
      return false; // Action failed, don't expend die
    }
    // Play the sound on successful load
    playSound(tankReloadSound, 0.4);
    return onUpdateUnit(shermanUnit.id, { mainGunStatus: 'loaded' });
  };

  const handleActionClick = (action, isDoublesButton = false) => {
    if (selectedDieIndex === null && !isDoublesActive) return;

    let actionSuccessful = false;

    if (isDoublesButton) {
      if (currentActionType === 'maneuver') {
        setShowDoublesManeuverOptions(true);
      } else if (currentActionType === 'attack') {
        setShowDoublesAttackOptions(true);
      } else if (currentActionType === 'miscellaneous') {
        setShowDoublesMiscOptions(true);
      }
      return;
    }

    if (isDoublesActive) {
      if (action === onTurnSherman) {
        setShowTurnButtons(true);
        setShowDoublesManeuverOptions(false); // Hide doubles maneuver options
      } else if (action === onFireMainGun) {
        // Special case for firing: pass the callback, don't expect immediate success
        onFireMainGun(expendCurrentDie);
      } else {
        actionSuccessful = action();
        if (actionSuccessful) {
          expendCurrentDie();
        } else {
          setShowDoublesManeuverOptions(false);
        }
      }
    } else if (selectedDieIndex !== null) {
      // For single die actions
      if (action === onTurnSherman) {
        setShowTurnButtons(true);
      } else if (action === onFireMainGun) {
        // Special case for firing: pass the callback
        onFireMainGun(expendCurrentDie);
      } else {
        actionSuccessful = action(); // e.g., onMoveSherman()
        if (actionSuccessful) {
          expendCurrentDie();
        } else {
          // If the action was not successful (e.g., illegal move), reset the selection
          setSelectedAction(null);
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
    setSelectedAction(null);
    setSelectedDieIndex(null);
    setShowTurnButtons(false);
  };

  const expendCurrentDie = useCallback(() => {
    if (isDoublesActive) {
      setExpendedDice(prev => [...prev, ...selectedDiceForDoubles]);
      setSelectedDiceForDoubles([]);
      setIsDoublesActive(false);
    } else if (selectedDieIndex !== null) {
      setExpendedDice(prev => [...prev, selectedDieIndex]);
    }
    setSelectedAction(null);
    setSelectedDieIndex(null);
    setShowDoublesManeuverOptions(false);
    setShowTurnButtons(false);
  }, [selectedDieIndex, selectedDiceForDoubles, isDoublesActive]);

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
          {diceResults.length === 0 && !miscellaneousExpended && (
            <button
              className={`${styles.actionButton} ${styles.maneuverButton} ${maneuverExpended ? styles.expended : ''}`}
              onClick={handleManeuverClick}
              title={`Roll ${calculateManeuverDice().totalDice} dice\n${calculateManeuverDice().reasons.join('\n')}`}
              disabled={maneuverExpended}
            >
              Maneuver
            </button>
          )}
          <DiceDisplay 
            results={diceResults} 
            onDieClick={handleDieClick} 
            selectedIndex={selectedDieIndex} 
            expendedDice={expendedDice} 
            selectedDiceForDoubles={selectedDiceForDoubles}
            getActionForRoll={currentActionType === 'maneuver' ? getManeuverActionForRoll : getAttackActionForRoll}
          />
          {diceResults.length === 0 && !miscellaneousExpended && (
            <button
              className={`${styles.actionButton} ${styles.attackButton} ${attackExpended ? styles.expended : ''}`}
              onClick={handleAttackClick}
              title={`Roll ${calculateAttackDice().totalDice} dice\n${calculateAttackDice().reasons.join('\n')}`}
              disabled={attackExpended}
            >
              Attack
            </button>
          )}

          {/* Action Buttons */}
          {!isDoublesActive && !showDoublesManeuverOptions && (
            <>
              {selectedAction === "MOVE" && <button className={`${styles.actionButton} ${styles.maneuverActionButton}`} onClick={() => handleActionClick(onMoveSherman)}>MOVE</button>}
              {selectedAction === "REVERSE" && <button className={`${styles.actionButton} ${styles.maneuverActionButton}`} onClick={() => handleActionClick(onReverseSherman)}>REVERSE</button>}
              {selectedAction === "TURN" && !showTurnButtons && <button className={`${styles.actionButton} ${styles.maneuverActionButton}`} onClick={() => handleActionClick(onTurnSherman)}>TURN</button>}
              {selectedAction === "LOAD" && <button className={`${styles.actionButton} ${styles.attackActionButton}`} onClick={() => handleActionClick(handleLoadAction)}>LOAD</button>}
              {selectedAction === "FIRE MACHINE GUN" && <button className={`${styles.actionButton} ${styles.attackActionButton}`} onClick={() => handleActionClick(() => console.log("FIRE MACHINE GUN"))}>FIRE MACHINE GUN</button>}
                            {selectedAction === "FIRE MAIN GUN" && <button className={`${styles.actionButton} ${styles.attackActionButton}`} onClick={() => handleActionClick(onFireMainGun)}>FIRE MAIN GUN</button>}
            </>
          )}

          {/* Doubles Button */}
          {isDoublesActive && !showDoublesManeuverOptions && !showDoublesAttackOptions && !showTurnButtons && (
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

          {/* Doubles Attack Options */}
          {isDoublesActive && showDoublesAttackOptions && (
            <div className={styles.doublesAttackOptions}>
              <button className={`${styles.actionButton} ${styles.attackActionButton}`} onClick={() => handleActionClick(handleLoadAction)}>
                LOAD
              </button>
              <button className={`${styles.actionButton} ${styles.attackActionButton}`} onClick={() => handleActionClick(onFireMainGun)}>
                MAIN GUN
              </button>
              <button className={`${styles.actionButton} ${styles.attackActionButton}`} onClick={() => { console.log("FIRE MACHINE GUN"); return true; }}>
                MG
              </button>
            </div>
          )}

          {/* Doubles Misc Options */}
          {isDoublesActive && showDoublesMiscOptions && (
            <div className={styles.doublesMiscOptions}>
              <button className={`${styles.actionButton} ${styles.miscellaneousActionButton}`} onClick={() => handleActionClick(onHullDown)}>
                HULL DOWN
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

          {maneuverExpended && attackExpended && !miscellaneousExpended && diceResults.length === 0 && (
            <button 
              className={`${styles.actionButton} ${styles.miscellaneousButton}`}
              onClick={handleMiscellaneousClick}
              title={`Roll ${calculateMiscellaneousDice().totalDice}
              ${calculateMiscellaneousDice().reasons.join('\n')}`}>
              Miscellaneous
            </button>
          )}
          {/* Add an "End Turn" button here later */}
        </>
      )}
    </div>
  );
}

export default TurnActions;