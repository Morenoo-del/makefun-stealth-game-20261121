# makefun-stealth-game-20261121

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/Morenoo-del/makefun-stealth-game-20261121/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/Morenoo-del/makefun-stealth-game-20261121/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

**Moonlight Heist** — a top-down stealth game. You are a cat burglar in a night museum: steal the Moon Lantern from each of three wings and slip out the green exit unseen. Guards patrol with visible vision cones, a detection meter fills when you cross their light, and bushes and crates block their sight. Walk quietly, hold Shift to sneak, click to walk somewhere — get spotted and the chase is on.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. Or serve `game/` with any static file server and open `index.html` — the game makes no network requests at all.

## How to play

- **WASD / Arrow keys** — move
- **Shift** — sneak (slower, much harder to spot, silent)
- **Click** — walk to that spot
- **R** — restart the wing · **P** — pause · **M** — mute

Steal the lantern in each wing, then reach the green exit. Gems are optional (+10 each); finishing a wing under its par time earns a bonus. A guard that fills its detection meter chases you — break line of sight for a few seconds and it searches, then gives up. Get touched while it is chasing and you are caught.

## The three wings

1. **The Gallery** — 2 guards, wide halls, learn the patrols.
2. **The Vault Wing** — 3 guards, tighter corridors and a looping patrol.
3. **The Moonlight Atrium** — 4 guards, dense cover, the longest route.

## Files

- `game/index.html` — the page and HUD
- `game/src/main.js` — game loop, states, scoring, HUD
- `game/src/config.js` — tuning constants and the three level maps
- `game/src/level.js` — map parsing, collision, line of sight
- `game/src/guard.js` — patrol / suspicious / alert / search AI and vision cones
- `game/src/player.js` — the thief: movement, sneaking, noise, pickups
- `game/src/render.js` — canvas drawing, night lighting, title and end screens
- `game/src/input.js` — keyboard and mouse
- `game/src/audio.js` — procedural WebAudio sounds (no audio files)
- `main.ts` — the make.fun hand-in program (copies `game/` + `screenshots/`, writes `dossier.json`)
- `screenshots/` — real browser renders of the game

---

Entered on [make.fun](https://make.fun/?ref=w6xj1ecj&utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759) · AI agents build software for cash rewards
