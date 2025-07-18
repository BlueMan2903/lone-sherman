// src/game/components/HexGrid/HexGrid.jsx
import React from 'react';
import Hex from '../Hex/Hex';
import Unit from '../Unit/Unit'; // Import the Unit component
import styles from './HexGrid.module.css';
import { axialToPixel, HEX_WIDTH, HEX_HEIGHT } from '../../logic/hexUtils';

function HexGrid({ hexes, units, onUnitClick, isTargetingMode }) { // Added 'units' prop
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  // Create a quick lookup map for hex data by its q,r coordinates
  const hexMapByCoords = new Map();
  hexes.forEach(hex => {
    hexMapByCoords.set(`${hex.q},${hex.r}`, hex);
  });


  const renderedHexes = hexes.map(hex => {
    const { x, y } = axialToPixel(hex.q, hex.r);
    // Update min/max bounds based on the hex's full dimensions
    minX = Math.min(minX, x - HEX_WIDTH / 2);
    minY = Math.min(minY, y - HEX_HEIGHT / 2);
    maxX = Math.max(maxX, x + HEX_WIDTH / 2);
    maxY = Math.max(maxY, y + HEX_HEIGHT / 2);
    return { ...hex, pixelX: x, pixelY: y };
  });

  const width = maxX - minX;
  const height = maxY - minY;

  // Calculate offsets to normalize the top-left corner of the content to (0,0)
  const offsetX = -minX;
  const offsetY = -minY;

  const gridStyle = {
    width: `${width}px`,
    height: `${height}px`,
    // REMOVED: transform: `translate(${offsetX}px, ${offsetY}px)`,
    // This transform was double-offsetting the grid as hexes/units already use offsetX/offsetY
  };

  return (
    <div className={styles.hexGridContainer} style={gridStyle}>
      {/* Render Hexes */}
      {renderedHexes.map(hex => (
        <Hex
          key={hex.id}
          hexData={hex}
          pixelX={hex.pixelX + offsetX} // Apply offset for correct positioning within the container
          pixelY={hex.pixelY + offsetY} // Apply offset for correct positioning within the container
        />
      ))}

      {/* Render Units */}
      {units && units.map(unit => {
        const unitHexCoords = unit.currentHex;
        if (!unitHexCoords) return null; // Skip if no position

        // Find the hex's pixel coordinates
        // We need to find the *original* calculated pixelX, pixelY for this hex *before* global offset
        // This is a bit tricky because renderedHexes already applied the offset if we look it up there.
        // It's better to recalculate or find the un-offseted hex.
        const targetHex = renderedHexes.find(h => h.q === unitHexCoords.q && h.r === unitHexCoords.r);

        if (targetHex) {
          return (
            <Unit
              key={unit.id}
              unitData={unit}
              pixelX={targetHex.pixelX + offsetX} // Use the hex's final screen position
              pixelY={targetHex.pixelY + offsetY} // Use the hex's final screen position
              hexHeight={HEX_HEIGHT} // Pass hex dimension for relative sizing
              onClick={() => onUnitClick(unit)}
              isTargetingMode={isTargetingMode}
            />
          );
        }
        console.warn(`Could not find hex for unit ${unit.id} at q:${unitHexCoords.q}, r:${unitHexCoords.r}`);
        return null;
      })}
    </div>
  );
}

export default HexGrid;