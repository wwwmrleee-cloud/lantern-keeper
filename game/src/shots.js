// Screenshot scenes behind ?shot=start|play|win|end. Each one plays the
// real rules forward from a fresh world for a fixed number of steps,
// steered by a simple autopilot, so the frame is what a short game really
// looks like and the same seed always gives the same frame.
import { FIREFLY, LANES, STEP } from './config.js';
import { EVENT_OVER, EVENT_WIN } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 24;
const WIN_LIMIT_SECONDS = 900;
const END_LIMIT_SECONDS = 900;

function steerToward(state, targetX) {
  const centre = state.keeper.x + state.keeper.width / 2;
  if (targetX > centre + 10) return 1;
  if (targetX < centre - 10) return -1;
  return 0;
}

/**
 * Careful pilot (skill 1): relight at once when it can, chase fireflies
 * when a lantern is dark and relighting needs one, otherwise guard the
 * lowest moth threatening a lit lantern.
 * Careless pilot (skill 0): reacts only when a moth is almost at a
 * lantern, never relights, never chases fireflies — as a hurried player is.
 */
function autopilot(state, skill) {
  if (skill > 0) {
    for (let lane = 0; lane < 3; lane += 1) {
      if (!state.lanterns[lane] && state.fireflies >= FIREFLY.relightCost) {
        // Walk over to the dark lantern first, then relight it.
        const centre = state.keeper.x + state.keeper.width / 2;
        if (Math.abs(centre - LANES[lane]) <= 130) return { move: 0, relight: lane };
        return { move: steerToward(state, LANES[lane]), relight: -1 };
      }
    }
    const dark = state.lanterns.some((lit) => !lit);
    if (dark) {
      let urgent = null;
      for (const enemy of state.enemies) {
        if (state.lanterns[enemy.lane] && enemy.y > 420 && (!urgent || enemy.y > urgent.y)) urgent = enemy;
      }
      if (!urgent) {
        let fly = null;
        for (const pickup of state.pickups) {
          if (!fly || pickup.y > fly.y) fly = pickup;
        }
        if (fly) return { move: steerToward(state, fly.x + fly.width / 2), relight: -1 };
      }
    }
    let target = null;
    for (const enemy of state.enemies) {
      if (!state.lanterns[enemy.lane]) continue;
      if (!target || enemy.y > target.y) target = enemy;
    }
    if (!target) {
      let fly = null;
      for (const pickup of state.pickups) {
        if (!fly || pickup.y > fly.y) fly = pickup;
      }
      if (fly) return { move: steerToward(state, fly.x + fly.width / 2), relight: -1 };
      return { move: 0, relight: -1 };
    }
    return { move: steerToward(state, target.x + target.width / 2), relight: -1 };
  }
  // Reacts only when a moth is close to a lantern, and never relights
  // or chases fireflies — as a hurried player is.
  let target = null;
  for (const enemy of state.enemies) {
    if (enemy.y < 460) continue;
    if (!target || enemy.y > target.y) target = enemy;
  }
  if (!target) return { move: 0, relight: -1 };
  return { move: steerToward(state, target.x + target.width / 2), relight: -1 };
}

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * start: title over a drifting night. play: mid-game, lanterns lit.
 * win: a full night survived to dawn. end: every lantern out.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'win' && name !== 'end') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) world.step(STEP, 0, -1, true);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'play') {
    for (let i = 0; i < PLAY_SECONDS / STEP; i += 1) {
      const action = autopilot(world.state, 1);
      const events = world.step(STEP, action.move, action.relight, false);
      if (events & (EVENT_OVER | EVENT_WIN)) break;
    }
    if (world.state.won) return { screen: SCREEN_WIN, best: world.state.score };
    return { screen: world.state.over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'win') {
    for (let i = 0; i < WIN_LIMIT_SECONDS / STEP; i += 1) {
      const action = autopilot(world.state, 1);
      const events = world.step(STEP, action.move, action.relight, false);
      if (events & EVENT_WIN) return { screen: SCREEN_WIN, best: world.state.score };
      if (events & EVENT_OVER) return { screen: SCREEN_OVER, best: world.state.score };
    }
    if (world.state.won) return { screen: SCREEN_WIN, best: world.state.score };
    return { screen: world.state.over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
  }
  // end: a careless pilot, so the moths get through.
  for (let i = 0; i < END_LIMIT_SECONDS / STEP; i += 1) {
    const action = autopilot(world.state, 0);
    const events = world.step(STEP, action.move, action.relight, false);
    if (events & EVENT_OVER) return { screen: SCREEN_OVER, best: world.state.score };
    if (events & EVENT_WIN) return { screen: SCREEN_WIN, best: world.state.score };
  }
  return { screen: world.state.over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
}
