// Midnight Ramen Rush — configuration: layout, timings, palette.
// One job: every number the game tunes lives here, so balance changes
// touch this file and nothing else.
export const W = 1280;
export const H = 720;
export const STEP = 1 / 60;

export const SHIFT_SECONDS = 180; // one shift lasts three minutes
export const MAX_HEARTS = 3; // three missed orders end the shift early
export const MAX_ORDERS = 4; // tickets on the rail at once
export const PATIENCE_BASE = 70; // seconds a ticket waits before it expires
export const PATIENCE_RUSH = 52;
export const SPAWN_BASE = 15; // seconds between new tickets, early shift
export const SPAWN_MID = 12; // after the first rush wave
export const SPAWN_RUSH = 9; // after the second rush wave
export const WAVE1_AT = 60; // seconds into the shift: first rush wave
export const WAVE2_AT = 120; // seconds into the shift: second rush wave
export const COMBO_BONUS = 2; // extra coins per combo level on a serve

export const CHEF_SPEED = 265; // px per second
export const CHEF_RADIUS = 21;
export const INTERACT_RANGE = 52; // px beyond a station's edge that still counts

// Channel times: how long each station action takes while the chef stands there.
export const LADLE_SECONDS = 1.2;
export const BOIL_SECONDS = 3.0;
export const TAKE_SECONDS = 0.6;
export const TOPPING_SECONDS = 0.35;
export const SERVE_SECONDS = 0.5;
export const DUMP_SECONDS = 0.3;

// Kitchen floor: x 8..992, y 66..712. The order board owns x 1000..1268.
export const STATIONS = {
  brothShoyu: { x: 40, y: 96, w: 132, h: 96, label: 'KALDU SHOYU', sub: 'tahan E — tuang' },
  brothMiso: { x: 192, y: 96, w: 132, h: 96, label: 'KALDU MISO', sub: 'tahan E — tuang' },
  boiler: { x: 400, y: 96, w: 184, h: 96, label: 'PANCI MIE', sub: 'E — rebus · E — angkat' },
  assembly: { x: 400, y: 300, w: 184, h: 112, label: 'MEJA RAKIT', sub: 'mangkukmu di sini' },
  pass: { x: 820, y: 300, w: 164, h: 112, label: 'PASS — SAJIKAN', sub: 'E — antar pesanan' },
  trash: { x: 40, y: 600, w: 124, h: 92, label: 'TEMPAT BUANG', sub: 'E — buang mangkuk' },
};

// The order board (ticket rail): right column x 1000..1268.
export const ORDER_BOARD = { x: 1004, y: 80, w: 260, h: 118, gap: 10 };

// Topping bins along the bottom counter, left to right.
export const TOPPING_BINS = [
  { id: 'egg', x: 330, y: 600, w: 112, h: 92, label: 'TELUR' },
  { id: 'chashu', x: 452, y: 600, w: 112, h: 92, label: 'CHASHU' },
  { id: 'nori', x: 574, y: 600, w: 112, h: 92, label: 'NORI' },
  { id: 'scallion', x: 696, y: 600, w: 112, h: 92, label: 'DAUN BAWANG' },
  { id: 'corn', x: 818, y: 600, w: 112, h: 92, label: 'JAGUNG' },
];

export const PALETTE = {
  night: '#171226', // wall behind the kitchen
  floor: '#2a1f3d', // floor tiles, dark warm purple
  floorLine: '#3a2c52',
  wood: '#8a5a33', // counters
  woodDark: '#6e4525',
  woodTop: '#a9743f',
  cream: '#f5e6c8',
  paper: '#fff7e0', // ticket paper
  ink: '#2b1d12',
  shoyu: '#6b3f1d',
  miso: '#d98e32',
  noodle: '#f2c94c',
  neonPink: '#ff5d8f',
  neonTeal: '#2dd4bf',
  gold: '#ffc53d',
  green: '#7bc96f',
  amber: '#f5a623',
  red: '#e5484d',
  white: '#ffffff',
};

export const FONT = '"Trebuchet MS", Verdana, sans-serif';
