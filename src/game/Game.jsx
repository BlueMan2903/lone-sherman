import React, { useState, useEffect } from 'react';
import HexGrid from './components/HexGrid/HexGrid';
import scenario1Data from '../data/scenarios/scenario1.json';

function Game() {
  const [currentScenario, setCurrentScenario] = useState(null);

  useEffect(() => {
    setCurrentScenario(scenario1Data);
  }, []);

  if (!currentScenario) {
    return <div>Loading game...</div>;
  }

  return (
    <div className="game-container">
      <h2>Scenario: {currentScenario.name}</h2>
      <p>Objective: {currentScenario.objective}</p>
      <HexGrid
        hexes={currentScenario.map.hexes}
        units={currentScenario.units || []} // Pass the units array, default to empty
      />
    </div>
  );
}

export default Game;