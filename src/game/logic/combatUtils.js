// src/game/logic/combatUtils.js
import { getDistance, getAngleOfAttack } from './hexUtils';

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

/**
 * Simulates rolling one 6-sided die.
 * @returns {number} The result of the die roll.
 */
export function roll1D6() {
    return Math.floor(Math.random() * 6) + 1;
}

/**
 * Determines the damage inflicted on a target after a successful hit.
 * @param {object} sherman The attacking Sherman unit.
 * @param {object} target The defending unit that was hit.
 * @returns {object} An object detailing the damage calculation and result.
 */
export function calculateDamage(sherman, target) {
    // Angle from the attacker TO the defender
    const angleOfAttack = getAngleOfAttack(sherman.currentHex, target.currentHex);
    
    // To determine which side is hit, we need the angle FROM the target back to the attacker.
    // This is the reverse of the angle of attack.
    const angleShotCameFrom = (angleOfAttack + 180) % 360;

    const targetRotation = target.rotation;

    // Determine the relative angle of the hit compared to the target's facing direction.
    // A result of 0 means the shot came from directly in front of the target.
    let relativeAngle = (angleShotCameFrom - targetRotation + 360) % 360;

    let armorSide = 'front'; // Default for 330-30 degree arc

    if (relativeAngle > 30 && relativeAngle <= 90) {
        armorSide = 'front_side';
    } else if (relativeAngle > 90 && relativeAngle <= 150) {
        armorSide = 'rear_side';
    } else if (relativeAngle > 150 && relativeAngle <= 210) {
        armorSide = 'rear';
    } else if (relativeAngle > 210 && relativeAngle <= 270) {
        armorSide = 'rear_side';
    } else if (relativeAngle > 270 && relativeAngle <= 330) {
        armorSide = 'front_side';
    }

    const armorValue = target.armor_values[armorSide];
    const penetrationScoreNeeded = armorValue - sherman.armor_pen;
    const penetrationRoll = roll1D6();
    const isPenetration = penetrationRoll >= penetrationScoreNeeded;
    let damageResult = {};
    let damageRollValue = null;

    if (isPenetration) {
        damageRollValue = roll1D6();
        if (damageRollValue <= 4) {
            if (target.damaged) {
                damageResult = { destroyed: true };
            } else {
                damageResult = { damaged: true };
            }
        } else {
            damageResult = { destroyed: true };
        }
    }

    return {
        penetrated: isPenetration,
        roll: penetrationRoll,
        scoreNeeded: penetrationScoreNeeded,
        armorSide: armorSide,
        armorValue: armorValue,
        damage: damageResult,
        damageRoll: damageRollValue
    };
}
