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

// Export these for use in Hex.jsx to set element dimensions
export { HEX_WIDTH, HEX_HEIGHT };