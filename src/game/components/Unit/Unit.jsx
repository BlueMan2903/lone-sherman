// src/game/components/Unit/Unit.jsx
import React, { useEffect, useRef, useState } from 'react';
import styles from './Unit.module.css';
import tankExplosionGif from '../../../assets/vfx/tank_explosion.gif'; // Import the explosion GIF
import fireGif from '../../../assets/vfx/fire.gif'; // Import the fire GIF

// Dynamically import unit sprites from the assets folder
// This uses Vite's glob import feature.
// Adjust the path if your assets/images/units structure is different.
const unitSprites = import.meta.glob('/src/assets/images/units/*.png', { eager: true });

function Unit({ unitData, pixelX, pixelY, hexHeight, onClick, isTargetingMode }) {
  // Destructure 'rotation' from unitData
  const { sprite, rotation, destroyed, damaged } = unitData;
  const imageRef = useRef(null);
  const rotationRef = useRef(rotation); // Initialize with the initial rotation
  const [currentVfx, setCurrentVfx] = useState(null); // State to manage current VFX GIF

  useEffect(() => {
    if (destroyed) {
      setCurrentVfx(tankExplosionGif);
      const explosionDuration = 1000; // 1 second for explosion GIF, adjust if needed
      const timer = setTimeout(() => {
        setCurrentVfx(fireGif);
      }, explosionDuration);

      return () => clearTimeout(timer);
    } else {
      setCurrentVfx(null); // Reset VFX if not destroyed
    }
  }, [destroyed]);

  useEffect(() => {
    if (imageRef.current && rotation !== undefined && rotation !== null) {
      let currentVisualRotation = rotationRef.current % 360;
      if (currentVisualRotation < 0) currentVisualRotation += 360; // Ensure positive modulo

      let targetRotation = rotation;

      let diff = targetRotation - currentVisualRotation;

      // Normalize diff to be within -180 to 180 degrees for shortest path
      if (diff > 180) {
        diff -= 360;
      } else if (diff < -180) {
        diff += 360;
      }

      rotationRef.current += diff;
      imageRef.current.style.setProperty('--rotation-angle', `${rotationRef.current}deg`);
    }
  }, [rotation]);

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
    // Ensure the rotation origin is the center of the unit image
    transformOrigin: 'center center',
  };

  const isEnemy = unitData.faction === 'axis';
  const canBeTargeted = isTargetingMode && isEnemy;

  return (
    <div
      className={`${styles.unitContainer} ${canBeTargeted ? styles.targeting : ''} ${destroyed ? styles.destroyed : ''} ${damaged && !destroyed ? styles.damaged : ''}`}
      style={containerStyle}
      onClick={canBeTargeted ? onClick : undefined}
    >
      <img
        ref={imageRef}
        src={spriteSrc}
        alt={unitData.name || 'Unit'} // Use unitData.name for alt text
        className={styles.unitImage}
        style={{ transformOrigin: 'center center' }} // Apply transform-origin here
      />
      {destroyed && currentVfx && <div className={styles.explosionEffect} style={{ backgroundImage: `url(${currentVfx})` }}></div>}
      {damaged && !destroyed && <div className={styles.damagedEffect}></div>}
    </div>
  );
}

export default Unit;