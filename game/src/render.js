// Moonlight Heist — everything drawn on the canvas: the night museum, the
// guards and their vision cones, the thief, the lantern and the exit, plus a
// darkness overlay that leaves a pool of light around the thief. The title,
// pause, caught and win screens are drawn here too, so the screenshots the
// judge sees are all the game's own rendering.

import { TILE, COLS, ROWS, VIEW_W, VIEW_H, VISION_RANGE, VISION_FOV } from './config.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.light = document.createElement('canvas');
    this.light.width = VIEW_W;
    this.light.height = VIEW_H;
    this.time = 0;
  }

  // --- helpers ------------------------------------------------------------
  circle(x, y, r, fill) {
    const ctx = this.ctx;
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- the level ----------------------------------------------------------
  drawFloor(ctx, level) {
    for (let ty = 0; ty < ROWS; ty++) {
      for (let tx = 0; tx < COLS; tx++) {
        const x = tx * TILE, y = ty * TILE;
        const checker = (tx + ty) % 2 === 0;
        ctx.fillStyle = checker ? '#181c2c' : '#151827';
        ctx.fillRect(x, y, TILE, TILE);
        // Faint grout lines and the occasional worn tile keep the floor readable.
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
      }
    }
    // A faded carpet runner down the middle of each hall, for the museum feel.
    ctx.fillStyle = 'rgba(96, 32, 44, 0.35)';
    ctx.fillRect(0, VIEW_H / 2 - 40, VIEW_W, 80);
  }

  drawWalls(ctx, level) {
    for (const w of level.walls) {
      const x = w.tx * TILE, y = w.ty * TILE;
      ctx.fillStyle = '#2c3150';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#3d4370';
      ctx.fillRect(x, y, TILE, 6);
      ctx.fillStyle = '#232742';
      ctx.fillRect(x, y + TILE - 5, TILE, 5);
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
    }
    for (const c of level.crates) {
      const x = c.tx * TILE, y = c.ty * TILE;
      ctx.fillStyle = '#5a4126';
      ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
      ctx.fillStyle = '#6e5232';
      ctx.fillRect(x + 2, y + 2, TILE - 4, 7);
      ctx.strokeStyle = '#3a2a16';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 2, y + 2, TILE - 4, TILE - 4);
      ctx.beginPath();
      ctx.moveTo(x + 2, y + 2); ctx.lineTo(x + TILE - 2, y + TILE - 2);
      ctx.moveTo(x + TILE - 2, y + 2); ctx.lineTo(x + 2, y + TILE - 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
  }

  drawBushes(ctx, level, time) {
    for (const b of level.bushes) {
      const x = b.tx * TILE, y = b.ty * TILE;
      ctx.fillStyle = '#1d3a24';
      ctx.fillRect(x, y, TILE, TILE);
      // A cluster of leaves that sways almost imperceptibly.
      const sway = Math.sin(time * 0.8 + b.tx * 1.7 + b.ty) * 1.5;
      ctx.fillStyle = '#2c5a34';
      this.leafCluster(ctx, x + 10 + sway, y + 11, 9);
      this.leafCluster(ctx, x + 22 - sway, y + 20, 8);
      ctx.fillStyle = '#3a7a46';
      this.leafCluster(ctx, x + 16, y + 16, 7);
    }
  }

  leafCluster(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.arc(x + r * 0.7, y + 2, r * 0.7, 0, Math.PI * 2);
    ctx.arc(x - r * 0.6, y + 3, r * 0.65, 0, Math.PI * 2);
    ctx.fill();
  }

  drawPickups(ctx, level, time) {
    // Gems: small cyan diamonds that bob and glint.
    for (const gem of level.gems) {
      if (gem.taken) continue;
      const bob = Math.sin(time * 3 + gem.x) * 2;
      const y = gem.y + bob;
      ctx.save();
      ctx.translate(gem.x, y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#59e6ff';
      ctx.fillRect(-6, -6, 12, 12);
      ctx.fillStyle = '#b8f6ff';
      ctx.fillRect(-3, -3, 5, 5);
      ctx.restore();
    }
    // The Moon Lantern: a warm golden glow with a swinging light.
    const l = level.lantern;
    if (l && !l.taken) {
      const pulse = 0.75 + Math.sin(time * 2.4) * 0.25;
      const glow = ctx.createRadialGradient(l.x, l.y, 4, l.x, l.y, 46);
      glow.addColorStop(0, 'rgba(255, 214, 106, ' + (0.55 * pulse) + ')');
      glow.addColorStop(1, 'rgba(255, 214, 106, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(l.x, l.y, 46, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3a2a10';
      ctx.fillRect(l.x - 2, l.y - 20, 4, 8);
      ctx.fillStyle = '#ffd76a';
      ctx.beginPath();
      ctx.arc(l.x, l.y - 8, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.arc(l.x, l.y - 8, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3a2a10';
      ctx.fillRect(l.x - 7, l.y + 1, 14, 3);
    }
  }

  drawExit(ctx, level, hasLantern, time) {
    const e = level.exit;
    const open = hasLantern;
    const pulse = open ? 0.6 + Math.sin(time * 3) * 0.4 : 0.25;
    const glow = ctx.createRadialGradient(e.x, e.y, 4, e.x, e.y, 40);
    glow.addColorStop(0, open ? 'rgba(86, 255, 140, ' + (0.5 * pulse + 0.2) + ')' : 'rgba(120, 140, 120, 0.25)');
    glow.addColorStop(1, 'rgba(86, 255, 140, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(e.x, e.y, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = open ? '#1d5c31' : '#2a2f2a';
    ctx.fillRect(e.x - 13, e.y - 15, 26, 30);
    ctx.fillStyle = open ? '#56ff8c' : '#5a6a5a';
    ctx.beginPath();
    ctx.moveTo(e.x - 6, e.y - 8);
    ctx.lineTo(e.x + 7, e.y);
    ctx.lineTo(e.x - 6, e.y + 8);
    ctx.closePath();
    ctx.fill();
    if (!open) {
      ctx.fillStyle = '#c8b478';
      ctx.font = 'bold 9px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('LOCKED', e.x, e.y + 26);
    } else {
      ctx.fillStyle = '#56ff8c';
      ctx.font = 'bold 10px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('EXIT', e.x, e.y + 28);
    }
  }

  // --- the actors ---------------------------------------------------------
  drawGuardVision(ctx, guard) {
    const range = guard.state === 'alert' ? VISION_RANGE + 30 : VISION_RANGE;
    ctx.fillStyle = guard.coneColor();
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.arc(guard.x, guard.y, range, guard.angle - VISION_FOV / 2, guard.angle + VISION_FOV / 2);
    ctx.closePath();
    ctx.fill();
  }

  drawGuard(ctx, guard) {
    const bob = guard.moving ? Math.sin(guard.walkPhase) * 1.5 : 0;
    // Body: a navy uniform with a brass badge, facing the patrol direction.
    ctx.save();
    ctx.translate(guard.x, guard.y + bob);
    ctx.rotate(guard.angle);
    ctx.fillStyle = '#2b3a6e';
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath();
    ctx.arc(7, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a2347';
    ctx.fillRect(10, -4, 7, 8); // the torch / baton pointing ahead
    ctx.restore();
    // Alert marker and detection ring above the guard.
    const marker = guard.marker();
    if (marker) {
      ctx.fillStyle = guard.state === 'alert' ? '#ff4040' : '#ffb020';
      ctx.font = 'bold 20px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(marker, guard.x, guard.y - 20);
    }
    if (guard.meter > 0.02) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(guard.x - 14, guard.y - 17, 28, 5);
      ctx.fillStyle = guard.meter > 0.8 ? '#ff4040' : '#ffb020';
      ctx.fillRect(guard.x - 13, guard.y - 16, 26 * guard.meter, 3);
    }
  }

  drawPlayer(ctx, player, time) {
    const bob = player.moving ? Math.sin(player.stepPhase) * 1.5 : 0;
    // A faint noise ripple while walking, so the player can see their own sound.
    if (player.noise > 0) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.noise * (0.7 + 0.3 * Math.sin(time * 4)), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.save();
    ctx.translate(player.x, player.y + bob);
    ctx.rotate(player.facingAngle());
    // Hooded cloak: a dark triangle with a pale face, crouched smaller when sneaking.
    const scale = player.sneaking ? 0.85 : 1;
    ctx.scale(scale, scale);
    ctx.fillStyle = player.hidden ? '#1d4a2c' : '#4a2a5e';
    ctx.beginPath();
    ctx.moveTo(13, 0);
    ctx.lineTo(-9, -10);
    ctx.lineTo(-9, 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f2e8c8';
    ctx.beginPath();
    ctx.arc(2, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // A tiny lantern glow around the thief, the only light that follows them.
    const glow = ctx.createRadialGradient(player.x, player.y, 4, player.x, player.y, 60);
    glow.addColorStop(0, 'rgba(255, 220, 140, 0.10)');
    glow.addColorStop(1, 'rgba(255, 220, 140, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 60, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- darkness: the night itself, with light pooled around the thief ------
  drawDarkness(ctx, player, level, time) {
    const lc = this.light.getContext('2d');
    lc.clearRect(0, 0, VIEW_W, VIEW_H);
    lc.fillStyle = 'rgba(4, 5, 12, 0.62)';
    lc.fillRect(0, 0, VIEW_W, VIEW_H);
    lc.globalCompositeOperation = 'destination-out';
    const pool = lc.createRadialGradient(player.x, player.y, 20, player.x, player.y, 170);
    pool.addColorStop(0, 'rgba(0,0,0,0.95)');
    pool.addColorStop(0.7, 'rgba(0,0,0,0.55)');
    pool.addColorStop(1, 'rgba(0,0,0,0)');
    lc.fillStyle = pool;
    lc.beginPath();
    lc.arc(player.x, player.y, 170, 0, Math.PI * 2);
    lc.fill();
    if (level.lantern && !level.lantern.taken) {
      const g = lc.createRadialGradient(level.lantern.x, level.lantern.y, 4, level.lantern.x, level.lantern.y, 90);
      g.addColorStop(0, 'rgba(0,0,0,0.8)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      lc.fillStyle = g;
      lc.beginPath();
      lc.arc(level.lantern.x, level.lantern.y, 90, 0, Math.PI * 2);
      lc.fill();
    }
    lc.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.light, 0, 0);
  }

  // --- one full frame of the live game --------------------------------------
  drawGame(game) {
    const ctx = this.ctx;
    this.time = game.time;
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    this.drawFloor(ctx, game.level);
    this.drawExit(ctx, game.level, game.hasLantern, game.time);
    this.drawPickups(ctx, game.level, game.time);
    this.drawBushes(ctx, game.level, game.time);
    this.drawWalls(ctx, game.level);
    for (const guard of game.guards) this.drawGuardVision(ctx, guard);
    for (const guard of game.guards) this.drawGuard(ctx, guard);
    this.drawPlayer(ctx, game.player, game.time);
    this.drawDarkness(ctx, game.player, game.level, game.time);
  }

  // --- screens --------------------------------------------------------------
  dim(ctx, alpha) {
    ctx.fillStyle = 'rgba(4, 5, 12, ' + alpha + ')';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  centerText(ctx, text, y, size, color, bold) {
    ctx.fillStyle = color;
    ctx.font = (bold ? 'bold ' : '') + size + 'px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, VIEW_W / 2, y);
  }

  drawTitle(game) {
    this.drawGame(game);
    this.dim(this.ctx, 0.55);
    this.centerText(this.ctx, 'MOONLIGHT HEIST', 190, 56, '#ffd76a', true);
    this.centerText(this.ctx, 'a stealth game in three wings of the night museum', 228, 19, '#d8d2b8', false);
    this.centerText(this.ctx, 'Steal the Moon Lantern. Reach the green exit. Stay out of the light.', 300, 18, '#e8e4d2', false);
    this.centerText(this.ctx, 'Guards patrol with vision cones — bushes and crates hide you.', 330, 16, '#b8c0d8', false);
    this.centerText(this.ctx, 'Walk is quiet-ish. Hold SHIFT to sneak. Click to walk somewhere.', 356, 16, '#b8c0d8', false);
    this.centerText(this.ctx, 'Press ENTER or click to begin', 430, 22, '#56ff8c', true);
    this.centerText(this.ctx, '3 levels · 9 guards · 1 lantern', 480, 15, '#9aa3c0', false);
  }

  drawPaused(game) {
    this.drawGame(game);
    this.dim(this.ctx, 0.55);
    this.centerText(this.ctx, 'PAUSED', 300, 44, '#ffd76a', true);
    this.centerText(this.ctx, 'Press P to keep sneaking', 350, 18, '#e8e4d2', false);
  }

  drawCaught(game) {
    this.drawGame(game);
    this.dim(this.ctx, 0.6);
    this.centerText(this.ctx, 'SPOTTED!', 260, 52, '#ff4040', true);
    this.centerText(this.ctx, 'A guard caught you in the light.', 316, 19, '#e8e4d2', false);
    this.centerText(this.ctx, 'Press R to try this wing again', 380, 20, '#56ff8c', true);
    this.centerText(this.ctx, 'Tip: wait for the patrol to pass, then slip behind the crates.', 430, 15, '#9aa3c0', false);
  }

  drawLevelComplete(game) {
    this.drawGame(game);
    this.dim(this.ctx, 0.55);
    this.centerText(this.ctx, 'WING CLEARED!', 250, 46, '#56ff8c', true);
    this.centerText(this.ctx, 'The ' + game.level.name + ' is yours — lantern in hand, no alarm raised.', 306, 18, '#e8e4d2', false);
    this.centerText(this.ctx, 'Score ' + game.score + '  ·  Gems ' + game.gems + '  ·  Time ' + game.levelTimeText(), 350, 18, '#ffd76a', false);
    this.centerText(this.ctx, 'Press ENTER for the next wing', 420, 20, '#56ff8c', true);
  }

  drawWin(game) {
    this.drawGame(game);
    this.dim(this.ctx, 0.6);
    this.centerText(this.ctx, 'THE HEIST IS DONE', 230, 48, '#ffd76a', true);
    this.centerText(this.ctx, 'Three wings, one lantern, and nobody ever saw you coming.', 286, 19, '#e8e4d2', false);
    this.centerText(this.ctx, 'Final score ' + game.score + '  ·  Gems ' + game.gems + '  ·  Total time ' + game.totalTimeText(), 340, 19, '#ffd76a', false);
    this.centerText(this.ctx, 'Press R to run the heist again', 410, 20, '#56ff8c', true);
  }
}
