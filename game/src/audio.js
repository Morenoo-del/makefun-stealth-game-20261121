// Moonlight Heist — all sound is synthesized with WebAudio, no audio files.
// A tiny synth: short blips and sweeps for footsteps, pickups, alerts and jingles,
// plus a quiet two-note night drone that hums under the game. Created lazily on
// the first user gesture, so browsers allow it, and muted with M.

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.drone = null;
    this.stepTimer = 0;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.35;
    this.master.connect(this.ctx.destination);
    this.startDrone();
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.35;
  }

  // A soft, slow night drone: two detuned low sines breathing through a low-pass.
  startDrone() {
    const ctx = this.ctx;
    const gain = ctx.createGain();
    gain.gain.value = 0.05;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    const o1 = ctx.createOscillator();
    o1.type = 'sine'; o1.frequency.value = 55;
    const o2 = ctx.createOscillator();
    o2.type = 'sine'; o2.frequency.value = 55.6;
    const lfo = ctx.createOscillator();
    lfo.type = 'sine'; lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.025;
    lfo.connect(lfoGain); lfoGain.connect(gain.gain);
    o1.connect(filter); o2.connect(filter);
    filter.connect(gain); gain.connect(this.master);
    o1.start(); o2.start(); lfo.start();
    this.drone = { o1, o2, lfo, gain };
  }

  // One short tone: a frequency sweep with a quick fade, the building block.
  blip(freqFrom, freqTo, duration, type, volume, when = 0) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freqFrom, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqTo), t + duration);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain); gain.connect(this.master);
    osc.start(t); osc.stop(t + duration + 0.05);
  }

  footstep(sneaking) {
    if (!this.ctx || this.muted) return;
    // A muffled tap; sneaking is softer and lower.
    this.blip(sneaking ? 90 : 140, sneaking ? 60 : 90, 0.07, 'triangle', sneaking ? 0.05 : 0.11);
  }

  gem() {
    this.blip(880, 1320, 0.14, 'sine', 0.16);
    this.blip(1320, 1760, 0.16, 'sine', 0.12, 0.07);
  }

  lantern() {
    // A little rising fanfare when the Moon Lantern is taken.
    [523, 659, 784, 1047].forEach((f, i) => this.blip(f, f, 0.22, 'triangle', 0.16, i * 0.09));
  }

  suspicious() {
    // A guard's questioning "huh?": a short rising chirp.
    this.blip(300, 520, 0.16, 'square', 0.07);
  }

  alarm() {
    // The alert sting: two sharp falling notes, then a low thud.
    this.blip(740, 370, 0.22, 'sawtooth', 0.14);
    this.blip(740, 370, 0.22, 'sawtooth', 0.14, 0.22);
    this.blip(120, 55, 0.3, 'sine', 0.2, 0.44);
  }

  caught() {
    [440, 349, 262, 196].forEach((f, i) => this.blip(f, f * 0.94, 0.24, 'sawtooth', 0.13, i * 0.14));
  }

  win() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => this.blip(f, f, 0.3, 'triangle', 0.15, i * 0.11));
  }

  click() {
    this.blip(600, 500, 0.06, 'sine', 0.08);
  }

  // Called every frame with the player's speed: paces footsteps to the stride.
  updateSteps(dt, speed, sneaking) {
    if (speed < 20) { this.stepTimer = 0; return; }
    this.stepTimer -= dt;
    if (this.stepTimer <= 0) {
      this.footstep(sneaking);
      this.stepTimer = sneaking ? 0.55 : 0.34;
    }
  }
}
