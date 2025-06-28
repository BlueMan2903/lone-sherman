// src/game/Game.jsx
import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    // Create a deep mutable copy of the scenario data to work with
    const scenario = JSON.parse(JSON.stringify(scenario1Data));

    let allUnits = [...(scenario.units || [])]; // Start with fixed units

    // Process dynamic spawns
    if (scenario.dynamicSpawns && scenario.unitTemplates) {
      scenario.dynamicSpawns.forEach(spawnInstruction => {
        const template = scenario.unitTemplates.find(t => t.id === spawnInstruction.templateId);

        if (template) {
          const randomSpawnHexes = selectRandomUniqueElements(spawnInstruction.possibleHexes, spawnInstruction.count);

          randomSpawnHexes.forEach((hex, index) => {
            const newUnit = {
              ...template,
              id: `${template.id}-${Math.random().toString(36).substr(2, 9)}`, // Unique ID for each spawned unit
              currentHex: { q: hex.q, r: hex.r }, // Store only q, r for currentHex
              rotation: hex.rotation || 0 // NEW: Assign rotation from the hex, default to 0 if not provided
            };
            allUnits.push(newUnit);
          });
        } else {
          console.warn(`Template with ID '${spawnInstruction.templateId}' not found for dynamic spawn.`);
        }
      });
    }

    // Update the scenario's units with all (fixed + dynamically spawned) units
    scenario.units = allUnits;

    setCurrentScenario(scenario);

    // Set the Sherman as the active unit (assuming it's unit-sherman-1)
    const shermanUnit = scenario.units.find(unit => unit.id === "unit-sherman-1");
    if (shermanUnit) {
      setActiveUnit(shermanUnit);
    } else if (scenario.units && scenario.units.length > 0) {
      // Fallback: if Sherman not found, set the first available unit as active
      setActiveUnit(scenario.units[0]);
    }

  }, []); // Empty dependency array ensures this runs once on mount

  // Placeholder action handlers
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
      <div className={styles.mapArea}>
        <h2>Scenario: {currentScenario.name}</h2>
        <p>Objective: {currentScenario.objective}</p>
        <div style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            overflow: 'hidden',
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

      <div className={styles.sidebar}>
        <TankStatusDisplay unit={activeUnit} />
        <TurnActions onManeuver={handleManeuver} onAttack={handleAttack} />
      </div>
    </div>
  );
}

export default Game;