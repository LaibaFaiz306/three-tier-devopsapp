import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';

// ---------- Renderer / scene / camera ----------
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x03030a);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1200);
const HOME_POS = new THREE.Vector3(0, 24, 44);
const HOME_TARGET = new THREE.Vector3(0, 0, 0);
camera.position.set(0, 90, 150); // intro fly-in starts far away

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.35;
controls.minDistance = 5;
controls.maxDistance = 95;
controls.enablePan = false;

// ---------- Helpers ----------
function makeGlowTexture() {
  const s = 128;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  gr.addColorStop(0.0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.2, 'rgba(255,255,255,0.65)');
  gr.addColorStop(0.5, 'rgba(255,255,255,0.14)');
  gr.addColorStop(1.0, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, s, s);
  return new THREE.CanvasTexture(c);
}
const glow = makeGlowTexture();

// ---------- Background star dust ----------
(function buildBackdrop() {
  const n = 3500;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const r = 220 + Math.random() * 380;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.cos(phi);
    pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ size: 2.2, map: glow, color: 0xcfd8ff, transparent: true, opacity: 0.8,
    depthWrite: false, blending: THREE.AdditiveBlending });
  scene.add(new THREE.Points(geo, mat));
})();

// ---------- Spiral galaxy ----------
const galaxy = (function buildGalaxy() {
  const N = 30000, ARMS = 3, RADIUS = 32;
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const inner = new THREE.Color('#ffd9a0');
  const mid = new THREE.Color('#c77dff');
  const outer = new THREE.Color('#4f7bff');
  const tmp = new THREE.Color();
  const scatter = r => (Math.random() < 0.5 ? -1 : 1) * Math.pow(Math.random(), 2.6) * (0.7 + r * 0.09);

  for (let i = 0; i < N; i++) {
    const r = Math.pow(Math.random(), 0.75) * RADIUS + 0.8;
    const arm = i % ARMS;
    const angle = (arm / ARMS) * Math.PI * 2 + r * 0.35;
    pos[i * 3] = Math.cos(angle) * r + scatter(r);
    pos[i * 3 + 1] = scatter(r) * 0.55;
    pos[i * 3 + 2] = Math.sin(angle) * r + scatter(r);

    const t = r / RADIUS;
    if (t < 0.5) tmp.copy(inner).lerp(mid, t / 0.5);
    else tmp.copy(mid).lerp(outer, (t - 0.5) / 0.5);
    const b = 0.55 + Math.random() * 0.45;
    col[i * 3] = tmp.r * b; col[i * 3 + 1] = tmp.g * b; col[i * 3 + 2] = tmp.b * b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({ size: 0.42, map: glow, vertexColors: true, transparent: true, opacity: 0.95,
    depthWrite: false, blending: THREE.AdditiveBlending });
  const points = new THREE.Points(geo, mat);
  scene.add(points);

  // Glowing core
  const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xffd9a0, transparent: true, opacity: 0.95,
    depthWrite: false, blending: THREE.AdditiveBlending }));
  core.scale.setScalar(15);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xff7a3d, transparent: true, opacity: 0.28,
    depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.setScalar(46);
  scene.add(core, halo);
  return { points, core, halo };
})();

// ---------- Planted stars ----------
const stars = new Map();      // id -> sprite
const sprites = [];           // raycast list
let hovered = null;

function addStar(s, animate) {
  if (stars.has(s.id)) return null;
  const mat = new THREE.SpriteMaterial({ map: glow, color: new THREE.Color(s.color), transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending });
  const sp = new THREE.Sprite(mat);
  sp.position.set(s.x, s.y, s.z);
  const base = 1.9 + (s.id % 5) * 0.18;
  sp.userData = { star: s, base, born: animate ? performance.now() : -1, phase: Math.random() * Math.PI * 2 };
  sp.scale.setScalar(animate ? 0.01 : base);

  const center = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xffffff, transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending }));
  center.scale.setScalar(0.38);
  sp.add(center);

  scene.add(sp);
  stars.set(s.id, sp);
  sprites.push(sp);
  updateCount();
  return sp;
}

function updateCount() { document.getElementById('count').textContent = stars.size; }

// ---------- Camera fly-to ----------
let goalPos = HOME_POS.clone();
let goalTarget = HOME_TARGET.clone();
controls.addEventListener('start', () => { goalPos = null; goalTarget = null; });

function flyHome() {
  goalPos = HOME_POS.clone();
  goalTarget = HOME_TARGET.clone();
  controls.autoRotate = true;
  hideDetail();
}

function focusStar(sp) {
  const dir = camera.position.clone().sub(sp.position).normalize();
  goalTarget = sp.position.clone();
  goalPos = sp.position.clone().add(dir.multiplyScalar(9)).add(new THREE.Vector3(0, 2.5, 0));
  controls.autoRotate = false;
  showDetail(sp.userData.star);
}

// ---------- UI: detail card / tooltip ----------
const tip = document.getElementById('tip');
const detail = document.getElementById('detail');
function showDetail(s) {
  document.getElementById('d-msg').textContent = '“' + s.message + '”';
  document.getElementById('d-meta').textContent = '— ' + s.name + ' · ' + new Date(s.created_at || Date.now()).toLocaleDateString();
  detail.style.setProperty('--c', s.color);
  document.getElementById('d-dot').style.setProperty('--c', s.color);
  detail.classList.add('show');
}
function hideDetail() { detail.classList.remove('show'); }

// ---------- Pointer interaction ----------
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let downAt = null;

function pick(ev) {
  mouse.x = (ev.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(ev.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(sprites, false);
  return hits.length ? hits[0].object : null;
}

renderer.domElement.addEventListener('pointermove', ev => {
  const hit = pick(ev);
  hovered = hit;
  renderer.domElement.style.cursor = hit ? 'pointer' : 'grab';
  if (hit) {
    tip.textContent = hit.userData.star.name;
    tip.style.left = ev.clientX + 'px';
    tip.style.top = ev.clientY + 'px';
    tip.classList.add('show');
  } else {
    tip.classList.remove('show');
  }
});
renderer.domElement.addEventListener('pointerdown', ev => { downAt = { x: ev.clientX, y: ev.clientY }; });
renderer.domElement.addEventListener('pointerup', ev => {
  if (!downAt) return;
  const moved = Math.hypot(ev.clientX - downAt.x, ev.clientY - downAt.y);
  downAt = null;
  if (moved > 5) return; // it was a drag, not a click
  const hit = pick(ev);
  if (hit) focusStar(hit); else hideDetail();
});
document.getElementById('reset').addEventListener('click', flyHome);

// ---------- Color swatches + form ----------
const COLORS = ['#ffd166', '#ff7eb6', '#7ee8fa', '#a78bfa', '#7cffb2', '#ff8a5c'];
let chosen = COLORS[0];
const swatches = document.getElementById('swatches');
COLORS.forEach((c, i) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'swatch' + (i === 0 ? ' active' : '');
  b.style.setProperty('--c', c);
  b.setAttribute('aria-label', 'Color ' + c);
  b.onclick = () => {
    chosen = c;
    swatches.querySelectorAll('.swatch').forEach(el => el.classList.remove('active'));
    b.classList.add('active');
  };
  swatches.appendChild(b);
});

const form = document.getElementById('form');
const errorEl = document.getElementById('error');
form.addEventListener('submit', async e => {
  e.preventDefault();
  errorEl.textContent = '';
  const btn = document.getElementById('submit');
  btn.disabled = true;
  try {
    const res = await fetch('/api/stars', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: document.getElementById('name').value,
        message: document.getElementById('message').value,
        color: chosen,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Something went wrong');
    const sp = addStar(data, true);
    document.getElementById('message').value = '';
    if (sp) focusStar(sp);
  } catch (err) {
    errorEl.textContent = err.message;
  } finally {
    btn.disabled = false;
  }
});

// ---------- Data loading ----------
async function loadStars(animateNew) {
  const res = await fetch('/api/stars');
  if (!res.ok) throw new Error('API error');
  const list = await res.json();
  list.forEach(s => addStar(s, animateNew));
}

loadStars(false)
  .catch(() => { document.querySelector('.loader span').textContent = 'Backend unreachable — retrying…'; })
  .finally(() => setTimeout(() => document.getElementById('loader').classList.add('hide'), 600));

// Pick up stars planted by other visitors
setInterval(() => loadStars(true).catch(() => {}), 15000);

// ---------- Animation loop ----------
const ease = k => 1 - Math.pow(1 - k, 3);
function animate(now) {
  requestAnimationFrame(animate);

  if (goalPos && goalTarget) {
    camera.position.lerp(goalPos, 0.035);
    controls.target.lerp(goalTarget, 0.045);
    if (camera.position.distanceTo(goalPos) < 0.05 && controls.target.distanceTo(goalTarget) < 0.05) {
      goalPos = null; goalTarget = null;
    }
  }

  galaxy.points.rotation.y += 0.0006;
  galaxy.core.material.opacity = 0.9 + Math.sin(now / 900) * 0.06;

  for (const sp of sprites) {
    const u = sp.userData;
    let k = 1;
    if (u.born > 0) {
      k = Math.min((now - u.born) / 1400, 1);
      if (k >= 1) u.born = -1;
      k = ease(k);
    }
    const pulse = 1 + Math.sin(now / 650 + u.phase) * 0.14;
    const boost = sp === hovered ? 1.5 : 1;
    sp.scale.setScalar(u.base * k * pulse * boost);
  }

  controls.update();
  renderer.render(scene, camera);
}
requestAnimationFrame(animate);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
