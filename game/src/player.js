// Moonlight Heist — the thief. Moves with keys or by clicking a spot, sneaks
// with Shift, and leaves a noise ripple when walking fast. The player never
// decides what a guard sees; it just reports where it is, how loud it is and
// whether it is crouched in cover — the guard module does the seeing.

import {
  TILE, PLAYER_WALK_SPEED, PLAYER_SNEAK_SPEED, PLAYER_RADIUS,
  NOISE_RADIUS_WALK, NOISE_RADIUS_SNEAK,
} from './config.js';

export class Player {
  constructor(level) {
    this.level = level;
    this.x = level.playerStart.x;
    this.y = level.playerStart.y;
    this.dirX = 0;
    this.dirY = 1; // facing down at the start
    this.sneaking = false;
    this.moving = false;
    this.speed = 0;
    this.hidden = false; // crouched inside a bush
    this.stepPhase = 0; // walk-cycle phase for the little bobbing animation
    this.noise = 0; // current noise radius, for guards and the HUD
  }

  reset(level) {
    this.level = level;
    this.x = level.playerStart.x;
    this.y = level.playerStart.y;
    this.dirX = 0;
    this.dirY = 1;
    this.sneaking = false;
    this.moving = false;
    this.speed = 0;
    this.hidden = false;
    this.noise = 0;
  }

  update(dt, input) {
    input.cancelClickOnKey();
    const keys = input.moveVector();
    let vx = 0, vy = 0;
    this.sneaking = input.sneaking;

    if (keys) {
      vx = keys.x;
      vy = keys.y;
    } else if (input.clickTarget) {
      // Click-to-walk: steer toward the clicked point, stop on arrival.
      const dx = input.clickTarget.x - this.x;
      const dy = input.clickTarget.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 6) {
        input.clearClickTarget();
      } else {
        vx = dx / dist;
        vy = dy / dist;
      }
    }

    const speed = this.sneaking ? PLAYER_SNEAK_SPEED : PLAYER_WALK_SPEED;
    this.moving = vx !== 0 || vy !== 0;
    this.speed = this.moving ? speed : 0;
    if (this.moving) {
      this.dirX = vx;
      this.dirY = vy;
      this.stepPhase += dt * (this.sneaking ? 5 : 9);
      const moved = this.level.moveCircle(
        this.x, this.y,
        this.x + vx * speed * dt, this.y + vy * speed * dt,
        PLAYER_RADIUS,
      );
      this.x = moved.x;
      this.y = moved.y;
    }

    // Noise: walking is audible nearby, sneaking is silent.
    this.noise = this.moving
      ? (this.sneaking ? NOISE_RADIUS_SNEAK : NOISE_RADIUS_WALK)
      : 0;

    // Hidden means crouched inside a bush: a guard must be almost on top of you.
    this.hidden = this.sneaking && this.level.inBush(this.x, this.y);
  }

  // Tile the thief stands on, for the HUD and the guard's bush check.
  tile() {
    return { tx: Math.floor(this.x / TILE), ty: Math.floor(this.y / TILE) };
  }

  // Pick up any gem underfoot; returns how many were taken this frame.
  collectGems() {
    let taken = 0;
    for (const gem of this.level.gems) {
      if (!gem.taken && Math.hypot(gem.x - this.x, gem.y - this.y) < 22) {
        gem.taken = true;
        taken++;
      }
    }
    return taken;
  }

  // Is the thief standing on the lantern?
  onLantern() {
    const l = this.level.lantern;
    return l && !l.taken && Math.hypot(l.x - this.x, l.y - this.y) < 24;
  }

  takeLantern() {
    this.level.lantern.taken = true;
  }

  // Is the thief standing on the exit?
  onExit() {
    const e = this.level.exit;
    return Math.hypot(e.x - this.x, e.y - this.y) < 22;
  }

  // Facing angle in radians, for drawing the little hooded figure.
  facingAngle() {
    return Math.atan2(this.dirY, this.dirX);
  }
}
