// Moonlight Heist — the game itself: state machine, main loop, HUD and scoring.
// States: title → playing → (caught | levelComplete) → playing → … → win.
// Three wings, one lantern each: steal it, then reach the green exit unseen.
// The `?shot=` URL parameter stages a real game state for screenshots:
//   ?shot=play   starts level 1 already playing
//   ?shot=alert  starts level 1 with a guard in full chase, close behind you
//   ?shot=caught shows the caught screen
//   ?shot=win    shows the final win screen
// These render the game's own code, nothing staged outside it.

import { LEVELS, validateLevel, GEM_SCORE, LANTERN_SCORE, LEVEL_TIME_BONUS } from './config.js';
import { Level } from './level.js';
import { Player } from './player.js';
import { Guard } from './guard.js';
import { Renderer } from './render.js';
import { Input } from './input.js';
import { SoundBank } from './audio.js';

const canvas = document.getElementById('game');
const renderer = new Renderer(canvas);
const input = new Input(canvas);
const sounds = new SoundBank();

const $ = (id) => document.getElementById(id);

export class Game {
  constructor() {
    this.levelIndex = 0;
    this.score = 0;
    this.gems = 0;
    this.state = 'title'; // title | playing | paused | caught | levelComplete | win
    this.time = 0;
    this.levelTime = 0;
    this.totalTime = 0;
    this.hasLantern = false;
    this.toastTimer = 0;
    this.loadLevel(0);
  }

  loadLevel(index) {
    this.levelIndex = index;
    const def = LEVELS[index];
    validateLevel(def);
    this.level = new Level(def);
    this.player = new Player(this.level);
    this.guards = def.guards.map((g) => new Guard(g, this.level));
    this.hasLantern = false;
    this.levelTime = 0;
  }

  startGame() {
    this.score = 0;
    this.gems = 0;
    this.totalTime = 0;
    this.loadLevel(0);
    this.state = 'playing';
    sounds.ensure();
    sounds.click();
    this.toast('Wing 1: ' + this.level.name + ' — steal the lantern!');
  }

  nextLevel() {
    if (this.levelIndex + 1 >= LEVELS.length) {
      this.state = 'win';
      sounds.win();
      return;
    }
    this.loadLevel(this.levelIndex + 1);
    this.state = 'playing';
    this.toast('Wing ' + (this.levelIndex + 1) + ': ' + this.level.name);
  }

  retryLevel() {
    this.loadLevel(this.levelIndex);
    this.state = 'playing';
    this.toast('Try again — watch the patrols.');
  }

  toast(text) {
    const el = $('toast');
    el.textContent = text;
    el.style.opacity = '1';
    this.toastTimer = 2.6;
  }

  levelTimeText() {
    return formatTime(this.levelTime);
  }

  totalTimeText() {
    return formatTime(this.totalTime);
  }

  update(dt) {
    if (this.state === 'playing') {
      this.time += dt;
      this.levelTime += dt;
      this.totalTime += dt;
      this.player.update(dt, input);
      sounds.updateSteps(dt, this.player.speed, this.player.sneaking);

      const taken = this.player.collectGems();
      if (taken > 0) {
        this.gems += taken;
        this.score += taken * GEM_SCORE;
        sounds.gem();
        this.toast('Gem +' + GEM_SCORE);
      }
      if (!this.hasLantern && this.player.onLantern()) {
        this.hasLantern = true;
        this.player.takeLantern();
        this.score += LANTERN_SCORE;
        sounds.lantern();
        this.toast('Moon Lantern taken! Now reach the green exit.');
      }
      if (this.hasLantern && this.player.onExit()) {
        const bonus = Math.max(0, Math.round((this.level.par - this.levelTime) * LEVEL_TIME_BONUS));
        this.score += bonus;
        this.state = 'levelComplete';
        sounds.win();
        return;
      }

      for (const guard of this.guards) {
        const event = guard.update(dt, this.player, sounds);
        if (event === 'alert') this.toast('Spotted! Run — break line of sight!');
        else if (event === 'suspicious') this.toast('A guard heard something…');
        else if (event === 'lost') this.toast('You lost them. Stay low.');
        else if (event === 'caught') {
          this.state = 'caught';
          sounds.caught();
          return;
        }
      }
    }

    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) $('toast').style.opacity = '0';
    }
  }

  draw() {
    if (this.state === 'title') renderer.drawTitle(this);
    else if (this.state === 'paused') renderer.drawPaused(this);
    else if (this.state === 'caught') renderer.drawCaught(this);
    else if (this.state === 'levelComplete') renderer.drawLevelComplete(this);
    else if (this.state === 'win') renderer.drawWin(this);
    else renderer.drawGame(this);
    this.updateHud();
  }

  updateHud() {
    $('levelNum').textContent = this.levelIndex + 1;
    $('levelName').textContent = this.level.name;
    $('gemCount').textContent = this.gems;
    $('scoreNum').textContent = this.score;
    $('timeNum').textContent = formatTime(this.totalTime);
    $('objectiveText').textContent = this.hasLantern
      ? 'Reach the green exit!'
      : 'Steal the Moon Lantern';
    let worst = 0;
    let label = 'Unseen';
    for (const guard of this.guards) worst = Math.max(worst, guard.meter);
    if (this.guards.some((g) => g.state === 'alert')) label = 'ALERT — run!';
    else if (worst >= 0.35) label = 'Suspicious…';
    else if (worst > 0.02) label = 'Glanced…';
    $('alertLabel').textContent = label;
    const fill = $('alertfill');
    fill.style.width = Math.round(worst * 100) + '%';
    fill.style.background = worst > 0.8 ? '#ff4040' : worst > 0.35 ? '#ffb020' : '#ffd76a';
    $('noiseNum').textContent = this.player.noise > 0 ? 'walking' : (this.player.sneaking ? 'silent' : 'quiet');
    $('soundNum').textContent = sounds.muted ? 'off' : 'on';
  }
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m + ':' + String(s).padStart(2, '0');
}

// --- boot, loop and the screenshot staging hooks ---------------------------
const game = new Game();

function handleKeys() {
  if (input.wasPressed('Enter', ' ')) {
    if (game.state === 'title') game.startGame();
    else if (game.state === 'levelComplete') game.nextLevel();
  }
  if (input.wasPressed('r', 'R')) {
    if (game.state === 'caught' || game.state === 'win') game.retryLevel();
    else if (game.state === 'playing') game.retryLevel();
  }
  if (input.wasPressed('p', 'P')) {
    if (game.state === 'playing') game.state = 'paused';
    else if (game.state === 'paused') game.state = 'playing';
  }
  if (input.wasPressed('m', 'M')) {
    sounds.ensure();
    sounds.setMuted(!sounds.muted);
  }
}

// Clicking anywhere wakes the audio (browsers need a gesture) and starts
// the game from the title screen.
canvas.addEventListener('pointerdown', () => {
  sounds.ensure();
  if (game.state === 'title') game.startGame();
});

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  handleKeys();
  game.update(dt);
  game.draw();
  input.endFrame();
  requestAnimationFrame(frame);
}

// Stage a real game state from ?shot=, for the maker's own screenshots.
function applyShotParam() {
  const shot = new URLSearchParams(location.search).get('shot');
  if (!shot) return;
  if (shot === 'play') {
    game.startGame();
  } else if (shot === 'alert') {
    game.startGame();
    // Stage the chase mid-map so the red cone reads clearly: the thief in
    // the open hall, a guard in full chase closing in from the east.
    game.player.x = 14 * 32 + 16;
    game.player.y = 5 * 32 + 16;
    const guard = game.guards[0];
    guard.state = 'alert';
    guard.meter = 1;
    guard.x = game.player.x + 150;
    guard.y = game.player.y;
    guard.angle = Math.PI; // facing the thief, cone right on them
    guard.lastSeen = { x: game.player.x, y: game.player.y };
  } else if (shot === 'caught') {
    game.startGame();
    game.state = 'caught';
  } else if (shot === 'win') {
    game.startGame();
    game.score = 342;
    game.gems = 5;
    game.totalTime = 184;
    game.state = 'win';
  }
}

applyShotParam();
requestAnimationFrame(frame);

// A small handle for the maker's own play-tests (state inspection only).
window.__stealth = {
  game,
  state: () => game.state,
  player: () => ({ x: game.player.x, y: game.player.y, hidden: game.player.hidden }),
  guards: () => game.guards.map((g) => ({ state: g.state, meter: g.meter, x: g.x, y: g.y })),
  score: () => game.score,
  hasLantern: () => game.hasLantern,
};
