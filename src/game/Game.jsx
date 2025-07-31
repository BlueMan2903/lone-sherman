// src/game/Game.jsx
import React, { useState, useEffect, useCallback } from 'react';
import HexGrid from './components/HexGrid/HexGrid';
import TankStatusDisplay from './components/TankStatusDisplay/TankStatusDisplay';
import TurnActions from './components/TurnActions/TurnActions';
import Notification from './components/Notification/Notification'; // Import Notification
import { playSound } from './logic/audioManager';
import tankMoveSound from '../assets/sounds/tank-move-1.mp3'; // Import tank move sound
import tankShotSound from '../assets/sounds/tank-shot-1.wav'; // Import tank shot sound
import shellDeflectedSound from '../assets/sounds/shell-deflected.mp3'; // Import shell deflected sound
import { getNeighborHex, getHexesInLine, hasClearPath, getDistance, getFiringArcHexes, getAngleOfAttack } from './logic/hexUtils';
import { calculateToHitNumber, roll2D6, roll1D6, calculateDamage } from './logic/combatUtils';
import scenario1Data from '../data/scenarios/scenario1.json';
import styles from './Game.module.css';

// Helper function to get N unique random elements from an array
const selectRandomUniqueElements = (arr, count) => {
  if (arr.length < count) {
    console.warn("Not enough unique elements in array to select the requested count.");
    return [...arr]; // Return all available if not enough
  }
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

function Game() {
  const [currentScenario, setCurrentScenario] = useState(null);
  const [turnNumber, setTurnNumber] = useState(1);
  const [notification, setNotification] = useState(null); // State for notification message
  const [isTargetingMode, setIsTargetingMode] = useState(false);
  const [buttonMessage, setButtonMessage] = useState(null);
  const [onAttackComplete, setOnAttackComplete] = useState(null);
  const [bouncingUnitId, setBouncingUnitId] = useState(null); // <--- NEW
  const [selectedTargetUnitId, setSelectedTargetUnitId] = useState(null); // New state for selected target
  const [gameOver, setGameOver] = useState(false);

  const initializeScenarioUnits = useCallback(() => {
    const scenario = JSON.parse(JSON.stringify(scenario1Data));
    let allUnits = [...(scenario.units || [])];

    if (scenario.dynamicSpawns && scenario.unitTemplates) {
      scenario.dynamicSpawns.forEach(spawnInstruction => {
        const template = scenario.unitTemplates.find(t => t.id === spawnInstruction.templateId);

        if (template) {
          const randomSpawnHexes = selectRandomUniqueElements(spawnInstruction.possibleHexes, spawnInstruction.count);

          randomSpawnHexes.forEach((hex, index) => {
            const newUnit = {
              ...template,
              id: `${template.id}-${Math.random().toString(36).substr(2, 9)}`,
              currentHex: { q: hex.q, r: hex.r },
              rotation: hex.rotation || 0,
              destroyed: false, // Ensure destroyed is initialized
              damaged: false // Ensure damaged is initialized
            };
            allUnits.push(newUnit);
          });
        } else {
          console.warn(`Template with ID '${spawnInstruction.templateId}' not found for dynamic spawn.`);
        }
      });
    }
    // Also ensure initial units from scenario.units have these properties
    allUnits = allUnits.map(unit => ({
      ...unit,
      destroyed: unit.destroyed !== undefined ? unit.destroyed : false,
      damaged: unit.damaged !== undefined ? unit.damaged : false
    }));
    scenario.units = allUnits;
    return scenario;
  }, []);

  useEffect(() => {
    const initialScenario = initializeScenarioUnits();
    setCurrentScenario(initialScenario);
  }, [initializeScenarioUnits]);

  const handleStartTurnLogic = useCallback(() => {
    console.log(`Starting Turn ${turnNumber}...`);

    setCurrentScenario(prevScenario => {
      if (!prevScenario) return null;

      const newScenario = JSON.parse(JSON.stringify(prevScenario));
      newScenario.map.hexes = newScenario.map.hexes.map(hex => ({
        ...hex,
        shermanSmoke: false
      }));
      console.log("All Sherman smoke removed.");
      return newScenario;
    });
  }, [turnNumber]);

  const handleCommanderDecision = useCallback((position) => {
    console.log(`Commander positioned: ${position}`);
    setCurrentScenario(prevScenario => {
      if (!prevScenario) return null;

      const newScenario = JSON.parse(JSON.stringify(prevScenario));
      const shermanIndex = newScenario.units.findIndex(unit => unit.id.includes("sherman"));

      if (shermanIndex !== -1) {
        newScenario.units[shermanIndex].crew.commander = position;
        console.log(`Sherman commander status updated to: ${position}`);
      } else {
        console.warn("Sherman unit not found to update commander status.");
      }
      return newScenario;
    });
  }, []);


  const handleManeuver = () => {
    console.log("Maneuver action initiated from Game component!");
  };

  const handleAttack = () => {
    console.log("Attack action initiated from Game component!");
  };

  const handleFireMainGun = useCallback((onComplete) => { // Accept a callback
    const shermanUnit = currentScenario.units.find(u => u.id.includes("sherman"));

    if (shermanUnit.turretDamaged === "Yes") {
      setNotification("Main gun is damaged, can't fire until repaired!");
      return;
    }

    if (shermanUnit.mainGunStatus !== 'loaded') {
      setNotification("Main gun unloaded. Can't fire.");
      setButtonMessage(null); // Clear message if not loaded
      return;
    }

    setIsTargetingMode(true);
    setButtonMessage("Select an enemy unit to fire upon.");
    setOnAttackComplete(() => onComplete); // Store the callback
  }, [currentScenario]);

  const onUnitClick = useCallback((unit) => {
    if (!isTargetingMode) return;

    // If in targeting mode, set the selected target unit ID
    setSelectedTargetUnitId(unit.id);

    const shermanUnit = currentScenario.units.find(u => u.id.includes("sherman"));
    
    // Check if target is in firing arc
    const firingArcHexes = getFiringArcHexes(shermanUnit.currentHex, currentScenario.map.hexes);
    const targetInFiringArc = firingArcHexes.some(hex => hex.q === unit.currentHex.q && hex.r === unit.currentHex.r);

    if (!targetInFiringArc) {
      setNotification("Invalid target, not on a straight line from your current hex");
      setIsTargetingMode(false);
      return; // DO NOT EXPEND DIE
    }

    const losCheck = hasClearPath(shermanUnit.currentHex, unit.currentHex, currentScenario.map.hexes);

    if (losCheck.blocked) {
      setNotification(`Invalid target, line of sight obstructed by ${losCheck.blockingTerrain}.`);
      setIsTargetingMode(false);
      return; // DO NOT EXPEND DIE
    } else {
      // Play tank shot sound
      playSound(tankShotSound, 0.5); // Adjust volume as needed

      const { toHit, breakdown } = calculateToHitNumber(shermanUnit, unit, currentScenario.map.hexes);
      const diceRoll = roll2D6();
      const isHit = diceRoll.total >= toHit;

      let hitMessage = `To-Hit: ${toHit} (Roll: ${diceRoll.total} [${diceRoll.rolls.join('+')}]) - ${isHit ? 'HIT!' : 'MISS!'}`;
      hitMessage += `\nBreakdown: Dist(${breakdown.distance}), Size(${breakdown.size}), Build(${breakdown.building}), Smoke(${breakdown.smoke}), Hull(${breakdown.hullDown}), Arc(${breakdown.southernArc})`;

      console.log(hitMessage);

      if (isHit) {
        const damageResult = calculateDamage(shermanUnit, unit);
        let damageMessage = `Penetration Roll: ${damageResult.roll} vs. Armor (${damageResult.armorSide}): ${damageResult.armorValue}. Needed: ${damageResult.scoreNeeded}. Result: ${damageResult.penetrated ? 'PENETRATION' : 'BOUNCE'}`;
        if (damageResult.penetrated) {
          damageMessage += ` | Damage Roll: ${damageResult.damageRoll}.`;
          if (damageResult.damage.destroyed) {
            damageMessage += " Target destroyed!";
            handleUpdateUnit(unit.id, { destroyed: true });
          } else if (damageResult.damage.damaged) {
            damageMessage += " Target damaged!";
            handleUpdateUnit(unit.id, { damaged: true });
          }
        }
        console.log(damageMessage);
        if (!damageResult.penetrated) {
          // 1s delay before starting
          setTimeout(() => {
            setBouncingUnitId(unit.id);
            playSound(shellDeflectedSound, 1);
            
            // Let animation play for 1s
            setTimeout(() => {
              setBouncingUnitId(null);
            }, 1000);
          }, 700);
        }
      }

      // Set main gun status to unloaded after a successful shot
      handleUpdateUnit(shermanUnit.id, { mainGunStatus: 'unloaded' });
    }

    if (onAttackComplete) {
      onAttackComplete(); // Call the stored callback to expend the die
    }

    setIsTargetingMode(false);
    setButtonMessage(""); // Clear the message
    setOnAttackComplete(null); // Clear the callback
  }, [isTargetingMode, currentScenario, onAttackComplete]);

  const moveUnit = useCallback((unitId, forward = true) => {
    let moveResult = { success: false, reason: null };

    setCurrentScenario(prevScenario => {
      if (!prevScenario) {
        moveResult = { success: false, reason: 'Scenario not loaded' };
        return null;
      }

      const newScenario = JSON.parse(JSON.stringify(prevScenario));
      const unitIndex = newScenario.units.findIndex(u => u.id === unitId);

      if (unitIndex === -1) {
        moveResult = { success: false, reason: `Unit ${unitId} not found` };
        return newScenario;
      }

      const unit = newScenario.units[unitIndex];
      const startingHex = { ...unit.currentHex };
      const direction = forward ? unit.rotation : (unit.rotation + 180) % 360;
      const newHex = getNeighborHex(unit.currentHex, direction);

      const occupyingUnit = newScenario.units.find(
        u => u.id !== unitId && u.currentHex.q === newHex.q && u.currentHex.r === newHex.r
      );

      if (occupyingUnit) {
        moveResult = { success: false, reason: 'occupied', unit: occupyingUnit };
        return newScenario;
      }

      const isOffMap = !newScenario.map.hexes.some(
        hex => hex.q === newHex.q && hex.r === newHex.r
      );

      if (isOffMap) {
        moveResult = { success: false, reason: 'off-map' };
        return newScenario;
      }

      // If we get here, the move is legal
      unit.currentHex = newHex;
      unit.hull_down = false;
      newScenario.units[unitIndex] = unit;
      
      console.log(`Unit ${unit.id} moved from q:${startingHex.q}, r:${startingHex.r} to q:${newHex.q}, r:${newHex.r}`);
      playSound(tankMoveSound, 0.4);
      
      moveResult = { success: true };
      return newScenario;
    });

    return moveResult;
  }, []);

  const handleMoveSherman = useCallback(() => {
    const sherman = currentScenario.units.find(u => u.id.includes("sherman"));
    if (!sherman) return false;

    const result = moveUnit(sherman.id, true);

    if (!result.success) {
      if (result.reason === 'occupied') {
        setNotification("You can't move to an occupied hex.");
      } else if (result.reason === 'off-map') {
        setNotification("You can't move off the map.");
      }
    }

    return result.success;
  }, [currentScenario, moveUnit]);

  const handleReverseSherman = useCallback(() => {
    const sherman = currentScenario.units.find(u => u.id.includes("sherman"));
    if (!sherman) return false;

    const result = moveUnit(sherman.id, false);

    if (!result.success) {
      if (result.reason === 'occupied') {
        setNotification("You can't move to an occupied hex.");
      } else if (result.reason === 'off-map') {
        setNotification("You can't move off the map.");
      }
    }

    return result.success;
  }, [currentScenario, moveUnit]);

  const turnUnit = useCallback((unitId, turnAmount) => {
    setCurrentScenario(prevScenario => {
      if (!prevScenario) return null;
      const newScenario = JSON.parse(JSON.stringify(prevScenario));
      const unitIndex = newScenario.units.findIndex(u => u.id === unitId);

      if (unitIndex !== -1) {
        const unit = newScenario.units[unitIndex];
        let newRotation = (unit.rotation + turnAmount + 360) % 360;
        unit.rotation = newRotation;
        unit.hull_down = false; // Reset hull down status on turn
        newScenario.units[unitIndex] = unit;
        console.log(`Unit ${unit.id} turned to ${newRotation} degrees.`);
      }
      return newScenario;
    });
    return true; // Assume success for now
  }, []);

  const handleTurnSherman = useCallback((direction) => {
    const sherman = currentScenario.units.find(u => u.id.includes("sherman"));
    if (sherman) {
      turnUnit(sherman.id, direction);
    }
  }, [currentScenario, turnUnit]);

  const handleUpdateUnit = useCallback((unitId, updates) => {
    setCurrentScenario(prevScenario => {
      if (!prevScenario) return null;

      const newScenario = JSON.parse(JSON.stringify(prevScenario));
      const unitIndex = newScenario.units.findIndex(unit => unit.id === unitId);

      if (unitIndex !== -1) {
        newScenario.units[unitIndex] = { ...newScenario.units[unitIndex], ...updates };
        console.log(`Unit ${unitId} updated:`, updates);
      } else {
        console.warn(`Unit with ID ${unitId} not found for update.`);
      }
      return newScenario;
    });
    return true; // Assume success for now
  }, []);

  const handleRemoveGermanSmoke = useCallback(() => {
    setCurrentScenario(prevScenario => {
      if (!prevScenario) return null;

      const newScenario = JSON.parse(JSON.stringify(prevScenario));
      newScenario.map.hexes = newScenario.map.hexes.map(hex => ({
        ...hex,
        germanSmoke: false
      }));
      console.log("All German smoke removed.");
      return newScenario;
    });
  }, []);

  const isMoveLegal = (unit, scenario, forward = true) => {
    const direction = forward ? unit.rotation : (unit.rotation + 180) % 360;
    const newHex = getNeighborHex(unit.currentHex, direction);

    const isOccupied = scenario.units.some(
      u => u.id !== unit.id && u.currentHex.q === newHex.q && u.currentHex.r === newHex.r
    );

    const isOffMap = !scenario.map.hexes.some(
      hex => hex.q === newHex.q && hex.r === newHex.r
    );
    return !isOccupied && !isOffMap;
  }

  const fireGermanTankAtSherman = useCallback(async (germanTank, shermanUnit) => {
    console.log(`German Tank ${germanTank.id} is firing at Sherman!`);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Pause for notification

    const losCheck = hasClearPath(germanTank.currentHex, shermanUnit.currentHex, currentScenario.map.hexes);

    if (losCheck.blocked) {
      console.log(`German Tank ${germanTank.id}: Line of sight to Sherman obstructed by ${losCheck.blockingTerrain}.`);
    } else {
      playSound(tankShotSound, 0.5); // Play tank shot sound

      const { toHit, breakdown } = calculateToHitNumber(germanTank, shermanUnit, currentScenario.map.hexes);
      const diceRoll = roll2D6();
      const isHit = diceRoll.total >= toHit;

      let hitMessage = `German Tank ${germanTank.id} To-Hit: ${toHit} (Roll: ${diceRoll.total} [${diceRoll.rolls.join('+')}]) - ${isHit ? 'HIT!' : 'MISS!'}`;
      hitMessage += `\nBreakdown: Dist(${breakdown.distance}), Size(${breakdown.size}), Build(${breakdown.building}), Smoke(${breakdown.smoke}), Hull(${breakdown.hullDown}), Arc(${breakdown.southernArc})`;

      console.log(hitMessage);

      if (isHit) {
        const damageResult = calculateDamage(germanTank, shermanUnit);
        let damageMessage = `Penetration Roll: ${damageResult.roll} vs. Armor (${damageResult.armorSide}): ${damageResult.armorValue}. Needed: ${damageResult.scoreNeeded}. Result: ${damageResult.penetrated ? 'PENETRATION' : 'BOUNCE'}`;
        if (damageResult.penetrated) {
          damageMessage += ` | Penetration Roll: ${damageResult.damageRoll}.`; // Renamed damageRoll to penetrationRoll for clarity
          const shermanDamageRoll = roll1D6();
          let shermanUpdates = {};
          let outcomeMessage = `Sherman hit! Damage Roll: ${shermanDamageRoll}. Outcome: `;

          switch (shermanDamageRoll) {
            case 1:
              outcomeMessage += "DESTROYED! Game Over.";
              shermanUpdates = { destroyed: true };
              setGameOver(true);
              break;
            case 2:
              outcomeMessage += "KIA Check initiated.";
              // handleKIACheck will be called, which will then call handleEndTurn
              handleKIACheck();
              console.log(outcomeMessage);
            case 3:
            case 4:
              outcomeMessage += "Fire Spreads! Fire Level increased by 1.";
              shermanUpdates = { fireLevel: shermanUnit.fireLevel + 1 };
              break;
            case 5:
              outcomeMessage += "Turret Damaged!";
              shermanUpdates = { turretDamaged: "Yes" };
              break;
            case 6:
              outcomeMessage += "Immobilized!";
              shermanUpdates = { immobilized: "Yes" };
              break;
            default:
              outcomeMessage += "Unknown.";
          }
          console.log(outcomeMessage);
          if (Object.keys(shermanUpdates).length > 0) {
            handleUpdateUnit(shermanUnit.id, shermanUpdates);
          }
        }
        console.log(damageMessage);

        if (!damageResult.penetrated) {
          // 1s delay before starting bounce animation/sound
          setTimeout(() => {
            setBouncingUnitId(shermanUnit.id);
            playSound(shellDeflectedSound, 1);

            // Let animation play for 1s
            setTimeout(() => {
              setBouncingUnitId(null);
            }, 1000);
          }, 700); // This delay is for the bounce effect, not the main gun sound
        }
      }
    }
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate action time
  }, [currentScenario, handleUpdateUnit, setBouncingUnitId]);

  const repairGermanTank = useCallback((tankId) => {
    handleUpdateUnit(tankId, { damaged: false });
    console.log(`German Tank ${tankId} repaired.`);
  }, [handleUpdateUnit]);

  const turnGermanTankTowards = useCallback((germanTankId, targetHex) => {
    const germanTank = currentScenario.units.find(u => u.id === germanTankId);
    if (!germanTank) return;

    const angleToSherman = getAngleOfAttack(germanTank.currentHex, targetHex);

    if (germanTank.rotation === angleToSherman) {
      console.log(`German Tank ${germanTank.id} is already facing the target direction.`);
      return;
    }

    let diff = angleToSherman - germanTank.rotation;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    const turnDirection = Math.sign(diff);
    turnUnit(germanTankId, turnDirection * 60);
  }, [currentScenario, turnUnit]);

  const moveGermanTank = useCallback((germanTankId, forward = true) => {
    let moveSuccessful = false;
    setCurrentScenario(prevScenario => {
      if (!prevScenario) return null;
      const newScenario = JSON.parse(JSON.stringify(prevScenario));
      const germanTankIndex = newScenario.units.findIndex(unit => unit.id === germanTankId);

      if (germanTankIndex !== -1) {
        const germanTank = newScenario.units[germanTankIndex];
        const startingHex = germanTank.currentHex; // Capture starting position
        const direction = forward ? germanTank.rotation : (germanTank.rotation + 180) % 360;
        const newHex = getNeighborHex(germanTank.currentHex, direction);

        const occupyingUnit = newScenario.units.find(
          unit => unit.id !== germanTankId && unit.currentHex.q === newHex.q && unit.currentHex.r === newHex.r
        );
        const isOccupied = !!occupyingUnit;

        const isOffMap = !newScenario.map.hexes.some(
          hex => hex.q === newHex.q && hex.r === newHex.r
        );

        if (!isOccupied && !isOffMap) {
          germanTank.currentHex = newHex;
          germanTank.hull_down = false; // Reset hull down status
          console.log(`German Tank ${germanTankId} moved from q:${startingHex.q}, r:${startingHex.r} to q:${newHex.q}, r:${newHex.r}`);
          playSound(tankMoveSound, 0.4);
          moveSuccessful = true;
        } else {
          if (occupyingUnit) {
            console.log(`German Tank ${germanTankId} could not move to q:${newHex.q}, r:${newHex.r}. Occupied by:`, occupyingUnit);
          } else {
            console.log(`German Tank ${germanTankId} could not move. Occupied: ${isOccupied}, OffMap: ${isOffMap}`);
          }
        }
      }
      return newScenario;
    });
    return moveSuccessful;
  }, []);

  const deployGermanSmoke = useCallback((germanTankId) => {
    setCurrentScenario(prevScenario => {
      if (!prevScenario) return null;
      const newScenario = JSON.parse(JSON.stringify(prevScenario));
      const germanTank = newScenario.units.find(unit => unit.id === germanTankId);

      if (germanTank) {
        const hexIndex = newScenario.map.hexes.findIndex(
          hex => hex.q === germanTank.currentHex.q && hex.r === germanTank.currentHex.r
        );
        if (hexIndex !== -1) {
          newScenario.map.hexes[hexIndex].germanSmoke = true;
          console.log(`German Tank ${germanTankId} deployed smoke at q:${germanTank.currentHex.q}, r:${germanTank.currentHex.r}`);
        }
      }
      return newScenario;
    });
  }, []);

  const performDamagedGermanTankActions = useCallback(async (germanTank, shermanUnit) => {
    console.log(`German Tank ${germanTank.id} is damaged. Rolling for actions...`);

    const diceRolls = [roll1D6(), roll1D6()].sort((a, b) => a - b); // Roll 2D6 and sort ascending
    console.log(`Damaged German Tank ${germanTank.id} rolled: ${diceRolls.join(', ')}`);

    for (const roll of diceRolls) {
      switch (roll) {
        case 1:
          console.log(`German Tank ${germanTank.id}: Action 1 (Repair)...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Pause for notification
          repairGermanTank(germanTank.id);
          break;
        case 2:
          console.log(`German Tank ${germanTank.id}: Action 2 (Turn)...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Pause
          turnGermanTankTowards(germanTank.id, shermanUnit.currentHex);
          break;
        case 3:
          console.log(`German Tank ${germanTank.id}: Action 3 (Move > Turn)...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Pause
          if (isMoveLegal(germanTank, currentScenario)) {
            moveGermanTank(germanTank.id);
          } else {
            console.log(`German Tank ${germanTank.id}: Can't move. Turning instead.`);
            turnGermanTankTowards(germanTank.id, shermanUnit.currentHex);
          }
          break;
        case 4:
          console.log(`German Tank ${germanTank.id}: Action 4 (Move > Reverse)...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Pause
          if (isMoveLegal(germanTank, currentScenario)) {
            moveGermanTank(germanTank.id);
          } else {
            console.log(`German Tank ${germanTank.id}: Can't move. Reversing instead.`);
            moveGermanTank(germanTank.id, false); // Attempt to reverse
          }
          break;
        case 5:
          console.log(`German Tank ${germanTank.id}: Action 5 (Fire)...`);
          await fireGermanTankAtSherman(germanTank, shermanUnit);
          break;
        case 6:
          console.log(`German Tank ${germanTank.id}: Action 6 (Smoke)...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Pause
          deployGermanSmoke(germanTank.id);
          break;
        default:
          break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000)); // Pause between actions
    }
  }, [handleUpdateUnit, repairGermanTank, turnGermanTankTowards, moveGermanTank, deployGermanSmoke, fireGermanTankAtSherman]);

  const performMuddedGermanTankActions = useCallback(async (germanTank, shermanUnit) => {
    console.log(`German Tank ${germanTank.id} is stuck in mud! Rolling for actions...`);

    const diceRolls = [roll1D6(), roll1D6(), roll1D6()].sort((a, b) => a - b); // Roll 3D6 and sort ascending
    console.log(`Mudded German Tank ${germanTank.id} rolled: ${diceRolls.join(', ')}`);

    for (const roll of diceRolls) {
      switch (roll) {
        case 1:
          console.log(`German Tank ${germanTank.id}: Action 1 (Fire)...`);
          await fireGermanTankAtSherman(germanTank, shermanUnit);
          break;
        case 2:
          console.log(`German Tank ${germanTank.id}: Action 2 (Turn)...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Pause
          turnGermanTankTowards(germanTank.id, shermanUnit.currentHex);
          break;
        case 3:
          console.log(`German Tank ${germanTank.id}: Action 3 (Move > Turn)...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Pause
          if (isMoveLegal(germanTank, currentScenario)) {
            moveGermanTank(germanTank.id);
          } else {
            console.log(`German Tank ${germanTank.id}: Can't move. Turning instead.`);
            turnGermanTankTowards(germanTank.id, shermanUnit.currentHex);
          }
          break;
        case 4:
          console.log(`German Tank ${germanTank.id}: Action 4 (Move > Reverse)...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Pause
          if (isMoveLegal(germanTank, currentScenario)) {
            moveGermanTank(germanTank.id);
          } else {
            console.log(`German Tank ${germanTank.id}: Can't move. Reversing instead.`);
            moveGermanTank(germanTank.id, false); // Attempt to reverse
          }
          break;
        case 5:
          console.log(`German Tank ${germanTank.id}: Action 5 (Fire)...`);
          await fireGermanTankAtSherman(germanTank, shermanUnit);
          break;
        case 6:
          console.log(`German Tank ${germanTank.id}: Action 6 (Smoke)...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Pause
          deployGermanSmoke(germanTank.id);
          break;
        default:
          break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000)); // Pause between actions
    }
  }, [fireGermanTankAtSherman, turnGermanTankTowards, moveGermanTank, deployGermanSmoke]);

  const performFieldGermanTankActions = useCallback(async (germanTank, shermanUnit) => {
    console.log(`German Tank ${germanTank.id} is on a field hex! Rolling for actions...`);

    const diceRolls = [roll1D6(), roll1D6(), roll1D6(), roll1D6()].sort((a, b) => a - b); // Roll 4D6 and sort ascending
    console.log(`Field German Tank ${germanTank.id} rolled: ${diceRolls.join(', ')}`);

    for (const roll of diceRolls) {
      let actionTaken = false; // Flag to track if an action was successfully taken
      switch (roll) {
        case 1:
          console.log(`German Tank ${germanTank.id}: Action 1 (Fire > Turn)...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Pause
          const losCheck1 = hasClearPath(germanTank.currentHex, shermanUnit.currentHex, currentScenario.map.hexes);
          if (!losCheck1.blocked) {
            await fireGermanTankAtSherman(germanTank, shermanUnit);
            actionTaken = true;
          } else {
            console.log(`German Tank ${germanTank.id}: Can't fire. Sherman not in line of sight.`);
            turnGermanTankTowards(germanTank.id, shermanUnit.currentHex);
            actionTaken = true;
          }
          break;
        case 2:
          console.log(`German Tank ${germanTank.id}: Action 2 (Move > Turn)...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Pause
          if (isMoveLegal(germanTank, currentScenario)) {
            moveGermanTank(germanTank.id);
          } else {
            console.log(`German Tank ${germanTank.id}: Can't move. Turning instead.`);
            turnGermanTankTowards(germanTank.id, shermanUnit.currentHex);
          }
          actionTaken = true;
          break;
        case 3:
          console.log(`German Tank ${germanTank.id}: Action 3 (Fire > Move)...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Pause
          const losCheck3 = hasClearPath(germanTank.currentHex, shermanUnit.currentHex, currentScenario.map.hexes);
          if (!losCheck3.blocked) {
            await fireGermanTankAtSherman(germanTank, shermanUnit);
            // If Sherman was destroyed or KIA check initiated, stop further actions for this tank
            if (shermanUnit.destroyed || shermanUnit.crew.commander === "kia" || shermanUnit.crew.loader === "kia" || shermanUnit.crew.gunner === "kia" || shermanUnit.crew.driver === "kia" || shermanUnit.crew.assistantDriver === "kia") {
              return; // Exit the loop and function
            }
            actionTaken = true;
          }
          if (!actionTaken) { // Only attempt move if fire didn't happen or didn't destroy/KIA
            console.log(`German Tank ${germanTank.id}: Can't fire. Moving instead.`);
            moveGermanTank(germanTank.id);
          }
          break;
        case 4:
          console.log(`German Tank ${germanTank.id}: Action 4 (Turn)...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Pause
          turnGermanTankTowards(germanTank.id, shermanUnit.currentHex);
          actionTaken = true;
          break;
        case 5:
          console.log(`German Tank ${germanTank.id}: Action 5 (Move > Reverse)...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Pause
          if (isMoveLegal(germanTank, currentScenario)) {
            moveGermanTank(germanTank.id);
          } else {
            console.log(`German Tank ${germanTank.id}: Can't move. Reversing instead.`);
            moveGermanTank(germanTank.id, false); // Attempt to reverse
          }
          actionTaken = true;
          break;
        case 6:
          console.log(`German Tank ${germanTank.id}: Action 6 (Fire > Hull Down)...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Pause
          const losCheck6 = hasClearPath(germanTank.currentHex, shermanUnit.currentHex, currentScenario.map.hexes);
          if (!losCheck6.blocked) {
            await fireGermanTankAtSherman(germanTank, shermanUnit);
            actionTaken = true;
          } else {
            console.log(`German Tank ${germanTank.id}: Can't fire. Going hull down instead.`);
            handleUpdateUnit(germanTank.id, { hull_down: true });
            actionTaken = true;
          }
          break;
        default:
          break;
      }
      if (actionTaken) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Pause between actions if an action was taken
      }
    }
  }, [fireGermanTankAtSherman, turnGermanTankTowards, moveGermanTank, deployGermanSmoke, handleUpdateUnit, currentScenario]);

  const performRoadGermanTankActions = useCallback(async (germanTank, shermanUnit) => {
    console.log(`German Tank ${germanTank.id} is on a road hex! Rolling for actions...`);

    const diceRolls = [roll1D6(), roll1D6(), roll1D6(), roll1D6()].sort((a, b) => a - b); // Roll 4D6 and sort ascending
    console.log(`Road German Tank ${germanTank.id} rolled: ${diceRolls.join(', ')}`);

    for (const roll of diceRolls) {
      let actionTaken = false;
      switch (roll) {
        case 1:
          console.log(`German Tank ${germanTank.id}: Action 1 (Fire > Turn)...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Pause
          const losCheck1 = hasClearPath(germanTank.currentHex, shermanUnit.currentHex, currentScenario.map.hexes);
          if (!losCheck1.blocked) {
            await fireGermanTankAtSherman(germanTank, shermanUnit);
            actionTaken = true;
          } else {
            console.log(`German Tank ${germanTank.id}: Can't fire. Turning instead.`);
            turnGermanTankTowards(germanTank.id, shermanUnit.currentHex);
            actionTaken = true;
          }
          break;
        case 2:
          console.log(`German Tank ${germanTank.id}: Action 2 (Move > Turn)...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Pause
          if (isMoveLegal(germanTank, currentScenario)) {
            moveGermanTank(germanTank.id);
          } else {
            console.log(`German Tank ${germanTank.id}: Can't move. Turning instead.`);
            turnGermanTankTowards(germanTank.id, shermanUnit.currentHex);
          }
          actionTaken = true;
          break;
        case 3:
          console.log(`German Tank ${germanTank.id}: Action 3 (Fire > Move)...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Pause
          const losCheck3 = hasClearPath(germanTank.currentHex, shermanUnit.currentHex, currentScenario.map.hexes);
          if (!losCheck3.blocked) {
            await fireGermanTankAtSherman(germanTank, shermanUnit);
            actionTaken = true;
          } else {
            console.log(`German Tank ${germanTank.id}: Can't fire. Moving instead.`);
            moveGermanTank(germanTank.id);
            actionTaken = true;
          }
          break;
        case 4:
          console.log(`German Tank ${germanTank.id}: Action 4 (Move > Turn)...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Pause
          if (isMoveLegal(germanTank, currentScenario)) {
            moveGermanTank(germanTank.id);
          } else {
            console.log(`German Tank ${germanTank.id}: Can't move. Turning instead.`);
            turnGermanTankTowards(germanTank.id, shermanUnit.currentHex);
          }
          actionTaken = true;
          break;
        case 5:
          console.log(`German Tank ${germanTank.id}: Action 5 (Move > Reverse)...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Pause
          if (isMoveLegal(germanTank, currentScenario)) {
            moveGermanTank(germanTank.id);
          } else {
            console.log(`German Tank ${germanTank.id}: Can't move. Reversing instead.`);
            moveGermanTank(germanTank.id, false); // Attempt to reverse
          }
          actionTaken = true;
          break;
        case 6:
          console.log(`German Tank ${germanTank.id}: Action 6 (Fire > Smoke)...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Pause
          const losCheck6 = hasClearPath(germanTank.currentHex, shermanUnit.currentHex, currentScenario.map.hexes);
          if (!losCheck6.blocked) {
            await fireGermanTankAtSherman(germanTank, shermanUnit);
            actionTaken = true;
          } else {
            console.log(`German Tank ${germanTank.id}: Can't fire. Deploying smoke instead.`);
            deployGermanSmoke(germanTank.id);
            actionTaken = true;
          }
          break;
        default:
          break;
      }
      if (actionTaken) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Pause between actions if an action was taken
      }
    }
  }, [fireGermanTankAtSherman, turnGermanTankTowards, moveGermanTank, deployGermanSmoke, currentScenario]);

  const performUndamagedGermanTankActions = useCallback(async (germanTank, shermanUnit) => {
    setNotification(`German Tank ${germanTank.id} is undamaged. (Placeholder)`);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Pause for notification
  }, [setNotification]);

  const handleGermanTankOperations = useCallback(async () => {
    console.log("Starting German Tank Operations...");
    if (!currentScenario) return;

    const germanTanks = currentScenario.units.filter(unit => unit.faction === 'axis' && !unit.destroyed);
    const shermanUnit = currentScenario.units.find(unit => unit.id.includes("sherman"));

    if (!shermanUnit) {
      console.warn("Sherman unit not found for German operations.");
      return;
    }

    // Sort German tanks by distance to Sherman (closest first)
    const sortedGermanTanks = [...germanTanks].sort((a, b) => {
      const distA = getDistance(a.currentHex, shermanUnit.currentHex);
      const distB = getDistance(b.currentHex, shermanUnit.currentHex);
      return distA - distB;
    });

    for (const germanTank of sortedGermanTanks) {
      const germanTankHex = currentScenario.map.hexes.find(hex => hex.q === germanTank.currentHex.q && hex.r === germanTank.currentHex.r);

      if (germanTank.damaged) {
        await performDamagedGermanTankActions(germanTank, shermanUnit);
      } else {
        const germanTankHex = currentScenario.map.hexes.find(hex => hex.q === germanTank.currentHex.q && hex.r === germanTank.currentHex.r);
        if (germanTankHex && germanTankHex.terrain.includes("road")) {
          await performRoadGermanTankActions(germanTank, shermanUnit);
        } else if (germanTankHex && germanTankHex.terrain.includes("mud")) {
          await performMuddedGermanTankActions(germanTank, shermanUnit);
        } else if (germanTankHex && germanTankHex.terrain.includes("field")) {
          await performFieldGermanTankActions(germanTank, shermanUnit);
        }
      }
    }

    // After all German tanks have acted, the turn truly ends.
    // This might need adjustment if there are more phases after German tanks.
    console.log("German Tank Operations complete.");
  }, [currentScenario, handleUpdateUnit, performDamagedGermanTankActions, performUndamagedGermanTankActions, performMuddedGermanTankActions, performFieldGermanTankActions, performRoadGermanTankActions]);

  const handleEndTurn = useCallback(() => {
    setTurnNumber(prevTurn => prevTurn + 1);
    setCurrentScenario(prevScenario => {
      if (!prevScenario) return null;
      const newScenario = JSON.parse(JSON.stringify(prevScenario));
      return newScenario;
    });
    console.log(`Ending Turn ${turnNumber}. Starting next turn...`);
    handleGermanTankOperations(); // Call German tank operations after player's turn
  }, [turnNumber, handleGermanTankOperations]);

  const handleKIACheck = useCallback(() => {
    const shermanUnit = currentScenario.units.find(unit => unit.id.includes("sherman"));
    if (!shermanUnit) return;

    setNotification("KIA Check! Rolling 1D6...");
    playSound(tankMoveSound, 0.4); // Placeholder for dice roll sound

    const roll = roll1D6();
    let outcomeMessage = `KIA Check Roll: ${roll}. Outcome: `;
    let crewUpdate = {};

    switch (roll) {
      case 1:
        outcomeMessage += "Commander KIA!";
        crewUpdate = { commander: "kia" };
        break;
      case 2:
        outcomeMessage += "Loader KIA!";
        crewUpdate = { loader: "kia" };
        break;
      case 3:
        outcomeMessage += "Gunner KIA!";
        crewUpdate = { gunner: "kia" };
        break;
      case 4:
        outcomeMessage += "Driver KIA!";
        crewUpdate = { driver: "kia" };
        break;
      case 5:
        outcomeMessage += "Assistant Driver KIA!";
        crewUpdate = { assistantDriver: "kia" };
        break;
      case 6:
        if (shermanUnit.crew.commander === "popped hatch") {
          outcomeMessage += "Commander KIA (due to popped hatch)!";
          crewUpdate = { commander: "kia" };
        } else {
          outcomeMessage += "No KIA (Commander was buttoned up).";
        }
        break;
      default:
        outcomeMessage += "Unknown KIA result.";
    }

    setNotification(outcomeMessage);
    if (Object.keys(crewUpdate).length > 0) {
      handleUpdateUnit(shermanUnit.id, { crew: { ...shermanUnit.crew, ...crewUpdate } });
    }

    // After KIA check, proceed to end turn
    setTimeout(() => {
      handleEndTurn();
    }, 3000); // 3 second delay for player to read outcome

  }, [currentScenario, handleEndTurn, handleUpdateUnit]);

  const handleFireLevelCheck = useCallback(() => {
    const shermanUnit = currentScenario.units.find(unit => unit.id.includes("sherman"));
    if (!shermanUnit || shermanUnit.fireLevel === 0) {
      console.log("Fire Level is 0, skipping Fire Level Check.");
      handleEndTurn();
      return;
    }

        setNotification(`Fire Level Check! Rolling ${shermanUnit.fireLevel} dice...`);
    playSound(tankMoveSound, 0.4); // Using tankMoveSound as a placeholder for dice roll sound

    let rolls = [];
    for (let i = 0; i < shermanUnit.fireLevel; i++) {
      rolls.push(roll1D6());
    }
    const lowestRoll = Math.min(...rolls);

    let outcomeMessage = `Fire Level Check: Rolled ${rolls.join(', ')}. Lowest roll: ${lowestRoll}.
`;
    let updates = {};

    switch (lowestRoll) {
      case 1:
        outcomeMessage += "Outcome: DESTROYED! Game Over.";
        updates = { destroyed: true };
        // TODO: Implement Game Over state
        break;
      case 2:
        outcomeMessage += "Outcome: KIA Check initiated.";
        handleKIACheck(); // Call the new KIA check function
        return; // KIA check will handle ending the turn
      case 3:
      case 4:
        outcomeMessage += "Outcome: Fire Spreads! Fire Level increased by 1.";
        updates = { fireLevel: shermanUnit.fireLevel + 1 };
        break;
      case 5:
        outcomeMessage += "Outcome: Turret Damaged!";
        updates = { turretDamaged: "Yes" };
        break;
      case 6:
        outcomeMessage += "Outcome: Immobilized!";
        updates = { immobilized: "Yes" };
        break;
      default:
        outcomeMessage += "Outcome: Unknown.";
    }

    setNotification(outcomeMessage);
    if (Object.keys(updates).length > 0) {
      handleUpdateUnit(shermanUnit.id, updates);
    }

    // Proceed to next phase after a delay
    setTimeout(() => {
      handleEndTurn();
    }, 3000); // 3 second delay for player to read outcome

  }, [currentScenario, handleEndTurn, handleUpdateUnit, handleKIACheck]);

  if (!currentScenario) {
    return <div>Loading game...</div>;
  }

  if (gameOver) {
    return (
      <div className={styles.gameOverScreen}>
        <Notification message="Your Sherman was destroyed. YOU LOSE" onClose={() => {}} />
      </div>
    );
  }

  const enemyTanks = currentScenario.units.filter(unit => unit.faction === 'axis');
  const totalEnemyTanks = enemyTanks.length;
  const destroyedEnemyTanks = enemyTanks.filter(unit => unit.destroyed).length;
  const objectiveText = `Destroy all enemies (${destroyedEnemyTanks}/${totalEnemyTanks})`;
  const shermanUnit = currentScenario.units.find(unit => unit.id.includes("sherman"));

  return (
    <div className={styles.gameContainer}>
      <Notification message={notification} onClose={() => setNotification(null)} />
      {/* Left Section */}
      <div className={styles.leftPanel}>
        <div className={styles.infoContainer}>
          <h3>Game Info</h3>
          <div className={styles.infoCard}>
            <h2>Scenario</h2>
            <p>{currentScenario.name}</p>
          </div>
          <div className={styles.infoCard}>
            <h2>Objective</h2>
            <p>{objectiveText}</p>
          </div>
          <div className={styles.infoCard}>
            <h2>Turn</h2>
            <p className={styles.turnCounter}>{turnNumber}</p>
          </div>
        </div>
      </div>

      {/* Middle Section: Map Area */}
      <div className={styles.mapArea}>
        <h1>Lone Sherman</h1>
        <div style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            overflow: 'auto',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
        }}>
          <HexGrid
            hexes={currentScenario.map.hexes}
            units={currentScenario.units || []}
            onUnitClick={onUnitClick}
            isTargetingMode={isTargetingMode}
            bouncingUnitId={bouncingUnitId} // <--- NEW
          />
        </div>
        {isTargetingMode && buttonMessage && <p className={styles.buttonMessage}>{buttonMessage}</p>}
      </div>

      {/* Right Section: Sidebar */}
      <div className={styles.sidebar}>
        <TankStatusDisplay unit={shermanUnit} />
        <TurnActions
          onManeuver={handleManeuver}
          onAttack={handleAttack}
          onStartTurnLogic={handleStartTurnLogic}
          onCommanderDecision={handleCommanderDecision}
          shermanUnit={shermanUnit}
          currentScenario={currentScenario}
          onMoveSherman={handleMoveSherman}
          onReverseSherman={handleReverseSherman}
          onTurnSherman={handleTurnSherman}
          onUpdateUnit={handleUpdateUnit}
          onSetNotification={setNotification}
          getHexesInLine={getHexesInLine}
          onFireMainGun={handleFireMainGun}
          targetingMessage={buttonMessage}
          selectedTargetUnitId={selectedTargetUnitId} // Pass selected target ID
          onRemoveGermanSmoke={handleRemoveGermanSmoke}
          onEndTurn={handleEndTurn}
          onFireLevelCheck={handleFireLevelCheck}
        />
      </div>
    </div>
  );
}

export default Game;
