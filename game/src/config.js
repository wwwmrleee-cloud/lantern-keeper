// Lantern Keeper: every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it
// to the window, so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 720, groundY: 664 };

/** The simulation's fixed step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

/** Three lanes down the courtyard, one lantern at the foot of each. */
export const LANES = [320, 640, 960];
export const LANTERN_Y = 596;
export const LANTERN_RADIUS = 30;

export const KEEPER = {
  width: 52,
  height: 58,
  speed: 640,
  /** Bottom of the keeper sits on the ground. */
  y: FIELD.groundY - 58,
};

export const ENEMY = {
  size: 38,
  dartSize: 28,
  shadeSize: 48,
  baseSpeed: 135,
  speedPerWave: 14,
  dartMultiplier: 1.65,
  shadeMultiplier: 0.75,
};

export const FIREFLY = {
  size: 13,
  speed: 70,
  points: 5,
  /** Fireflies spent to relight one lantern. */
  relightCost: 1,
};

export const WAVES = {
  total: 10,
  /** Enemies in wave n. */
  count: (wave) => 6 + wave * 2,
  /** Seconds between spawns in wave n. */
  interval: (wave) => Math.max(0.5, 1.05 - wave * 0.05),
  /** Seconds of quiet between waves. */
  breakSeconds: 3,
};

export const SCORE = { moth: 10, dart: 20, shade: 30, waveBonus: 25 };

export const PALETTE = {
  skyTop: '#0b1030',
  skyMid: '#16204d',
  skyLow: '#2c2a55',
  ground: '#1d2418',
  groundEdge: '#33402a',
  houseWall: '#3a2f28',
  houseRoof: '#241d1a',
  roofTile: '#4a2f2a',
  wall: '#2e2118',
  lanternLit: '#ffb347',
  lanternCore: '#ffe9a8',
  lanternOut: '#4a4238',
  keeperCoat: '#3d6b8e',
  keeperHat: '#d9a441',
  moth: '#8a7f9e',
  dart: '#c9a0dc',
  shade: '#3a3348',
  firefly: '#c8ff7a',
  text: '#f5ead0',
  muted: '#9aa3c7',
  panel: '#141a33',
  dawnSky: '#f7b267',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'lantern-keeper.best';
