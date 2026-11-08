# Green Hill Dash — 3D browser-game starter

## Run it
Because this project uses JavaScript modules, open it through a local web server rather than double-clicking `index.html`.

Easy options:
- VS Code: install/use the Live Server extension, then choose **Open with Live Server**.
- Python: open a terminal in this folder and run `python -m http.server 8000`, then visit `http://localhost:8000`.

You need an internet connection for the Three.js library loaded from jsDelivr.

## Files
- `index.html` — page structure and HUD
- `style.css` — visual styling
- `game.js` — Three.js scene, player, rings, obstacles, controls, and game loop

## Controls
- A / D or left / right arrows: move
- Space: jump
- Shift: boost
- R: restart

The blue character is a placeholder made from basic shapes. You can replace the `player` group with a 3D model exported from Blender as a GLB/GLTF later.
