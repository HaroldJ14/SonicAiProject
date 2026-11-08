// SONIC 3D — HYBRID GENERATIONS (UPGRADED VERSION)
const $ = (id) => document.getElementById(id);
function showError(msg) {
  const el = $('error');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

let THREE;
try {
  THREE = await import('https://jsdelivr.net')
    .catch(() => import('https://unpkg.com'));
} catch (err) {
  showError('Could not load Three.js. Please verify your connection.');
  throw err;
}

const SETTINGS = {
  walkSpeed: 13,
  boostSpeed: 29,
  airDashSpeed: 42,
  acceleration: 36,
  airControl: 0.65,
  jumpPower: 12.8,
  gravity: 31,
  worldWidth: 22,
  padSpeed: 42,
  springPower: 25,
  homingSpeed: 46,
  homingRange: 16,
  boostDrain: 20,
  boostRegen: 8,
  startLives: 3
};

const shortest = (a) => ((a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.1, 400);
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true });
} catch (err) {
  showError('WebGL required to load game parameters.');
  throw err;
}
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const hemi = new THREE.HemisphereLight(0xe6faff, 0x527a39, 2.0);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -36, right: 36, top: 36, bottom: -36, near: 1, far: 160 });
sun.shadow.bias = -0.0005;
scene.add(sun, sun.target);
const SUN_OFFSET = new THREE.Vector3(-25, 45, 25);

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
const chemFloor = mat(0x3a3a55);
const chemPath = mat(0x5a5a78);
const chemAccent = mat(0x9b59ff, { emissive: 0x3a1a6a });
const nightFloor = mat(0x1a1a2e);
const nightPath = mat(0x2a2a4a);
const neonMat = mat(0xff2ec4, { emissive: 0x880066 });
const starMat = mat(0xffe04b, { emissive: 0xaa8800 });
const cityFloor = mat(0x111116);
const cityPath = mat(0x222233);
const cityNeon = mat(0x00ffcc, { emissive: 0x00aa88 });

const player = new THREE.Group();
scene.add(player);
const rig = new THREE.Group();
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

const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12), mat(0xffd9a2));
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
for (const child of rig.children) child.position.y -= 0.9;

const LEVELS = [
  {
    id: 'greenhill',
    name: 'GREEN HILL',
    subtitle: 'Classic grassy speedway',
    length: 190,
    start: new THREE.Vector3(0, 0, 7),
    checkpoint: new THREE.Vector3(0, 0, -95),
    checkpointZ: -100,
    sky: 0x79dfff,
    fogNear: 65, fogFar: 200,
    ground: 'grass',
    pits: [[-50, -57], [-132, -140]],
    rings: (add) => {
      for (let row = 0; row < 26; row++) {
        const z = -row * 7 - 5;
        if (z < -50 && z > -57 || z < -132 && z > -140) continue;
        const x = Math.sin(row * 0.65) * 3.2;
        add(x - 1, 1.35, z); add(x, 1.35, z); add(x + 1, 1.35, z);
      }
    },
    enemies: [
      { x: -3, z: -34, kind: 'floater', amp: 1.2, speed: 1.5 },
      { x: 3, z: -61, kind: 'floater', amp: 1.2, speed: 1.5 },
      { x: 0, z: -91, kind: 'floater', amp: 1.2, speed: 1.5 },
      { x: -3, z: -122, kind: 'floater', amp: 1.2, speed: 1.5 },
      { x: 3, z: -151, kind: 'floater', amp: 1.2, speed: 1.5 }
    ],
    spikes: [[-3.5, -30], [3.5, -30], [0, -162]],
    springs: [{ x: 0, z: -82 }],
    pads: [[0, -12], [-2.5, -64]],
    monitors: [{ x: 3, z: -40, type: 'rings' }, { x: -3, z: -100, type: 'boost' }],
    platforms: [],
    rankTimes: [25, 40, 60]
  },
  {
    id: 'chemplant',
    name: 'CHEMICAL PLANT',
    subtitle: 'Toxic tubes & moving platforms',
    length: 210,
    start: new THREE.Vector3(0, 0, 8),
    checkpoint: new THREE.Vector3(0, 0, -105),
    checkpointZ: -110,
    sky: 0x2a1a4a,
    fogNear: 50, fogFar: 180,
    ground: 'chem',
    pits: [[-40, -48], [-90, -100]],
    rings: (add) => {
      for (let row = 0; row < 30; row++) {
        const z = -row * 6.5 - 4;
        if ((z < -40 && z > -48) || (z < -90 && z > -100)) continue;
        add(Math.sin(row * 0.9) * 4, 1.4, z);
      }
    },
    enemies: [
      { x: -4, z: -25, kind: 'floater', amp: 1.5, speed: 1.8 },
      { x: 4, z: -55, kind: 'floater', amp: 1.5, speed: 1.8 },
      { x: 0, z: -80, kind: 'floater', amp: 1.5, speed: 1.8 }
    ],
    spikes: [[-4, -22], [4, -22]],
    springs: [{ x: 0, z: -75 }],
    pads: [[0, -10]],
    monitors: [{ x: -3, z: -30, type: 'rings' }],
    platforms: [{ x: 0, z: -70, w: 6, d: 4, y: 1.8, moveX: 4, moveSpeed: 1.2 }],
    rankTimes: [30, 48, 70]
  },
  {
    id: 'stardust',
    name: 'STAR LIGHT',
    subtitle: 'Neon night & floating paths',
    length: 230,
    start: new THREE.Vector3(0, 0, 8),
    checkpoint: new THREE.Vector3(0, 0, -115),
    checkpointZ: -120,
    sky: 0x0a0a22,
    fogNear: 40, fogFar: 160,
    ground: 'night',
    pits: [[-35, -45], [-80, -92]],
    rings: (add) => {
      for (let row = 0; row < 34; row++) {
        const z = -row * 6.2 - 3;
        if ((z < -35 && z > -45) || (z < -80 && z > -92)) continue;
        add(Math.sin(row * 0.75) * 3.5, 1.5, z);
      }
    },
    enemies: [
      { x: -3, z: -20, kind: 'floater', amp: 1.8, speed: 2.0 },
      { x: 3, z: -48, kind: 'floater', amp: 1.8, speed: 2.0 }
    ],
    spikes: [[0, -52]],
    springs: [{ x: 0, z: -65 }],
    pads: [[0, -8]],
    monitors: [{ x: 3, z: -25, type: 'invincible' }],
    platforms: [{ x: 0, z: -60, w: 5, d: 3, y: 2.2, moveX: 5, moveSpeed: 1.4 }],
    rankTimes: [35, 55, 80]
  },
  {
    id: 'radicalcity',
    name: 'RADICAL CITY',
    subtitle: 'Cyberpunk Skyscraper Gauntlet',
    length: 260,
    start: new THREE.Vector3(0, 0, 8),
    checkpoint: new THREE.Vector3(0, 0, -125),
    checkpointZ: -135,
    sky: 0x050010,
    fogNear: 45, fogFar: 150,
    ground: 'city',
    pits: [[-50, -65], [-150, -170]],
    rings: (add) => {
      for (let row = 0; row < 40; row++) {
        const z = -row * 6.0 - 3;
        if ((z < -50 && z > -65) || (z < -150 && z > -170)) continue;
        add(Math.cos(row * 0.5) * 4.5, 1.6, z);
      }
    },
    enemies: [
      { x: 0, z: -35, kind: 'floater', amp: 2.5, speed: 2.5 },
      { x: -3, z: -90, kind: 'floater', amp: 1.0, speed: 3.0 },
      { x: 3, z: -110, kind: 'floater', amp: 1.0, speed: 3.0 },
      { x: 0, z: -200, kind: 'floater', amp: 3.0, speed: 2.0 }
    ],
    spikes: [[-2, -25], [2, -25], [0, -100]],
    springs: [{ x: -4, z: -45 }, { x: 4, z: -45 }, { x: 0, z: -145 }],
    pads: [[0, -15], [0, -115]],
    monitors: [{ x: 0, z: -40, type: '1up' }, { x: 0, z: -190, type: 'boost' }],
    platforms: [
      { x: 0, z: -57, w: 7, d: 5, y: 2.5, moveX: 6, moveSpeed: 2.0 },
      { x: 0, z: -160, w: 6, d: 4, y: 3.0, moveX: -6, moveSpeed: 1.8 }
    ],
    rankTimes: [40, 60, 90]
  }
];

let currentLevelIdx = 0;
let levelLength = 190;
let PITS = [];
let START_POS = new THREE.Vector3(0, 0, 7);
let CHECKPOINT_POS = new THREE.Vector3(0, 0, -95);
let CHECKPOINT_Z = -100;
let rankTimes =;

const rings = [];
const enemies = [];
const spikes = [];
const springs = [];
const pads = [];
const monitors = [];
const platforms = [];
const levelMeshes = [];
let TOTAL_RINGS = 0;
let abyss = null;
let checkpoint = null;
let goal = null;
let cpMat = null;
let goalMat = null;

const inPit = (z, margin = 0) => PITS.some(([a, b]) => z < a - margin && z > b + margin);

function clearLevel() {
  for (const m of levelMeshes) {
    scene.remove(m);
    m.traverse?.(c => {
      if (c.geometry) c.geometry.dispose();
      if (c.material) {
        if (Array.isArray(c.material)) c.material.forEach(mm => mm.dispose());
        else c.material.dispose();
      }
    });
  }
  levelMeshes.length = 0;
  rings.length = 0;
  enemies.length = 0;
  spikes.length = 0;
  springs.length = 0;
Use code with caution.
pads.length = 0;
monitors.length = 0;
platforms.length = 0;
if (abyss) { scene.remove(abyss); abyss = null; }
if (checkpoint) { scene.remove(checkpoint); checkpoint = null; }
if (goal) { scene.remove(goal); goal = null; }
}
function buildLevel(idx) {
clearLevel();
const L = LEVELS[idx];
currentLevelIdx = idx;
levelLength = L.length;
PITS = L.pits.map(p => [...p]);
START_POS.copy(L.start);
CHECKPOINT_POS.copy(L.checkpoint);
CHECKPOINT_Z = L.checkpointZ;
rankTimes = L.rankTimes;
scene.background = new THREE.Color(L.sky);
scene.fog = new THREE.Fog(L.sky, L.fogNear, L.fogFar);
if (L.ground === 'night') {
hemi.color.setHex(0x334466); hemi.groundColor.setHex(0x111122);
} else if (L.ground === 'chem') {
hemi.color.setHex(0xa080c0); hemi.groundColor.setHex(0x2a2040);
} else if (L.ground === 'city') {
hemi.color.setHex(0x5533aa); hemi.groundColor.setHex(0x050010);
} else {
hemi.color.setHex(0xe6faff); hemi.groundColor.setHex(0x527a39);
}
const gMat = L.ground === 'chem' ? chemFloor : L.ground === 'night' ? nightFloor : L.ground === 'city' ? cityFloor : grassMat;
const pMat = L.ground === 'chem' ? chemPath : L.ground === 'night' ? nightPath : L.ground === 'city' ? cityPath : pathMat;
const sideMat = L.ground === 'chem' ? chemAccent : L.ground === 'night' ? neonMat : L.ground === 'city' ? cityNeon : dirtMat;
const edges = [80, ...PITS.flatMap(([a, b]) => [a, b]), -levelLength - 40];
for (let i = 0; i < edges.length; i += 2) {
const z0 = edges[i], z1 = edges[i + 1];
const len = z0 - z1;
if (len <= 0) continue;
const grass = new THREE.Mesh(new THREE.BoxGeometry(280, 6, len), [sideMat, sideMat, gMat, sideMat, sideMat, sideMat]);
grass.position.set(0, -0.18 - 3, (z0 + z1) / 2);
grass.receiveShadow = true;
scene.add(grass);
levelMeshes.push(grass);
const pz0 = Math.min(z0, 30), pz1 = Math.max(z1, -levelLength - 20);
if (pz0 > pz1) {
const path = new THREE.Mesh(new THREE.BoxGeometry(15, 0.25, pz0 - pz1), pMat);
path.position.set(0, -0.08, (pz0 + pz1) / 2);
path.receiveShadow = true;
scene.add(path);
levelMeshes.push(path);
}
}
abyss = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshBasicMaterial({ color: 0x020208 }));
abyss.rotation.x = -Math.PI / 2;
abyss.position.set(0, -14, -levelLength / 2);
scene.add(abyss);
const markerGeo = new THREE.BoxGeometry(0.5, 0.12, 5);
const mCol = L.ground === 'night' ? starMat : L.ground === 'chem' ? chemAccent : L.ground === 'city' ? cityNeon : markerMat;
for (let z = 5; z > -levelLength; z -= 12) {
if (inPit(z, -4)) continue;
for (const side of [-1, 1]) {
const marker = new THREE.Mesh(markerGeo, mCol);
marker.position.set(side * 7.15, 0.08, z);
scene.add(marker);
levelMeshes.push(marker);
}
}
const ringGeometry = new THREE.TorusGeometry(0.48, 0.105, 10, 24);
function addRing(x, y, z) {
const mesh = new THREE.Mesh(ringGeometry, goldMat);
mesh.position.set(x, y, z);
mesh.rotation.y = Math.PI / 2;
scene.add(mesh);
levelMeshes.push(mesh);
rings.push({ mesh, taken: false });
}
L.rings(addRing);
TOTAL_RINGS = rings.length;
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
levelMeshes.push(group);
enemies.push({ group, baseX: x, z, kind, amp, speed, phase: Math.random() * 6, alive: true });
}
for (const e of L.enemies) addEnemy(e.x, e.z, e.kind, e.amp, e.speed);
const spikeMat = mat(0xc9d3dc, { metalness: 0.6, roughness: 0.3 });
for (const [x, z] of L.spikes) {
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
levelMeshes.push(g);
spikes.push({ x, z });
}
const springMat = mat(0xffb000, { emissive: 0x442200 });
for (const s of L.springs) {
const g = new THREE.Group();
const base = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 0.35, 16), darkMat);
base.position.y = 0.18;
const top = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.2, 16), springMat);
top.position.y = 0.55;
g.add(base, top);
g.position.set(s.x, 0, s.z);
scene.add(g);
levelMeshes.push(g);
springs.push({ x: s.x, z: s.z, top, cooldown: 0 });
}
const padMat = mat(0x28d7ff, { emissive: 0x0a7aa0 });
for (const [x, z] of L.pads) {
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
levelMeshes.push(g);
pads.push({ x, z });
}
const monColors = { rings: 0xffd52b, boost: 0x28d7ff, invincible: 0xffffff, '1up': 0x42b943 };
for (const m of L.monitors) {
const g = new THREE.Group();
const box = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), mat(monColors[m.type] || 0xffffff, { metalness: 0.3, roughness: 0.4 }));
box.castShadow = true;
const frame = new THREE.Mesh(new THREE.BoxGeometry(1.55, 1.55, 1.55), darkMat);
frame.scale.set(1, 1, 0.15);
g.add(box, frame);
g.position.set(m.x, 1.1, m.z);
scene.add(g);
levelMeshes.push(g);
monitors.push({ group: g, x: m.x, z: m.z, type: m.type, taken: false });
}
for (const p of L.platforms) {
const mesh = new THREE.Mesh(new THREE.BoxGeometry(p.w, 0.4, p.d), L.ground === 'night' ? neonMat : L.ground === 'city' ? cityNeon : chemAccent);
mesh.position.set(p.x, p.y, p.z);
mesh.castShadow = true;
mesh.receiveShadow = true;
scene.add(mesh);
levelMeshes.push(mesh);
platforms.push({
mesh, baseX: p.x, z: p.z, y: p.y, w: p.w, d: p.d,
moveX: p.moveX || 0, moveSpeed: p.moveSpeed || 1, phase: Math.random() * 6
});
}
checkpoint = new THREE.Group();
cpMat = mat(0xffdf43, { emissive: 0x553300 });
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
goal = new THREE.Group();
goalMat = mat(0x28d7ff, { emissive: 0x075577 });
for (const x of [-5, 5]) {
const post = new THREE.Mesh(new THREE.BoxGeometry(0.55, 5, 0.55), goalMat);
post.position.set(x, 2.5, 0);
goal.add(post);
}
const goalTop = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.55, 0.55), goalMat);
goalTop.position.y = 5;
goal.add(goalTop);
goal.position.z = -levelLength;
scene.add(goal);
}
const sparkGeo = new THREE.SphereGeometry(0.12, 6, 5);
const sparks = [];
for (let i = 0; i < 120; i++) {
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
let audioCtx = null;
let muted = false;
function ensureAudio() {
if (audioCtx) return;
audioCtx = new (window.AudioContext || window.webkitAudioContext)();
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
o.start(t); o.stop(t + dur);
} catch {}
}
const sfx = {
ring: (n) => beep(880 + (n % 3) * 110, 0.08, 'triangle', 0.05),
jump: () => beep(350, 0.15, 'square', 0.04, 350),
kill: () => beep(180, 0.22, 'sawtooth', 0.06, 400),
hurt: () => beep(450, 0.35, 'sawtooth', 0.07, -350),
spring: () => beep(260, 0.28, 'square', 0.05, 650),
pad: () => beep(380, 0.32, 'sawtooth', 0.04, 850),
homing: () => beep(580, 0.14, 'square', 0.04, 550),
airdash: () => beep(700, 0.12, 'noise', 0.05, -200),
check: () => { beep(600, 0.1, 'triangle', 0.05); setTimeout(() => beep(900, 0.18, 'triangle', 0.05), 90); },
win: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.2, 'triangle', 0.06), i * 120))
};
const keys = {};
let state = 'menu';
let worldTime = 0;
let ringsHeld = 0, ringsCollected = 0, score = 0, lives = SETTINGS.startLives;
let boostGauge = 50, boostLock = false, boostOn = false;
let comboChain = 0, comboTimer = 0;
let hasAirDashed = false;
const velocity = new THREE.Vector3();
let velocityY = 0;
let grounded = true, isBall = false, coyote = 0, jumpBuffer = 0;
let hurtTime = 0, invincible = 0, padTime = 0, invinciblePower = 0;
let homing = null;
let heading = Math.PI, camYaw = Math.PI;
let checkpointReached = false;
let sparkTimer = 0, ringSfxCount = 0;
let onPlatform = null;
const center = new THREE.Vector3();
const scratch = new THREE.Vector3();
function loadUnlocked() {
try { return Math.max(1, parseInt(localStorage.getItem('sonic3d-unlocked') || '1', 10)); } catch { return 1; }
}
function saveUnlocked(n) {
try { localStorage.setItem('sonic3d-unlocked', String(n)); } catch {}
}
let unlockedLevels = loadUnlocked();
const ui = {
rings: $('rings'), speed: $('speed'), score: $('score'), time: $('time'), lives: $('lives'),
boost: $('boostfill'), toast: $('toast'), reticle: $('reticle'), levelName: $('level-name'),
intro: $('intro'), finish: $('finish'), gameover: $('gameover'), pause: $('pause'),
levelselect: $('levelselect'), levelGrid: $('level-grid')
};
const lastText = new Map();
function setText(el, val) {
if (!el) return;
if (lastText.get(el) !== val) { lastText.set(el, val); el.textContent = val; }
}
const fmtTime = (t) => {
const m = Math.floor(t / 60), s = Math.floor(t % 60), cs = Math.floor((t % 1) * 100);
return ${m}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')};
};
function toast(text) {
ui.toast.textContent = text;
ui.toast.classList.add('show');
setTimeout(() => ui.toast.classList.remove('show'), 1500);
}
function startLevel(idx) {
ensureAudio();
buildLevel(idx);
worldTime = 0; ringsHeld = 0; ringsCollected = 0; score = 0; comboChain = 0;
boostGauge = 60; boostLock = false; hasAirDashed = false;
checkpointReached = false;
player.visible = true;
player.position.copy(START_POS);
velocity.set(0, 0, 0); velocityY = 0;
grounded = true; isBall = false;
for (const el of [ui.intro, ui.finish, ui.gameover, ui.pause, ui.levelselect]) el.classList.add('hidden');
state = 'playing';
ui.levelName.textContent = LEVELS[idx].name;
ui.levelName.classList.add('show');
setTimeout(() => ui.levelName.classList.remove('show'), 2000);
}
function openLevelSelect() {
ui.intro.classList.add('hidden');
ui.finish.classList.add('hidden');
ui.gameover.classList.add('hidden');
ui.pause.classList.add('hidden');
unlockedLevels = loadUnlocked();
ui.levelGrid.innerHTML = '';
LEVELS.forEach((L, i) => {
const locked = i >= unlockedLevels;
const card = document.createElement('div');
card.className = 'level-card' + (locked ? ' locked' : '');
card.innerHTML = <h3>${i + 1}. ${L.name}</h3><p>${L.subtitle}</p><div class="badge">${locked ? 'LOCKED' : 'PLAY'}</div>;
if (!locked) card.addEventListener('click', () => startLevel(i));
ui.levelGrid.appendChild(card);
});
ui.levelselect.classList.remove('hidden');
state = 'menu';
}
function die() {
lives--;
sfx.hurt();
if (lives <= 0) {
state = 'lost';
$('go-stats').textContent = Score: ${score} | Rings: ${ringsCollected};
ui.gameover.classList.remove('hidden');
} else {
toast(Lives remaining: ${lives});
player.position.copy(checkpointReached ? CHECKPOINT_POS : START_POS);
ringsHeld = 0; velocity.set(0, 0, 0); velocityY = 0;
}
}
function hurt() {
if (invincible > 0 || invinciblePower > 0 || homing) return;
if (ringsHeld <= 0) { die(); return; }
scratch.set(player.position.x, player.position.y + 0.5, player.position.z);
for(let i=0; i < Math.min(ringsHeld, 15); i++) {
const ringMesh = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.08, 8, 16), goldMat);
ringMesh.position.copy(scratch);
scene.add(ringMesh);
levelMeshes.push(ringMesh);
rings.push({ mesh: ringMesh, taken: false, vel: new THREE.Vector3((Math.random()-0.5)*9, Math.random()*6+3, (Math.random()-0.5)*9) });
}
ringsHeld = 0;
sfx.hurt();
hurtTime = 0.5; invincible = 2.0;
velocityY = 7; grounded = false;
}
function killEnemy(e) {
e.alive = false; e.group.visible = false;
comboChain++;
comboTimer = 2.0;
const addedScore = 100 * comboChain;
score += addedScore;
boostGauge = Math.min(100, boostGauge + 15);
scratch.copy(e.group.position);
burst(scratch, 14, 10, 0xff5a3c, 16, 0.5);
sfx.kill();
if (comboChain > 1) toast(${comboChain}X COMBO! +${addedScore});
}
function tryHoming() {
if (state !== 'playing' || homing || hurtTime > 0) return;
let best = null, bd = SETTINGS.homingRange;
for (const e of enemies) {
if (!e.alive) continue;
const d = e.group.position.distanceTo(player.position);
if (d < bd) { bd = d; best = e; }
}
if (!best) return;
homing = { target: best, t: 1.0 };
grounded = false; isBall = true;
sfx.homing();
}
function win() {
state = 'won';
sfx.win();
score += ringsHeld * 50;
const rank = worldTime < rankTimes[0] ? 'S' : worldTime < rankTimes[1] ? 'A' : worldTime < rankTimes[2] ? 'B' : 'C';
$('f-time').textContent = fmtTime(worldTime);
$('f-rings').textContent = ${ringsCollected} / ${TOTAL_RINGS};
$('f-score').textContent = String(score);
$('f-rank').textContent = rank;
if (currentLevelIdx + 1 >= unlockedLevels && currentLevelIdx + 1 < LEVELS.length) {
unlockedLevels = currentLevelIdx + 2;
saveUnlocked(unlockedLevels);
}
$('next-level').style.display = currentLevelIdx + 1 < LEVELS.length ? '' : 'none';
ui.finish.classList.remove('hidden');
}
addEventListener('keydown', (e) => {
if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'].includes(e.code)) e.preventDefault();
if (e.repeat) return;
keys[e.code] = true;
if (e.code === 'Space' && state === 'playing') jumpBuffer = 0.12;
if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
if (!grounded && !hasAirDashed && state === 'playing') {
hasAirDashed = true;
padTime = 0.4;
velocityY = 2;
sfx.airdash();
scratch.set(player.position.x, player.position.y + 0.5, player.position.z);
burst(scratch, 12, 6, 0xffffff, 0, 0.3);
}
}
if (e.code === 'KeyE') tryHoming();
if (e.code === 'KeyR' && state === 'playing') startLevel(currentLevelIdx);
if (e.code === 'Escape' || e.code === 'KeyP') {
if (state === 'playing') { state = 'paused'; ui.pause.classList.remove('hidden'); }
else if (state === 'paused') { state = 'playing'; ui.pause.classList.add('hidden'); }
}
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
function wire(id, fn) { $(id)?.addEventListener('click', (ev) => { ev.preventDefault(); fn(); }); }
wire('start', () => startLevel(0));
wire('to-levels', () => openLevelSelect());
wire('back-intro', () => { ui.levelselect.classList.add('hidden'); ui.intro.classList.remove('hidden'); state = 'menu'; });
wire('resume', () => { state = 'playing'; ui.pause.classList.add('hidden'); });
wire('pause-restart', () => startLevel(currentLevelIdx));
wire('pause-levels', () => openLevelSelect());
wire('retry', () => startLevel(currentLevelIdx));
wire('go-levels', () => openLevelSelect());
wire('again', () => startLevel(currentLevelIdx));
wire('next-level', () => startLevel(currentLevelIdx + 1));
wire('finish-levels', () => openLevelSelect());
function update(dt) {
if (dt > 0.05) dt = 0.033;
worldTime += dt;
if (comboTimer > 0) {
comboTimer -= dt;
if (comboTimer <= 0) comboChain = 0;
}
const forward = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
const sideways = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
const wantBoost = !!(keys.ShiftLeft || keys.ShiftRight);
boostOn = wantBoost && !boostLock && boostGauge > 0 && grounded && hurtTime <= 0;
if (boostOn) {
boostGauge = Math.max(0, boostGauge - SETTINGS.boostDrain * dt);
if (boostGauge <= 0) boostLock = true;
} else {
boostOn = false;
boostGauge = Math.min(100, boostGauge + SETTINGS.boostRegen * dt);
if (!wantBoost) boostLock = false;
}
hurtTime = Math.max(0, hurtTime - dt);
invincible = Math.max(0, invincible - dt);
invinciblePower = Math.max(0, invinciblePower - dt);
padTime = Math.max(0, padTime - dt);
jumpBuffer = Math.max(0, jumpBuffer - dt);
coyote = grounded ? 0.12 : Math.max(0, coyote - dt);
if (jumpBuffer > 0 && coyote > 0 && !homing && hurtTime <= 0) {
velocityY = SETTINGS.jumpPower;
grounded = false; isBall = true; coyote = 0; jumpBuffer = 0;
sfx.jump();
}
for (const p of platforms) {
const ox = Math.sin(worldTime * p.moveSpeed + p.phase) * p.moveX;
p.mesh.position.x = p.baseX + ox;
if (Math.abs(player.position.z - p.z) < p.d/2 + 0.4 && Math.abs(player.position.x - p.mesh.position.x) < p.w/2 + 0.4) {
if (player.position.y >= p.y - 0.2 && player.position.y <= p.y + 0.5 && velocityY <= 0) {
player.position.y = p.y + 0.2; velocityY = 0; grounded = true; hasAirDashed = false;
player.position.x += (p.mesh.position.x - (p.baseX + Math.sin((worldTime - dt) * p.moveSpeed + p.phase) * p.moveX));
}
}
}
if (homing) {
const t = homing.target; homing.t -= dt;
if (!t || !t.alive || homing.t <= 0) homing = null;
else {
scratch.set(t.group.position.x, t.group.position.y - 0.4, t.group.position.z).sub(player.position);
const dist = scratch.length();
if (dist < 1.1) {
killEnemy(t); homing = null; velocityY = 10;
} else {
scratch.normalize();
player.position.addScaledVector(scratch, SETTINGS.homingSpeed * dt);
}
}
} else {
let targetSpeedZ = -forward * (boostOn ? SETTINGS.boostSpeed : SETTINGS.walkSpeed);
if (padTime > 0) targetSpeedZ = -SETTINGS.padSpeed;
let targetSpeedX = sideways * 11;
velocity.z = THREE.MathUtils.damp(velocity.z, targetSpeedZ, SETTINGS.acceleration, dt);
velocity.x = THREE.MathUtils.damp(velocity.x, targetSpeedX, SETTINGS.acceleration, dt);
player.position.x += velocity.x * dt;
player.position.z += velocity.z * dt;
}
player.position.x = clamp(player.position.x, -SETTINGS.worldWidth / 2, SETTINGS.worldWidth / 2);
if (!homing) {
const supported = !inPit(player.position.z, 0.35);
if (!grounded) {
velocityY -= SETTINGS.gravity * dt;
player.position.y += velocityY * dt;
if (supported && player.position.y <= 0) {
player.position.y = 0; velocityY = 0; grounded = true; isBall = false; hasAirDashed = false;
}
} else if (!supported) {
grounded = false;
}
}
const spd = Math.hypot(velocity.x, velocity.z);
if (spd > 1.5) heading += shortest(Math.atan2(velocity.x, velocity.z) - heading) * (1 - Math.exp(-12 * dt));
player.rotation.y = heading;
if (isBall) rig.rotation.x += dt * 25; else rig.rotation.x = 0;
center.set(player.position.x, player.position.y + 0.6, player.position.z);
for (const r of rings) {
if (r.taken) continue;
if (r.vel) {
r.mesh.position.addScaledVector(r.vel, dt);
r.vel.y -= 18 * dt;
if (r.mesh.position.y < 0.2) { r.mesh.position.y = 0.2; r.vel.set(0,0,0); }
}
if (r.mesh.position.distanceTo(center) < 1.3) {
r.taken = true; r.mesh.visible = false;
ringsHeld++; ringsCollected++; score += 10;
sfx.ring(ringSfxCount++);
}
}
for (const e of enemies) {
if (e.alive && e.group.position.distanceTo(center) < 1.4) {
if (isBall || boostOn || invinciblePower > 0) killEnemy(e);
else hurt();
}
}
for (const s of spikes) {
if (Math.abs(s.x - player.position.x) < 1.3 && Math.abs(s.z - player.position.z) < 0.8 && player.position.y < 0.6) hurt();
}
for (const sp of springs) {
sp.cooldown = Math.max(0, sp.cooldown - dt);
if (sp.cooldown === 0 && Math.abs(sp.x - player.position.x) < 1.2 && Math.abs(sp.z - player.position.z) < 1.2 && player.position.y < 0.8) {
velocityY = SETTINGS.springPower; grounded = false; isBall = false; sp.cooldown = 0.4;
sfx.spring();
}
}
for (const p of pads) {
if (grounded && Math.abs(p.x - player.position.x) < 1.8 && Math.abs(p.z - player.position.z) < 1.8) {
padTime = 0.8; sfx.pad();
}
}
for (const m of monitors) {
if (!m.taken && Math.abs(m.x - player.position.x) < 1.2 && Math.abs(m.z - player.position.z) < 1.2 && player.position.y < 1.8) {
m.taken = true; m.group.visible = false;
if (m.type === 'rings') { ringsHeld += 10; toast('+10 RINGS'); }
if (m.type === 'boost') { boostGauge = 100; toast('BOOST CHARGED'); }
if (m.type === '1up') { lives++; toast('1-UP!'); }
burst(m.group.position, 12, 6, 0xffffff);
}
}
if (!checkpointReached && player.position.z < CHECKPOINT_Z) { checkpointReached = true; sfx.check(); toast('CHECKPOINT REACHED'); }
if (player.position.y < -12) die();
if (player.position.z < -levelLength) win();
}
function animateScene(dt) {
for (const r of rings) if (!r.taken) r.mesh.rotation.z += dt * 2.5;
for (const e of enemies) if (e.alive) e.group.position.x = e.baseX + Math.sin(worldTime * e.speed) * e.amp;
for (const m of monitors) if (!m.taken) m.group.rotation.y += dt * 1.5;
for (const s of sparks) {
if (s.life > 0) {
s.life -= dt; s.vel.y -= s.grav * dt;
s.mesh.position.addScaledVector(s.vel, dt);
s.mesh.visible = true;
} else s.mesh.visible = false;
}
}
function updateCamera(dt) {
let targetYaw = Math.PI + shortest(heading - Math.PI) * 0.4;
camYaw += shortest(targetYaw - camYaw) * (1 - Math.exp(-4 * dt));
const dist = 9.5 + Math.min(4, Math.hypot(velocity.x, velocity.z) * 0.1);
scratch.set(player.position.x - Math.sin(camYaw)*dist, player.position.y + 4.8, player.position.z - Math.cos(camYaw)*dist);
camera.position.lerp(scratch, 1 - Math.exp(-7 * dt));
camera.lookAt(player.position.x, player.position.y + 1.0, player.position.z);
sun.position.copy(player.position).add(SUN_OFFSET);
sun.target.position.copy(player.position);
}
function updateHud() {
setText(ui.rings, String(ringsHeld));
setText(ui.score, String(score));
setText(ui.time, fmtTime(worldTime));
setText(ui.lives, x${lives});
setText(ui.speed, String(Math.round(Math.hypot(velocity.x, velocity.z) * 4)));
ui.boost.style.width = Math.round(boostGauge) + '%';
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
addEventListener('resize', () => {
camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
renderer.setSize(innerWidth, innerHeight);
});
buildLevel(0);
frame();
