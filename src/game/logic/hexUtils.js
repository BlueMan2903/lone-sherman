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