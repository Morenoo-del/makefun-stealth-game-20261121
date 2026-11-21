// Moonlight Heist — configuration: tile size, tuning constants and the three levels.
// A level map is 20 rows of 30 characters:
//   # wall   . floor   B bush (blocks sight, hides a crouched thief)
//   C crate (blocks sight and movement)   P player start   A the Moon Lantern
//   E exit   g gem (optional, +10 score)   guards are placed by waypoints below.

export const TILE = 32;
export const COLS = 30;
export const ROWS = 20;
export const VIEW_W = COLS * TILE; // 960
export const VIEW_H = ROWS * TILE; // 640

export const PLAYER_WALK_SPEED = 150;
export const PLAYER_SNEAK_SPEED = 82;
export const PLAYER_RADIUS = 11;

export const GUARD_PATROL_SPEED = 56;
export const GUARD_SUSPICIOUS_SPEED = 78;
export const GUARD_CHASE_SPEED = 132;
export const GUARD_RADIUS = 12;

export const VISION_RANGE = 195;
export const VISION_FOV = 1.35; // radians, about 77 degrees
export const VISION_RANGE_SNEAK = 140; // a crouched thief is harder to spot
export const VISION_RANGE_BUSH = 70; // inside a bush you must be almost on top of a guard

export const DETECT_FILL = 1.5; // detection meter per second at point blank
export const DETECT_DECAY = 0.55;
export const SUSPICIOUS_AT = 0.35; // meter level where a guard gets curious
export const NOISE_RADIUS_WALK = 46;
export const NOISE_RADIUS_SNEAK = 0;

export const GEM_SCORE = 10;
export const LANTERN_SCORE = 100;
export const LEVEL_TIME_BONUS = 5; // points per second under par, at most

export const LEVELS = [
  {
    name: 'The Gallery',
    par: 75,
    map: [
      '##############################',
      '#P........BB......g..........#',
      '#.........BB.................#',
      '#....####......####.....###..#',
      '#....####......####.....###..#',
      '#............................#',
      '#..B.....C........C......B...#',
      '#..B.....C........C......B...#',
      '#............................#',
      '#....####......####.....###..#',
      '#....####......####.....###..#',
      '#............................#',
      '#..g.....C........C......g...#',
      '#............................#',
      '#....####......####.....###..#',
      '#....####......####.....###..#',
      '#............................#',
      '#..B.....A........C......E...#',
      '#............................#',
      '##############################',
    ],
    guards: [
      { x: 4, y: 5, waypoints: [[4, 5], [25, 5]], pause: 1.2 },
      { x: 20, y: 2, waypoints: [[20, 2], [20, 17]], pause: 0.8 },
    ],
  },
  {
    name: 'The Vault Wing',
    par: 90,
    map: [
      '##############################',
      '#P...#.....BB......g....#....#',
      '#....#.....BB...........#....#',
      '#....#..C........C......#....#',
      '#....#..................#....#',
      '#....####..######..###..#....#',
      '#............................#',
      '#..B......C........C......B..#',
      '#............................#',
      '#....#..####......####..#....#',
      '#....#..####......####..#....#',
      '#............................#',
      '#..g......C........C......g..#',
      '#............................#',
      '#....####..######..####......#',
      '#............................#',
      '#....#.....BB......A.....#...#',
      '#....#.....BB..........E#....#',
      '#............................#',
      '##############################',
    ],
    guards: [
      { x: 2, y: 6, waypoints: [[2, 6], [27, 6]], pause: 1.0 },
      { x: 14, y: 1, waypoints: [[14, 1], [14, 18]], pause: 0.7 },
      { x: 24, y: 13, waypoints: [[24, 13], [24, 18], [10, 18], [10, 13]], pause: 0.9 },
    ],
  },
  {
    name: 'The Moonlight Atrium',
    par: 110,
    map: [
      '##############################',
      '#P...BB.......####......g....#',
      '#....BB.......####...........#',
      '#............................#',
      '#..####...C........C...####..#',
      '#..####...C........C...####..#',
      '#............................#',
      '#....BB......####......BB....#',
      '#....BB......####......BB....#',
      '#............................#',
      '#..C.....####......####.....C#',
      '#..C.....####......####.....C#',
      '#............................#',
      '#....BB......####......BB....#',
      '#....BB......####......BB....#',
      '#............................#',
      '#..g....C........C.......A...#',
      '#............................#',
      '#......................E.....#',
      '##############################',
    ],
    guards: [
      { x: 3, y: 2, waypoints: [[3, 2], [26, 2]], pause: 0.8 },
      { x: 26, y: 9, waypoints: [[26, 9], [3, 9]], pause: 1.1 },
      { x: 14, y: 3, waypoints: [[14, 3], [14, 16]], pause: 0.6 },
      { x: 8, y: 17, waypoints: [[8, 17], [21, 17], [21, 12], [8, 12]], pause: 1.0 },
    ],
  },
];

// Sanity check a level definition: every row 30 wide, only known tiles, exactly one
// player start, one lantern and one exit. Throws a readable error while developing.
export function validateLevel(level) {
  if (level.map.length !== ROWS) throw new Error(level.name + ': map must have ' + ROWS + ' rows');
  let counts = { P: 0, A: 0, E: 0 };
  for (let y = 0; y < ROWS; y++) {
    const row = level.map[y];
    if (row.length !== COLS) throw new Error(level.name + ': row ' + y + ' is ' + row.length + ' wide, want ' + COLS);
    for (let x = 0; x < COLS; x++) {
      const ch = row[x];
      if (!'# .BCPAEg'.includes(ch)) throw new Error(level.name + ': unknown tile ' + JSON.stringify(ch) + ' at ' + x + ',' + y);
      if (counts[ch] !== undefined) counts[ch]++;
    }
  }
  for (const key of ['P', 'A', 'E']) {
    if (counts[key] !== 1) throw new Error(level.name + ': need exactly one ' + key + ', found ' + counts[key]);
  }
  for (const g of level.guards) {
    for (const [wx, wy] of g.waypoints) {
      if (level.map[wy][wx] !== '.') throw new Error(level.name + ': guard waypoint ' + wx + ',' + wy + ' is not open floor');
    }
  }
}

// Tile helpers shared by the level, guard and player code.
export function tileAt(level, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return '#';
  return level.map[ty][tx];
}

export function isSolidTile(ch) {
  return ch === '#' || ch === 'C';
}

export function blocksSightTile(ch) {
  return ch === '#' || ch === 'C' || ch === 'B';
}
