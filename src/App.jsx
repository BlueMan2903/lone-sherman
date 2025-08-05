// src/App.jsx
import React, { useState } from 'react';
import './App.css';
import Game from './game/Game';
import IntroModal from './game/components/IntroModal/IntroModal';
import WelcomeModal from './game/components/WelcomeModal/WelcomeModal'; // NEW: Import WelcomeModal
import { playSound } from './game/logic/audioManager';
import soundtrack from './assets/sounds/soundtrack.mp3';

function App() {
  const [showWelcomeModal, setShowWelcomeModal] = useState(true);
  const [showIntroModal, setShowIntroModal] = useState(false);

  const handlePlayClick = () => {
    setShowWelcomeModal(false);
    setShowIntroModal(true);
    playSound(soundtrack, 0.1, true);
  };

  const handleGoClick = () => {
    setShowIntroModal(false);
  };

  return (
    <div className="App">
      <Game />
      {showWelcomeModal && <WelcomeModal onPlayClick={handlePlayClick} />}
      {showIntroModal && <IntroModal onGoClick={handleGoClick} />}
    </div>
  );
}

export default App;