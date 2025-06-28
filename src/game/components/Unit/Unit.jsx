// src/game/components/Unit/Unit.jsx
import React from 'react';
import styles from './Unit.module.css';

// Dynamically import unit sprites from the assets folder
// This uses Vite's glob import feature.
// Adjust the path if your assets/images/units structure is different.
const unitSprites = import.meta.glob('/src/assets/images/units/*.png', { eager: true });

function Unit({ unitData, pixelX, pixelY, hexHeight }) {
  // Destructure 'rotation' from unitData
  const { sprite, rotation } = unitData; // <-- UPDATED LINE: Added rotation

  if (!unitData || !sprite) { // Changed unitData.sprite to sprite directly
    return null; // Don't render if no sprite info
  }

  const spriteFileName = sprite; // Changed unitData.sprite to sprite directly
  // Construct the full path key for the glob import
  const spritePathKey = `/src/assets/images/units/${spriteFileName}`;
  const spriteSrc = unitSprites[spritePathKey]?.default;

  if (!spriteSrc) {
    console.warn(`Sprite not found for: ${spriteFileName}`);
    return <div style={{ position: 'absolute', left: pixelX, top: pixelY, color: 'red' }}>?</div>;
  }

  // Define the size of the unit relative to the hex height (or a fixed size)
  const unitSize = hexHeight * 1; // Adjust this multiplier as needed

  const containerStyle = { // Renamed 'style' to 'containerStyle' for clarity
    left: `${pixelX - unitSize / 2}px`, // Center horizontally
    top: `${pixelY - unitSize / 2}px`,  // Center vertically
    width: `${unitSize}px`,
    height: `${unitSize}px`,
  };

  const imageStyle = {
    // Add transform for rotation if 'rotation' is defined
    transform: rotation !== undefined && rotation !== null ? `rotate(${rotation}deg)` : 'none',
    // Ensure the rotation origin is the center of the unit image
    transformOrigin: 'center center',
  };

  return (
    <div className={styles.unitContainer} style={containerStyle}>
      <img
        src={spriteSrc}
        alt={unitData.name || 'Unit'} // Use unitData.name for alt text
        className={styles.unitImage}
        style={imageStyle} // Apply the new imageStyle here
      />
    </div>
  );
}

export default Unit;