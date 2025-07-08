// src/game/Game.jsx
import React, { useState, useEffect, useCallback } from 'react';
import HexGrid from './components/HexGrid/HexGrid';
import TankStatusDisplay from './components/TankStatusDisplay/TankStatusDisplay';
import TurnActions from './components/TurnActions/TurnActions';
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
  const [activeUnit, setActiveUnit] = useState(null);
  const [turnNumber, setTurnNumber] = useState(1);

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
              rotation: hex.rotation || 0
            };
            allUnits.push(newUnit);
          });
        } else {
          console.warn(`Template with ID '${spawnInstruction.templateId}' not found for dynamic spawn.`);
        }
      });
    }
    scenario.units = allUnits;
    return scenario;
  }, []);

  useEffect(() => {
    const initialScenario = initializeScenarioUnits();
    setCurrentScenario(initialScenario);

    const shermanUnit = initialScenario.units.find(unit => unit.id === "unit-sherman-1");
    if (shermanUnit) {
      setActiveUnit(shermanUnit);
    } else if (initialScenario.units && initialScenario.units.length > 0) {
      setActiveUnit(initialScenario.units[0]);
    }
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
      const shermanIndex = newScenario.units.findIndex(unit => unit.id === "unit-sherman-1");

      if (shermanIndex !== -1) {
        newScenario.units[shermanIndex].crew.commander = position;
        setActiveUnit(newScenario.units[shermanIndex]);
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

  if (!currentScenario) {
    return <div>Loading game...</div>;
  }

  return (
    <div className={styles.gameContainer}>
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
            <p>{currentScenario.objective}</p>
          </div>
          <div className={styles.infoCard}>
            <h2>Turn</h2>
            <p className={styles.turnCounter}>{turnNumber}</p>
          </div>
        </div>
      </div>

      {/* Middle Section: Map Area */}
      <div className={styles.mapArea}>
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
          />
        </div>
      </div>

      {/* Right Section: Sidebar */}
      <div className={styles.sidebar}>
        <TankStatusDisplay unit={activeUnit} />
        <TurnActions
          onManeuver={handleManeuver}
          onAttack={handleAttack}
          onStartTurnLogic={handleStartTurnLogic}
          onCommanderDecision={handleCommanderDecision}
        />
      </div>
    </div>
  );
}

export default Game;