import React from 'react';
import './App.css'; // Keep or remove, depending on if you have global app styles
import Game from './game/Game'; // Import the Game component

function App() {
  return (
    <div className="App">
      <h1>Lone Sherman: The Board Game</h1>
      <Game /> {/* Render the main Game component here */}
    </div>
  );
}

export default App;