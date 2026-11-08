# Sonic 3D — Hybrid Generations

A browser-based 3D platforming prototype with Adventure-style free movement and a Generations-style boost gauge. Now with **three full levels**, item monitors, moving platforms, and progression.

## Levels

1. **Green Hill** — Classic grassy speedway with pits, springs and bots  
2. **Chemical Plant** — Toxic tubes, moving platforms and denser hazards  
3. **Star Light** — Neon night stage with floating platforms and long arcs  

Clear a level to unlock the next. Best times are saved per stage.

## Gameplay

- Run, jump (hold Space for higher) and boost through the stage  
- **Boost gauge**: Shift drains the gauge; rings, enemies and monitors refill it  
- **Homing attack**: yellow reticle locks on; press **E** to dive into the target  
- **Enemies**: red bots — jump, boost or home into them to destroy them  
- **Hazards**: spikes and pits. Hurt with rings scatters them; no rings (or falling) costs a life  
- **Helpers**: dash pads, springs, checkpoint arches, **item monitors**  
- **Monitors**: Rings (+10), Boost (full gauge), Invincible (8 s), 1-UP  
- Timer, score, rank (S/A/B/C) and per-level best times  

## Controls

| Key | Action |
|-----|--------|
| W / ↑ | Forward |
| S / ↓ | Back |
| A / D or ← / → | Steer |
| Space | Jump (hold = higher) |
| Shift | Boost |
| E | Homing attack |
| P / Esc | Pause |
| R | Restart level |
| M | Mute |
| Enter | Confirm / start |

## Run locally

Needs an internet connection for Three.js (jsDelivr / unpkg) and a local web server:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

You can also deploy the four files to GitHub Pages.

## Project files

- `index.html` — HUD, menus, level select  
- `style.css` — menus and HUD styling  
- `game.js` — Three.js scene, levels and gameplay (tweak `SETTINGS` or `LEVELS`)  

Add `?debug` to the URL to expose `window.__sonic` (teleport, unlockAll, etc.).
