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
import { getNeighborHex, getHexesInLine, hasClearPath, getDistance, getFiringArcHexes } from './logic/hexUtils';
import { calculateToHitNumber, roll2D6, calculateDamage } from './logic/combatUtils';
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
  const [selectedTargetUnitId, setSelectedTargetUnitId] = useState(null); // New state for selected target

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
          setTimeout(() => {
            playSound(shellDeflectedSound, 0.5); // Play deflected sound on bounce with a delay
          }, 1000); // 1 second delay
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

  const handleMoveSherman = useCallback(() => {
    let moveSuccessful = false;
    setCurrentScenario(prevScenario => {
      if (!prevScenario) return null;

      const newScenario = JSON.parse(JSON.stringify(prevScenario));
      const shermanIndex = newScenario.units.findIndex(unit => unit.id.includes("sherman"));

      if (shermanIndex !== -1) {
        const sherman = newScenario.units[shermanIndex];
        const newHex = getNeighborHex(sherman.currentHex, sherman.rotation);

        const isOccupied = newScenario.units.some(
          unit => unit.currentHex.q === newHex.q && unit.currentHex.r === newHex.r
        );

        const isOffMap = !newScenario.map.hexes.some(
          hex => hex.q === newHex.q && hex.r === newHex.r
        );

        if (isOccupied) {
          setNotification("You can't move to an occupied hex.");
        } else if (isOffMap) {
          setNotification("You can't move off the map.");
        } else {
          sherman.currentHex = newHex;
          console.log(`Sherman moved to q:${newHex.q}, r:${newHex.r}`);
          playSound(tankMoveSound, 0.4);
          moveSuccessful = true;
        }
      } else {
        console.warn("Sherman unit not found for movement.");
      }
      return newScenario;
    });
    return moveSuccessful;
  }, []);

  const handleReverseSherman = useCallback(() => {
    let moveSuccessful = false;
    setCurrentScenario(prevScenario => {
      if (!prevScenario) return null;

      const newScenario = JSON.parse(JSON.stringify(prevScenario));
      const shermanIndex = newScenario.units.findIndex(unit => unit.id.includes("sherman"));

      if (shermanIndex !== -1) {
        const sherman = newScenario.units[shermanIndex];
        const reverseRotation = (sherman.rotation + 180) % 360;
        const newHex = getNeighborHex(sherman.currentHex, reverseRotation);

        const isOccupied = newScenario.units.some(
          unit => unit.currentHex.q === newHex.q && unit.currentHex.r === newHex.r
        );

        const isOffMap = !newScenario.map.hexes.some(
          hex => hex.q === newHex.q && hex.r === newHex.r
        );

        if (isOccupied) {
          setNotification("You can't move to an occupied hex.");
        } else if (isOffMap) {
          setNotification("You can't move off the map.");
        } else {
          sherman.currentHex = newHex;
          console.log(`Sherman reversed to q:${newHex.q}, r:${newHex.r}`);
          playSound(tankMoveSound, 0.4);
          moveSuccessful = true;
        }
      } else {
        console.warn("Sherman unit not found for movement.");
      }
      return newScenario;
    });
    return moveSuccessful;
  }, []);

  const handleTurnSherman = useCallback((direction) => {
    setCurrentScenario(prevScenario => {
      if (!prevScenario) return null;

      const newScenario = JSON.parse(JSON.stringify(prevScenario));
      const shermanIndex = newScenario.units.findIndex(unit => unit.id.includes("sherman"));

      if (shermanIndex !== -1) {
        const sherman = newScenario.units[shermanIndex];
        
        // More robust rotation calculation
        let newRotation = sherman.rotation + direction;
        if (newRotation >= 360) {
          newRotation -= 360;
        } else if (newRotation < 0) {
          newRotation += 360;
        }

        sherman.rotation = newRotation;
        console.log(`Sherman turned to ${newRotation} degrees`);
      } else {
        console.warn("Sherman unit not found for turning.");
      }
      return newScenario;
    });
  }, []);

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

  if (!currentScenario) {
    return <div>Loading game...</div>;
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
          onUpdateUnit={handleUpdateUnit} // Pass update unit function
        />
      </div>
    </div>
  );
}

export default Game;
