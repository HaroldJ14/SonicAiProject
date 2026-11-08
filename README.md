# Sonic 3D — Hybrid Prototype

A small browser-based 3D platforming prototype with a third-person chase camera:
Adventure-style free movement plus a Generations-style boost gauge.

## Gameplay
- Run, jump (hold Space for a higher jump) and boost through a 190-unit level
- **Boost gauge**: Shift boosts while the gauge lasts; rings and defeated bots refill it
- **Homing attack**: a yellow reticle marks the lock-on target; press E to fly into it
- **Enemies**: red bots patrol the path or hover. Jumping, boosting or homing into them destroys them; touching them otherwise hurts
- **Hazards**: spikes and two pits. Getting hurt scatters your rings; getting hurt with no rings (or falling) costs a life
- **Helpers**: dash pads, a spring, a checkpoint arch (respawn point)
- Timer, score, rank (S/A/B/C) and a saved best time

## Controls
- W / Up: forward, S / Down: back, A / D or Left / Right: steer
- Space: jump, Shift: boost, E: homing attack
- P or Esc: pause, R: restart, M: mute, Enter: start / play again

## Run locally
This uses Three.js as an ES module from jsDelivr (with an unpkg fallback), so you need an internet connection and a local web server.

In this folder run `python -m http.server 8000`, then open `http://localhost:8000`.

You can also upload all four files to a GitHub repository and enable GitHub Pages (Deploy from a branch, `main`, `/ (root)`).

## Project files
- `index.html`: page structure, HUD and menus
- `style.css`: menus and HUD styling
- `game.js`: Three.js scene and gameplay (tweak `SETTINGS` at the top)

Add `?debug` to the URL to expose `window.__sonic` for testing.
