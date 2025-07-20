// src/game/logic/audioManager.js

// Create a single AudioContext to be reused.
let audioContext;
const audioBufferCache = new Map();

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

async function loadSound(url) {
  const context = getAudioContext();

  // Return from cache if available
  if (audioBufferCache.has(url)) {
    return audioBufferCache.get(url);
  }

  // Fetch and decode the audio file
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = await context.decodeAudioData(arrayBuffer);

  // Cache the buffer for future use
  audioBufferCache.set(url, audioBuffer);
  return audioBuffer;
}

export async function playSound(url, volume = 1.0) { // Add volume parameter with a default of 1.0
  try {
    const context = getAudioContext();
    if (context.state === 'suspended') {
      await context.resume();
    }

    const buffer = await loadSound(url);
    const source = context.createBufferSource();
    const gainNode = context.createGain(); // Create a GainNode

    source.buffer = buffer;
    source.connect(gainNode); // Connect source to GainNode
    gainNode.connect(context.destination); // Connect GainNode to destination

    gainNode.gain.value = volume; // Set the volume

    source.start(0); // Play immediately
  } catch (error) {
    console.error(`Error playing sound ${url}:`, error);
    // Fallback for browsers that might have issues with Web Audio API
    const audio = new Audio(url);
    audio.volume = volume; // Set volume on fallback too
    audio.play();
  }
}
