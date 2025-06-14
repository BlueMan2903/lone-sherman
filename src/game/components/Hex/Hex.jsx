import React from 'react';
import styles from './Hex.module.css';
import { HEX_WIDTH, HEX_HEIGHT } from '../../logic/hexUtils';

// Dynamically import all terrain texture images from the specified folder
// The key for each image will be its full path, e.g., '/src/assets/images/terrain/clear.png'
const terrainTextures = import.meta.glob('/src/assets/images/terrain/*.{png,jpg,jpeg,gif,webp}', { eager: true });

function Hex({ hexData, pixelX, pixelY }) {
  const { id, q, r, terrain } = hexData;

  // Construct the expected path key for the specific terrain texture
  // Assuming your texture files are named e.g., 'clear.png', 'forest.png'
  const textureKey = `/src/assets/images/terrain/${terrain}.png`; 
  const textureSrc = terrainTextures[textureKey]?.default; // Get the URL for the texture

  const style = {
    left: `${pixelX - HEX_WIDTH / 2}px`,
    top: `${pixelY - HEX_HEIGHT / 2}px`,
    width: `${HEX_WIDTH}px`,
    height: `${HEX_HEIGHT}px`,
  };

  // Apply the texture as a background image to the hexInner div
  // This ensures the texture is behind the coordinates and units
  const hexInnerStyle = {
    backgroundImage: textureSrc ? `url(${textureSrc})` : 'none', // Use the loaded texture URL
    backgroundSize: 'cover', // Cover the entire area of the hexInner div
    backgroundPosition: 'center', // Center the background image
    backgroundRepeat: 'no-repeat', // Prevent repeating the image
  };

  return (
    <div
      className={styles.hex}
      style={style}
      data-id={id}
      data-q={q}
      data-r={r}
    >
      {/* Apply texture to hexInner to ensure it's behind text/units */}
      <div className={styles.hexInner} style={hexInnerStyle}>
        {/* Display coordinates for debugging */}
        <span className={styles.hexCoords}>
          ({q}, {r})
        </span>
        {/* REMOVED: The text display for terrain is now replaced by the background image */}
        {/* <span className={styles.hexTerrain}>{terrain}</span> */}
      </div>
    </div>
  );
}

export default Hex;