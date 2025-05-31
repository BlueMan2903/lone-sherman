import React from 'react';
import styles from './Unit.module.css';

// Dynamically import unit sprites from the assets folder
// This uses Vite's glob import feature.
// Adjust the path if your assets/images/units structure is different.
const unitSprites = import.meta.glob('/src/assets/images/units/*.png', { eager: true });

function Unit({ unitData, pixelX, pixelY, hexHeight }) {
  if (!unitData || !unitData.sprite) {
    return null; // Don't render if no sprite info
  }

  const spriteFileName = unitData.sprite;
  // Construct the full path key for the glob import
  const spritePathKey = `/src/assets/images/units/${spriteFileName}`;
  const spriteSrc = unitSprites[spritePathKey]?.default;

  if (!spriteSrc) {
    console.warn(`Sprite not found for: ${spriteFileName}`);
    return <div style={{ position: 'absolute', left: pixelX, top: pixelY, color: 'red' }}>?</div>;
  }

  // Define the size of the unit relative to the hex height (or a fixed size)
  // Let's make it about 70-80% of the hex height for a flat-top hex
  // For pointy-top, you might use hexWidth.
  const unitSize = hexHeight * 1; // Adjust this multiplier as needed

  const style = {
    left: `${pixelX - unitSize / 2}px`, // Center horizontally
    top: `${pixelY - unitSize / 2}px`,  // Center vertically
    width: `${unitSize}px`,
    height: `${unitSize}px`,
  };

  return (
    <div className={styles.unitContainer} style={style}>
      <img src={spriteSrc} alt={unitData.type} className={styles.unitImage} />
      {/* You could add HP bars or other indicators here later */}
    </div>
  );
}

export default Unit;