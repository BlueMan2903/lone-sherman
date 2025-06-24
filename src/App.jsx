// src/App.jsx
import React from 'react';
import './App.css'; // Keep if you have other global App styles, otherwise remove
import Game from './game/Game'; // Import the Game component

function App() {
  return (
    <div className="App">
      {/* Removed the h1 here to give Game full control over layout */}
      <Game /> {/* Render the main Game component here */}
    </div>
  );
}

export default App;