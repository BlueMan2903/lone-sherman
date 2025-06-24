// src/game/Game.jsx
import React, { useState, useEffect } from 'react';
import HexGrid from './components/HexGrid/HexGrid';
import TankStatusDisplay from './components/TankStatusDisplay/TankStatusDisplay';
import TurnActions from './components/TurnActions/TurnActions';
import scenario1Data from '../data/scenarios/scenario1.json';
import styles from './Game.module.css';

function Game() {
  const [currentScenario, setCurrentScenario] = useState(null);
  const [activeUnit, setActiveUnit] = useState(null);

  useEffect(() => {
    setCurrentScenario(scenario1Data);
    if (scenario1Data.units && scenario1Data.units.length > 0) {
      setActiveUnit(scenario1Data.units[0]);
    }
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
      <div className={styles.mapArea}>
        <h2>Scenario: {currentScenario.name}</h2>
        <p>Objective: {currentScenario.objective}</p>
        {/* NEW: Wrapper div for HexGrid with explicit clipping */}
        <div style={{
            position: 'relative', /* Essential for containing HexGrid's absolute hexes */
            width: '100%', /* Ensures it takes the full width of mapArea's content */
            height: '100%', /* Ensures it takes the full height of mapArea's content */
            overflow: 'hidden', /* THIS IS THE KEY: It will clip any content that goes beyond its boundaries */
            display: 'flex', /* To allow centering of HexGrid within this wrapper */
            justifyContent: 'center', /* Center HexGrid horizontally */
            alignItems: 'flex-start', /* Align HexGrid to the top vertically within this wrapper */
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