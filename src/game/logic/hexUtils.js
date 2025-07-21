// src/game/logic/hexUtils.js

const HEX_SIZE = 55; // Distance from center to vertex (outer radius)

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

export function getDistance(hexA, hexB) {
  const dq = hexA.q - hexB.q;
  const dr = hexA.r - hexB.r;
  const sA = -hexA.q - hexA.r;
  const sB = -hexB.q - hexB.r;
  const ds = sA - sB;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(ds)) / 2;
}

// Helper for linear interpolation
function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Helper for hex interpolation
function hex_lerp(a, b, t) {
  return {
    q: lerp(a.q, b.q, t),
    r: lerp(a.r, b.r, t),
    s: lerp(-a.q - a.r, -b.q - b.r, t)
  };
}

// Helper to round floating point hex coordinates to the nearest integer hex
function hex_round(hex) {
  let rq = Math.round(hex.q);
  let rr = Math.round(hex.r);
  let rs = Math.round(-rq - rr);

  let q_diff = Math.abs(rq - hex.q);
  let r_diff = Math.abs(rr - hex.r);
  let s_diff = Math.abs(rs - hex.s);

  if (q_diff > r_diff && q_diff > s_diff) {
    rq = -rr - rs;
  } else if (r_diff > s_diff) {
    rr = -rq - rs;
  } else {
    rs = -rq - rr;
  }

  return { q: rq, r: rr };
}

export function getHexesInLine(hexA, hexB) {
  const N = getDistance(hexA, hexB); // Number of steps
  const results = [];
  // Add a small epsilon to avoid floating point issues at the end point
  const epsilon = 1e-6;
  for (let i = 0; i <= N; i++) {
    const hex = hex_round(hex_lerp(hexA, hexB, (1.0 / N * i) + epsilon * (i / N)));
    results.push(hex);
  }
  return results;
}

export function getHexesInAxialLine(startHex, directionDegrees, allHexes) {
  const normalizedRotation = (directionDegrees % 360 + 360) % 360;
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

export function hasClearPath(startHex, endHex, allHexes) {
  const line = getHexesInLine(startHex, endHex);

  // Iterate through all hexes on the line, excluding the start and end hexes
  for (let i = 1; i < line.length - 1; i++) {
    const hexOnLine = line[i];
    const hexData = allHexes.find(h => h.q === hexOnLine.q && h.r === hexOnLine.r);
    
    // If a hex on the line is not found in allHexes, it means the line goes off map
    // or there's an issue with hex generation, but for LOS, we only care about existing hexes.
    if (hexData) {
      if (hexData.terrain === 'forest' || hexData.terrain.includes('buildings')) {
        return { blocked: true, blockingTerrain: hexData.terrain };
      }
    }
  }
  return { blocked: false };
}

export function getFiringArcHexes(shermanHex, allHexes) {
  const firingArcHexes = new Set();

  // Iterate through all 6 axial directions
  for (let i = 0; i < AXIAL_DIRECTIONS.length; i++) {
    const directionDegrees = i * 60;
    const hexesInDirection = getHexesInAxialLine(shermanHex, directionDegrees, allHexes);
    hexesInDirection.forEach(hex => firingArcHexes.add(`${hex.q},${hex.r}`));
  }

  // Convert Set back to array of hex objects
  return Array.from(firingArcHexes).map(coord => {
    const [q, r] = coord.split(',').map(Number);
    return { q, r };
  });
}

export function getAngleOfAttack(attackerHex, defenderHex) {
  const dy = (defenderHex.q - attackerHex.q) * 1.5;
  const dx = (defenderHex.r - attackerHex.r) * Math.sqrt(3) + (defenderHex.q - attackerHex.q) * Math.sqrt(3) / 2;
  
  const angleRad = Math.atan2(dx, dy);
  let degrees = angleRad * (180 / Math.PI);
  
  if (degrees < 0) {
    degrees += 360;
  }

  // Snap to the nearest 60-degree increment
  const snappedDegrees = Math.round(degrees / 60) * 60;

  return snappedDegrees % 360;
}
