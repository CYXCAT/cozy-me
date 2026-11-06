// Camera stations and hotspots, in three.js room space (Y up).
// Converted from D:\wangye\bake\camera_views.json (Blender Z up): three = (x, z, -y).
// th = tan(horizontal FOV / 2) = 18 / lens (36 mm sensor, horizontal fit). Each view was checked
// in Blender at 16:10 to show no background; main.js crops (never widens) to keep that true.

export const STATIONS = {
  home: { pos: [1.33, 2.1, 2.32], target: [-0.419, 1.383, -0.014], up: [0, 1, 0], th: 18 / 18 },
  works: { pos: [-0.75, 1.9, 1.03], target: [-1.964, 1.72, 1.03], up: [0, 1, 0], th: 18 / 19 },
  notes: { pos: [0.95, 1.3, 1.35], target: [-0.82, 1.1, -1.16], up: [0, 1, 0], th: 18 / 17 },
  about: { pos: [0.2, 3.6, 0.45], target: [-1.35, 3.35, -1.95], up: [0, 1, 0], th: 18 / 30 },
  top: { pos: [-0.35, 30, -0.55], target: [-0.35, 0, -0.549], up: [0, 0, -1], th: 18 / 235 },
};

// Things you can use, per station. r = pick radius in metres.
export const HOTSPOTS = {
  home: [
    { id: 'monitor', pos: [-1.85, 1.75, 1.03], r: 0.42, tag: 'Monitor · W to view works', action: 'works' },
    { id: 'notebook', pos: [0.02, 1.0, 0.5], r: 0.3, tag: 'Notebook · R to pick up', action: 'notes' },
    { id: 'shelf', pos: [-1.35, 3.72, -1.92], r: 0.4, tag: 'Bookshelf · B for about', action: 'about' },
    { id: 'window', pos: [0.03, 2.75, -2.2], r: 0.6, tag: 'Window · Click for rain', action: 'rain' },
    { id: 'clock', pos: [1.639, 3.806, -2.25], r: 0.3, tag: 'Clock · Drag the hands', action: 'clock' },
  ],
  about: [
    { id: 'book', pos: [-1.374, 3.767, -1.9], r: 0.18, tag: 'This book · About me', action: 'none' },
    { id: 'lamp', pos: [-1.65, 3.7, -1.31], r: 0.3, tag: 'Pendant lamp · On / Off', action: 'lamp' },
  ],
  works: [],
  notes: [],
  top: [],
};

// Monitor screen corners (for laying the works UI onto the screen).
export const SCREEN_CORNERS = [
  [-1.964, 1.97, 1.452], // top-left
  [-1.964, 1.97, 0.603], // top-right
  [-1.964, 1.47, 1.474], // bottom-left
  [-1.954, 1.465, 0.586], // bottom-right
];

export const BOOK = { pos: [-1.374, 3.765, -1.915], size: [0.075, 0.3, 0.05] };

export const HINTS = {
  home: 'W Works · R Notebook · B Bookshelf · M Record player · T Top view · Drag to look · Scroll through time',
  works: 'Click the monitor to unlock · Esc back to room',
  notes: 'Choose an entry to read · Esc to put down',
  about: 'Click the lamp to toggle it · Esc back to room',
  top: 'A view from above · Esc back to room · Scroll through time',
};

export const BACK_LABEL = {
  works: 'Back to room · Esc',
  notes: 'Put down · Esc',
  about: 'Return to shelf · Esc',
  top: 'Back to room · Esc',
};
