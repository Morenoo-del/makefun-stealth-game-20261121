// Moonlight Heist — the level: a parsed map, collision and line of sight.
// The map is a grid of tiles (see config.js). This module turns it into the
// lists the game needs (walls, bushes, gems, lantern, exit, player start) and
// answers the two questions movement and vision keep asking: "is this point
// blocked?" and "can a guard at A see a thief at B?".

import { TILE, COLS, ROWS, tileAt, isSolidTile, blocksSightTile } from './config.js';

export class Level {
  constructor(def) {
    this.def = def;
    this.name = def.name;
    this.par = def.par;
    this.walls = []; // {tx, ty} tiles that block movement
    this.crates = [];
    this.bushes = [];
    this.gems = []; // {x, y, taken} in pixels
    this.lantern = null; // {x, y, taken}
    this.exit = null; // {x, y}
    this.playerStart = null; // {x, y}

    for (let ty = 0; ty < ROWS; ty++) {
      for (let tx = 0; tx < COLS; tx++) {
        const ch = def.map[ty][tx];
        const cx = tx * TILE + TILE / 2;
        const cy = ty * TILE + TILE / 2;
        if (ch === '#') this.walls.push({ tx, ty });
        else if (ch === 'C') this.crates.push({ tx, ty });
        else if (ch === 'B') this.bushes.push({ tx, ty });
        else if (ch === 'g') this.gems.push({ x: cx, y: cy, taken: false });
        else if (ch === 'A') this.lantern = { x: cx, y: cy, taken: false };
        else if (ch === 'E') this.exit = { x: cx, y: cy };
        else if (ch === 'P') this.playerStart = { x: cx, y: cy };
      }
    }
  }

  // Is the tile at (tx, ty) solid for movement?
  solidAt(tx, ty) {
    return isSolidTile(tileAt(this.def, tx, ty));
  }

  // Does the tile at (tx, ty) block a guard's sight?
  sightBlockingAt(tx, ty) {
    return blocksSightTile(tileAt(this.def, tx, ty));
  }

  // Is the pixel point (x, y) inside a bush tile?
  inBush(x, y) {
    const tx = Math.floor(x / TILE);
    const ty = Math.floor(y / TILE);
    return tileAt(this.def, tx, ty) === 'B';
  }

  // Circle-vs-tile collision: try to move a circle of `radius` to (nx, ny);
  // returns the furthest reachable position, sliding along walls.
  moveCircle(x, y, nx, ny, radius) {
    let px = x, py = y;
    if (!this.circleHits(px, py, nx, py, radius)) px = nx;
    else {
      // Step toward the target in small increments so corners don't snag.
      const steps = 8;
      for (let i = 1; i <= steps; i++) {
        const ix = x + (nx - x) * (i / steps);
        if (this.circleHits(px, py, ix, py, radius)) break;
        px = ix;
      }
    }
    if (!this.circleHits(px, py, px, ny, radius)) py = ny;
    else {
      const steps = 8;
      for (let i = 1; i <= steps; i++) {
        const iy = y + (ny - y) * (i / steps);
        if (this.circleHits(px, py, px, iy, radius)) break;
        py = iy;
      }
    }
    return { x: px, y: py };
  }

  // Does a circle of `radius` centred at (x, y) overlap any solid tile?
  circleHits(x, y, nx, ny, radius) {
    const minTx = Math.floor((nx - radius) / TILE);
    const maxTx = Math.floor((nx + radius) / TILE);
    const minTy = Math.floor((ny - radius) / TILE);
    const maxTy = Math.floor((ny + radius) / TILE);
    for (let ty = minTy; ty <= maxTy; ty++) {
      for (let tx = minTx; tx <= maxTx; tx++) {
        if (!this.solidAt(tx, ty)) continue;
        const cx = Math.max(tx * TILE, Math.min(nx, tx * TILE + TILE));
        const cy = Math.max(ty * TILE, Math.min(ny, ty * TILE + TILE));
        const dx = nx - cx, dy = ny - cy;
        if (dx * dx + dy * dy < radius * radius) return true;
      }
    }
    return false;
  }

  // Line of sight: walk the segment from (x0, y0) to (x1, y1) in small steps;
  // any sight-blocking tile in the way means no line of sight.
  hasLineOfSight(x0, y0, x1, y1) {
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.max(1, Math.ceil(dist / 6));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t;
      if (this.sightBlockingAt(Math.floor(x / TILE), Math.floor(y / TILE))) return false;
    }
    return true;
  }

  // Distance from a pixel point to the exit, for the "getting warmer" hint.
  distanceToExit(x, y) {
    return Math.hypot(this.exit.x - x, this.exit.y - y);
  }
}
