import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// SONIC 3D — HYBRID GAMEPLAY PROTOTYPE
// Adventure-style movement + a Generations-inspired boost.
// The level is a real space to run around in; it does not scroll automatically.

const SETTINGS = {
  walkSpeed: 13,
  boostSpeed: 27,
  acceleration: 34,
  airControl: 0.58,
  jumpPower: 12,
  gravity: 30,
  levelLength: 190,
  worldWidth: 22
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x79dfff);
// FIX: fog far pushed beyond levelLength so the goal gate is visible on approach.
scene.fog = new THREE.Fog(0x79dfff, 80, 260);

const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.1, 300);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xe6faff, 0x527a39, 2.0));
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.position.set(-25, 40, 25);
sun.castShadow = true;
// FIX: configure shadow camera + map so shadows cover the whole level area.
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 150;
sun.shadow.camera.left = -45;
sun.shadow.camera.right = 45;
sun.shadow.camera.top = 45;
sun.shadow.camera.bottom = -45;
scene.add(sun);
scene.add(sun.target);

// Materials
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });
const grassMat = mat(0x42b943);
const pathMat = mat(0xc58a43);
const blueMat = mat(0x0879e8, { roughness: 0.5 });
const creamMat = mat(0xffd9a2);
const redMat = mat(0xe63232);
const whiteMat = mat(0xffffff);
const goldMat = mat(0xffd52b, { metalness: 0.55, roughness: 0.24 });
const darkMat = mat(0x27384a);

// Ground and broad running path
const ground = new THREE.Mesh(new THREE.PlaneGeometry(260, 300), grassMat);
ground.rotation.x = -Math.PI / 2;
ground.position.set(0, -0.18, -75);
ground.receiveShadow = true;
scene.add(ground);

const path = new THREE.Mesh(new THREE.BoxGeometry(15, 0.25, SETTINGS.levelLength + 25), pathMat);
path.position.set(0, -0.08, -82);
path.receiveShadow = true;
scene.add(path);

// Decorative checker-like path edge markers
for (let z = 5; z > -SETTINGS.levelLength; z -= 12) {
  for (const side of [-1, 1]) {
    const marker = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 5), mat(0xf3d18b));
    marker.position.set(side * 7.15, 0.08, z);
    scene.add(marker);
  }
}

// Hills and simple trees
for (let i = 0; i < 44; i++) {
  const side = i % 2 === 0 ? -1 : 1;
  const z = 8 - Math.floor(i / 2) * 9 - Math.random() * 4;
  const x = side * (13 + Math.random() * 18);
  const hill = new THREE.Mesh(
    new THREE.SphereGeometry(5 + Math.random() * 5, 12, 9),
    mat([0x48bd4b, 0x55c64e, 0x269b43][i % 3])
  );
  hill.scale.y = 0.65;
  hill.position.set(x, 1.8, z);
  scene.add(hill);

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 2.2, 7), mat(0x875027));
  trunk.position.set(x + side * 3, 1.0, z - 2);
  scene.add(trunk);
  const crown = new THREE.Mesh(new THREE.SphereGeometry(1.5, 9, 8), mat(0x168d43));
  crown.position.set(trunk.position.x, 2.7, trunk.position.z);
  scene.add(crown);
}

// Player placeholder: a blue mascot made from simple shapes.
// Replace this group with a Blender GLB model when you have one.
const player = new THREE.Group();
scene.add(player);

const body = new THREE.Mesh(new THREE.SphereGeometry(0.62, 20, 16), blueMat);
body.scale.set(0.82, 1.05, 0.72);
body.position.y = 0.88;
body.castShadow = true;
player.add(body);

const belly = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 12), creamMat);
belly.scale.set(0.85, 0.9, 0.38);
belly.position.set(0, 0.78, 0.43);
player.add(belly);

const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12), mat(0x1595ed));
muzzle.scale.set(1.05, 0.65, 0.75);
muzzle.position.set(0, 1.24, 0.25);
player.add(muzzle);

for (const x of [-0.16, 0.16]) {
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), whiteMat);
  eye.position.set(x, 1.36, 0.51);
  player.add(eye);
}
const nose = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), darkMat);
nose.position.set(0, 1.2, 0.62);
player.add(nose);

for (const x of [-0.28, 0.28]) {
  const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.43, 0.2, 0.72), mat(0xe52b2b));
  shoe.position.set(x, 0.14, 0.02);
  shoe.castShadow = true;
  player.add(shoe);
}
player.position.set(0, 0, 7);
player.rotation.y = Math.PI; // face down the level, toward negative Z

// Rings
const rings = [];
const ringGeometry = new THREE.TorusGeometry(0.48, 0.105, 10, 24);
function addRing(x, y, z) {
  const ring = new THREE.Mesh(ringGeometry, goldMat);
  ring.position.set(x, y, z);
  // FIX: leave ring in default orientation and spin around Y in animate
  // (classic coin-spin) instead of an odd tumble from combined Y/Z rotation.
  scene.add(ring);
  rings.push(ring);
}
function seedRings() {
  for (let row = 0; row < 22; row++) {
    const z = -row * 7 - 5;
    const x = Math.sin(row * 0.65) * 3.2;
    addRing(x - 1, 1.35, z);
    addRing(x, 1.35, z);
    addRing(x + 1, 1.35, z);
  }
}
seedRings();

// Targets for homing attack and obstacles
const targets = [];
function addTarget(x, z) {
  const group = new THREE.Group();
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 12), redMat);
  const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.71, 0.08, 8, 22), whiteMat);
  stripe.rotation.x = Math.PI / 2;
  group.add(orb, stripe);
  group.position.set(x, 0.85, z);
  scene.add(group);
  targets.push(group);
}
function seedTargets() {
  for (const [x, z] of [[-3, -34], [3, -61], [0, -91], [-3, -122], [3, -151]]) addTarget(x, z);
}
seedTargets();

// A checkpoint arch
const checkpoint = new THREE.Group();
const postMat = mat(0xffdf43, { emissive: 0x553300 });
for (const x of [-5, 5]) {
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.45, 4, 0.45), postMat);
  post.position.set(x, 2, 0);
  checkpoint.add(post);
}
const topBar = new THREE.Mesh(new THREE.BoxGeometry(10.4, 0.45, 0.45), postMat);
topBar.position.y = 4;
checkpoint.add(topBar);
checkpoint.position.z = -100;
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

const keys = {};
let running = false;
let finished = false;
let ringsCollected = 0;
let velocity = new THREE.Vector3();
let velocityY = 0;
let grounded = true;
let boostOn = false;
let homingCooldown = 0;          // FIX: real cooldown replaces the old dead `homingTime`
let checkpointReached = false;
const checkpointPosition = new THREE.Vector3(0, 0, -95);

const ringDisplay = document.getElementById('rings');
const speedDisplay = document.getElementById('speed');
const intro = document.getElementById('intro');
const finish = document.getElementById('finish');

// FIX: shortest-path angle interpolation — avoids long-way spins at ±π.
function lerpAngle(a, b, t) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

addEventListener('keydown', (e) => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  // FIX: ignore auto-repeat so Space/E/R don't fire dozens of times per second.
  if (e.repeat) return;

  keys[e.code] = true;
  if (e.code === 'Space' && running && !finished && grounded) {
    velocityY = SETTINGS.jumpPower;
    grounded = false;
  }
  if (e.code === 'KeyE' && running && !finished) startHomingAttack();
  if (e.code === 'KeyR') resetGame();
});
addEventListener('keyup', (e) => keys[e.code] = false);

function startHomingAttack() {
  // FIX: require airborne + cooldown so it can't be spammed from the ground.
  if (targets.length === 0 || grounded || homingCooldown > 0) return;

  let nearest = null;
  let best = 13;
  for (const target of targets) {
    const d = target.position.distanceTo(player.position);
    if (d < best) { best = d; nearest = target; }
  }
  if (nearest) {
    player.position.set(nearest.position.x, 0, nearest.position.z);
    velocity.set(0, 0, -SETTINGS.boostSpeed * 0.65);
    velocityY = 4;
    grounded = false;
    scene.remove(nearest);
    targets.splice(targets.indexOf(nearest), 1);
    homingCooldown = 0.6;
  }
}

function resetGame() {
  ringsCollected = 0;
  ringDisplay.textContent = '0';
  velocity.set(0, 0, 0);
  velocityY = 0;
  grounded = true;
  boostOn = false;
  // FIX: reset ALL transient state that used to leak between runs.
  homingCooldown = 0;
  checkpointReached = false;
  checkpointPosition.set(0, 0, -95);
  player.position.set(0, 0, 7);
  player.rotation.set(0, Math.PI, 0);
  body.rotation.x = 0;

  for (const ring of rings) scene.remove(ring);
  rings.length = 0;
  seedRings();

  for (const target of targets) scene.remove(target);
  targets.length = 0;
  seedTargets();

  running = true;
  finished = false;
  intro.classList.add('hidden');
  finish.classList.add('hidden');
}
document.getElementById('start').addEventListener('click', resetGame);
document.getElementById('again').addEventListener('click', resetGame);

const clock = new THREE.Clock();
const desiredCameraPosition = new THREE.Vector3();
const cameraLookAt = new THREE.Vector3();
const ringCheckPoint = new THREE.Vector3();   // FIX: reused instead of allocating per frame

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.035);

  if (running && !finished) {
    const forward = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
    const sideways = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
    boostOn = !!(keys.ShiftLeft || keys.ShiftRight);

    // Camera-relative movement: W moves along the level, A/D steer.
    const targetForward = forward !== 0 ? forward * (boostOn ? SETTINGS.boostSpeed : SETTINGS.walkSpeed) : 0;
    const targetSide = sideways * (boostOn ? 13 : 10);
    const control = grounded ? 1 : SETTINGS.airControl;
    velocity.z = THREE.MathUtils.damp(velocity.z, -targetForward, SETTINGS.acceleration * control, dt);
    velocity.x = THREE.MathUtils.damp(velocity.x, targetSide, SETTINGS.acceleration * control, dt);

    // Boost can also build forward momentum when Shift is held.
    if (boostOn && forward === 0) {
      velocity.z = THREE.MathUtils.damp(velocity.z, -SETTINGS.boostSpeed, 16 * control, dt);
    }

    player.position.x += velocity.x * dt;
    player.position.z += velocity.z * dt;
    player.position.x = THREE.MathUtils.clamp(player.position.x, -SETTINGS.worldWidth / 2, SETTINGS.worldWidth / 2);

    // Jump and gravity
    if (!grounded) {
      velocityY -= SETTINGS.gravity * dt;
      player.position.y += velocityY * dt;
      if (player.position.y <= 0) {
        player.position.y = 0;
        velocityY = 0;
        grounded = true;
      }
    }

    // FIX: correct facing formula — local +Z forward is (sinθ, cosθ).
    // The old atan2(x, -z) turned the model around when running forward.
    if (Math.abs(velocity.x) + Math.abs(velocity.z) > 1.2) {
      const angle = Math.atan2(velocity.x, velocity.z);
      player.rotation.y = lerpAngle(player.rotation.y, angle, 0.18);
    }
    player.rotation.z = THREE.MathUtils.lerp(player.rotation.z, -sideways * 0.12, 0.12);
    body.rotation.x = Math.sin(performance.now() * 0.012) * Math.min(0.12, velocity.length() * 0.003);

    // Ring collection
    for (let i = rings.length - 1; i >= 0; i--) {
      const ring = rings[i];
      ring.rotation.y += dt * 3;                       // FIX: coin-spin around Y
      ringCheckPoint.set(player.position.x, player.position.y + 0.9, player.position.z);
      if (ring.position.distanceTo(ringCheckPoint) < 1.25) {
        scene.remove(ring);
        rings.splice(i, 1);
        ringsCollected++;
        ringDisplay.textContent = ringsCollected;
      }
    }

    // Target bump — FIX: single response per frame, consistent horizontal distance test.
    for (const target of targets) {
      const dx = target.position.x - player.position.x;
      const dz = target.position.z - player.position.z;
      if (dx * dx + dz * dz < 1.44 && player.position.y < 1.2) {
        velocity.x *= 0.5;
        velocity.z *= 0.5;
        break;
      }
    }

    if (!checkpointReached && player.position.z < -97) {
      checkpointReached = true;
      checkpointPosition.set(0, 0, -95);
    }

    // Fall recovery
    if (player.position.y < -8) {
      player.position.copy(checkpointReached ? checkpointPosition : new THREE.Vector3(0, 0, 7));
      velocity.set(0, 0, 0);
      velocityY = 0;
      grounded = true;
    }

    // Goal trigger
    if (player.position.z < -SETTINGS.levelLength + 2) {
      finished = true;
      document.getElementById('finish-stats').textContent =
        `You collected ${ringsCollected} rings. Nice running!`;
      finish.classList.remove('hidden');
    }

    homingCooldown = Math.max(0, homingCooldown - dt);
    speedDisplay.textContent = Math.round(velocity.length() * 4);
  }

  // Third-person chase camera: always stays behind the character.
  const behind = new THREE.Vector3(0, 5.2, 10);
  behind.applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y - Math.PI);
  desiredCameraPosition.set(
    player.position.x + behind.x,
    player.position.y + behind.y,
    player.position.z + behind.z
  );
  camera.position.lerp(desiredCameraPosition, 1 - Math.pow(0.001, dt));

  // FIX: look in the player's facing direction, not always toward -Z.
  const fx = Math.sin(player.rotation.y);
  const fz = Math.cos(player.rotation.y);
  cameraLookAt.set(
    player.position.x + fx * 4,
    player.position.y + 1.1,
    player.position.z + fz * 4
  );
  camera.lookAt(cameraLookAt);

  // FIX: move sun + its target with the player so shadows follow the action.
  sun.position.set(player.position.x - 25, 40, player.position.z + 25);
  sun.target.position.set(player.position.x, 0, player.position.z);
  sun.target.updateMatrixWorld();

  renderer.render(scene, camera);
}
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
