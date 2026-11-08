import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

// ------------------------------------------------------------
// GREEN HILL DASH — small 3D browser-game starter
// Edit the values in this section to tune the game.
// ------------------------------------------------------------
const SETTINGS = {
  laneLimit: 4.2,
  forwardSpeed: 17,
  boostSpeed: 28,
  jumpPower: 11,
  gravity: 27,
  ringSpacing: 8,
  obstacleSpacing: 24
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x79d9ff);
scene.fog = new THREE.Fog(0x79d9ff, 35, 145);

const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.1, 220);
camera.position.set(0, 5.5, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xdaf5ff, 0x54752d, 2.0));
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.position.set(-8, 18, 10);
sun.castShadow = true;
scene.add(sun);

// Materials
const grassMat = new THREE.MeshStandardMaterial({ color: 0x48b83d, roughness: 1 });
const pathMat = new THREE.MeshStandardMaterial({ color: 0xc98b42, roughness: 1 });
const blueMat = new THREE.MeshStandardMaterial({ color: 0x0879e8, roughness: 0.55 });
const lightBlueMat = new THREE.MeshStandardMaterial({ color: 0x35baff });
const redMat = new THREE.MeshStandardMaterial({ color: 0xe83932, roughness: 0.5 });
const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd52a, metalness: 0.65, roughness: 0.25 });

// Ground and track
const ground = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), grassMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.18;
ground.receiveShadow = true;
scene.add(ground);

const track = new THREE.Mesh(new THREE.BoxGeometry(11, 0.25, 220), pathMat);
track.position.set(0, -0.08, -75);
track.receiveShadow = true;
scene.add(track);

// Simple repeating scenery
const scenery = [];
for (let i = 0; i < 34; i++) {
  for (const side of [-1, 1]) {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.3, 2.1, 7),
      new THREE.MeshStandardMaterial({ color: 0x8a4d25 })
    );
    trunk.position.set(side * (8 + Math.random() * 5), 0.95, -i * 8 - 8);
    scene.add(trunk);
    const leaves = new THREE.Mesh(
      new THREE.SphereGeometry(1.35 + Math.random() * 0.5, 8, 7),
      new THREE.MeshStandardMaterial({ color: 0x168b43 })
    );
    leaves.position.set(trunk.position.x, 2.7, trunk.position.z);
    scene.add(leaves);
    scenery.push(trunk, leaves);
  }
}

// Player: a blue mascot placeholder built from basic 3D shapes.
// You can replace this group with a model you make in Blender.
const player = new THREE.Group();
scene.add(player);

const body = new THREE.Mesh(new THREE.SphereGeometry(0.62, 20, 16), blueMat);
body.scale.set(0.82, 1.05, 0.72);
body.position.y = 0.85;
body.castShadow = true;
player.add(body);

const belly = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 12),
  new THREE.MeshStandardMaterial({ color: 0xffd7a0 }));
belly.scale.set(0.85, 0.9, 0.38);
belly.position.set(0, 0.77, 0.43);
player.add(belly);

const face = new THREE.Mesh(new THREE.SphereGeometry(0.37, 16, 12), lightBlueMat);
face.scale.set(1.05, 0.68, 0.75);
face.position.set(0, 1.23, 0.25);
player.add(face);

for (const x of [-0.16, 0.16]) {
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), whiteMat);
  eye.position.set(x, 1.34, 0.52);
  player.add(eye);
}
const nose = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10),
  new THREE.MeshStandardMaterial({ color: 0x17233a }));
nose.position.set(0, 1.19, 0.61);
player.add(nose);

for (const x of [-0.28, 0.28]) {
  const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.2, 0.7),
    new THREE.MeshStandardMaterial({ color: 0xe92c2c }));
  shoe.position.set(x, 0.14, 0.02);
  shoe.castShadow = true;
  player.add(shoe);
}
player.position.set(0, 0, 2);

// Rings and obstacles
const rings = [];
const obstacles = [];
const ringGeometry = new THREE.TorusGeometry(0.48, 0.105, 10, 24);

function addRing(x, z, y = 1.35) {
  const ring = new THREE.Mesh(ringGeometry, goldMat);
  ring.position.set(x, y, z);
  ring.rotation.y = Math.PI / 2;
  ring.castShadow = true;
  scene.add(ring);
  rings.push(ring);
}

function addObstacle(x, z) {
  const bumper = new THREE.Mesh(new THREE.SphereGeometry(0.68, 16, 12), redMat);
  bumper.position.set(x, 0.68, z);
  bumper.castShadow = true;
  scene.add(bumper);
  const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.69, 0.07, 8, 24), whiteMat);
  stripe.position.copy(bumper.position);
  stripe.rotation.x = Math.PI / 2;
  scene.add(stripe);
  obstacles.push({ mesh: bumper, stripe });
}

for (let row = 0; row < 16; row++) {
  const z = -row * SETTINGS.ringSpacing - 8;
  const lane = [-3, 0, 3][Math.floor(Math.random() * 3)];
  for (let j = -1; j <= 1; j++) addRing(lane + j * 0.9, z - Math.abs(j) * 0.35);
}
for (let i = 0; i < 8; i++) {
  const x = [-3.2, 0, 3.2][Math.floor(Math.random() * 3)];
  addObstacle(x, -20 - i * SETTINGS.obstacleSpacing);
}

const keys = {};
let running = false;
let ringsCollected = 0;
let velocityY = 0;
let distance = 0;
let currentSpeed = SETTINGS.forwardSpeed;
let lastSpawnZ = -145;

const ringCount = document.getElementById('ring-count');
const speedCount = document.getElementById('speed-count');
const message = document.getElementById('message');
const startButton = document.getElementById('start-button');

addEventListener('keydown', (event) => {
  keys[event.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
    event.preventDefault();
  }
  if (event.code === 'KeyR') resetGame();
  if (event.code === 'Space' && running && player.position.y <= 0.02) {
    velocityY = SETTINGS.jumpPower;
  }
});
addEventListener('keyup', (event) => keys[event.code] = false);

function resetGame() {
  ringsCollected = 0;
  distance = 0;
  velocityY = 0;
  player.position.set(0, 0, 2);
  for (const ring of rings) scene.remove(ring);
  for (const item of obstacles) {
    scene.remove(item.mesh);
    scene.remove(item.stripe);
  }
  rings.length = 0;
  obstacles.length = 0;
  for (let row = 0; row < 16; row++) {
    const z = -row * SETTINGS.ringSpacing - 8;
    const lane = [-3, 0, 3][Math.floor(Math.random() * 3)];
    for (let j = -1; j <= 1; j++) addRing(lane + j * 0.9, z - Math.abs(j) * 0.35);
  }
  for (let i = 0; i < 8; i++) {
    const x = [-3.2, 0, 3.2][Math.floor(Math.random() * 3)];
    addObstacle(x, -20 - i * SETTINGS.obstacleSpacing);
  }
  ringCount.textContent = '0';
  message.style.display = 'none';
  running = true;
}
startButton.addEventListener('click', resetGame);

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.04);

  if (running) {
    const boosting = keys.ShiftLeft || keys.ShiftRight;
    currentSpeed = boosting ? SETTINGS.boostSpeed : SETTINGS.forwardSpeed;

    const move = 7.5 * dt;
    if (keys.ArrowLeft || keys.KeyA) player.position.x -= move;
    if (keys.ArrowRight || keys.KeyD) player.position.x += move;
    player.position.x = THREE.MathUtils.clamp(player.position.x, -SETTINGS.laneLimit, SETTINGS.laneLimit);

    // Jump physics
    if (player.position.y > 0 || velocityY > 0) {
      velocityY -= SETTINGS.gravity * dt;
      player.position.y += velocityY * dt;
      if (player.position.y < 0) {
        player.position.y = 0;
        velocityY = 0;
      }
    }

    // Move the world toward the player to create forward motion.
    const dz = currentSpeed * dt;
    distance += dz;
    for (const ring of rings) {
      ring.position.z += dz;
      ring.rotation.z += dt * 2.5;
      if (ring.position.distanceTo(new THREE.Vector3(player.position.x, player.position.y + 1, player.position.z)) < 1.05) {
        scene.remove(ring);
        ring.userData.collected = true;
        ringsCollected++;
        ringCount.textContent = ringsCollected;
      }
    }
    for (let i = rings.length - 1; i >= 0; i--) {
      if (rings[i].userData.collected || rings[i].position.z > 13) rings.splice(i, 1);
    }

    for (const obstacle of obstacles) {
      obstacle.mesh.position.z += dz;
      obstacle.stripe.position.z += dz;
      const dx = Math.abs(obstacle.mesh.position.x - player.position.x);
      const dzPlayer = Math.abs(obstacle.mesh.position.z - player.position.z);
      if (dx < 0.95 && dzPlayer < 0.9 && player.position.y < 0.7) {
        // A bump slows you briefly instead of ending the prototype run.
        currentSpeed = 7;
      }
    }
    for (let i = obstacles.length - 1; i >= 0; i--) {
      if (obstacles[i].mesh.position.z > 13) {
        scene.remove(obstacles[i].mesh);
        scene.remove(obstacles[i].stripe);
        obstacles.splice(i, 1);
      }
    }

    // Keep feeding the course ahead.
    if (rings.length < 24) {
      const z = -110 - Math.random() * 35;
      const lane = [-3, 0, 3][Math.floor(Math.random() * 3)];
      for (let j = -1; j <= 1; j++) addRing(lane + j * 0.9, z - Math.abs(j) * 0.35);
    }
    if (obstacles.length < 5) {
      const x = [-3.2, 0, 3.2][Math.floor(Math.random() * 3)];
      addObstacle(x, -100 - Math.random() * 35);
    }

    // Running animation
    player.rotation.z = THREE.MathUtils.lerp(player.rotation.z,
      (keys.ArrowLeft || keys.KeyA) ? 0.12 : (keys.ArrowRight || keys.KeyD) ? -0.12 : 0, 0.12);
    body.rotation.x = Math.sin(distance * 0.035) * 0.08;
    speedCount.textContent = Math.round(currentSpeed * 4);
  }

  camera.position.x = THREE.MathUtils.lerp(camera.position.x, player.position.x * 0.35, 0.05);
  camera.position.y = 5.2 + player.position.y * 0.25;
  camera.lookAt(player.position.x * 0.25, 1.0 + player.position.y * 0.25, -5);

  renderer.render(scene, camera);
}
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
