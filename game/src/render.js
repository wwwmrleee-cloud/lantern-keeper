// Everything the player sees, drawn with canvas shapes only: no images,
// no fonts to load. Deep blue night, amber lanterns, a small keeper.
import { FIELD, LANES, LANTERN_RADIUS, LANTERN_Y, PALETTE, WAVES } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

// Stars fixed by index, so the sky never twinkles into a new pattern.
const STARS = Array.from({ length: 90 }, (_, i) => ({
  x: ((i * 173 + 41) % 1280),
  y: ((i * 97 + 13) % 300),
  r: 0.7 + ((i * 7) % 3) * 0.5,
  twinkle: (i % 5) * 0.7,
}));

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function fit() {
    const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
  }

  function sky(dawn) {
    const gradient = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    if (dawn) {
      gradient.addColorStop(0, '#f7b267');
      gradient.addColorStop(0.55, '#e8836b');
      gradient.addColorStop(1, '#7a4a6b');
    } else {
      gradient.addColorStop(0, PALETTE.skyTop);
      gradient.addColorStop(0.55, PALETTE.skyMid);
      gradient.addColorStop(1, PALETTE.skyLow);
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    if (!dawn) {
      const now = performance.now() / 1000;
      for (const star of STARS) {
        ctx.globalAlpha = 0.45 + 0.35 * Math.sin(now + star.twinkle);
        ctx.fillStyle = '#dfe6ff';
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      // Moon, upper right.
      ctx.fillStyle = '#f2ead0';
      ctx.beginPath();
      ctx.arc(1120, 92, 44, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.skyMid;
      ctx.beginPath();
      ctx.arc(1104, 82, 38, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function house(dawn) {
    // A low farmhouse across the back of the courtyard.
    ctx.fillStyle = PALETTE.houseWall;
    ctx.fillRect(340, 150, 600, 190);
    ctx.fillStyle = PALETTE.houseRoof;
    ctx.beginPath();
    ctx.moveTo(300, 155);
    ctx.lineTo(640, 78);
    ctx.lineTo(980, 155);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.roofTile;
    for (let x = 320; x < 960; x += 42) {
      ctx.fillRect(x, 128, 26, 8);
    }
    // Door, warm when the night is still alive.
    ctx.fillStyle = dawn ? '#5a4632' : '#ffb347';
    ctx.fillRect(608, 232, 64, 108);
    ctx.fillStyle = '#241d1a';
    ctx.fillRect(636, 232, 8, 108);
    // Two windows.
    for (const wx of [420, 800]) {
      ctx.fillStyle = dawn ? '#3a2f28' : '#ffd98a';
      ctx.fillRect(wx, 230, 72, 56);
      ctx.fillStyle = '#241d1a';
      ctx.fillRect(wx + 32, 230, 6, 56);
      ctx.fillRect(wx, 254, 72, 6);
    }
    // Courtyard wall and ground.
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(0, 340, 1280, 18);
    ctx.fillStyle = PALETTE.ground;
    ctx.fillRect(0, 358, 1280, FIELD.height - 358);
    ctx.fillStyle = PALETTE.groundEdge;
    ctx.fillRect(0, 358, 1280, 6);
    // Stone path down the middle lane.
    ctx.fillStyle = '#2c3324';
    ctx.fillRect(604, 358, 72, 306);
    for (let y = 380; y < 640; y += 44) {
      ctx.fillStyle = '#3a4432';
      ctx.beginPath();
      ctx.ellipse(640, y, 26, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function lantern(x, lit, time) {
    // Post.
    ctx.strokeStyle = '#1c1712';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(x, LANTERN_Y + 34);
    ctx.lineTo(x, LANTERN_Y - 58);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, LANTERN_Y - 58);
    ctx.lineTo(x + 18, LANTERN_Y - 58);
    ctx.stroke();
    if (lit) {
      const flicker = 0.85 + 0.15 * Math.sin(time * 5 + x);
      const glow = ctx.createRadialGradient(x + 18, LANTERN_Y - 28, 4, x + 18, LANTERN_Y - 28, 92);
      glow.addColorStop(0, 'rgba(255, 179, 71, 0.55)');
      glow.addColorStop(1, 'rgba(255, 179, 71, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x + 18, LANTERN_Y - 28, 92, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = flicker;
    } else {
      ctx.globalAlpha = 0.55;
    }
    // Lantern body.
    ctx.fillStyle = lit ? PALETTE.lanternLit : PALETTE.lanternOut;
    ctx.beginPath();
    ctx.ellipse(x + 18, LANTERN_Y - 28, 20, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = lit ? PALETTE.lanternCore : '#2e2822';
    ctx.beginPath();
    ctx.ellipse(x + 18, LANTERN_Y - 28, 11, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1c1712';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 18, LANTERN_Y - 56);
    ctx.lineTo(x + 18, LANTERN_Y - 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function keeper(k) {
    const cx = k.x + k.width / 2;
    // Small hand lantern, swinging.
    const swing = Math.sin(performance.now() / 300) * 4;
    ctx.fillStyle = 'rgba(255, 179, 71, 0.35)';
    ctx.beginPath();
    ctx.arc(cx + 26 + swing, k.y + 30, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.lanternLit;
    ctx.beginPath();
    ctx.arc(cx + 26 + swing, k.y + 30, 7, 0, Math.PI * 2);
    ctx.fill();
    // Coat.
    ctx.fillStyle = PALETTE.keeperCoat;
    ctx.beginPath();
    ctx.moveTo(cx - 16, k.y + k.height);
    ctx.lineTo(cx - 12, k.y + 18);
    ctx.lineTo(cx + 12, k.y + 18);
    ctx.lineTo(cx + 16, k.y + k.height);
    ctx.closePath();
    ctx.fill();
    // Head and straw hat.
    ctx.fillStyle = '#e8c39a';
    ctx.beginPath();
    ctx.arc(cx, k.y + 10, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.keeperHat;
    ctx.beginPath();
    ctx.ellipse(cx, k.y + 2, 22, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, k.y - 1, 10, Math.PI, 0);
    ctx.fill();
  }

  function moth(enemy) {
    const cx = enemy.x + enemy.width / 2;
    const cy = enemy.y + enemy.height / 2;
    const flap = Math.sin(enemy.phase * 2) * 0.5;
    ctx.save();
    ctx.translate(cx, cy);
    if (enemy.kind === 'shade') {
      ctx.fillStyle = PALETTE.shade;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.width / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8d8ff';
      ctx.beginPath();
      ctx.arc(-7, -4, 3, 0, Math.PI * 2);
      ctx.arc(7, -4, 3, 0, Math.PI * 2);
      ctx.fill();
      if (enemy.hp > 1) {
        ctx.strokeStyle = '#c9a0dc';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, enemy.width / 2 + 4, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else {
      const colour = enemy.kind === 'dart' ? PALETTE.dart : PALETTE.moth;
      ctx.fillStyle = colour;
      ctx.save();
      ctx.rotate(-0.4 - flap * 0.3);
      ctx.beginPath();
      ctx.ellipse(-10, -4, 13, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.rotate(0.4 + flap * 0.3);
      ctx.beginPath();
      ctx.ellipse(10, -4, 13, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#2b2536';
      ctx.beginPath();
      ctx.ellipse(0, 2, 6, 11, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function firefly(fly) {
    const cx = fly.x + fly.width / 2;
    const cy = fly.y + fly.height / 2;
    const glow = 0.6 + 0.4 * Math.sin(fly.phase * 2);
    ctx.globalAlpha = glow;
    ctx.fillStyle = PALETTE.firefly;
    ctx.beginPath();
    ctx.arc(cx, cy, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f4ffd0';
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function panel(x, y, w, h) {
    ctx.fillStyle = 'rgba(10, 14, 32, 0.82)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 179, 71, 0.45)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function text(str, x, y, size, colour, align = 'center', weight = '700') {
    ctx.fillStyle = colour;
    ctx.font = `${weight} ${size}px ${'system-ui, -apple-system, "Segoe UI", sans-serif'}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(str, x, y);
  }

  function hud(state, best) {
    ctx.fillStyle = 'rgba(10, 14, 32, 0.72)';
    ctx.fillRect(0, 0, FIELD.width, 54);
    text(`第 ${Math.min(state.wave, WAVES.total)} / ${WAVES.total} 波`, 110, 28, 22, PALETTE.text, 'center');
    text(`分数 ${state.score}`, 330, 28, 22, PALETTE.text, 'center');
    text(`萤火 ${state.fireflies}  ·  点灯按 1 / 2 / 3（1 萤火）`, 640, 28, 20, PALETTE.muted, 'center');
    text(`最佳 ${best}`, 1000, 28, 20, PALETTE.muted, 'center');
    // Lantern icons, lit or dark.
    for (let i = 0; i < 3; i += 1) {
      const x = 1130 + i * 42;
      ctx.fillStyle = state.lanterns[i] ? PALETTE.lanternLit : PALETTE.lanternOut;
      ctx.beginPath();
      ctx.arc(x, 27, 12, 0, Math.PI * 2);
      ctx.fill();
    }
    if (state.betweenWaves > 0) {
      text(`下一波 ${Math.ceil(state.betweenWaves)} 秒`, 640, 84, 22, PALETTE.lanternCore, 'center');
    }
  }

  function draw(state, screen, best) {
    const dawn = screen === SCREEN_WIN;
    fit();
    sky(dawn);
    house(dawn);
    const time = state.time;
    for (let i = 0; i < 3; i += 1) lantern(LANES[i], state.lanterns[i], time);
    for (const fly of state.pickups) firefly(fly);
    for (const enemy of state.enemies) moth(enemy);
    keeper(state.keeper);
    for (const pop of state.pops) {
      ctx.globalAlpha = Math.max(0, Math.min(1, pop.life));
      text(pop.text, pop.x, pop.y, 20, pop.colour, 'center');
    }
    ctx.globalAlpha = 1;

    if (screen === SCREEN_TITLE) {
      ctx.fillStyle = 'rgba(8, 10, 28, 0.45)';
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      panel(290, 150, 700, 400);
      text('灯火守夜人', 640, 215, 56, PALETTE.lanternCore, 'center');
      text('LANTERN KEEPER', 640, 262, 20, PALETTE.muted, 'center');
      text('飞蛾扑向屋前的三盏灯，守住它们，等到天亮。', 640, 315, 22, PALETTE.text, 'center');
      text('移动：鼠标 / 方向键　　点灯：1 / 2 / 3 键', 640, 355, 20, PALETTE.text, 'center');
      text('撞飞蛾得分，捡萤火攒点灯的柴火，撑过 10 波。', 640, 390, 20, PALETTE.text, 'center');
      text('按 空格 或 点击 开始', 640, 465, 26, PALETTE.lanternLit, 'center');
      text(`最佳 ${best}`, 640, 510, 18, PALETTE.muted, 'center');
    } else if (screen === SCREEN_PAUSED) {
      ctx.fillStyle = 'rgba(8, 10, 28, 0.55)';
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      panel(440, 280, 400, 160);
      text('暂停', 640, 330, 40, PALETTE.text, 'center');
      text('按 P 继续，按 R 重开', 640, 385, 20, PALETTE.muted, 'center');
    } else if (screen === SCREEN_OVER) {
      ctx.fillStyle = 'rgba(8, 10, 28, 0.6)';
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      panel(340, 190, 600, 330);
      text('灯全灭了', 640, 255, 48, PALETTE.text, 'center');
      text(`守到了第 ${state.wave} 波　　分数 ${state.score}　　最佳 ${best}`, 640, 325, 22, PALETTE.text, 'center');
      text('飞蛾赢了这一夜，明晚再来。', 640, 365, 20, PALETTE.muted, 'center');
      text('按 空格 或 R 重开', 640, 450, 26, PALETTE.lanternLit, 'center');
    } else if (screen === SCREEN_WIN) {
      ctx.fillStyle = 'rgba(247, 178, 103, 0.18)';
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      panel(340, 190, 600, 330);
      text('天亮了', 640, 255, 52, '#fff3d6', 'center');
      text(`三盏灯都亮着　　分数 ${state.score}　　最佳 ${best}`, 640, 325, 22, PALETTE.text, 'center');
      text('你守住了这个院子。', 640, 365, 20, PALETTE.muted, 'center');
      text('按 空格 或 R 再守一夜', 640, 450, 26, PALETTE.lanternLit, 'center');
    } else {
      hud(state, best);
    }
  }

  return { draw };
}
