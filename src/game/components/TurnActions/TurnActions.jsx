// src/game/components/TurnActions/TurnActions.jsx
import React, { useState, useEffect } from 'react';
import styles from './TurnActions.module.css';
import diceRollingSound from '../../../assets/sounds/dice-rolling.mp3';
import DiceDisplay from '../DiceDisplay/DiceDisplay';

function TurnActions({ onManeuver, onAttack, onStartTurnLogic, onCommanderDecision, shermanUnit, currentScenario, onMoveSherman, onReverseSherman, onTurnSherman, onUpdateUnit, onSetNotification, getHexesInLine }) {
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
  const [currentActionType, setCurrentActionType] = useState(null); // 'maneuver' or 'attack'
  const [showMiscellaneousButton, setShowMiscellaneousButton] = useState(false);

  useEffect(() => {
    if (diceResults.length > 0 && diceResults.length === expendedDice.length) {
      if (currentActionType === 'maneuver') {
        setManeuverExpended(true);
      } else if (currentActionType === 'attack') {
        setAttackExpended(true);
      }
      setTimeout(() => {
        setDiceResults([]);
        setExpendedDice([]);
        setCurrentActionType(null);
      }, 500); // 0.5s delay
    }
  }, [expendedDice, diceResults, currentActionType]);

  useEffect(() => {
    if (maneuverExpended && attackExpended) {
      setShowMiscellaneousButton(true);
    }
  }, [maneuverExpended, attackExpended]);

  

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
        setSelectedDiceForDoubles([selectedDieIndex, index]);
        setIsDoublesActive(true);
        setSelectedDieIndex(null); // Clear single selection
        setSelectedAction(null); // Action will be chosen by doubles buttons
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
      setSelectedDieIndex(null); // Clear any single selection too
      setSelectedAction(null);
    }
  };

  // Reset phase when turn starts (e.g., if Game.jsx signals a new turn)
  // For now, onStartTurnLogic will trigger the phase change directly.
  // In a more complex setup, you might pass turnNumber as a prop and reset on change.
  const handleStartTurn = () => {
    setManeuverExpended(false);
    setAttackExpended(false);
    setShowMiscellaneousButton(false);
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
    setCurrentActionType('attack');

    // Play dice rolling sound
    const audio = new Audio(diceRollingSound);
    audio.play();

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

  const handleActionClick = (action, isDoublesButton = false) => {
    if (selectedDieIndex === null && !isDoublesActive) return;

    let actionSuccessful = false;

    if (isDoublesButton) {
      if (currentActionType === 'maneuver') {
        setShowDoublesManeuverOptions(true);
      } else if (currentActionType === 'attack') {
        setShowDoublesAttackOptions(true);
      }
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
          setSelectedAction(null);
          setSelectedDieIndex(null);
          setShowDoublesManeuverOptions(false); // Reset after action
        } else {
          // If the action failed, hide the maneuver options but keep doubles active
          // so the user can try another doubles action.
          setShowDoublesManeuverOptions(false);
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
          setSelectedAction(null);
          setSelectedDieIndex(null);
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
          {diceResults.length === 0 && !showMiscellaneousButton && (
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
          {diceResults.length === 0 && !showMiscellaneousButton && (
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
              {selectedAction === "LOAD" && <button className={`${styles.actionButton} ${styles.attackActionButton}`} onClick={() => handleActionClick(() => onUpdateUnit(shermanUnit.id, { mainGunStatus: 'loaded' }))}>LOAD</button>}
              {selectedAction === "FIRE MACHINE GUN" && <button className={`${styles.actionButton} ${styles.attackActionButton}`} onClick={() => handleActionClick(() => console.log("FIRE MACHINE GUN"))}>FIRE MACHINE GUN</button>}
                            {selectedAction === "FIRE MAIN GUN" && <button className={`${styles.actionButton} ${styles.attackActionButton}`} onClick={() => handleActionClick(() => {
                if (shermanUnit.turretDamaged === "Yes") {
                  onSetNotification("Main gun is damaged, can't fire until repaired!");
                  return false; // Indicate action failed
                }
                if (shermanUnit.mainGunStatus !== 'loaded') {
                  onSetNotification("Main gun unloaded. Can't fire.");
                  return false; // Indicate action failed
                }

                const lineOfFire = getHexesInLine(shermanUnit.currentHex, shermanUnit.rotation, currentScenario.map.hexes);
                const enemyInLineOfFire = currentScenario.units.find(unit => 
                  unit.faction === 'axis' && 
                  lineOfFire.some(hex => hex.q === unit.currentHex.q && hex.r === unit.currentHex.r)
                );

                if (!enemyInLineOfFire) {
                  onSetNotification("There is nothing in front of you to fire at");
                  return false; // Indicate action failed
                }

                console.log("Fire Main Gun at", enemyInLineOfFire);
                return true; // Indicate action succeeded
              })}>FIRE MAIN GUN</button>}
            </>
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

          {/* Doubles Attack Options */}
          {isDoublesActive && showDoublesAttackOptions && (
            <div className={styles.doublesAttackOptions}>
              <button className={`${styles.actionButton} ${styles.attackActionButton}`} onClick={() => handleActionClick(() => onUpdateUnit(shermanUnit.id, { mainGunStatus: 'loaded' }))}>
                LOAD
              </button>
              <button className={`${styles.actionButton} ${styles.attackActionButton}`} onClick={() => handleActionClick(() => {
                if (shermanUnit.turretDamaged === "Yes") {
                  onSetNotification("Main gun is damaged, can't fire until repaired!");
                  return false;
                }
                if (shermanUnit.mainGunStatus !== 'loaded') {
                  onSetNotification("Main gun unloaded. Can't fire.");
                  return false;
                }

                const lineOfFire = getHexesInLine(shermanUnit.currentHex, shermanUnit.rotation, currentScenario.map.hexes);
                const enemyInLineOfFire = currentScenario.units.find(unit => 
                  unit.faction === 'axis' && 
                  lineOfFire.some(hex => hex.q === unit.currentHex.q && hex.r === unit.currentHex.r)
                );

                if (!enemyInLineOfFire) {
                  onSetNotification("There is nothing in front of you to fire at");
                  return false;
                }

                console.log("Fire Main Gun at", enemyInLineOfFire);
                return true;
              })}>
                MAIN GUN
              </button>
              <button className={`${styles.actionButton} ${styles.attackActionButton}`} onClick={() => { console.log("FIRE MACHINE GUN"); return true; }}>
                MG
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

          {showMiscellaneousButton && (
            <button className={`${styles.actionButton} ${styles.miscellaneousButton}`} onClick={() => console.log("Miscellaneous button clicked!")}>
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