# Sonic 3D — Hybrid Prototype

A small browser-based 3D platforming prototype with a third-person chase camera.

## Gameplay direction
- Adventure-inspired free movement through a 3D level
- Generations-inspired boost
- Jumping and a basic homing attack
- Collectible rings, targets, a checkpoint marker, and a finish gate

## Controls
- W / Up: move forward
- S / Down: move backward
- A / Left and D / Right: steer
- Space: jump
- Shift: boost
- E: homing attack (when a target is nearby)
- R: restart

## Run locally
This uses Three.js as an ES module from jsDelivr, so you need an internet connection and a local web server.

For example, in this folder run:
`python -m http.server 8000`

Then open `http://localhost:8000`.

You can also upload all four files to a GitHub repository and enable GitHub Pages using **Deploy from a branch**, `main`, and `/ (root)`.

## Project files
- `index.html`: page structure and HUD
- `style.css`: menus and HUD styling
- `game.js`: Three.js scene and gameplay
