// src/game/components/Hex/Hex.jsx
import React from 'react';
import styles from './Hex.module.css';
import { HEX_WIDTH, HEX_HEIGHT } from '../../logic/hexUtils';

// Dynamically import all terrain texture images from the specified folder
const terrainTextures = import.meta.glob('/src/assets/images/terrain/*.{png,jpg,jpeg,gif,webp}', { eager: true });

function Hex({ hexData, pixelX, pixelY }) {
  // Destructure 'rotation' from hexData (it will be undefined if not set in JSON)
  const { id, q, r, terrain, rotation } = hexData;

  // Construct the expected path key for the specific terrain texture
  // Assuming .png, adjust extension if your files are different (e.g., .jpg)
  const textureKey = `/src/assets/images/terrain/${terrain}.png`; 
  const textureSrc = terrainTextures[textureKey]?.default;

  const style = {
    left: `${pixelX - HEX_WIDTH / 2}px`,
    top: `${pixelY - HEX_HEIGHT / 2}px`,
    width: `${HEX_WIDTH}px`,
    height: `${HEX_HEIGHT}px`,
  };

  const hexInnerStyle = {
    backgroundImage: textureSrc ? `url(${textureSrc})` : 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  };

  // --- ADD THIS CONDITIONAL ROTATION LOGIC ---
  if (rotation !== undefined && rotation !== null) {
    hexInnerStyle.transform = `rotate(${rotation}deg)`;
    // Ensure the rotation origin is the center of the hexInner div
    hexInnerStyle.transformOrigin = 'center center'; 
  }

  return (
    <div
      className={styles.hex}
      style={style}
      data-id={id}
      data-q={q}
      data-r={r}
    >
      <div className={styles.hexInner} style={hexInnerStyle}>
        <span className={styles.hexCoords}>
          ({q}, {r})
        </span>
        {/* Removed: The text display for terrain is now replaced by the background image */}
      </div>
    </div>
  );
}

export default Hex;