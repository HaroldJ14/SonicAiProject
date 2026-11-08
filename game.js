// SONIC 3D — HYBRID GAMEPLAY PROTOTYPE
// Adventure-style movement + a Generations-inspired boost gauge.
// Free-running 3D level: rings, enemies, spikes, springs, dash pads, pits, checkpoint, goal.

const $ = (id) => document.getElementById(id);
function showError(msg) {
  const el = $('error');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

// Load Three.js (primary CDN, then a fallback CDN).
let THREE;
try {
  THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js')
    .catch(() => import('https://unpkg.com/three@0.160.0/build/three.module.js'));
} catch (err) {
  showError('Could not load Three.js. Check your internet connection and reload the page.');
  throw err;
}

const SETTINGS = {
  walkSpeed: 13,
  boostSpeed: 27,
  acceleration: 34,
  airControl: 0.58,
  jumpPower: 12,
  gravity: 30,
  levelLength: 190,
  worldWidth: 22,
  padSpeed: 38,
  springPower: 24,
  homingSpeed: 42,
  homingRange: 14,
  boostDrain: 20,   // gauge units per second while boosting
  boostRegen: 6,    // gauge units per second while not boosting
  startLives: 3
};

// Gaps in the ground: [near edge z, far edge z]
const PITS = [[-50, -57], [-132, -140]];
const inPit = (z, margin = 0) => PITS.some(([a, b]) => z < a - margin && z > b + margin);

const START_POS = new THREE.Vector3(0, 0, 7);
const CHECKPOINT_POS = new THREE.Vector3(0, 0, -95);
const CHECKPOINT_Z = -100;

const shortest = (a) => ((a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// ---------------------------------------------------------------- renderer / scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x79dfff);
scene.fog = new THREE.Fog(0x79dfff, 65, 190);

const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.1, 300);
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true });
} catch (err) {
  showError('WebGL is not available in this browser, so the game cannot start.');
  throw err;
}
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xe6faff, 0x527a39, 2.0));
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 1, far: 140 });
sun.shadow.camera.updateProjectionMatrix();
sun.shadow.bias = -0.0005;
scene.add(sun, sun.target);
const SUN_OFFSET = new THREE.Vector3(-25, 45, 25);

// Materials (shared)
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });
const grassMat = mat(0x42b943);
const dirtMat = mat(0x7a5232);
const pathMat = mat(0xc58a43);
const markerMat = mat(0xf3d18b);
const blueMat = mat(0x0879e8, { roughness: 0.5 });
const creamMat = mat(0xffd9a2);
const redMat = mat(0xe63232);
const whiteMat = mat(0xffffff);
const goldMat = mat(0xffd52b, { metalness: 0.55, roughness: 0.24 });
const darkMat = mat(0x27384a);
const trunkMat = mat(0x875027);
const crownMat = mat(0x168d43);
const hillMats = [mat(0x48bd4b), mat(0x55c64e), mat(0x269b43)];

// ---------------------------------------------------------------- level geometry
// Ground and path are built in slabs so the pits are real holes.
const slabEdges = [75, ...PITS.flatMap(([a, b]) => [a, b]), -225];
for (let i = 0; i < slabEdges.length; i += 2) {
  const z0 = slabEdges[i], z1 = slabEdges[i + 1];
  const len = z0 - z1;
  const grass = new THREE.Mesh(new THREE.BoxGeometry(260, 6, len), [dirtMat, dirtMat, grassMat, dirtMat, dirtMat, dirtMat]);
  grass.position.set(0, -0.18 - 3, (z0 + z1) / 2);
  grass.receiveShadow = true;
  scene.add(grass);

  const pz0 = Math.min(z0, 25), pz1 = Math.max(z1, -200);
  if (pz0 > pz1) {
    const path = new THREE.Mesh(new THREE.BoxGeometry(15, 0.25, pz0 - pz1), pathMat);
    path.position.set(0, -0.08, (pz0 + pz1) / 2);
    path.receiveShadow = true;
    scene.add(path);
  }
}
const abyss = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshBasicMaterial({ color: 0x10243d }));
abyss.rotation.x = -Math.PI / 2;
abyss.position.set(0, -12, -100);
scene.add(abyss);

// Path edge markers (skipped over pits)
const markerGeo = new THREE.BoxGeometry(0.5, 0.12, 5);
for (let z = 5; z > -SETTINGS.levelLength; z -= 12) {
  if (inPit(z, -4)) continue;
  for (const side of [-1, 1]) {
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.position.set(side * 7.15, 0.08, z);
    scene.add(marker);
  }
}

// Hills and trees: kept well outside the walkable width so you never clip into them.
for (let i = 0; i < 44; i++) {
  const side = i % 2 === 0 ? -1 : 1;
  const z = 8 - Math.floor(i / 2) * 9 - Math.random() * 4;
  const r = 4 + Math.random() * 4;
  const x = side * (SETTINGS.worldWidth / 2 + r + 2 + Math.random() * 10);
  const hill = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 9), hillMats[i % 3]);
  hill.scale.y = 0.65;
  hill.position.set(x, 1.0, z);
  scene.add(hill);

  const tx = x + side * (r + 2.5);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 2.2, 7), trunkMat);
  trunk.position.set(tx, 1.0, z - 2);
  trunk.castShadow = true;
  const crown = new THREE.Mesh(new THREE.SphereGeometry(1.5, 9, 8), crownMat);
  crown.position.set(tx, 2.7, z - 2);
  crown.castShadow = true;
  scene.add(trunk, crown);
}

// A few clouds
const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
for (let i = 0; i < 14; i++) {
  const cloud = new THREE.Group();
  for (let k = 0; k < 3; k++) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(3 + Math.random() * 2, 8, 6), cloudMat);
    puff.position.set(k * 3.2 - 3, Math.random(), Math.random() * 2);
    puff.scale.y = 0.55;
    cloud.add(puff);
  }
  cloud.position.set((Math.random() - 0.5) * 220, 38 + Math.random() * 14, -Math.random() * 230 + 20);
  scene.add(cloud);
}

// ---------------------------------------------------------------- player
const player = new THREE.Group();
scene.add(player);
const rig = new THREE.Group(); // pivot at body centre: used for lean and the spin-ball
rig.position.y = 0.9;
player.add(rig);

const body = new THREE.Mesh(new THREE.SphereGeometry(0.62, 20, 16), blueMat);
body.scale.set(0.82, 1.05, 0.72);
body.position.y = 0.88;
body.castShadow = true;
rig.add(body);

const belly = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 12), creamMat);
belly.scale.set(0.85, 0.9, 0.38);
belly.position.set(0, 0.78, 0.43);
rig.add(belly);

const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12), mat(0x1595ed));
muzzle.scale.set(1.05, 0.65, 0.75);
muzzle.position.set(0, 1.24, 0.25);
rig.add(muzzle);

for (const x of [-0.16, 0.16]) {
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), whiteMat);
  eye.position.set(x, 1.36, 0.51);
  rig.add(eye);
}
const nose = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), darkMat);
nose.position.set(0, 1.2, 0.62);
rig.add(nose);

for (const x of [-0.28, 0.28]) {
  const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.43, 0.2, 0.72), redMat);
  shoe.position.set(x, 0.14, 0.02);
  shoe.castShadow = true;
  rig.add(shoe);
}
// Quills and ears so the silhouette reads as a hedgehog
for (const [y, rx] of [[1.35, -1.0], [1.0, -1.3], [0.65, -1.6]]) {
  const quill = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.9, 7), blueMat);
  quill.position.set(0, y, -0.5);
  quill.rotation.x = rx;
  rig.add(quill);
}
for (const x of [-0.25, 0.25]) {
  const ear = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.35, 6), blueMat);
  ear.position.set(x, 1.7, -0.02);
  rig.add(ear);
}
// Re-centre every part on the rig pivot (parts were authored with feet at y=0)
for (const child of rig.children) child.position.y -= 0.9;

player.position.copy(START_POS);

// ---------------------------------------------------------------- level objects
const rings = [];
const ringGeometry = new THREE.TorusGeometry(0.48, 0.105, 10, 24);
function addRing(x, y, z) {
  const mesh = new THREE.Mesh(ringGeometry, goldMat);
  mesh.position.set(x, y, z);
  mesh.rotation.y = Math.PI / 2;
  scene.add(mesh);
  rings.push({ mesh, taken: false });
}
// Weaving rows (skipping pits), all the way to the goal
for (let row = 0; row < 26; row++) {
  const z = -row * 7 - 5;
  if (inPit(z, -2)) continue;
  const x = Math.sin(row * 0.65) * 3.2;
  addRing(x - 1, 1.35, z); addRing(x, 1.35, z); addRing(x + 1, 1.35, z);
}
// Arcs over the pits show where to jump
for (const [a, b] of PITS) {
  const heights = [1.6, 2.7, 3.2, 2.7, 1.6];
  heights.forEach((y, i) => addRing(0, y, a - 1 - (i * (a - b - 2)) / (heights.length - 1)));
}
// Rings above the spring
[[3, -84], [5, -87], [6.5, -90], [5, -93], [3, -96]].forEach(([y, z]) => addRing(0, y, z));

// Enemies: floaters hover and drift, patrollers sweep across the path.
const enemies = [];
function addEnemy(x, z, kind, amp, speed) {
  const group = new THREE.Group();
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 12), redMat);
  orb.castShadow = true;
  const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.71, 0.08, 8, 22), whiteMat);
  stripe.rotation.x = Math.PI / 2;
  group.add(orb, stripe);
  for (const ex of [-0.25, 0.25]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), whiteMat);
    eye.position.set(ex, 0.25, 0.58);
    group.add(eye);
  }
  group.position.set(x, 0.85, z);
  scene.add(group);
  enemies.push({ group, baseX: x, z, kind, amp, speed, phase: Math.random() * 6, alive: true });
}
for (const [x, z] of [[-3, -34], [3, -61], [0, -91], [-3, -122], [3, -151]]) addEnemy(x, z, 'floater', 1.2, 1.5);
for (const [z, amp, sp] of [[-22, 4, 1.6], [-42, 5, 2], [-66, 4.5, 1.8], [-108, 5, 1.7], [-118, 4, 2.2], [-146, 5, 1.9], [-168, 5, 2.1], [-178, 4, 1.5]]) {
  addEnemy(0, z, 'patrol', amp, sp);
}

// Spikes
const spikes = [];
const spikeMat = mat(0xc9d3dc, { metalness: 0.6, roughness: 0.3 });
for (const [x, z] of [[-3.5, -30], [3.5, -30], [-3.5, -72], [3.5, -72], [-3, -126], [3, -126], [0, -162]]) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(2, 0.15, 1.2), darkMat);
  base.position.y = 0.08;
  g.add(base);
  for (const sx of [-0.6, 0, 0.6]) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.9, 8), spikeMat);
    cone.position.set(sx, 0.55, 0);
    cone.castShadow = true;
    g.add(cone);
  }
  g.position.set(x, 0, z);
  scene.add(g);
  spikes.push({ x, z });
}

// Springs
const springs = [];
const springMat = mat(0xffb000, { emissive: 0x442200 });
{
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 0.35, 16), darkMat);
  base.position.y = 0.18;
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.2, 16), springMat);
  top.position.y = 0.55;
  g.add(base, top);
  g.position.set(0, 0, -82);
  scene.add(g);
  springs.push({ x: 0, z: -82, top, cooldown: 0 });
}

// Dash pads
const pads = [];
const padMat = mat(0x28d7ff, { emissive: 0x0a7aa0 });
for (const [x, z] of [[0, -12], [-2.5, -64], [-2.5, -148]]) {
  const g = new THREE.Group();
  const plate = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.08, 3.4), padMat);
  plate.position.y = 0.09;
  g.add(plate);
  for (const dz of [-0.7, 0.7]) {
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.8, 0.8, 3), whiteMat);
    arrow.rotation.x = -Math.PI / 2;
    arrow.scale.z = 0.12;
    arrow.position.set(0, 0.17, dz);
    g.add(arrow);
  }
  g.position.set(x, 0, z);
  scene.add(g);
  pads.push({ x, z });
}

// Checkpoint arch (changes colour when activated)
const checkpoint = new THREE.Group();
const cpMat = mat(0xffdf43, { emissive: 0x553300 });
for (const x of [-5, 5]) {
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.45, 4, 0.45), cpMat);
  post.position.set(x, 2, 0);
  checkpoint.add(post);
}
const cpBar = new THREE.Mesh(new THREE.BoxGeometry(10.4, 0.45, 0.45), cpMat);
cpBar.position.y = 4;
checkpoint.add(cpBar);
checkpoint.position.z = CHECKPOINT_Z;
scene.add(checkpoint);

// Finish gate
const goal = new THREE.Group();
const goalMat = mat(0x28d7ff, { emissive: 0x075577 });
for (const x of [-5, 5]) {
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.55, 5, 0.55), goalMat);
  post.position.set(x, 2.5, 0);
  goal.add(post);
}
const goalTop = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.55, 0.55), goalMat);
goalTop.position.y = 5;
goal.add(goalTop);
goal.position.z = -SETTINGS.levelLength;
scene.add(goal);

// ---------------------------------------------------------------- particles
const sparkGeo = new THREE.SphereGeometry(0.11, 6, 5);
const sparks = [];
for (let i = 0; i < 80; i++) {
  const mesh = new THREE.Mesh(sparkGeo, new THREE.MeshBasicMaterial({ color: 0xffe04b }));
  mesh.visible = false;
  scene.add(mesh);
  sparks.push({ mesh, vel: new THREE.Vector3(), life: 0, max: 1, grav: 0 });
}
let sparkCursor = 0;
function burst(pos, count, speed, color, grav = 14, life = 0.6) {
  for (let i = 0; i < count; i++) {
    const s = sparks[sparkCursor++ % sparks.length];
    s.mesh.position.copy(pos);
    s.mesh.material.color.setHex(color);
    s.vel.set((Math.random() - 0.5) * speed, Math.random() * speed * 0.8 + 1, (Math.random() - 0.5) * speed);
    s.life = s.max = life * (0.6 + Math.random() * 0.6);
    s.grav = grav;
    s.mesh.visible = true;
    s.mesh.scale.setScalar(1);
  }
}

// ---------------------------------------------------------------- audio (tiny synth, no assets)
let audioCtx = null;
let muted = false;
function ensureAudio() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch { /* audio is optional */ }
}
function beep(freq, dur = 0.1, type = 'square', vol = 0.05, slide = 0) {
  if (muted || !audioCtx) return;
  try {
    const t = audioCtx.currentTime;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start(t);
    o.stop(t + dur);
  } catch { /* ignore */ }
}
const sfx = {
  ring: (n) => beep(880 + (n % 2) * 220, 0.09, 'triangle', 0.06),
  jump: () => beep(300, 0.18, 'square', 0.04, 400),
  kill: () => beep(200, 0.2, 'sawtooth', 0.06, 500),
  hurt: () => beep(500, 0.4, 'sawtooth', 0.07, -400),
  spring: () => beep(250, 0.3, 'square', 0.05, 700),
  pad: () => beep(400, 0.35, 'sawtooth', 0.04, 900),
  homing: () => beep(600, 0.15, 'square', 0.04, 600),
  check: () => { beep(660, 0.12, 'triangle', 0.06); setTimeout(() => beep(990, 0.2, 'triangle', 0.06), 110); },
  win: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.25, 'triangle', 0.07), i * 130))
};

// ---------------------------------------------------------------- game state
const keys = {};
let state = 'menu'; // menu | playing | paused | won | lost
let worldTime = 0;
let ringsHeld = 0, ringsCollected = 0, score = 0, lives = SETTINGS.startLives;
let boostGauge = 50, boostLock = false, boostOn = false;
const velocity = new THREE.Vector3();
let velocityY = 0;
let grounded = true, isBall = false, coyote = 0, jumpBuffer = 0;
let hurtTime = 0, invincible = 0, padTime = 0;
let homing = null; // { target, t }
let heading = Math.PI, camYaw = Math.PI;
let checkpointReached = false;
let sparkTimer = 0;
let ringSfxCount = 0;
const center = new THREE.Vector3();
const scratch = new THREE.Vector3();
const TOTAL_RINGS = rings.length;

const BEST_KEY = 'sonic3d-best-time';
function loadBest() { try { const v = parseFloat(localStorage.getItem(BEST_KEY)); return Number.isFinite(v) ? v : null; } catch { return null; } }
function saveBest(t) { try { localStorage.setItem(BEST_KEY, String(t)); } catch { /* ignore */ } }

const ui = {
  rings: $('rings'), speed: $('speed'), score: $('score'), time: $('time'), lives: $('lives'),
  boost: $('boostfill'), toast: $('toast'), reticle: $('reticle'),
  intro: $('intro'), finish: $('finish'), gameover: $('gameover'), pause: $('pause')
};
const lastText = new Map();
function setText(el, val) {
  if (!el) return;
  if (lastText.get(el) !== val) { lastText.set(el, val); el.textContent = val; }
}
const fmtTime = (t) => {
  const m = Math.floor(t / 60), s = Math.floor(t % 60), cs = Math.floor((t % 1) * 100);
  return `${m}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
};
let toastTimer = 0;
function toast(text) {
  ui.toast.textContent = text;
  ui.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ui.toast.classList.remove('show'), 1600);
}

function hideOverlays() {
  for (const el of [ui.intro, ui.finish, ui.gameover, ui.pause]) el.classList.add('hidden');
}

function placePlayer(pos) {
  player.position.copy(pos);
  velocity.set(0, 0, 0);
  velocityY = 0;
  grounded = true; isBall = false; homing = null; padTime = 0; hurtTime = 0;
  heading = Math.PI; camYaw = Math.PI;
  player.rotation.y = heading;
  rig.rotation.set(0, 0, 0);
  updateCamera(0, true);
}

function resetLevel() {
  worldTime = 0;
  ringsHeld = 0; ringsCollected = 0; score = 0; lives = SETTINGS.startLives;
  boostGauge = 50; boostLock = false; boostOn = false;
  invincible = 0; checkpointReached = false;
  for (const r of rings) { r.taken = false; r.mesh.visible = true; }
  for (const e of enemies) { e.alive = true; e.group.visible = true; }
  cpMat.color.setHex(0xffdf43); cpMat.emissive.setHex(0x553300);
  for (const s of sparks) { s.life = 0; s.mesh.visible = false; }
  player.visible = true;
  placePlayer(START_POS);
}

function startGame() {
  ensureAudio();
  resetLevel();
  hideOverlays();
  state = 'playing';
}

function setPaused(p) {
  if (p && state === 'playing') { state = 'paused'; ui.pause.classList.remove('hidden'); }
  else if (!p && state === 'paused') { state = 'playing'; ui.pause.classList.add('hidden'); }
}

function respawn() {
  placePlayer(checkpointReached ? CHECKPOINT_POS : START_POS);
  ringsHeld = 0;
  invincible = 1.5;
}

function die() {
  lives--;
  sfx.hurt();
  ringsHeld = 0;
  if (lives <= 0) {
    state = 'lost';
    $('go-stats').textContent = `Score ${score} · ${ringsCollected} rings collected`;
    ui.gameover.classList.remove('hidden');
  } else {
    toast(`Lives left: ${lives}`);
    respawn();
  }
}

function hurt() {
  if (invincible > 0 || homing) return;
  if (ringsHeld <= 0) { die(); return; }
  scratch.set(player.position.x, player.position.y + 1, player.position.z);
  burst(scratch, Math.min(30, 6 + ringsHeld), 12, 0xffd52b, 22, 1.0);
  ringsHeld = 0;
  sfx.hurt();
  hurtTime = 0.5;
  invincible = 2;
  velocity.set(-Math.sign(velocity.x || 1) * 3, 0, Math.max(6, velocity.z * -0.4 + 6));
  velocityY = 8;
  grounded = false; isBall = false; boostLock = true;
}

function killEnemy(e) {
  e.alive = false;
  e.group.visible = false;
  score += 100;
  boostGauge = Math.min(100, boostGauge + 12);
  scratch.copy(e.group.position);
  burst(scratch, 14, 10, 0xff5a3c, 16, 0.5);
  sfx.kill();
}

function findTarget() {
  let best = null, bd = SETTINGS.homingRange;
  for (const e of enemies) {
    if (!e.alive) continue;
    if (e.group.position.z - player.position.z > 3) continue; // behind us
    const d = e.group.position.distanceTo(center);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

function tryHoming() {
  if (state !== 'playing' || homing || hurtTime > 0) return;
  const target = findTarget();
  if (!target) return;
  homing = { target, t: 1.0 };
  grounded = false; isBall = true; velocityY = 0;
  sfx.homing();
}

function win() {
  state = 'won';
  sfx.win();
  const bonus = Math.max(0, Math.round((60 - worldTime) * 50));
  score += bonus;
  const best = loadBest();
  const isBest = best === null || worldTime < best;
  if (isBest) saveBest(worldTime);
  const rank = worldTime < 25 ? 'S' : worldTime < 40 ? 'A' : worldTime < 60 ? 'B' : 'C';
  $('f-time').textContent = fmtTime(worldTime);
  $('f-rings').textContent = `${ringsCollected} / ${TOTAL_RINGS}`;
  $('f-score').textContent = String(score);
  $('f-rank').textContent = rank;
  $('f-best').textContent = isBest ? 'NEW BEST TIME!' : `Best: ${fmtTime(best)}`;
  ui.finish.classList.remove('hidden');
}

// ---------------------------------------------------------------- input
const GAME_KEYS = ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'];
addEventListener('keydown', (e) => {
  if (GAME_KEYS.includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  keys[e.code] = true;
  if (e.code === 'Space' && state === 'playing') jumpBuffer = 0.12;
  else if (e.code === 'KeyE') tryHoming();
  else if (e.code === 'KeyR' && state !== 'menu') startGame();
  else if (e.code === 'KeyP' || e.code === 'Escape') setPaused(state === 'playing');
  else if (e.code === 'KeyM') { muted = !muted; toast(muted ? 'Sound off' : 'Sound on'); }
  else if (e.code === 'Enter' && (state === 'menu' || state === 'won' || state === 'lost')) startGame();
});
addEventListener('keyup', (e) => {
  keys[e.code] = false;
  // Variable jump height: releasing early cuts the jump short
  if (e.code === 'Space' && state === 'playing' && isBall && !grounded && !homing && velocityY > 5) velocityY *= 0.5;
});
addEventListener('blur', () => {
  for (const k of Object.keys(keys)) keys[k] = false;
  setPaused(true);
});
document.addEventListener('visibilitychange', () => { if (document.hidden) setPaused(true); });

for (const [id, fn] of [['start', startGame], ['again', startGame], ['retry', startGame], ['resume', () => setPaused(false)]]) {
  $(id).addEventListener('click', (ev) => { ev.currentTarget.blur(); fn(); });
}

// ---------------------------------------------------------------- simulation
function update(dt) {
  worldTime += dt;
  const forward = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
  const sideways = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);

  // Boost gauge
  const wantBoost = !!(keys.ShiftLeft || keys.ShiftRight);
  if (!wantBoost) boostLock = false;
  boostOn = wantBoost && !boostLock && boostGauge > 0 && hurtTime <= 0;
  if (boostOn) {
    boostGauge = Math.max(0, boostGauge - SETTINGS.boostDrain * dt);
    if (boostGauge === 0) { boostLock = true; boostOn = false; }
  } else {
    boostGauge = Math.min(100, boostGauge + SETTINGS.boostRegen * dt);
  }

  hurtTime = Math.max(0, hurtTime - dt);
  invincible = Math.max(0, invincible - dt);
  padTime = Math.max(0, padTime - dt);
  jumpBuffer = Math.max(0, jumpBuffer - dt);
  coyote = grounded ? 0.1 : Math.max(0, coyote - dt);

  // Jump (with coyote time + input buffer)
  if (jumpBuffer > 0 && coyote > 0 && !homing && hurtTime <= 0) {
    velocityY = SETTINGS.jumpPower;
    grounded = false; isBall = true; coyote = 0; jumpBuffer = 0;
    sfx.jump();
  }

  const prev = player.position.clone();
  center.set(player.position.x, player.position.y + 0.9, player.position.z);

  if (homing) {
    // Real homing attack: fly straight at the target
    const t = homing.target;
    homing.t -= dt;
    if (!t.alive || homing.t <= 0) {
      homing = null;
    } else {
      scratch.set(t.group.position.x, Math.max(0, t.group.position.y - 0.8), t.group.position.z).sub(player.position);
      const dist = scratch.length();
      if (dist < 1.0) {
        killEnemy(t);
        homing = null;
        velocityY = 11; grounded = false; isBall = true;
        velocity.z = Math.min(velocity.z, -SETTINGS.boostSpeed * 0.5);
        velocity.x *= 0.3;
      } else {
        scratch.multiplyScalar(1 / dist);
        velocity.set(scratch.x * SETTINGS.homingSpeed, 0, scratch.z * SETTINGS.homingSpeed);
        player.position.x += scratch.x * SETTINGS.homingSpeed * dt;
        player.position.y = Math.max(0, player.position.y + scratch.y * SETTINGS.homingSpeed * dt);
        player.position.z += scratch.z * SETTINGS.homingSpeed * dt;
      }
    }
  }

  if (!homing) {
    // Horizontal movement
    const moveF = forward !== 0 ? forward : (boostOn ? 1 : 0);
    let tz = -moveF * (boostOn ? SETTINGS.boostSpeed : SETTINGS.walkSpeed);
    let tx = sideways * (boostOn ? 13 : 10);
    let rate = SETTINGS.acceleration * (grounded ? 1 : SETTINGS.airControl);
    if (hurtTime > 0) { tx = 0; tz = 0; rate = 3; }
    if (padTime > 0) { tz = -SETTINGS.padSpeed; rate = 20; }
    velocity.z = THREE.MathUtils.damp(velocity.z, tz, rate, dt);
    velocity.x = THREE.MathUtils.damp(velocity.x, tx, rate, dt);

    player.position.x += velocity.x * dt;
    player.position.z += velocity.z * dt;
  }
  player.position.x = clamp(player.position.x, -SETTINGS.worldWidth / 2, SETTINGS.worldWidth / 2);
  player.position.z = clamp(player.position.z, -SETTINGS.levelLength - 12, 12);

  // Vertical movement and ground support (pits are holes)
  if (!homing) {
    const supported = !inPit(player.position.z, 0.3);
    if (grounded && !supported) { grounded = false; velocityY = 0; isBall = false; }
    if (!grounded) {
      velocityY -= SETTINGS.gravity * dt;
      player.position.y += velocityY * dt;
      if (supported && prev.y >= -0.05 && player.position.y <= 0 && velocityY <= 0) {
        player.position.y = 0; velocityY = 0; grounded = true; isBall = false;
      } else if (supported && player.position.y < -0.05) {
        // Hit the pit wall from below: push back into the hole
        player.position.z = prev.z; velocity.z = 0;
      }
    }
  }

  // Orientation: face the direction of travel (model faces local +Z)
  const spd = Math.hypot(velocity.x, velocity.z);
  if (spd > 1.5) heading += shortest(Math.atan2(velocity.x, velocity.z) - heading) * (1 - Math.exp(-14 * dt));
  player.rotation.y = heading;
  rig.rotation.z += (-sideways * 0.15 - rig.rotation.z) * (1 - Math.exp(-10 * dt));
  if (isBall || homing) rig.rotation.x += dt * 22;
  else rig.rotation.x = 0;
  player.visible = invincible <= 0 || Math.floor(worldTime * 20) % 2 === 0;

  center.set(player.position.x, player.position.y + 0.9, player.position.z);
  const attacking = isBall || homing || (boostOn && spd > 15);

  // Rings
  for (const r of rings) {
    if (r.taken) continue;
    if (r.mesh.position.distanceTo(center) < 1.25) {
      r.taken = true; r.mesh.visible = false;
      ringsHeld++; ringsCollected++; score += 10;
      boostGauge = Math.min(100, boostGauge + 3);
      burst(r.mesh.position, 5, 5, 0xffe04b, 2, 0.35);
      sfx.ring(ringSfxCount++);
    }
  }

  // Enemies: attacking kills them, otherwise they hurt
  for (const e of enemies) {
    if (!e.alive) continue;
    if (e.group.position.distanceTo(center) < 1.5) {
      if (attacking) {
        killEnemy(e);
        if (!grounded && !homing) { velocityY = Math.max(velocityY, 0) + 9; isBall = true; }
      } else {
        hurt();
      }
    }
  }

  // Spikes
  for (const s of spikes) {
    if (Math.abs(s.x - player.position.x) < 1.3 && Math.abs(s.z - player.position.z) < 0.8 && player.position.y < 0.7) hurt();
  }

  // Springs
  for (const sp of springs) {
    sp.cooldown = Math.max(0, sp.cooldown - dt);
    if (sp.cooldown === 0 && Math.abs(sp.x - player.position.x) < 1.2 && Math.abs(sp.z - player.position.z) < 1.2 && player.position.y < 0.8 && velocityY <= 0) {
      velocityY = SETTINGS.springPower; grounded = false; isBall = false; sp.cooldown = 0.4;
      sfx.spring();
    }
  }

  // Dash pads
  for (const p of pads) {
    if (grounded && Math.abs(p.x - player.position.x) < 2 && Math.abs(p.z - player.position.z) < 1.7 && padTime < 0.3) {
      padTime = 0.8;
      sfx.pad();
    }
  }

  // Checkpoint
  if (!checkpointReached && player.position.z < CHECKPOINT_Z + 3) {
    checkpointReached = true;
    cpMat.color.setHex(0xff5a3c); cpMat.emissive.setHex(0x802010);
    toast('CHECKPOINT!');
    sfx.check();
  }

  // Boost trail
  sparkTimer -= dt;
  if (boostOn && sparkTimer <= 0) {
    sparkTimer = 0.03;
    scratch.set(player.position.x, player.position.y + 0.5, player.position.z + 0.6);
    burst(scratch, 1, 2, 0x28d7ff, 0, 0.3);
  }

  // Fell into a pit
  if (player.position.y < -9) { die(); return; }

  // Goal
  if (player.position.z < -SETTINGS.levelLength + 2) win();
}

function animateScene(dt) {
  for (const r of rings) if (!r.taken) r.mesh.rotation.z += dt * 2.4;
  for (const e of enemies) {
    if (!e.alive) continue;
    e.group.rotation.y += dt * 1.5;
    if (e.kind === 'floater') {
      e.group.position.set(e.baseX + Math.sin(worldTime * e.speed + e.phase) * e.amp, 0.95 + Math.sin(worldTime * 2.2 + e.phase) * 0.2, e.z);
    } else {
      e.group.position.set(e.baseX + Math.sin(worldTime * e.speed + e.phase) * e.amp, 0.75, e.z);
    }
  }
  for (const s of sparks) {
    if (s.life <= 0) continue;
    s.life -= dt;
    if (s.life <= 0) { s.mesh.visible = false; continue; }
    s.vel.y -= s.grav * dt;
    s.mesh.position.addScaledVector(s.vel, dt);
    s.mesh.scale.setScalar(Math.max(0.05, s.life / s.max));
  }
  for (const sp of springs) sp.top.position.y = 0.55 + (sp.cooldown > 0 ? 0.35 * (sp.cooldown / 0.4) : 0);
}

function updateCamera(dt, snap = false) {
  const spd = Math.hypot(velocity.x, velocity.z);
  // Camera yaw follows the heading gently, clamped so it never swings round to the front
  let off = shortest(heading - Math.PI);
  if (Math.abs(off) > 2.2) off = 0;
  const targetYaw = Math.PI + clamp(off, -1, 1) * 0.5;
  camYaw += shortest(targetYaw - camYaw) * (snap ? 1 : 1 - Math.exp(-3 * dt));

  const dist = 10 + Math.min(4, spd * 0.12);
  const cy = Math.max(player.position.y, -1);
  const sy = Math.sin(camYaw), cyaw = Math.cos(camYaw);
  scratch.set(player.position.x - sy * dist, cy + 5.2, player.position.z - cyaw * dist);
  if (snap) camera.position.copy(scratch);
  else camera.position.lerp(scratch, 1 - Math.pow(0.001, dt));
  camera.lookAt(player.position.x + sy * 5, cy + 1.1, player.position.z + cyaw * 5);

  const targetFov = 68 + Math.min(14, spd * 0.3) + (boostOn ? 4 : 0);
  const newFov = snap ? targetFov : camera.fov + (targetFov - camera.fov) * (1 - Math.exp(-5 * dt));
  if (Math.abs(newFov - camera.fov) > 0.01) { camera.fov = newFov; camera.updateProjectionMatrix(); }

  // Keep the sun's shadow box centred on the player
  sun.target.position.copy(player.position);
  sun.position.copy(player.position).add(SUN_OFFSET);
}

const projected = new THREE.Vector3();
function updateHud() {
  setText(ui.rings, String(ringsHeld));
  setText(ui.score, String(score));
  setText(ui.time, fmtTime(worldTime));
  setText(ui.lives, `×${lives}`);
  setText(ui.speed, String(Math.round(Math.hypot(velocity.x, velocity.z) * 4)));
  const pct = Math.round(boostGauge);
  if (lastText.get(ui.boost) !== pct) { lastText.set(ui.boost, pct); ui.boost.style.width = pct + '%'; }
  ui.boost.classList.toggle('locked', boostLock);

  // Homing lock-on reticle
  let target = null;
  if (state === 'playing') target = homing ? homing.target : findTarget();
  if (target && target.alive) {
    projected.copy(target.group.position).project(camera);
    if (projected.z < 1) {
      ui.reticle.style.transform = `translate(${(projected.x * 0.5 + 0.5) * innerWidth}px, ${(-projected.y * 0.5 + 0.5) * innerHeight}px)`;
      ui.reticle.classList.remove('hidden');
      return;
    }
  }
  ui.reticle.classList.add('hidden');
}

const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.033);
  if (state === 'playing') update(dt);
  animateScene(dt);
  updateCamera(dt);
  updateHud();
  renderer.render(scene, camera);
}

resetLevel();
frame();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// Debug handle for automated tests: add ?debug to the URL
if (location.search.includes('debug')) {
  window.__sonic = {
    get state() { return state; },
    get lives() { return lives; },
    get rings() { return ringsHeld; },
    get score() { return score; },
    get gauge() { return boostGauge; },
    get checkpoint() { return checkpointReached; },
    player, enemies,
    teleport(x, y, z) { player.position.set(x, y, z); grounded = y <= 0; velocityY = 0; }
  };
}
