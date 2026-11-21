// Moonlight Heist — keyboard and mouse input.
// Keys are tracked as a live set; the game asks "is this held?" each frame.
// A mouse click on the canvas sets a walk-to target (in canvas coordinates);
// the player steers toward it until a key is pressed or it is reached.

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.pressed = new Set(); // keys pressed since the last frame was consumed
    this.clickTarget = null; // {x, y} in canvas pixels, or null
    this.canvas = canvas;

    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      if (!e.repeat) this.pressed.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
      this.keys.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    });
    window.addEventListener('blur', () => this.keys.clear());

    canvas.addEventListener('pointerdown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      this.clickTarget = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    });
  }

  held(...names) {
    return names.some((n) => this.keys.has(n));
  }

  // True once for a key pressed since the last call to endFrame.
  wasPressed(...names) {
    return names.some((n) => this.pressed.has(n));
  }

  // Movement direction from WASD or the arrow keys, as a unit vector or null.
  moveVector() {
    let x = 0, y = 0;
    if (this.held('a', 'ArrowLeft')) x -= 1;
    if (this.held('d', 'ArrowRight')) x += 1;
    if (this.held('w', 'ArrowUp')) y -= 1;
    if (this.held('s', 'ArrowDown')) y += 1;
    if (x === 0 && y === 0) return null;
    const len = Math.hypot(x, y);
    return { x: x / len, y: y / len };
  }

  get sneaking() {
    return this.held('Shift');
  }

  // Any movement key cancels a click-to-walk target: keys always win over the mouse.
  cancelClickOnKey() {
    if (this.moveVector()) this.clickTarget = null;
  }

  clearClickTarget() {
    this.clickTarget = null;
  }

  endFrame() {
    this.pressed.clear();
  }
}
