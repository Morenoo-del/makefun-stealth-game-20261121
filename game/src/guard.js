// Moonlight Heist — the guards. Each one walks a patrol route, looks around
// with a vision cone, and keeps a detection meter on the thief:
//   patrol     — walks waypoints, pauses and looks around at each one
//   suspicious — saw something briefly, or heard a noise: walks over to look
//   alert      — meter full: chases the thief until caught or the trail goes cold
//   search     — lost the thief while alert: checks the last seen spot, then gives up
// A guard never teleports and never sees through walls: sight needs distance,
// a cone angle and a clear line of sight, and sneaking or hiding in a bush
// shrinks the range a lot.

import {
  TILE, GUARD_PATROL_SPEED, GUARD_SUSPICIOUS_SPEED, GUARD_CHASE_SPEED,
  GUARD_RADIUS, VISION_RANGE, VISION_FOV, VISION_RANGE_SNEAK,
  VISION_RANGE_BUSH, DETECT_FILL, DETECT_DECAY, SUSPICIOUS_AT,
} from './config.js';

export class Guard {
  constructor(def, level) {
    this.level = level;
    this.x = def.x * TILE + TILE / 2;
    this.y = def.y * TILE + TILE / 2;
    this.waypoints = def.waypoints.map(([wx, wy]) => ({ x: wx * TILE + TILE / 2, y: wy * TILE + TILE / 2 }));
    this.pause = def.pause || 1;
    this.wpIndex = 0;
    this.waitTimer = 0;
    this.angle = Math.PI / 2; // facing down the patrol route at first
    this.state = 'patrol';
    this.meter = 0; // 0 unseen, 1 fully spotted
    this.lastSeen = null; // {x, y} where the thief was last seen
    this.loseTimer = 0; // seconds without sight while alert
    this.searchTimer = 0;
    this.suspicionPoint = null; // where a noise came from, or a glimpse
    this.walkPhase = 0;
    this.moving = false;
  }

  reset(def) {
    const fresh = new Guard(def, this.level);
    Object.assign(this, fresh);
  }

  // How far this guard can see right now, given how the thief is moving.
  visionRange(player) {
    if (player.hidden) return VISION_RANGE_BUSH;
    if (player.sneaking) return VISION_RANGE_SNEAK;
    return VISION_RANGE;
  }

  // Can this guard see the thief right now? Distance, cone angle and a clear
  // line of sight all have to agree.
  canSee(player) {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    const range = this.visionRange(player);
    if (dist > range) return false;
    if (dist > 26) {
      const targetAngle = Math.atan2(dy, dx);
      let diff = targetAngle - this.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      if (Math.abs(diff) > VISION_FOV / 2) return false;
    }
    return this.level.hasLineOfSight(this.x, this.y, player.x, player.y);
  }

  // Steer toward a point at a given speed, sliding along walls. Returns true
  // when the point is reached.
  moveToward(tx, ty, speed, dt) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 4) return true;
    const step = Math.min(dist, speed * dt);
    const nx = this.x + (dx / dist) * step;
    const ny = this.y + (dy / dist) * step;
    this.angle = Math.atan2(dy, dx);
    this.walkPhase += dt * 8;
    this.moving = true;
    const moved = this.level.moveCircle(this.x, this.y, nx, ny, GUARD_RADIUS);
    this.x = moved.x;
    this.y = moved.y;
    return dist - step < 4;
  }

  // Turn in place toward an angle, at most `turnRate` radians per second.
  turnToward(targetAngle, turnRate, dt) {
    let diff = targetAngle - this.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const step = Math.max(-turnRate * dt, Math.min(turnRate * dt, diff));
    this.angle += step;
    return Math.abs(diff - step) < 0.05;
  }

  // One frame of guard behaviour. Returns an event string for the game to
  // react to: 'suspicious' (first glimpse), 'alert' (meter just filled),
  // 'lost' (gave up the chase), 'caught' (touched the thief), or null.
  update(dt, player, sounds) {
    this.moving = false;
    const sees = this.canSee(player);
    const dist = Math.hypot(player.x - this.x, player.y - this.y);

    // --- detection meter -------------------------------------------------
    if (sees) {
      // Closer and faster-moving thieves fill the meter quicker.
      const closeness = 1 - dist / Math.max(1, this.visionRange(player));
      const rate = DETECT_FILL * (0.35 + 0.85 * closeness) * (player.sneaking ? 0.55 : 1);
      const before = this.meter;
      this.meter = Math.min(1, this.meter + rate * dt);
      this.lastSeen = { x: player.x, y: player.y };
      this.loseTimer = 0;
      if (before < SUSPICIOUS_AT && this.meter >= SUSPICIOUS_AT && this.state === 'patrol') {
        this.state = 'suspicious';
        this.suspicionPoint = { x: player.x, y: player.y };
        if (sounds) sounds.suspicious();
        return 'suspicious';
      }
      if (this.meter >= 1 && this.state !== 'alert') {
        this.state = 'alert';
        if (sounds) sounds.alarm();
        return 'alert';
      }
    } else {
      this.meter = Math.max(0, this.meter - DETECT_DECAY * dt);
      if (this.state === 'alert') {
        this.loseTimer += dt;
        if (this.loseTimer > 4) {
          this.state = 'search';
          this.searchTimer = 3;
          return 'lost';
        }
      }
    }

    // --- hearing: walking feet are audible nearby ------------------------
    if (player.noise > 0 && dist < player.noise && this.state === 'patrol') {
      this.state = 'suspicious';
      this.suspicionPoint = { x: player.x, y: player.y };
      if (sounds) sounds.suspicious();
      return 'suspicious';
    }

    // --- state machine ----------------------------------------------------
    if (this.state === 'patrol') this.updatePatrol(dt);
    else if (this.state === 'suspicious') this.updateSuspicious(dt, player, sees);
    else if (this.state === 'alert') this.updateAlert(dt, player);
    else if (this.state === 'search') this.updateSearch(dt);

    // Caught: an alert guard that reaches the thief ends the run.
    if (this.state === 'alert' && dist < GUARD_RADIUS + 13) return 'caught';
    return null;
  }

  updatePatrol(dt) {
    if (this.waitTimer > 0) {
      // Paused at a waypoint: slowly scan the area.
      this.waitTimer -= dt;
      this.angle += dt * 0.9;
      return;
    }
    const target = this.waypoints[this.wpIndex];
    if (this.moveToward(target.x, target.y, GUARD_PATROL_SPEED, dt)) {
      this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
      this.waitTimer = this.pause;
    }
  }

  updateSuspicious(dt, player, sees) {
    if (sees && this.lastSeen) {
      // Still glimpsing the thief: face them and keep watching.
      this.turnToward(Math.atan2(player.y - this.y, player.x - this.x), 3.2, dt);
      return;
    }
    if (this.suspicionPoint) {
      if (this.moveToward(this.suspicionPoint.x, this.suspicionPoint.y, GUARD_SUSPICIOUS_SPEED, dt)) {
        // Arrived and found nothing: look around, then go back to patrol.
        this.suspicionPoint = null;
        this.waitTimer = 1.4;
        this.state = 'patrol';
        this.wpIndex = this.nearestWaypoint();
      }
    }
  }

  updateAlert(dt, player) {
    // Chase the last seen position; while the thief is visible, chase them live.
    const target = this.canSee(player) ? player : this.lastSeen;
    if (target) this.moveToward(target.x, target.y, GUARD_CHASE_SPEED, dt);
  }

  updateSearch(dt) {
    this.searchTimer -= dt;
    if (this.searchTimer <= 0) {
      this.state = 'patrol';
      this.wpIndex = this.nearestWaypoint();
      this.waitTimer = 0.5;
      return;
    }
    if (this.lastSeen) {
      if (this.moveToward(this.lastSeen.x, this.lastSeen.y, GUARD_SUSPICIOUS_SPEED, dt)) {
        // Reached the last seen spot: stand and scan.
        this.angle += dt * 1.6;
      }
    }
  }

  nearestWaypoint() {
    let best = 0, bestDist = Infinity;
    this.waypoints.forEach((w, i) => {
      const d = Math.hypot(w.x - this.x, w.y - this.y);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    return best;
  }

  // Colour of this guard's vision cone and markers, by state.
  coneColor() {
    if (this.state === 'alert') return 'rgba(255, 64, 64, 0.30)';
    if (this.state === 'suspicious' || this.state === 'search') return 'rgba(255, 176, 32, 0.26)';
    return 'rgba(255, 214, 90, 0.20)';
  }

  marker() {
    if (this.state === 'alert') return '!';
    if (this.state === 'suspicious' || this.state === 'search') return '?';
    return null;
  }
}
