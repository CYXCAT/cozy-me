import { Color } from 'three';

// Key frames for one day (hours). Every value is blended between neighbouring keys.
const RAW = [
  { t: 0,    hemiSky: '#3a4a86', hemiGround: '#1c1626', hemi: 0.55, key: '#8a9ae0', keyI: 0.35, sun: '#7a8ee0', sunI: 0.0, lamp: 1.0,  screen: 1.0,  glass: '#0e1838', glassMix: 0.92, glassGlow: 0.10, stars: 1.0, bg: '#2a2f52', bgA: 0.62, exposure: 1.05 },
  { t: 4.6,  hemiSky: '#3a4a86', hemiGround: '#1c1626', hemi: 0.55, key: '#8a9ae0', keyI: 0.35, sun: '#7a8ee0', sunI: 0.0, lamp: 0.85, screen: 0.8,  glass: '#16214a', glassMix: 0.9,  glassGlow: 0.12, stars: 0.9, bg: '#2a2f52', bgA: 0.58, exposure: 1.05 },
  { t: 6.0,  hemiSky: '#e0b7c6', hemiGround: '#a88a92', hemi: 1.25,  key: '#ffc6ab', keyI: 0.8,  sun: '#ffb08a', sunI: 1.6, lamp: 0.35, screen: 0.3,  glass: '#f4b5a2', glassMix: 0.55, glassGlow: 0.45, stars: 0.15, bg: '#e8b4a6', bgA: 0.32, exposure: 1.05 },
  { t: 8.0,  hemiSky: '#fff6ea', hemiGround: '#e2d3bf', hemi: 1.75, key: '#fff3e2', keyI: 1.0, sun: '#ffefcf', sunI: 2.6, lamp: 0.0,  screen: 0.12, glass: '#bcd8f0', glassMix: 0.08, glassGlow: 0.3,  stars: 0.0, bg: '#f4ead8', bgA: 0.0,  exposure: 1.05 },
  { t: 13.0, hemiSky: '#ffffff', hemiGround: '#e6d9c6', hemi: 1.85, key: '#ffffff', keyI: 1.05, sun: '#fffaf0', sunI: 2.8, lamp: 0.0,  screen: 0.12, glass: '#a9d0f2', glassMix: 0.04, glassGlow: 0.32, stars: 0.0, bg: '#f4ead8', bgA: 0.0,  exposure: 1.05 },
  { t: 16.8, hemiSky: '#ffe2bf', hemiGround: '#d8b892', hemi: 1.6,  key: '#ffcf9a', keyI: 1.0,  sun: '#ffa955', sunI: 3.4, lamp: 0.15, screen: 0.25, glass: '#ffc98e', glassMix: 0.45, glassGlow: 0.55, stars: 0.0, bg: '#f0c592', bgA: 0.22, exposure: 1.05 },
  { t: 18.6, hemiSky: '#a58bbb', hemiGround: '#3e2f44', hemi: 0.95, key: '#ff9b7c', keyI: 0.6,  sun: '#ff7a68', sunI: 1.1, lamp: 0.8,  screen: 0.7,  glass: '#6e5ca6', glassMix: 0.72, glassGlow: 0.35, stars: 0.35, bg: '#7e6b9c', bgA: 0.38, exposure: 1.05 },
  { t: 20.2, hemiSky: '#3a4a86', hemiGround: '#1c1626', hemi: 0.55, key: '#8a9ae0', keyI: 0.35, sun: '#7a8ee0', sunI: 0.0, lamp: 1.0,  screen: 1.0,  glass: '#0e1838', glassMix: 0.92, glassGlow: 0.10, stars: 1.0, bg: '#2a2f52', bgA: 0.62, exposure: 1.05 },
];

const COLOR_KEYS = ['hemiSky', 'hemiGround', 'key', 'sun', 'glass', 'bg'];
const KEYS = RAW.map((k) => {
  const o = { ...k };
  COLOR_KEYS.forEach((c) => (o[c] = new Color(k[c])));
  return o;
});

const out = {};
COLOR_KEYS.forEach((c) => (out[c] = new Color()));

const smooth = (x) => x * x * (3 - 2 * x);

export function sampleDay(hours) {
  const t = ((hours % 24) + 24) % 24;
  let i = KEYS.length - 1;
  for (let k = 0; k < KEYS.length; k++) if (KEYS[k].t <= t) i = k;
  const a = KEYS[i];
  const b = KEYS[(i + 1) % KEYS.length];
  const span = (b.t > a.t ? b.t : b.t + 24) - a.t;
  const f = smooth(Math.min(1, (t - a.t) / span));
  for (const key in a) {
    if (key === 't') continue;
    if (COLOR_KEYS.includes(key)) out[key].copy(a[key]).lerp(b[key], f);
    else out[key] = a[key] + (b[key] - a[key]) * f;
  }
  out.t = t;
  return out;
}

const PERIODS = [
  [0, 'late night'], [4.5, 'dawn'], [6.5, 'morning'], [9, 'daytime'], [11.5, 'noon'],
  [13.5, 'afternoon'], [16.5, 'evening'], [18, 'sunset'], [19.5, 'nightfall'], [22, 'late night'],
];

export function periodName(hours) {
  const t = ((hours % 24) + 24) % 24;
  let name = PERIODS[0][1];
  for (const [h, n] of PERIODS) if (t >= h) name = n;
  return name;
}

export function formatTime(hours) {
  const t = ((hours % 24) + 24) % 24;
  const h = Math.floor(t);
  const m = Math.floor((t - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
