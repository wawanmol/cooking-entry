// Dapur Kilat — all tunable numbers, the menu, and the kitchen floor plan.
// One job: describe the game. Nothing here moves, draws, or listens.

export const VIEW_W = 1280;
export const VIEW_H = 800;
export const BOARD_H = 96; // order board strip across the top
export const DAY_LENGTH = 180; // one shift, in seconds
export const PLAYER_SPEED = 255;
export const PLAYER_RADIUS = 20;
export const INTERACT_DIST = 48; // how close the chef must stand to use a station
export const CHOP_TIME = 1.4; // seconds of chopping at a board
export const COOK_TIME = 4.5; // seconds on a burner before a dish is cooked
export const BURN_GRACE = 9; // seconds a cooked item survives on the burner
export const MAX_HEARTS = 3;
export const MAX_ORDERS = 4;
export const RUSH_EVERY = 70; // seconds between service rushes
export const RUSH_ORDERS = 2; // extra tickets a rush drops at once

// Warm warung palette: terracotta floor, cream walls, dark wood counters.
export const PALETTE = {
  floorA: '#c98a5a',
  floorB: '#bd7f50',
  wall: '#f3e2c2',
  wallTrim: '#a4552f',
  wood: '#7a4a26',
  woodDark: '#5d371c',
  woodLight: '#96683c',
  steel: '#9aa3ab',
  steelDark: '#6e767e',
  cream: '#fff6e3',
  ink: '#2e1d12',
  red: '#c0392b',
  green: '#2e7d32',
  gold: '#f2b705',
  ticket: '#fff8e6',
};

// An ingredient knows what it needs before it can go on a plate.
export const INGREDIENTS = {
  rice: { name: 'Nasi', short: 'Nasi', chop: false, cook: true, color: '#f6efdc', dark: '#d9cba6' },
  noodle: { name: 'Mie', short: 'Mie', chop: false, cook: true, color: '#f2c14e', dark: '#c98f1b' },
  chicken: { name: 'Ayam', short: 'Ayam', chop: true, cook: true, color: '#e8a87c', dark: '#b96f3e' },
  egg: { name: 'Telur', short: 'Telur', chop: false, cook: true, color: '#fdf3d0', dark: '#e8b64c' },
  chili: { name: 'Cabai', short: 'Cabai', chop: true, cook: false, color: '#d7263d', dark: '#8f1d2c' },
  greens: { name: 'Sayur', short: 'Sayur', chop: true, cook: false, color: '#4caf50', dark: '#2e7d32' },
};

export const INGREDIENT_KINDS = Object.keys(INGREDIENTS);

// Five dishes, each a different combination of the same six ingredients, so
// every ticket forces a different route through the kitchen.
export const RECIPES = [
  { id: 'nasi-goreng', name: 'Nasi Goreng', price: 28, parts: ['rice', 'egg', 'chili'] },
  { id: 'mie-ayam', name: 'Mie Ayam', price: 34, parts: ['noodle', 'chicken', 'greens'] },
  { id: 'sate-ayam', name: 'Sate Ayam', price: 30, parts: ['chicken', 'chili', 'greens'] },
  { id: 'gado-gado', name: 'Gado-Gado', price: 26, parts: ['greens', 'egg', 'chili'] },
  { id: 'soto-ayam', name: 'Soto Ayam', price: 36, parts: ['chicken', 'rice', 'greens'] },
];

export const RECIPE_BY_ID = Object.fromEntries(RECIPES.map((r) => [r.id, r]));

// Floor plan. Pantry crates hug the left wall, burners and boards sit in two
// work rows up top, the plating counter runs along the bottom, and the serving
// window waits on the right — so a full dish crosses the whole kitchen.
export const STATIONS = [
  // pantry crates, top to bottom — contiguous, no seams: a 12 px gap between
  // crates let the chef wedge into the notch between two corners, so the
  // column reads as one solid stack the chef slides along freely
  { id: 'pantry-rice', kind: 'pantry', item: 'rice', x: 16, y: 118, w: 168, h: 62 },
  { id: 'pantry-noodle', kind: 'pantry', item: 'noodle', x: 16, y: 180, w: 168, h: 62 },
  { id: 'pantry-chicken', kind: 'pantry', item: 'chicken', x: 16, y: 242, w: 168, h: 62 },
  { id: 'pantry-egg', kind: 'pantry', item: 'egg', x: 16, y: 304, w: 168, h: 62 },
  { id: 'pantry-chili', kind: 'pantry', item: 'chili', x: 16, y: 366, w: 168, h: 62 },
  { id: 'pantry-greens', kind: 'pantry', item: 'greens', x: 16, y: 428, w: 168, h: 62 },
  // stoves (wok burners) — a wide gap to the pantry and to the boards, so the
  // nearest station is never ambiguous when the chef stands to use one
  { id: 'stove-0', kind: 'stove', burner: 0, x: 280, y: 122, w: 180, h: 86 },
  { id: 'stove-1', kind: 'stove', burner: 1, x: 500, y: 122, w: 180, h: 86 },
  // chopping boards
  { id: 'board-0', kind: 'board', x: 280, y: 292, w: 180, h: 86 },
  { id: 'board-1', kind: 'board', x: 500, y: 292, w: 180, h: 86 },
  // plating counter (two plate slots)
  { id: 'plate', kind: 'plate', x: 280, y: 612, w: 400, h: 100 },
  // serving window
  { id: 'window', kind: 'window', x: 740, y: 122, w: 330, h: 112 },
  // trash bin — below the spice rack, clear of the window
  { id: 'trash', kind: 'trash', x: 1108, y: 292, w: 118, h: 96 },
  // spice rack (decoration you can bump into, not a station)
  { id: 'rack', kind: 'decor', x: 1108, y: 122, w: 150, h: 112 },
  // potted plant (decoration)
  { id: 'plant', kind: 'decor', x: 1108, y: 606, w: 110, h: 88 },
];

// Rectangles the chef cannot walk through: every station plus the walls.
export const SOLIDS = STATIONS.map((s) => ({ x: s.x, y: s.y, w: s.w, h: s.h }));

export const FLOOR = { x: 8, y: BOARD_H + 8, w: VIEW_W - 16, h: VIEW_H - BOARD_H - 16 };

export const PLAYER_SPAWN = { x: 900, y: 620 };

/** Difficulty at `elapsed` seconds into the shift, 0 at open rising to 1. */
export function difficultyAt(elapsed) {
  return Math.min(1, Math.max(0, elapsed / DAY_LENGTH));
}

/** Seconds between new tickets at this point in the shift. */
export function spawnIntervalAt(elapsed) {
  return 16 - 7 * difficultyAt(elapsed);
}

/** How long a ticket stays patient, before tip and hearts are at stake. */
export function patienceAt(elapsed, rng) {
  return 78 - 28 * difficultyAt(elapsed) + rng() * 12;
}

/** Coins for serving `recipe` with `patienceLeft` of `patienceMax` left, on a `combo` streak. */
export function serveValue(recipe, patienceLeft, patienceMax, combo) {
  const tip = Math.round(recipe.price * 0.5 * Math.max(0, patienceLeft / patienceMax));
  const streak = Math.min(combo, 5) * 2;
  return { base: recipe.price, tip, streak, total: recipe.price + tip + streak };
}

/** Grade for a finished shift. */
export function gradeFor(coins, served) {
  if (coins >= 420 && served >= 12) return 'S';
  if (coins >= 300 && served >= 9) return 'A';
  if (coins >= 200 && served >= 6) return 'B';
  if (coins >= 100 && served >= 3) return 'C';
  return 'D';
}
