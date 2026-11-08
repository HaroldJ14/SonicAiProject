// SONIC 3D — HYBRID GENERATIONS
// Adventure-style free movement + Generations boost gauge.
// Multi-level, item monitors, moving platforms, progression.

const $ = (id) => document.getElementById(id);
function showError(msg) {
  const el = $('error');
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

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
  boostSpeed: 28,
  acceleration: 36,
  airControl: 0.6,
  jumpPower: 12.5,
  gravity: 30,
  worldWidth: 22,
  padSpeed: 40,
  springPower: 24,
  homingSpeed: 44,
  homingRange: 15,
  boostDrain: 18,
  boostRegen: 7,
  startLives: 3
};

const shortest = (a) => ((a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// ---------------------------------------------------------------- renderer / scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.1, 400);
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

const hemi = new THREE.HemisphereLight(0xe6faff, 0x527a39, 2.0);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -36, right: 36, top: 36, bottom: -36, near: 1, far: 160 });
sun.shadow.camera.updateProjectionMatrix();
sun.shadow.bias = -0.0005;
scene.add(sun, sun.target);
const SUN_OFFSET = new THREE.Vector3(-25, 45, 25);

// Materials
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

// ---------------------------------------------------------------- player
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

// ---------------------------------------------------------------- level data
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
      [[-50, -57], [-132, -140]].forEach(([a, b]) => {
        const heights = [1.6, 2.7, 3.2, 2.7, 1.6];
        heights.forEach((y, i) => add(0, y, a - 1 - (i * (a - b - 2)) / (heights.length - 1)));
      });
      [[3, -84], [5, -87], [6.5, -90], [5, -93], [3, -96]].forEach(([y, z]) => add(0, y, z));
    },
    enemies: [
      ...[[-3, -34], [3, -61], [0, -91], [-3, -122], [3, -151]].map(([x, z]) => ({ x, z, kind: 'floater', amp: 1.2, speed: 1.5 })),
      ...[[-22, 4, 1.6], [-42, 5, 2], [-66, 4.5, 1.8], [-108, 5, 1.7], [-118, 4, 2.2], [-146, 5, 1.9], [-168, 5, 2.1], [-178, 4, 1.5]].map(([z, amp, sp]) => ({ x: 0, z, kind: 'patrol', amp, speed: sp }))
    ],
    spikes: [[-3.5, -30], [3.5, -30], [-3.5, -72], [3.5, -72], [-3, -126], [3, -126], [0, -162]],
    springs: [{ x: 0, z: -82 }],
    pads: [[0, -12], [-2.5, -64], [-2.5, -148]],
    monitors: [
      { x: 3, z: -40, type: 'rings' },
      { x: -3, z: -100, type: 'boost' },
      { x: 0, z: -155, type: 'invincible' }
    ],
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
    pits: [[-40, -48], [-90, -100], [-155, -165]],
    rings: (add) => {
      for (let row = 0; row < 30; row++) {
        const z = -row * 6.5 - 4;
        if ((z < -40 && z > -48) || (z < -90 && z > -100) || (z < -155 && z > -165)) continue;
        const x = Math.sin(row * 0.9) * 4;
        add(x, 1.4, z); add(x + 1.2, 1.4, z);
      }
      // High rings over platforms
      for (let i = 0; i < 5; i++) add(0, 3.5 + i * 0.3, -70 - i * 3);
      for (let i = 0; i < 4; i++) add(Math.sin(i) * 2, 2.8, -130 - i * 4);
    },
    enemies: [
      ...[[-4, -25], [4, -55], [0, -80], [-3, -120], [3, -145], [0, -175]].map(([x, z]) => ({ x, z, kind: 'floater', amp: 1.5, speed: 1.8 })),
      ...[[-18, 5, 2], [-35, 4, 1.7], [-65, 5.5, 2.2], [-115, 4.5, 1.9], [-140, 5, 2], [-185, 4, 1.6]].map(([z, amp, sp]) => ({ x: 0, z, kind: 'patrol', amp, speed: sp }))
    ],
    spikes: [[-4, -22], [4, -22], [0, -58], [-3.5, -95], [3.5, -95], [0, -150], [-2, -180]],
    springs: [{ x: 0, z: -75 }, { x: 2, z: -160 }],
    pads: [[0, -10], [2, -50], [-2, -125], [0, -170]],
    monitors: [
      { x: -3, z: -30, type: 'rings' },
      { x: 3, z: -85, type: 'boost' },
      { x: 0, z: -135, type: '1up' },
      { x: -2, z: -190, type: 'invincible' }
    ],
    platforms: [
      { x: 0, z: -70, w: 6, d: 4, y: 1.8, moveX: 4, moveSpeed: 1.2 },
      { x: 0, z: -132, w: 5, d: 3.5, y: 1.5, moveX: 5, moveSpeed: 1.5 }
    ],
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
    pits: [[-35, -45], [-80, -92], [-145, -158], [-195, -205]],
    rings: (add) => {
      for (let row = 0; row < 34; row++) {
        const z = -row * 6.2 - 3;
        if ((z < -35 && z > -45) || (z < -80 && z > -92) || (z < -145 && z > -158) || (z < -195 && z > -205)) continue;
        const x = Math.sin(row * 0.75) * 3.5;
        add(x - 0.8, 1.5, z); add(x + 0.8, 1.5, z);
        if (row % 3 === 0) add(x, 2.8, z);
      }
      // Neon arcs
      for (let i = 0; i < 7; i++) {
        const t = i / 6;
        add(Math.sin(t * Math.PI) * 4, 1.5 + Math.sin(t * Math.PI) * 3, -55 - t * 12);
      }
    },
    enemies: [
      ...[[-3, -20], [3, -48], [0, -70], [-4, -105], [4, -130], [0, -165], [-2, -185]].map(([x, z]) => ({ x, z, kind: 'floater', amp: 1.8, speed: 2 })),
      ...[[-28, 5, 2.2], [-60, 4.5, 1.8], [-100, 5, 2], [-140, 4, 2.3], [-175, 5.5, 1.9], [-210, 4, 1.7]].map(([z, amp, sp]) => ({ x: 0, z, kind: 'patrol', amp, speed: sp }))
    ],
    spikes: [[-3, -18], [3, -18], [0, -52], [-4, -95], [4, -95], [0, -140], [-3, -170], [3, -200]],
    springs: [{ x: 0, z: -65 }, { x: -2, z: -150 }, { x: 2, z: -180 }],
    pads: [[0, -8], [3, -42], [-3, -110], [0, -160], [2, -195]],
    monitors: [
      { x: 3, z: -25, type: 'rings' },
      { x: -3, z: -75, type: 'boost' },
      { x: 0, z: -125, type: 'invincible' },
      { x: 3, z: -175, type: '1up' },
      { x: 0, z: -215, type: 'boost' }
    ],
    platforms: [
      { x: 0, z: -60, w: 5, d: 3, y: 2.2, moveX: 5, moveSpeed: 1.4 },
      { x: 0, z: -125, w: 6, d: 4, y: 1.6, moveX: 4, moveSpeed: 1.1 },
      { x: 0, z: -185, w: 5, d: 3.5, y: 2.0, moveX: 6, moveSpeed: 1.6 }
    ],
    rankTimes: [35, 55, 80]
  }
];

// Runtime level objects
let currentLevelIdx = 0;
let levelLength = 190;
let PITS = [];
let START_POS = new THREE.Vector3(0, 0, 7);
let CHECKPOINT_POS = new THREE.Vector3(0, 0, -95);
let CHECKPOINT_Z = -100;
let rankTimes = [25, 40, 60];

const rings = [];
const enemies = [];
const spikes = [];
const springs = [];
const pads = [];
const monitors = [];
const platforms = [];
const levelMeshes = []; // for cleanup
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

  // Sky / fog
  scene.background = new THREE.Color(L.sky);
  scene.fog = new THREE.Fog(L.sky, L.fogNear, L.fogFar);
  hemi.color.setHex(L.ground === 'night' ? 0x334466 : L.ground === 'chem' ? 0xa080c0 : 0xe6faff);
  hemi.groundColor.setHex(L.ground === 'night' ? 0x111122 : L.ground === 'chem' ? 0x2a2040 : 0x527a39);

  const gMat = L.ground === 'chem' ? chemFloor : L.ground === 'night' ? nightFloor : grassMat;
  const pMat = L.ground === 'chem' ? chemPath : L.ground === 'night' ? nightPath : pathMat;
  const sideMat = L.ground === 'chem' ? chemAccent : L.ground === 'night' ? neonMat : dirtMat;

  // Ground slabs
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

  abyss = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshBasicMaterial({ color: L.ground === 'night' ? 0x050510 : 0x10243d }));
  abyss.rotation.x = -Math.PI / 2;
  abyss.position.set(0, -14, -levelLength / 2);
  scene.add(abyss);

  // Path markers
  const markerGeo = new THREE.BoxGeometry(0.5, 0.12, 5);
  const mCol = L.ground === 'night' ? starMat : L.ground === 'chem' ? chemAccent : markerMat;
  for (let z = 5; z > -levelLength; z -= 12) {
    if (inPit(z, -4)) continue;
    for (const side of [-1, 1]) {
      const marker = new THREE.Mesh(markerGeo, mCol);
      marker.position.set(side * 7.15, 0.08, z);
      scene.add(marker);
      levelMeshes.push(marker);
    }
  }

  // Decor
  if (L.ground === 'grass') {
    for (let i = 0; i < 48; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const z = 10 - Math.floor(i / 2) * 8.5 - Math.random() * 3;
      const r = 4 + Math.random() * 4;
      const x = side * (SETTINGS.worldWidth / 2 + r + 2 + Math.random() * 10);
      const hill = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 9), hillMats[i % 3]);
      hill.scale.y = 0.65;
      hill.position.set(x, 1.0, z);
      scene.add(hill);
      levelMeshes.push(hill);
      const tx = x + side * (r + 2.5);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 2.2, 7), trunkMat);
      trunk.position.set(tx, 1.0, z - 2);
      trunk.castShadow = true;
      const crown = new THREE.Mesh(new THREE.SphereGeometry(1.5, 9, 8), crownMat);
      crown.position.set(tx, 2.7, z - 2);
      crown.castShadow = true;
      scene.add(trunk, crown);
      levelMeshes.push(trunk, crown);
    }
  } else if (L.ground === 'chem') {
    for (let i = 0; i < 30; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const z = 5 - i * 7 - Math.random() * 4;
      const h = 4 + Math.random() * 8;
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, h, 10), chemAccent);
      pipe.position.set(side * (12 + Math.random() * 6), h / 2, z);
      scene.add(pipe);
      levelMeshes.push(pipe);
    }
  } else {
    // Night stars / neon pillars
    for (let i = 0; i < 40; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const z = 5 - i * 6;
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.6, 6 + Math.random() * 4, 0.6), neonMat);
      pillar.position.set(side * (11 + Math.random() * 5), 3, z);
      scene.add(pillar);
      levelMeshes.push(pillar);
    }
  }

  // Clouds / stars
  const cloudMat = new THREE.MeshBasicMaterial({ color: L.ground === 'night' ? 0xaaaaff : 0xffffff, fog: false });
  for (let i = 0; i < (L.ground === 'night' ? 60 : 14); i++) {
    if (L.ground === 'night') {
      const star = new THREE.Mesh(new THREE.SphereGeometry(0.15 + Math.random() * 0.2, 6, 5), cloudMat);
      star.position.set((Math.random() - 0.5) * 250, 25 + Math.random() * 40, -Math.random() * 260 + 20);
      scene.add(star);
      levelMeshes.push(star);
    } else {
      const cloud = new THREE.Group();
      for (let k = 0; k < 3; k++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(3 + Math.random() * 2, 8, 6), cloudMat);
        puff.position.set(k * 3.2 - 3, Math.random(), Math.random() * 2);
        puff.scale.y = 0.55;
        cloud.add(puff);
      }
      cloud.position.set((Math.random() - 0.5) * 220, 38 + Math.random() * 14, -Math.random() * 230 + 20);
      scene.add(cloud);
      levelMeshes.push(cloud);
    }
  }

  // Rings
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

  // Enemies
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

  // Spikes
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

  // Springs
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

  // Dash pads
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

  // Item monitors
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

  // Moving platforms
  for (const p of L.platforms) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(p.w, 0.4, p.d), L.ground === 'night' ? neonMat : L.ground === 'chem' ? chemAccent : mat(0x8b7355));
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

  // Checkpoint
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

  // Goal
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

// ---------------------------------------------------------------- particles
const sparkGeo = new THREE.SphereGeometry(0.11, 6, 5);
const sparks = [];
for (let i = 0; i < 100; i++) {
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

// ---------------------------------------------------------------- audio
let audioCtx = null;
let muted = false;
function ensureAudio() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch { /* optional */ }
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
  win: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.25, 'triangle', 0.07), i * 130)),
  monitor: () => { beep(440, 0.08, 'square', 0.05); setTimeout(() => beep(880, 0.15, 'triangle', 0.06), 80); },
  oneup: () => [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => beep(f, 0.12, 'triangle', 0.05), i * 70))
};

// ---------------------------------------------------------------- game state
const keys = {};
let state = 'menu';
let worldTime = 0;
let ringsHeld = 0, ringsCollected = 0, score = 0, lives = SETTINGS.startLives;
let boostGauge = 50, boostLock = false, boostOn = false;
const velocity = new THREE.Vector3();
let velocityY = 0;
let grounded = true, isBall = false, coyote = 0, jumpBuffer = 0;
let hurtTime = 0, invincible = 0, padTime = 0, invinciblePower = 0;
let homing = null;
let heading = Math.PI, camYaw = Math.PI;
let checkpointReached = false;
let sparkTimer = 0;
let ringSfxCount = 0;
let onPlatform = null;
const center = new THREE.Vector3();
const scratch = new THREE.Vector3();

const UNLOCK_KEY = 'sonic3d-unlocked';
const BEST_PREFIX = 'sonic3d-best-';
function loadUnlocked() {
  try {
    const v = parseInt(localStorage.getItem(UNLOCK_KEY) || '1', 10);
    return Number.isFinite(v) ? Math.max(1, Math.min(LEVELS.length, v)) : 1;
  } catch { return 1; }
}
function saveUnlocked(n) {
  try { localStorage.setItem(UNLOCK_KEY, String(n)); } catch { /* ignore */ }
}
function loadBest(id) {
  try {
    const v = parseFloat(localStorage.getItem(BEST_PREFIX + id));
    return Number.isFinite(v) ? v : null;
  } catch { return null; }
}
function saveBest(id, t) {
  try { localStorage.setItem(BEST_PREFIX + id, String(t)); } catch { /* ignore */ }
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
  return `${m}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
};
let toastTimer = 0;
function toast(text) {
  ui.toast.textContent = text;
  ui.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ui.toast.classList.remove('show'), 1600);
}
function showLevelName(name) {
  ui.levelName.textContent = name;
  ui.levelName.classList.add('show');
  setTimeout(() => ui.levelName.classList.remove('show'), 2200);
}

function hideOverlays() {
  for (const el of [ui.intro, ui.finish, ui.gameover, ui.pause, ui.levelselect]) {
    if (el) el.classList.add('hidden');
  }
}

function placePlayer(pos) {
  player.position.copy(pos);
  velocity.set(0, 0, 0);
  velocityY = 0;
  grounded = true; isBall = false; homing = null; padTime = 0; hurtTime = 0;
  onPlatform = null;
  heading = Math.PI; camYaw = Math.PI;
  player.rotation.y = heading;
  rig.rotation.set(0, 0, 0);
  updateCamera(0, true);
}

function resetLevelState() {
  worldTime = 0;
  ringsHeld = 0; ringsCollected = 0; score = 0; lives = SETTINGS.startLives;
  boostGauge = 50; boostLock = false; boostOn = false;
  invincible = 0; invinciblePower = 0; checkpointReached = false;
  for (const r of rings) { r.taken = false; r.mesh.visible = true; }
  for (const e of enemies) { e.alive = true; e.group.visible = true; }
  for (const m of monitors) { m.taken = false; m.group.visible = true; }
  if (cpMat) { cpMat.color.setHex(0xffdf43); cpMat.emissive.setHex(0x553300); }
  for (const s of sparks) { s.life = 0; s.mesh.visible = false; }
  player.visible = true;
  placePlayer(START_POS);
}

function startLevel(idx) {
  ensureAudio();
  buildLevel(idx);
  resetLevelState();
  hideOverlays();
  state = 'playing';
  showLevelName(LEVELS[idx].name);
}

function openLevelSelect() {
  hideOverlays();
  unlockedLevels = loadUnlocked();
  ui.levelGrid.innerHTML = '';
  LEVELS.forEach((L, i) => {
    const locked = i >= unlockedLevels;
    const best = loadBest(L.id);
    const card = document.createElement('div');
    card.className = 'level-card' + (locked ? ' locked' : '');
    card.innerHTML = `
      <h3>${i + 1}. ${L.name}</h3>
      <p>${L.subtitle}</p>
      ${best !== null ? `<div class="best">Best: ${fmtTime(best)}</div>` : ''}
      ${locked ? '<div class="badge">LOCKED</div>' : '<div class="badge">PLAY</div>'}
    `;
    if (!locked) {
      card.addEventListener('click', () => startLevel(i));
    }
    ui.levelGrid.appendChild(card);
  });
  ui.levelselect.classList.remove('hidden');
  state = 'menu';
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
  if (invincible > 0 || invinciblePower > 0 || homing) return;
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
  boostGauge = Math.min(100, boostGauge + 14);
  scratch.copy(e.group.position);
  burst(scratch, 14, 10, 0xff5a3c, 16, 0.5);
  sfx.kill();
}

function openMonitor(m) {
  m.taken = true;
  m.group.visible = false;
  score += 50;
  scratch.copy(m.group.position);
  burst(scratch, 12, 8, 0xffffff, 10, 0.5);
  if (m.type === 'rings') {
    ringsHeld += 10; ringsCollected += 10; score += 50;
    toast('+10 RINGS!');
    sfx.monitor();
  } else if (m.type === 'boost') {
    boostGauge = 100;
    toast('BOOST FULL!');
    sfx.monitor();
  } else if (m.type === 'invincible') {
    invinciblePower = 8;
    toast('INVINCIBLE!');
    sfx.monitor();
  } else if (m.type === '1up') {
    lives++;
    toast('1-UP!');
    sfx.oneup();
  }
}

function findTarget() {
  let best = null, bd = SETTINGS.homingRange;
  for (const e of enemies) {
    if (!e.alive) continue;
    if (e.group.position.z - player.position.z > 4) continue;
    const d = e.group.position.distanceTo(center);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

function tryHoming() {
  if (state !== 'playing' || homing || hurtTime > 0) return;
  const target = findTarget();
  if (!target) return;
  homing = { target, t: 1.1 };
  grounded = false; isBall = true; velocityY = 0;
  sfx.homing();
}

function win() {
  state = 'won';
  sfx.win();
  const bonus = Math.max(0, Math.round((rankTimes[2] - worldTime) * 40));
  score += bonus + ringsHeld * 50;
  const L = LEVELS[currentLevelIdx];
  const best = loadBest(L.id);
  const isBest = best === null || worldTime < best;
  if (isBest) saveBest(L.id, worldTime);
  const rank = worldTime < rankTimes[0] ? 'S' : worldTime < rankTimes[1] ? 'A' : worldTime < rankTimes[2] ? 'B' : 'C';
  $('f-time').textContent = fmtTime(worldTime);
  $('f-rings').textContent = `${ringsCollected} / ${TOTAL_RINGS}`;
  $('f-score').textContent = String(score);
  $('f-rank').textContent = rank;
  $('f-best').textContent = isBest ? 'NEW BEST TIME!' : `Best: ${fmtTime(best)}`;

  // Unlock next
  if (currentLevelIdx + 1 >= unlockedLevels && currentLevelIdx + 1 < LEVELS.length) {
    unlockedLevels = currentLevelIdx + 2;
    saveUnlocked(unlockedLevels);
    toast('NEW LEVEL UNLOCKED!');
  }

  const nextBtn = $('next-level');
  if (nextBtn) nextBtn.style.display = currentLevelIdx + 1 < LEVELS.length ? '' : 'none';

  ui.finish.classList.remove('hidden');
}

// ---------------------------------------------------------------- input
const GAME_KEYS = ['Space', 'ArrowUp', '