import React, { useState, useEffect } from 'react';
import HexGrid from './components/HexGrid/HexGrid';
import TankStatusDisplay from './components/TankStatusDisplay/TankStatusDisplay';
import scenario1Data from '../data/scenarios/scenario1.json';

function Game() {
  const [currentScenario, setCurrentScenario] = useState(null);
  const [playerTank, setPlayerTank] = useState(null);

  useEffect(() => {
    setCurrentScenario(scenario1Data);
    if (scenario1Data && scenario1Data.units && scenario1Data.units.length > 0) {
      setPlayerTank(scenario1Data.units[0]);
    }
  }, []);

  if (!currentScenario || !playerTank) {
    return <div>Loading game...</div>;
  }

  return (
    <div className="game-container">
      <h2>Scenario: {currentScenario.name}</h2>
      <p>Objective: {currentScenario.objective}</p>

      {/* NEW: Wrapper for the map and stats to enable side-by-side layout */}
      <div className="game-content-layout">
        <HexGrid
          hexes={currentScenario.map.hexes}
          units={currentScenario.units || []}
        />
        <TankStatusDisplay unit={playerTank} />
      </div>
      
      {/* Other game UI elements will go here */}
    </div>
  );
}

export default Game;