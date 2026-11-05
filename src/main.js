import 'papercss/dist/paper.min.css';
import './style.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import gsap from 'gsap';
import { sampleDay, periodName, formatTime } from './daycycle.js';
import { createLofi } from './lofi.js';
import { STATIONS, HOTSPOTS, SCREEN_CORNERS, BOOK, HINTS, BACK_LABEL } from './stations.js';
import { WORKS, POSTS, ABOUT } from './content.js';

const $ = (id) => document.getElementById(id);
const V3 = (a) => new THREE.Vector3(...a);

// ============================================================ renderer / scene
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.AgXToneMapping;
$('app').appendChild(renderer.domElement);
const canvas = renderer.domElement;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#2a211c'); // never meant to be seen; dark and warm if anything leaks
const camera = new THREE.PerspectiveCamera(50, 1, 0.02, 200);

// ============================================================ lights
const hemi = new THREE.HemisphereLight('#fff', '#888', 1.5);
const key = new THREE.DirectionalLight('#fff', 1.2);
key.position.set(6, 9, 7);
const sun = new THREE.SpotLight('#fff', 2, 0, 0.55, 0.85, 0);
sun.position.set(0.6, 5.8, -5.0);
sun.target.position.set(0.3, 0, 1.0);
const lamp = new THREE.PointLight('#ffc27a', 0, 0, 2);
lamp.position.set(-1.7, 3.38, -1.36);
const screenLight = new THREE.PointLight('#b9c8ff', 0, 0, 2);
screenLight.position.set(-1.65, 1.85, 1.05);
scene.add(hemi, key, sun, sun.target, lamp, screenLight);
const LAMP_K = 7;
const SCREEN_K = 2.2;

// ============================================================ room material (time-of-day masks)
const U = {
  uSky: { value: new THREE.Color() },
  uGlassMix: { value: 0 },
  uGlassGlow: { value: 0 },
  uStars: { value: 0 },
  uLampGlow: { value: 0 },
  uScreenGlow: { value: 0 },
  uRain: { value: 0 },
  uTime: { value: 0 },
};

function patchRoomMaterial(mat) {
  mat.roughness = 0.92;
  mat.metalness = 0;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vRPos;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvRPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform vec3 uSky;
uniform float uGlassMix, uGlassGlow, uStars, uLampGlow, uScreenGlow, uRain, uTime;
varying vec3 vRPos;
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }`
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
vec3 baseC = diffuseColor.rgb;
vec3 extraEm = vec3(0.0);
float glassRect = step(-0.48, vRPos.x) * step(vRPos.x, 0.56) * step(1.62, vRPos.y) * step(vRPos.y, 3.98) * step(vRPos.z, -2.12);
float glassM = glassRect * smoothstep(-0.10, -0.01, baseC.b - baseC.r);
if (glassM > 0.0) {
  float lum = dot(baseC, vec3(0.333));
  vec3 g = uSky * (0.7 + 0.6 * lum);
  vec2 sc = floor(vRPos.xy * 85.0);
  float star = step(0.986, h21(sc)) * (0.6 + 0.4 * sin(uTime * 2.0 + h21(sc + 3.1) * 40.0)) * uStars;
  float col = floor(vRPos.x * 70.0);
  float spd = 1.6 + h21(vec2(col, 1.0)) * 1.6;
  float drop = smoothstep(0.86, 1.0, fract(vRPos.y * 1.3 + uTime * spd + h21(vec2(col, 7.0)))) * step(0.55, h21(vec2(col, 3.0)));
  g = mix(g, g * 0.55, uRain * 0.6);
  vec3 c = mix(baseC, g, uGlassMix);
  diffuseColor.rgb = mix(baseC, c, glassM);
  extraEm += glassM * (c * uGlassGlow + vec3(1.0, 0.97, 0.85) * star * 1.4 + vec3(0.75, 0.82, 0.95) * drop * uRain * 0.5);
}
float monM = step(abs(vRPos.x + 1.964), 0.05) * step(1.42, vRPos.y) * step(vRPos.y, 2.28) * step(0.58, vRPos.z) * step(vRPos.z, 1.52);
extraEm += monM * baseC * uScreenGlow * 1.3;
float lampM = smoothstep(0.36, 0.2, length(vRPos - vec3(-1.65, 3.74, -1.31))) * smoothstep(0.42, 0.68, dot(baseC, vec3(0.333)));
extraEm += lampM * vec3(1.0, 0.72, 0.42) * uLampGlow * 1.1;`
      )
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += extraEm;');
  };
  mat.needsUpdate = true;
}

// ============================================================ clock overlay with draggable hands
const CLOCK_C = new THREE.Vector3(1.639, 3.806, -2.268);
const clock = new THREE.Group();
clock.position.copy(CLOCK_C);
scene.add(clock);
function makeClockFace() {
  const s = 512;
  const cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const g = cv.getContext('2d');
  g.fillStyle = '#efe4cf';
  g.beginPath();
  g.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2);
  g.fill();
  for (let i = 0; i < 1400; i++) {
    g.fillStyle = `rgba(120,95,70,${Math.random() * 0.06})`;
    g.fillRect(Math.random() * s, Math.random() * s, Math.random() * 3 + 1, 1);
  }
  g.strokeStyle = '#4a3a30';
  g.lineCap = 'round';
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const big = i % 5 === 0;
    const r1 = s * (big ? 0.38 : 0.42);
    const r2 = s * 0.455;
    g.lineWidth = big ? 9 : 3;
    g.beginPath();
    g.moveTo(s / 2 + Math.sin(a) * r1, s / 2 - Math.cos(a) * r1);
    g.lineTo(s / 2 + Math.sin(a) * r2, s / 2 - Math.cos(a) * r2);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
const clockFace = new THREE.Mesh(new THREE.CircleGeometry(0.262, 64), new THREE.MeshStandardMaterial({ map: makeClockFace(), roughness: 1 }));
clock.add(clockFace);
function makeHand(len, w) {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, -0.03);
  shape.lineTo(w / 2, -0.03);
  shape.lineTo(w * 0.28, len);
  shape.lineTo(-w * 0.28, len);
  shape.closePath();
  return new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshStandardMaterial({ color: '#3a2e28', roughness: 1 }));
}
const hourHand = makeHand(0.135, 0.034);
const minuteHand = makeHand(0.205, 0.022);
hourHand.position.z = 0.004;
minuteHand.position.z = 0.007;
const clockPin = new THREE.Mesh(new THREE.CircleGeometry(0.018, 24), new THREE.MeshStandardMaterial({ color: '#c4685a', roughness: 1 }));
clockPin.position.z = 0.009;
clock.add(hourHand, minuteHand, clockPin);

// ============================================================ the book that gets "pulled out" in about
const bookGlow = new THREE.Group();
{
  const geo = new THREE.BoxGeometry(...BOOK.size);
  const fill = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#e8a85c', transparent: true, opacity: 0, depthWrite: false }));
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: '#ffd59a', transparent: true, opacity: 0 }));
  bookGlow.add(fill, edges);
  bookGlow.position.set(...BOOK.pos);
  bookGlow.userData = { fill, edges };
  scene.add(bookGlow);
}

// ============================================================ dust in the window light
const DUST_N = 160;
const dustGeo = new THREE.BufferGeometry();
const dustPos = new Float32Array(DUST_N * 3);
const dustSeed = new Float32Array(DUST_N);
for (let i = 0; i < DUST_N; i++) {
  dustPos[i * 3] = THREE.MathUtils.randFloat(-1.1, 1.3);
  dustPos[i * 3 + 1] = THREE.MathUtils.randFloat(0.4, 3.8);
  dustPos[i * 3 + 2] = THREE.MathUtils.randFloat(-2.1, 0.8);
  dustSeed[i] = Math.random() * 100;
}
dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
const dustTex = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,248,230,1)');
  gr.addColorStop(1, 'rgba(255,248,230,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();
const dust = new THREE.Points(
  dustGeo,
  new THREE.PointsMaterial({ size: 0.012, map: dustTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: '#fff3d6', opacity: 0.6 })
);
scene.add(dust);

// ============================================================ state
const state = {
  station: 'home',
  moving: false,
  time: 16.33,
  lastInput: 0,
  rain: 0,
  rainOn: false,
  lampOn: 1,
  screenOn: 0,
  workIndex: 0,
  workOpen: false,
  hover: null,
  ready: false,
};

// ============================================================ camera rig
// rig = position, target, up and th (tan of half the horizontal FOV); all tweened together.
const rig = { px: 0, py: 0, pz: 0, tx: 0, ty: 0, tz: 0, ux: 0, uy: 1, uz: 0, th: 1 };
function rigFor(name) {
  const s = STATIONS[name];
  return { px: s.pos[0], py: s.pos[1], pz: s.pos[2], tx: s.target[0], ty: s.target[1], tz: s.target[2], ux: s.up[0], uy: s.up[1], uz: s.up[2], th: s.th };
}
Object.assign(rig, rigFor('home'));

// look-around = tiny mouse parallax + a clamped drag offset, so the frame never leaves the room
const look = { yaw: 0, pitch: 0, mx: 0, my: 0, dragYaw: 0, dragPitch: 0 };
const LOOK = { parallaxYaw: 0.012, parallaxPitch: 0.008, dragYaw: 0.035, dragPitch: 0.02 };
const MARGIN = 0.92; // crop a little so look-around can't reveal the outside
const RENDER_ASPECT = 1.6; // the views were checked at 16:10
const _p = new THREE.Vector3();
const _t = new THREE.Vector3();
const _u = new THREE.Vector3();

function updateCamera() {
  const tyaw = -look.mx * LOOK.parallaxYaw + look.dragYaw;
  const tpitch = -look.my * LOOK.parallaxPitch + look.dragPitch;
  look.yaw += (tyaw - look.yaw) * 0.06;
  look.pitch += (tpitch - look.pitch) * 0.06;
  _p.set(rig.px, rig.py, rig.pz);
  _t.set(rig.tx, rig.ty, rig.tz);
  _u.set(rig.ux, rig.uy, rig.uz).normalize();
  camera.position.copy(_p);
  camera.up.copy(_u);
  camera.lookAt(_t);
  camera.rotateY(look.yaw);
  camera.rotateX(look.pitch);
  // cover-fit: show at most the 16:10 frame that was checked in Blender, cropping on any other aspect
  const th = rig.th * MARGIN;
  const tv = Math.min(th / RENDER_ASPECT, th / camera.aspect);
  const fov = THREE.MathUtils.radToDeg(2 * Math.atan(tv));
  if (Math.abs(fov - camera.fov) > 1e-4) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }
}

// ============================================================ stations
const body = document.body;
const hintsEl = $('hints');
const backBtn = $('back-btn');
const navBtns = [...document.querySelectorAll('.nav button')];

function goTo(name, { duration = 1.7 } = {}) {
  if (!STATIONS[name] || !state.ready) return;
  const from = state.station;
  if (from === name) return;
  leave(from, name);
  state.station = name;
  state.moving = true;
  look.dragYaw = look.dragPitch = 0;
  body.dataset.station = name;
  body.classList.add('is-moving');
  navBtns.forEach((b) => b.classList.toggle('is-on', b.dataset.go === name));
  hintsEl.textContent = HINTS[name];
  backBtn.hidden = name === 'home';
  backBtn.textContent = BACK_LABEL[name] || '';
  setHover(null);
  gsap.to(rig, {
    ...rigFor(name),
    duration,
    ease: 'power2.inOut',
    overwrite: true,
    onComplete: () => {
      state.moving = false;
      body.classList.remove('is-moving');
      arrive(name);
    },
  });
}

function leave(from, to) {
  if (from === 'works') {
    hideScreen();
    gsap.to(state, { screenOn: 0, duration: 0.6 });
  }
  if (from === 'notes') hideNotebook();
  if (from === 'about') hideBookpage();
  if (to !== 'notes') $('app').classList.remove('is-blurred');
}

function arrive(name) {
  if (name === 'works') {
    gsap.to(state, { screenOn: 1, duration: 0.5 });
    showScreen();
  }
  if (name === 'notes') showNotebook();
  if (name === 'about') showBookpage();
}

navBtns.forEach((b) => b.addEventListener('click', () => goTo(b.dataset.go)));
backBtn.addEventListener('click', () => goTo('home'));

// ============================================================ hotspots (pins + pick proxies)
const pinsEl = $('pins');
const proxyMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
const hotspots = [];
for (const [station, list] of Object.entries(HOTSPOTS)) {
  for (const h of list) {
    const p = V3(h.pos);
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(h.r, 16, 12), proxyMat);
    mesh.position.copy(p);
    mesh.userData.key = `${station}:${h.id}`;
    scene.add(mesh);
    const el = document.createElement('button');
    el.className = 'pin';
    el.setAttribute('aria-label', h.tag);
    el.innerHTML = `<span class="pin__dot"></span><span class="pin__tag">${h.tag}</span>`;
    el.addEventListener('click', () => runAction(h.action));
    el.addEventListener('pointerenter', () => setHover(`${station}:${h.id}`));
    el.addEventListener('pointerleave', () => setHover(null));
    pinsEl.appendChild(el);
    hotspots.push({ ...h, station, key: `${station}:${h.id}`, p, mesh, el });
  }
}
const byKey = Object.fromEntries(hotspots.map((h) => [h.key, h]));

function setHover(k) {
  if (state.hover === k) return;
  state.hover = k;
  hotspots.forEach((h) => h.el.classList.toggle('is-hover', h.key === k));
  canvas.style.cursor = k ? (k.endsWith(':clock') ? 'grab' : 'pointer') : '';
}

function runAction(a) {
  if (a === 'works' || a === 'notes' || a === 'about') goTo(a);
  if (a === 'rain') {
    state.rainOn = !state.rainOn;
    gsap.to(state, { rain: state.rainOn ? 1 : 0, duration: 1.6 });
  }
  if (a === 'lamp') gsap.to(state, { lampOn: state.lampOn > 0.5 ? 0 : 1, duration: 0.35 });
}

const _sp = new THREE.Vector3();
function toScreen(p) {
  _sp.copy(p).project(camera);
  return { x: (_sp.x * 0.5 + 0.5) * window.innerWidth, y: (-_sp.y * 0.5 + 0.5) * window.innerHeight, front: _sp.z < 1 };
}

function updatePins() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  for (const hs of hotspots) {
    const active = hs.station === state.station && !state.moving && state.ready;
    let show = false;
    if (active) {
      const s = toScreen(hs.p);
      show = s.front && s.x > 24 && s.x < w - 24 && s.y > 80 && s.y < h - 80;
      if (show) hs.el.style.transform = `translate(${s.x}px, ${s.y}px)`;
      hs.el.classList.toggle('is-flip', s.x > w - 280);
    }
    hs.el.classList.toggle('is-on', show);
  }
}

// ============================================================ picking + look-around + clock drag
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const clockPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -CLOCK_C.z);
const _hit = new THREE.Vector3();
function setRay(e) {
  ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
}
function pick(e) {
  setRay(e);
  const list = hotspots.filter((h) => h.station === state.station).map((h) => h.mesh);
  if (!list.length) return null;
  const hits = raycaster.intersectObjects(list, false);
  return hits.length ? hits[0].object.userData.key : null;
}
function clockAngle(e) {
  setRay(e);
  if (!raycaster.ray.intersectPlane(clockPlane, _hit)) return null;
  return Math.atan2(_hit.x - CLOCK_C.x, _hit.y - CLOCK_C.y);
}

let drag = null;
canvas.addEventListener('pointermove', (e) => {
  look.mx = (e.clientX / window.innerWidth) * 2 - 1;
  look.my = (e.clientY / window.innerHeight) * 2 - 1;
  if (!state.ready) return;
  if (drag) {
    if (drag.type === 'clock') {
      const a = clockAngle(e);
      if (a !== null) {
        let da = a - drag.angle;
        if (da > Math.PI) da -= Math.PI * 2;
        if (da < -Math.PI) da += Math.PI * 2;
        drag.angle = a;
        drag.moved += Math.abs(da);
        setTime(state.time + (da / (Math.PI * 2)) * 12);
      }
    } else {
      drag.moved += Math.abs(e.movementX) + Math.abs(e.movementY);
      look.dragYaw = THREE.MathUtils.clamp(drag.yaw + (e.clientX - drag.x) * 0.0004, -LOOK.dragYaw, LOOK.dragYaw);
      look.dragPitch = THREE.MathUtils.clamp(drag.pitch + (e.clientY - drag.y) * 0.0003, -LOOK.dragPitch, LOOK.dragPitch);
    }
    return;
  }
  if (!state.moving) setHover(pick(e));
});
canvas.addEventListener('pointerdown', (e) => {
  if (!state.ready || state.moving) return;
  const k = pick(e);
  canvas.setPointerCapture(e.pointerId);
  if (k === 'home:clock') {
    drag = { type: 'clock', angle: clockAngle(e) ?? 0, moved: 0, key: k };
    canvas.style.cursor = 'grabbing';
  } else {
    drag = { type: 'look', x: e.clientX, y: e.clientY, yaw: look.dragYaw, pitch: look.dragPitch, moved: 0, key: k };
    if (!k) canvas.style.cursor = 'grabbing';
  }
});
canvas.addEventListener('pointerup', (e) => {
  if (!drag) return;
  const d = drag;
  drag = null;
  canvas.style.cursor = state.hover ? 'pointer' : '';
  const isClick = d.type === 'clock' ? d.moved < 0.08 : d.moved < 6;
  if (!isClick) return;
  const k = pick(e);
  if (k && k === d.key) runAction(byKey[k].action);
});

// ============================================================ time of day
const timeText = $('time-text');
const timePeriod = $('time-period');
const screenClock = $('screen-clock');
function setTime(t, fromUser = true) {
  state.time = ((t % 24) + 24) % 24;
  if (fromUser) state.lastInput = performance.now();
}
function applyTime() {
  const t = state.time;
  const s = sampleDay(t);
  hemi.color.copy(s.hemiSky);
  hemi.groundColor.copy(s.hemiGround);
  hemi.intensity = s.hemi;
  key.color.copy(s.key);
  key.intensity = s.keyI;
  sun.color.copy(s.sun);
  sun.intensity = s.sunI * (1 - state.rain * 0.6);
  const k = THREE.MathUtils.clamp((t - 6) / 13, 0, 1);
  sun.position.x = THREE.MathUtils.lerp(2.6, -2.2, k);
  sun.target.position.x = THREE.MathUtils.lerp(-0.6, 1.2, k);
  lamp.intensity = s.lamp * LAMP_K * state.lampOn;
  const screen = Math.max(s.screen, state.screenOn * 0.9);
  screenLight.intensity = screen * SCREEN_K;
  U.uSky.value.copy(s.glass);
  U.uGlassMix.value = s.glassMix;
  U.uGlassGlow.value = s.glassGlow;
  U.uStars.value = s.stars * (1 - state.rain);
  U.uLampGlow.value = s.lamp * state.lampOn;
  U.uScreenGlow.value = screen;
  U.uRain.value = state.rain;
  renderer.toneMappingExposure = s.exposure;
  dust.material.opacity = Math.min(1, s.sunI / 2.6) * 0.7;
  hourHand.rotation.z = -((t % 12) / 12) * Math.PI * 2;
  minuteHand.rotation.z = -(t % 1) * Math.PI * 2;
  const txt = formatTime(t);
  if (timeText.textContent !== txt) {
    timeText.textContent = txt;
    timePeriod.textContent = periodName(t);
    screenClock.textContent = txt;
  }
}
const PRESETS = [6.2, 10, 16.33, 18.8, 22.5];
$('time-btn').addEventListener('click', () => {
  const next = PRESETS.find((p) => p > state.time + 0.05) ?? PRESETS[0] + 24;
  const o = { t: state.time };
  gsap.to(o, { t: next, duration: 1.6, ease: 'power2.inOut', onUpdate: () => setTime(o.t) });
});
window.addEventListener(
  'wheel',
  (e) => {
    if (!state.ready || e.target.closest('.notebook, .bookpage, .screen')) return;
    setTime(state.time + e.deltaY * 0.0025);
  },
  { passive: true }
);

// ============================================================ works: UI laid onto the monitor
const screenEl = $('screen');
const screenInner = $('screen-inner');
const screenBody = $('screen-body');
const SCREEN_BASE = { w: 846, h: 478 };
const screenPts = SCREEN_CORNERS.map(V3);

function renderWorks() {
  if (state.workOpen) {
    const w = WORKS[state.workIndex];
    screenBody.innerHTML = `
      <p class="screen__path">~/works/${state.workIndex + 1}</p>
      <div class="work-detail">
        <span class="work-detail__thumb" style="background:${w.tint}"></span>
        <div>
          <h3>${w.title}</h3>
          <p class="work-detail__meta">${w.meta}</p>
          <p>${w.body}</p>
          ${w.link ? `<a href="${w.link}" target="_blank" rel="noopener">Open link ↗</a>` : ''}
        </div>
      </div>
      <p class="screen__hint">Backspace to list · ← → Previous / Next</p>`;
  } else {
    screenBody.innerHTML = `
      <p class="screen__path">~/works · ${WORKS.length} projects</p>
      <div class="works">
        ${WORKS.map(
          (w, i) => `<button class="work card border border-2${i === state.workIndex ? ' is-on' : ''}" data-i="${i}">
            <span class="work__thumb" style="background:${w.tint}"></span>
            <span class="work__title">${w.title}</span>
            <span class="work__desc">${w.desc}</span>
            <span class="work__meta">${w.meta}</span>
          </button>`
        ).join('')}
      </div>
      <p class="screen__hint">← → Select · Enter to open · Everything on screen is clickable</p>`;
  }
}
screenBody.addEventListener('click', (e) => {
  const b = e.target.closest('.work');
  if (!b) return;
  state.workIndex = +b.dataset.i;
  state.workOpen = true;
  renderWorks();
});
function showScreen() {
  state.workOpen = false;
  renderWorks();
  screenEl.setAttribute('aria-hidden', 'false');
  gsap.fromTo(screenEl, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 });
  gsap.fromTo(screenInner, { filter: 'brightness(2.5) blur(4px)' }, { filter: 'brightness(1) blur(0px)', duration: 0.7, ease: 'power2.out' });
}
function hideScreen() {
  screenEl.setAttribute('aria-hidden', 'true');
  gsap.to(screenEl, { autoAlpha: 0, duration: 0.25 });
}
function placeScreen() {
  if (state.station !== 'works') return;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of screenPts) {
    const s = toScreen(p);
    x0 = Math.min(x0, s.x); y0 = Math.min(y0, s.y); x1 = Math.max(x1, s.x); y1 = Math.max(y1, s.y);
  }
  const w = x1 - x0;
  const h = y1 - y0;
  screenEl.style.transform = `translate(${x0}px, ${y0}px)`;
  screenEl.style.width = `${w}px`;
  screenEl.style.height = `${h}px`;
  const sc = Math.min(w / SCREEN_BASE.w, h / SCREEN_BASE.h);
  screenInner.style.transform = `scale(${sc})`;
  screenInner.style.width = `${w / sc}px`;
  screenInner.style.height = `${h / sc}px`;
}

// ============================================================ notes: the notebook
const notebook = $('notebook');
const notebookPage = $('notebook-page');
let openPost = -1;
function renderNotebook() {
  if (openPost >= 0) {
    const p = POSTS[openPost];
    notebookPage.innerHTML = `
      <div class="nb-head"><h2>${p.title}</h2></div>
      <p class="nb-date">${p.date}</p>
      <div class="nb-article"><p>${p.body}</p></div>
      <button class="nb-back" data-back>← Back to index</button>`;
  } else {
    notebookPage.innerHTML = `
      <div class="nb-head"><h2>Notes</h2><span>autumn · 2026</span></div>
      <div class="nb-list">
        ${POSTS.map(
          (p, i) => `<button class="nb-row" data-i="${i}"><span class="nb-row__n">${String(i + 1).padStart(2, '0')}</span><span class="nb-row__t">${p.title}</span><span class="nb-row__d">${p.date}</span><span class="nb-row__tag">Read</span></button>`
        ).join('')}
      </div>`;
  }
}
notebookPage.addEventListener('click', (e) => {
  const row = e.target.closest('.nb-row');
  if (row) {
    openPost = +row.dataset.i;
    flipNotebook();
  }
  if (e.target.closest('[data-back]')) {
    openPost = -1;
    flipNotebook();
  }
});
function flipNotebook() {
  gsap.to(notebookPage, {
    rotateX: 80,
    opacity: 0,
    duration: 0.22,
    ease: 'power2.in',
    onComplete: () => {
      renderNotebook();
      gsap.fromTo(notebookPage, { rotateX: -60, opacity: 0 }, { rotateX: 0, opacity: 1, duration: 0.35, ease: 'power2.out' });
    },
  });
}
function showNotebook() {
  openPost = -1;
  renderNotebook();
  $('app').classList.add('is-blurred');
  notebook.setAttribute('aria-hidden', 'false');
  gsap.fromTo(notebook, { autoAlpha: 1, yPercent: 120, rotate: 6 }, { yPercent: 0, rotate: -2.5, duration: 0.8, ease: 'power3.out' });
}
function hideNotebook() {
  notebook.setAttribute('aria-hidden', 'true');
  gsap.to(notebook, { yPercent: 120, rotate: 6, duration: 0.5, ease: 'power2.in', onComplete: () => gsap.set(notebook, { autoAlpha: 0 }) });
}

// ============================================================ about: the book page
const bookpage = $('bookpage');
bookpage.innerHTML = `
  <p class="bp-kicker">${ABOUT.kicker}</p>
  <h2>${ABOUT.title}</h2>
  ${ABOUT.paragraphs.map((p) => `<p class="bp-p">${p}</p>`).join('')}
  <div class="bp-links">${ABOUT.links.map((l) => `<a href="${l.href}" target="_blank" rel="noopener"><span>${l.label}</span><span>${l.value} ↗</span></a>`).join('')}</div>`;
function showBookpage() {
  bookpage.setAttribute('aria-hidden', 'false');
  const { fill, edges } = bookGlow.userData;
  gsap.to(fill.material, { opacity: 0.28, duration: 0.5 });
  gsap.to(edges.material, { opacity: 1, duration: 0.5 });
  gsap.fromTo(bookGlow.position, { z: BOOK.pos[2] }, { z: BOOK.pos[2] + 0.06, duration: 0.6, ease: 'power2.out' });
  gsap.fromTo(bookpage, { autoAlpha: 0, x: 80, rotate: 4 }, { autoAlpha: 1, x: 0, rotate: 1.2, duration: 0.7, ease: 'power3.out', delay: 0.15 });
}
function hideBookpage() {
  bookpage.setAttribute('aria-hidden', 'true');
  const { fill, edges } = bookGlow.userData;
  gsap.to([fill.material, edges.material], { opacity: 0, duration: 0.3 });
  gsap.to(bookGlow.position, { z: BOOK.pos[2], duration: 0.4 });
  gsap.to(bookpage, { autoAlpha: 0, x: 60, duration: 0.35, ease: 'power2.in' });
}

// ============================================================ music
const lofi = createLofi();
const soundBtn = $('sound-btn');
function toggleMusic() {
  const on = lofi.toggle();
  soundBtn.setAttribute('aria-pressed', String(on));
  soundBtn.textContent = on ? 'Sound On' : 'Sound Off';
}
soundBtn.addEventListener('click', toggleMusic);

// ============================================================ keyboard
window.addEventListener('keydown', (e) => {
  if (!state.ready || e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k === 'escape') {
    if (state.station === 'notes' && openPost >= 0) {
      openPost = -1;
      flipNotebook();
    } else if (state.station === 'works' && state.workOpen) {
      state.workOpen = false;
      renderWorks();
    } else goTo('home');
    return;
  }
  if (k === 'm') return toggleMusic();
  if (state.station === 'works' && !state.moving) {
    if (k === 'arrowright' || k === 'arrowleft') {
      const d = k === 'arrowright' ? 1 : -1;
      state.workIndex = (state.workIndex + d + WORKS.length) % WORKS.length;
      renderWorks();
      return;
    }
    if (k === 'enter') {
      state.workOpen = true;
      renderWorks();
      return;
    }
    if (k === 'backspace') {
      state.workOpen = false;
      renderWorks();
      return;
    }
  }
  const map = { w: 'works', r: 'notes', b: 'about', t: 'top', h: 'home', 1: 'home', 2: 'works', 3: 'notes', 4: 'about' };
  if (map[k]) goTo(map[k]);
});

// ============================================================ resize / loop
function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.fov = 0; // forces a projection update in updateCamera
}
window.addEventListener('resize', resize);
resize();

const clk = new THREE.Clock();
function frame() {
  const dt = Math.min(clk.getDelta(), 0.05);
  U.uTime.value += dt;
  // the day drifts forward by itself (1 hour ≈ 90 s) when nobody touches it
  if (state.ready && !drag && performance.now() - state.lastInput > 8000) setTime(state.time + dt / 90, false);
  const pa = dustGeo.attributes.position.array;
  for (let i = 0; i < DUST_N; i++) {
    const sd = dustSeed[i];
    pa[i * 3] += Math.sin(U.uTime.value * 0.3 + sd) * 0.0006;
    pa[i * 3 + 1] += 0.0009 + Math.sin(U.uTime.value * 0.5 + sd * 2) * 0.0005;
    if (pa[i * 3 + 1] > 3.9) pa[i * 3 + 1] = 0.4;
  }
  dustGeo.attributes.position.needsUpdate = true;
  applyTime();
  updateCamera();
  updatePins();
  placeScreen();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

// ============================================================ load
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const loaderEl = $('loader');
const params = new URLSearchParams(location.search);
loader.load(
  '/models/room.glb',
  (gltf) => {
    gltf.scene.traverse((o) => {
      if (o.isMesh) {
        patchRoomMaterial(o.material);
        if (o.material.map) o.material.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
      }
    });
    scene.add(gltf.scene);
    updateCamera();
    renderer.compile(scene, camera);
    $('loader-hint').textContent = 'Ready';
    // start half a step back (slightly tighter, never wider) and walk in
    const home = rigFor('home');
    const dir = new THREE.Vector3(home.tx - home.px, home.ty - home.py, home.tz - home.pz).normalize();
    Object.assign(rig, home, { px: home.px - dir.x * 0.3, py: home.py - dir.y * 0.3, pz: home.pz - dir.z * 0.3, th: home.th * 0.85 });
    const skip = params.has('skip');
    gsap.to(loaderEl, { autoAlpha: 0, duration: skip ? 0 : 0.9, delay: skip ? 0 : 0.3, onComplete: () => loaderEl.remove() });
    gsap.to(rig, {
      ...home,
      duration: skip ? 0 : 2.4,
      ease: 'power2.out',
      onComplete: () => {
        state.ready = true;
        body.classList.remove('is-loading');
        hintsEl.textContent = HINTS.home;
        navBtns[0].classList.add('is-on');
        if (params.get('at')) goTo(params.get('at'), { duration: 0.01 });
        if (params.get('t')) setTime(parseFloat(params.get('t')));
      },
    });
  },
  (e) => {
    if (!e.total) return;
    const p = Math.round((e.loaded / e.total) * 100);
    $('loader-fill').style.width = `${p}%`;
    $('loader-hint').textContent = `Cutting out the room… ${p}%`;
  },
  (err) => {
    console.error(err);
    $('loader-hint').textContent = 'The room failed to load. Please refresh.';
  }
);

window.__room = { state, goTo, setTime, rig };
requestAnimationFrame(frame);
