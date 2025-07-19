// src/game/logic/combatUtils.js
import { getDistance } from './hexUtils';

/**
 * Calculates the "to-hit" number required for a successful shot.
 * @param {object} sherman The player's Sherman tank unit object.
 * @param {object} target The target unit object.
 * @param {Array} allHexes The array of all hexes on the map.
 * @returns {{toHit: number, breakdown: object}} An object containing the final to-hit number and a breakdown of the calculation.
 */
export function calculateToHitNumber(sherman, target, allHexes) {
  const distance = getDistance(sherman.currentHex, target.currentHex);
  const targetHex = allHexes.find(h => h.q === target.currentHex.q && h.r === target.currentHex.r);

  if (!targetHex) {
    // This should ideally not happen if the target is on the map
    return { toHit: 99, breakdown: { error: "Target hex not found" } };
  }

  // +1 if target is on a hex with a building
  const buildingBonus = targetHex.terrain.includes('buildings') ? 1 : 0;
  
  // +1 if target is on hex with smoke
  const smokeBonus = (targetHex.germanSmoke || targetHex.shermanSmoke) ? 1 : 0;
  
  // +2 if unit is hull down
  const hullDownBonus = target.hull_down ? 2 : 0;

  // +1 if target is SW, S, or SE of the Sherman
  const dq = target.currentHex.q - sherman.currentHex.q;
  const dr = target.currentHex.r - sherman.currentHex.r;
  // Simplified check for the southern arc based on axial coordinate differences
  const southernArcBonus = (dr < 0 || (dr === 0 && dq < 0)) ? 1 : 0;

  const toHit = distance + target.size + buildingBonus + smokeBonus + hullDownBonus + southernArcBonus;

  return {
    toHit,
    breakdown: {
      distance,
      size: target.size,
      building: buildingBonus,
      smoke: smokeBonus,
      hullDown: hullDownBonus,
      southernArc: southernArcBonus,
    }
  };
}

/**
 * Simulates rolling two 6-sided dice.
 * @returns {{total: number, rolls: Array<number>}} An object containing the total roll and an array of the individual dice results.
 */
export function roll2D6() {
  const die1 = Math.floor(Math.random() * 6) + 1;
  const die2 = Math.floor(Math.random() * 6) + 1;
  return { total: die1 + die2, rolls: [die1, die2] };
}
