// src/game/logic/hexUtils.js

const HEX_SIZE = 50; // Distance from center to vertex (outer radius)

const HEX_WIDTH = HEX_SIZE * 2; // Point-to-point horizontal distance
const HEX_HEIGHT = HEX_SIZE * Math.sqrt(3); // Flat-side to flat-side vertical distance

/**
 * Converts axial hex coordinates (q, r) to pixel screen coordinates (x, y).
 * This uses a standard flat-top axial grid system.
 * The Y-axis is inverted so positive 'r' moves the hex UP on the screen,
 * which matches a conventional Cartesian coordinate system for 'y'.
 *
 * @param {number} q Axial Q coordinate (column index)
 * @param {number} r Axial R coordinate (row index)
 * @returns {{x: number, y: number}} Pixel coordinates for the center of the hex.
 */
export function axialToPixel(q, r) {
  // X coordinate for flat-top axial:
  const x = q * (HEX_WIDTH * 0.75); // q * (HEX_SIZE * 1.5)

  // Y coordinate for flat-top axial:
  // Each r-step moves HEX_HEIGHT vertically.
  // Each q-step also has a vertical component of HEX_HEIGHT / 2.
  // We NEGATE the result to make positive 'r' values go UP on the screen.
  const y = -(r * HEX_HEIGHT + q * (HEX_HEIGHT / 2)); // Removed the odd-q offset logic

  return { x, y };
}

// Axial directions for flat-top hexes based on N=0 degrees (clockwise rotation)
export const ROTATION_N = 0;
export const ROTATION_NE = 60;
export const ROTATION_SE = 120;
export const ROTATION_S = 180;
export const ROTATION_SW = 240;
export const ROTATION_NW = 300;

// Axial directions for flat-top hexes based on N=0 degrees (clockwise rotation)
const AXIAL_DIRECTIONS = [
  { q: 0, r: 1 },   // N (0 degrees)
  { q: 1, r: 0 },   // NE (60 degrees)
  { q: 1, r: -1 },  // SE (120 degrees)
  { q: 0, r: -1 },  // S (180 degrees)
  { q: -1, r: 0 },  // SW (240 degrees)
  { q: -1, r: 1 }   // NW (300 degrees)
];

/**
 * Calculates the coordinates of a neighboring hex in a given direction.
 * @param {{q: number, r: number}} currentHex The axial coordinates of the current hex.
 * @param {number} rotationDegrees The rotation of the unit in degrees (0, 60, 120, 180, 240, 300).
 * @returns {{q: number, r: number}} The axial coordinates of the neighboring hex.
 */
export function getNeighborHex(currentHex, rotationDegrees) {
  // Normalize rotation to be within 0-300 and map to array index
  const normalizedRotation = (rotationDegrees % 360 + 360) % 360;
  const directionIndex = normalizedRotation / 60;

  const direction = AXIAL_DIRECTIONS[directionIndex];

  return {
    q: currentHex.q + direction.q,
    r: currentHex.r + direction.r
  };
}

export function getHexesInLine(startHex, rotationDegrees, allHexes) {
  const normalizedRotation = (rotationDegrees % 360 + 360) % 360;
  const directionIndex = normalizedRotation / 60;
  const direction = AXIAL_DIRECTIONS[directionIndex];
  const lineOfHexes = [];
  let currentHex = { ...startHex };

  while (true) {
    currentHex = {
      q: currentHex.q + direction.q,
      r: currentHex.r + direction.r
    };

    const hexExists = allHexes.some(h => h.q === currentHex.q && h.r === currentHex.r);
    if (!hexExists) {
      break; // Stop if we go off the map
    }

    lineOfHexes.push(currentHex);
  }

  return lineOfHexes;
}

// Export these for use in Hex.jsx to set element dimensions
export { HEX_WIDTH, HEX_HEIGHT };

export function getDistance(hexA, hexB) {
  const dq = hexA.q - hexB.q;
  const dr = hexA.r - hexB.r;
  const sA = -hexA.q - hexA.r;
  const sB = -hexB.q - hexB.r;
  const ds = sA - sB;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(ds)) / 2;
}

export function hasClearPath(startHex, endHex, allHexes) {
  // Determine the axial direction from startHex to endHex
  const dq = endHex.q - startHex.q;
  const dr = endHex.r - startHex.r;

  let directionIndex = -1;
  if (dq === 0 && dr > 0) directionIndex = 0; // N
  else if (dq > 0 && dr === 0) directionIndex = 1; // NE
  else if (dq > 0 && dr < 0 && dq === -dr) directionIndex = 2; // SE
  else if (dq === 0 && dr < 0) directionIndex = 3; // S
  else if (dq < 0 && dr === 0) directionIndex = 4; // SW
  else if (dq < 0 && dr > 0 && dq === -dr) directionIndex = 5; // NW

  if (directionIndex === -1) {
    return { blocked: true, blockingTerrain: 'Not a straight axial line' };
  }

  const line = getHexesInLine(startHex, directionIndex * 60, allHexes);

  // Find the index of the endHex in the line
  const endIndex = line.findIndex(hex => hex.q === endHex.q && hex.r === endHex.r);

  // If endHex is not found in the line, or it's the start hex itself, it's not a valid straight line target
  if (endIndex === -1 || endIndex === 0) {
    return { blocked: true, blockingTerrain: 'Not a straight axial line' };
  }

  for (let i = 1; i < endIndex; i++) { // Iterate only through intervening hexes
    const hexOnLine = line[i];
    const hexData = allHexes.find(h => h.q === hexOnLine.q && h.r === hexOnLine.r);
    if (hexData) {
      if (hexData.terrain === 'forest' || hexData.terrain.includes('buildings')) {
        return { blocked: true, blockingTerrain: hexData.terrain };
      }
    }
  }
  return { blocked: false };
}

export function getFiringArcHexes(shermanHex, shermanRotation, allHexes) {
  const firingArcHexes = new Set();

  // Get hexes in line for the current facing
  const currentFacingHexes = getHexesInLine(shermanHex, shermanRotation, allHexes);
  currentFacingHexes.forEach(hex => firingArcHexes.add(`${hex.q},${hex.r}`));

  // Get hexes in line for the left adjacent facing
  const leftRotation = (shermanRotation - 60 + 360) % 360;
  const leftFacingHexes = getHexesInLine(shermanHex, leftRotation, allHexes);
  leftFacingHexes.forEach(hex => firingArcHexes.add(`${hex.q},${hex.r}`));

  // Get hexes in line for the right adjacent facing
  const rightRotation = (shermanRotation + 60) % 360;
  const rightFacingHexes = getHexesInLine(shermanHex, rightRotation, allHexes);
  rightFacingHexes.forEach(hex => firingArcHexes.add(`${hex.q},${hex.r}`));

  // Convert Set back to array of hex objects
  return Array.from(firingArcHexes).map(coord => {
    const [q, r] = coord.split(',').map(Number);
    return { q, r };
  });
}