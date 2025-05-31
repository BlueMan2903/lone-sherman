import React from 'react';
import styles from './Hex.module.css';
import { HEX_WIDTH, HEX_HEIGHT } from '../../logic/hexUtils'; // Import constants

function Hex({ hexData, pixelX, pixelY }) {
  const { id, q, r, terrain } = hexData;

  // We position the hex's top-left corner using pixelX, pixelY
  // We also account for the hex's own width/height to center it relative to pixelX, pixelY
  // For absolute positioning, left/top refer to the element's top-left corner.
  // The pixelX, pixelY from axialToPixel are for the *center* of the hex.
  // So, subtract half the hex's width/height to get the top-left.
  const style = {
    left: `${pixelX - HEX_WIDTH / 2}px`,
    top: `${pixelY - HEX_HEIGHT / 2}px`,
    width: `${HEX_WIDTH}px`,
    height: `${HEX_HEIGHT}px`,
    // Add terrain class dynamically
    // className: `${styles.hex} ${styles[terrain]}` would be better once you have terrain styles
  };

  return (
    <div
      className={styles.hex}
      style={style}
      data-id={id}
      data-q={q}
      data-r={r}
    >
      <div className={styles.hexInner}>
        {/* Display coordinates for debugging */}
        <span className={styles.hexCoords}>
          ({q}, {r})
        </span>
        <span className={styles.hexTerrain}>{terrain}</span>
      </div>
    </div>
  );
}

export default Hex;