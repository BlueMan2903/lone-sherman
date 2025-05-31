import React from 'react';
import Hex from '../Hex/Hex';
import Unit from '../Unit/Unit'; // Import the Unit component
import styles from './HexGrid.module.css';
import { axialToPixel, HEX_WIDTH, HEX_HEIGHT } from '../../logic/hexUtils';

// Make sure HEX_HEIGHT is exported from hexUtils if you use it for unit sizing.
// If your hexUtils exports HEX_SIZE, you might derive HEX_HEIGHT differently
// depending on flat-top or pointy-top.
// For the provided hexUtils (flat-top axial where HEX_SIZE is outer radius):
// const actualHexHeight = HEX_SIZE * Math.sqrt(3);

function HexGrid({ hexes, units }) { // Added 'units' prop
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  // Create a quick lookup map for hex data by its q,r coordinates
  const hexMapByCoords = new Map();
  hexes.forEach(hex => {
    hexMapByCoords.set(`${hex.q},${hex.r}`, hex);
  });


  const renderedHexes = hexes.map(hex => {
    const { x, y } = axialToPixel(hex.q, hex.r);
    minX = Math.min(minX, x - HEX_WIDTH / 2);
    minY = Math.min(minY, y - HEX_HEIGHT / 2);
    maxX = Math.max(maxX, x + HEX_WIDTH / 2);
    maxY = Math.max(maxY, y + HEX_HEIGHT / 2);
    return { ...hex, pixelX: x, pixelY: y, id: hex.id || `hex-${hex.q}-${hex.r}` }; // Ensure ID
  });

  const gridWidth = maxX - minX;
  const gridHeight = maxY - minY;
  const offsetX = -minX;
  const offsetY = -minY;

  const gridStyle = {
    width: `${gridWidth}px`,
    height: `${gridHeight}px`,
    padding: `${Math.max(HEX_WIDTH, HEX_HEIGHT) * 0.1}px`,
    boxSizing: 'content-box',
  };

  return (
    <div className={styles.hexGridContainer} style={gridStyle}>
      {/* Render Hexes */}
      {renderedHexes.map(hex => (
        <Hex
          key={hex.id}
          hexData={hex}
          pixelX={hex.pixelX + offsetX}
          pixelY={hex.pixelY + offsetY}
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