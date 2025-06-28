// src/App.jsx
import React from 'react';
import './App.css'; // Keep if you have other global App styles
import Game from './game/Game'; // Import the Game component
import IntroModal from './game/components/IntroModal/IntroModal'; // <--- NEW: Import IntroModal

function App() {
  return (
    <div className="App">
      <Game /> {/* Render the main Game component here */}
      <IntroModal /> {/* <--- NEW: Render the IntroModal here */}
    </div>
  );
}

export default App;