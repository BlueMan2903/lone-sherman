// src/game/components/HexGrid/HexGrid.jsx
import React from 'react';
import Hex from '../Hex/Hex';
import Unit from '../Unit/Unit';
import styles from './HexGrid.module.css';
import { axialToPixel, HEX_WIDTH, HEX_HEIGHT } from '../../logic/hexUtils';

function HexGrid({ hexes, units, onUnitClick, isTargetingMode, bouncingUnitId, hitUnitId, smokingUnitId }) { // Added smokingUnitId
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

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
    return { ...hex, pixelX: x, pixelY: y };
  });

  const width = maxX - minX;
  const height = maxY - minY;
  const offsetX = -minX;
  const offsetY = -minY;

  const gridStyle = {
    width: `${width}px`,
    height: `${height}px`,
  };

  return (
    <div className={styles.hexGridContainer} style={gridStyle}>
      {renderedHexes.map(hex => (
        <Hex
          key={hex.id}
          hexData={hex}
          pixelX={hex.pixelX + offsetX}
          pixelY={hex.pixelY + offsetY}
          isHullDown={units.some(unit => unit.currentHex.q === hex.q && unit.currentHex.r === hex.r && unit.hull_down)}
        />
      ))}

      {units && units.map(unit => {
        const unitHexCoords = unit.currentHex;
        if (!unitHexCoords) return null;

        const targetHex = renderedHexes.find(h => h.q === unitHexCoords.q && h.r === unitHexCoords.r);

        if (targetHex) {
          return (
            <Unit
              key={unit.id}
              unitData={unit}
              pixelX={targetHex.pixelX + offsetX}
              pixelY={targetHex.pixelY + offsetY}
              hexHeight={HEX_HEIGHT}
              onClick={() => onUnitClick(unit)}
              isTargetingMode={isTargetingMode}
              isBouncing={bouncingUnitId === unit.id}
              isHit={hitUnitId === unit.id} // Pass isHit prop
              isSmoking={smokingUnitId === unit.id} // Pass isSmoking prop
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
