// The night itself: waves of moths and shadows drifting down three lanes
// toward the lanterns, the keeper swatting them, fireflies to catch.
// No drawing here, only rules, so the screenshot pilot can run it headless.
import { ENEMY, FIELD, FIREFLY, KEEPER, LANES, LANTERN_Y, SCORE, SWAT_COOLDOWN, WAVES } from './config.js';

export const EVENT_HIT = 1;
export const EVENT_OUT = 2;
export const EVENT_OVER = 4;
export const EVENT_WIN = 8;
export const EVENT_WAVE = 16;
export const EVENT_RELIGHT = 32;

export const KIND_MOTH = 'moth';
export const KIND_DART = 'dart';
export const KIND_SHADE = 'shade';

function pickKind(random, wave) {
  const roll = random.next();
  if (wave >= 5 && roll < 0.18) return KIND_SHADE;
  if (wave >= 3 && roll < 0.42) return KIND_DART;
  return KIND_MOTH;
}

function kindSize(kind) {
  if (kind === KIND_DART) return ENEMY.dartSize;
  if (kind === KIND_SHADE) return ENEMY.shadeSize;
  return ENEMY.size;
}

function kindSpeed(kind, wave, random) {
  const base = ENEMY.baseSpeed + (wave - 1) * ENEMY.speedPerWave;
  const jitter = random.range(-18, 38);
  if (kind === KIND_DART) return base * ENEMY.dartMultiplier + jitter;
  if (kind === KIND_SHADE) return base * ENEMY.shadeMultiplier + jitter;
  return base + jitter;
}

export function createWorld(random) {
  const state = {
    time: 0,
    wave: 1,
    waveTime: 0,
    betweenWaves: 0,
    spawnedThisWave: 0,
    spawnTimer: 0.6,
    fireflyTimer: 2.2,
    score: 0,
    fireflies: 0,
    lanterns: [true, true, true],
    keeper: { x: FIELD.width / 2 - KEEPER.width / 2, y: KEEPER.y, width: KEEPER.width, height: KEEPER.height },
    enemies: [],
    pickups: [],
    pops: [],
    over: false,
    won: false,
    waveClearBonusPaid: false,
    relightFailAt: -10,
    /** Last time the keeper swung. */
    swatAt: -10,
  };

  function reset() {
    state.time = 0;
    state.wave = 1;
    state.waveTime = 0;
    state.betweenWaves = 0;
    state.spawnedThisWave = 0;
    state.spawnTimer = 0.6;
    state.fireflyTimer = 2.2;
    state.score = 0;
    state.fireflies = 0;
    state.lanterns = [true, true, true];
    state.keeper.x = FIELD.width / 2 - KEEPER.width / 2;
    state.enemies = [];
    state.pickups = [];
    state.pops = [];
    state.over = false;
    state.won = false;
    state.waveClearBonusPaid = false;
    state.relightFailAt = -10;
    state.swatAt = -10;
  }

  function litCount() {
    return state.lanterns.filter(Boolean).length;
  }

  function spawnEnemy() {
    // Moths are drawn to the light: when only one lantern is still lit,
    // most of the swarm funnels onto it, so letting two lanterns go dark
    // does not leave the last one safe. With two or three lit, spawns
    // are spread evenly, so losing one lantern is recoverable.
    let lane;
    const litLanes = [0, 1, 2].filter((l) => state.lanterns[l]);
    if (litLanes.length === 1 && random.next() < 0.7) lane = litLanes[0];
    else lane = random.int(0, 2);
    const kind = pickKind(random, state.wave);
    const size = kindSize(kind);
    state.enemies.push({
      kind,
      lane,
      x: LANES[lane] - size / 2 + random.range(-14, 14),
      y: -size - random.range(0, 40),
      width: size,
      height: size,
      speed: kindSpeed(kind, state.wave, random),
      hp: kind === KIND_SHADE ? 2 : 1,
      phase: random.range(0, Math.PI * 2),
      sway: random.range(14, 30),
    });
    state.spawnedThisWave += 1;
  }

  function spawnFirefly() {
    const lane = random.int(0, 2);
    state.pickups.push({
      x: LANES[lane] - FIREFLY.size / 2 + random.range(-30, 30),
      y: -20,
      width: FIREFLY.size,
      height: FIREFLY.size,
      speed: FIREFLY.speed + random.range(-12, 24),
      phase: random.range(0, Math.PI * 2),
    });
  }

  function overlaps(a, b) {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  }

  function pop(x, y, text, colour) {
    state.pops.push({ x, y, text, colour, life: 0.9 });
  }

  /**
   * Advance the world one fixed step.
   * @param {number} dt seconds, usually STEP
   * @param {number} move -1 left, 0 still, 1 right
   * @param {number} relight lane 0-2 to relight, or -1 for none
   * @param {boolean} ambient title-screen drift: nothing is lost, nothing scores
   * @returns {number} event bitmask
   */
  function step(dt, move, relight, ambient) {
    if (state.over || state.won) return 0;
    let events = 0;
    state.time += dt;

    // The keeper walks the courtyard floor.
    state.keeper.x = Math.min(
      FIELD.width - KEEPER.width,
      Math.max(0, state.keeper.x + move * KEEPER.speed * dt),
    );

    // Relighting costs fireflies, only works on a dark lantern, and only
    // when the keeper has walked over to it: you cannot relight a far
    // lantern from the other side of the courtyard, so standing still
    // in one lane and pressing keys is not a way to survive the night.
    if (relight >= 0 && relight <= 2 && !ambient) {
      const keeperCentre = state.keeper.x + KEEPER.width / 2;
      const near = Math.abs(keeperCentre - LANES[relight]) <= 130;
      if (!state.lanterns[relight] && near && state.fireflies >= FIREFLY.relightCost) {
        state.fireflies -= FIREFLY.relightCost;
        state.lanterns[relight] = true;
        events |= EVENT_RELIGHT;
        pop(LANES[relight], LANTERN_Y - 46, '点亮 +', '#ffe9a8');
      } else if (!state.lanterns[relight] && state.time - state.relightFailAt > 1.5) {
        // Tried and failed: say why, once, so the player can fix it.
        state.relightFailAt = state.time;
        pop(LANES[relight], LANTERN_Y - 46, near ? '萤火不够' : '走过去点灯', '#8b93a3');
      }
    }

    // Wave clock: spawn, then a short quiet, then the next wave.
    if (!ambient) {
      if (state.betweenWaves > 0) {
        state.betweenWaves -= dt;
        if (state.betweenWaves <= 0) {
          state.wave += 1;
          state.spawnedThisWave = 0;
          state.spawnTimer = 0.5;
          state.waveClearBonusPaid = false;
          events |= EVENT_WAVE;
        }
      } else {
        state.waveTime += dt;
        const wanted = WAVES.count(state.wave);
        if (state.spawnedThisWave < wanted) {
          state.spawnTimer -= dt;
          if (state.spawnTimer <= 0) {
            spawnEnemy();
            // Darkness breeds moths: every dark lantern makes the next
            // ones come sooner, so standing still in one lane and letting
            // the other two go dark is not a way to survive the night.
            const dark = 3 - litCount();
            state.spawnTimer = WAVES.interval(state.wave) * (dark === 0 ? 1 : dark === 1 ? 0.85 : 0.7);
          }
        } else if (state.enemies.length === 0) {
          // Wave cleared: bonus, then the next wave, or dawn after wave 10.
          if (!state.waveClearBonusPaid) {
            state.score += SCORE.waveBonus * state.wave;
            state.waveClearBonusPaid = true;
          }
          if (state.wave >= WAVES.total) {
            state.won = true;
            return events | EVENT_WIN;
          }
          state.betweenWaves = WAVES.breakSeconds;
        }
        state.fireflyTimer -= dt;
        if (state.fireflyTimer <= 0) {
          spawnFirefly();
          state.fireflyTimer = random.range(2.8, 4.5);
        }
      }
    } else if (state.enemies.length < 5 && random.next() < dt * 0.9) {
      spawnEnemy();
    }

    // Enemies drift down, swaying side to side as moths do.
    for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = state.enemies[i];
      enemy.phase += dt * 6;
      enemy.y += enemy.speed * dt;
      enemy.x += Math.sin(enemy.phase) * enemy.sway * dt;
      // The keeper swats with a raised hand: the swat zone reaches well
      // above his head, so a moth is caught on approach, not only at the
      // lantern line. That is what makes the game playable by hand.
      const swatZone = {
        x: state.keeper.x - 14,
        y: state.keeper.y - 160,
        width: state.keeper.width + 28,
        height: state.keeper.height + 160,
      };
      if (overlaps(enemy, swatZone) && state.time - state.swatAt >= SWAT_COOLDOWN) {
        state.swatAt = state.time;
        enemy.hp -= 1;
        if (enemy.hp <= 0) {
          const points = enemy.kind === KIND_DART ? SCORE.dart : enemy.kind === KIND_SHADE ? SCORE.shade : SCORE.moth;
          if (!ambient) {
            state.score += points;
            // A swatted moth sometimes drops a firefly: the relight economy.
            // Kept scarce on purpose, so relighting a lantern is a real
            // choice, not something you can do every few seconds.
            if (enemy.kind === KIND_SHADE || random.next() < 0.2) state.fireflies += 1;
          }
          pop(enemy.x + enemy.width / 2, enemy.y, `+${points}`, '#ffe9a8');
          state.enemies.splice(i, 1);
          events |= EVENT_HIT;
        } else {
          pop(enemy.x + enemy.width / 2, enemy.y, '挡下', '#c9a0dc');
          enemy.y -= 26;
          events |= EVENT_HIT;
        }
        continue;
      }
      if (enemy.y + enemy.height >= LANTERN_Y + 14) {
        // Reached the lantern at the foot of its lane.
        state.enemies.splice(i, 1);
        if (!ambient && state.lanterns[enemy.lane]) {
          state.lanterns[enemy.lane] = false;
          events |= EVENT_OUT;
          pop(LANES[enemy.lane], LANTERN_Y - 46, '灯灭了', '#8b93a3');
          if (litCount() === 0) {
            state.over = true;
            return events | EVENT_OVER;
          }
        }
      }
    }

    // Fireflies drift down and are caught by the keeper.
    for (let i = state.pickups.length - 1; i >= 0; i -= 1) {
      const fly = state.pickups[i];
      fly.phase += dt * 4;
      fly.y += fly.speed * dt;
      fly.x += Math.sin(fly.phase) * 22 * dt;
      if (overlaps(fly, state.keeper)) {
        if (!ambient) {
          state.score += FIREFLY.points;
          state.fireflies += 1;
        }
        pop(fly.x, fly.y, '+萤火', '#c8ff7a');
        state.pickups.splice(i, 1);
        events |= EVENT_HIT;
      } else if (fly.y > FIELD.groundY) {
        state.pickups.splice(i, 1);
      }
    }

    for (let i = state.pops.length - 1; i >= 0; i -= 1) {
      state.pops[i].life -= dt;
      state.pops[i].y -= 22 * dt;
      if (state.pops[i].life <= 0) state.pops.splice(i, 1);
    }

    return events;
  }

  return { state, reset, step, litCount };
}
