// The app's visualizer, drawing the same four modes. Here the bands come from the demo
// tune through an AnalyserNode rather than from the app's audio tap.

import { onPlayerChange, player } from './player.js';

const BANDS = 32;
const WAVE = 96;
const FALL = 0.035;
const PEAK_FALL = 0.006;
const DRAW_EVERY_MS = 30;

const VGA = ['#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ffffff'];
const LIT = ['#00ff00', '#ffff00', '#ff0000'];
const UNLIT = ['#003000', '#303000', '#300000'];

const audio = {
  bands: new Float32Array(BANDS),
  peaks: new Float32Array(BANDS),
  wave: new Float32Array(WAVE),
  target: new Float32Array(BANDS),
  waveTarget: new Float32Array(WAVE),
  level: 0,
};
// Until something plays, the bars hold a still pose instead of an empty black box.
for (let i = 0; i < BANDS; i++) {
  audio.bands[i] = 0.2 + 0.5 * (1 - i / BANDS) * (0.65 + 0.35 * Math.sin(i * 0.9) * Math.sin(i * 0.37 + 1));
  audio.peaks[i] = audio.bands[i] + 0.06;
}

let freq = null;
let time = null;
let drawing = false;
let drawnAt = 0;
const surfaces = new Set();

function readAudio() {
  const { analyser } = player;
  if (!analyser) return;
  freq ||= new Uint8Array(analyser.frequencyBinCount);
  time ||= new Float32Array(1024);
  analyser.getByteFrequencyData(freq);
  analyser.getFloatTimeDomainData(time);
  let sum = 0;
  for (let i = 0; i < BANDS; i++) {
    const from = Math.floor(3 * (140 ** (i / BANDS)));
    const to = Math.max(from + 1, Math.floor(3 * (140 ** ((i + 1) / BANDS))));
    let top = 0;
    for (let bin = from; bin < to; bin++) top = Math.max(top, freq[bin]);
    audio.target[i] = (top / 255) ** 1.8;
    sum += audio.target[i];
  }
  audio.level = sum / BANDS;
  // Starting each sweep at a rising edge keeps the oscilloscope trace still.
  let start = 0;
  while (start < 400 && !(time[start] <= 0 && time[start + 1] > 0)) start += 1;
  for (let i = 0; i < WAVE; i++) audio.waveTarget[i] = Math.max(-1, Math.min(1, time[start + i * 4] * 2.4));
}

function step() {
  if (player.playing) readAudio();
  else { audio.target.fill(0); audio.waveTarget.fill(0); audio.level = 0; }
  let moving = false;
  for (let i = 0; i < BANDS; i++) {
    audio.bands[i] = Math.max(audio.target[i], audio.bands[i] - FALL);
    audio.peaks[i] = audio.bands[i] >= audio.peaks[i] ? audio.bands[i] : Math.max(0, audio.peaks[i] - PEAK_FALL);
    moving ||= audio.peaks[i] > 0;
  }
  for (let i = 0; i < WAVE; i++) audio.wave[i] += (audio.waveTarget[i] - audio.wave[i]) * 0.6;
  return moving || player.playing;
}

const bass = () => (audio.bands[0] + audio.bands[1] + audio.bands[2] + audio.bands[3]) / 4;

function clearTo(ctx, w, h, color = '#000000') {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
}

/** A line with no smoothing, because Windows 95 had none. */
function line(ctx, x0, y0, x1, y1) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1) | 0;
  for (let i = 0; i <= steps; i++) {
    ctx.fillRect(Math.round(x0 + ((x1 - x0) * i) / steps), Math.round(y0 + ((y1 - y0) * i) / steps), 1, 1);
  }
}

function drawBars(ctx, w, h) {
  clearTo(ctx, w, h);
  const columns = w >= BANDS * 4 ? BANDS : Math.floor(BANDS / 2);
  const cell = Math.max(2, Math.floor(w / columns));
  const left = Math.floor((w - cell * columns) / 2);
  const rowHeight = h >= 60 ? 3 : 2;
  const rows = Math.floor(h / rowHeight);
  for (let c = 0; c < columns; c++) {
    const band = Math.floor((c / columns) * BANDS);
    const lit = Math.round(audio.bands[band] * rows);
    const peak = Math.round(audio.peaks[band] * rows);
    for (let r = 0; r < rows; r++) {
      const zone = r / rows < 0.6 ? 0 : r / rows < 0.85 ? 1 : 2;
      ctx.fillStyle = r < lit ? LIT[zone] : UNLIT[zone];
      if (r === peak - 1 && audio.peaks[band] > 0.02) ctx.fillStyle = '#ffffff';
      ctx.fillRect(left + c * cell, h - (r + 1) * rowHeight, cell - 1, rowHeight - 1);
    }
  }
}

function drawScope(ctx, w, h) {
  clearTo(ctx, w, h);
  ctx.fillStyle = '#004000';
  for (let x = 0; x <= w; x += Math.ceil(w / 10)) ctx.fillRect(x, 0, 1, h);
  for (let y = 0; y <= h; y += Math.ceil(h / 6)) ctx.fillRect(0, y, w, 1);
  ctx.fillStyle = '#008000';
  ctx.fillRect(0, Math.floor(h / 2), w, 1);
  ctx.fillStyle = '#00ff00';
  let last = null;
  for (let x = 0; x < w; x++) {
    const at = (x / w) * (WAVE - 1);
    const from = Math.floor(at);
    const value = audio.wave[from] + ((audio.wave[from + 1] ?? 0) - audio.wave[from]) * (at - from);
    const y = Math.round(h / 2 - value * (h / 2 - 2));
    if (last != null) ctx.fillRect(x, Math.min(last, y), 1, Math.abs(last - y) + 1);
    last = y;
  }
}

function makeShape(colorIndex) {
  const points = Array.from({ length: 4 }, () => ({
    x: Math.random(), y: Math.random(),
    dx: (Math.random() + 0.3) * (Math.random() < 0.5 ? -1 : 1),
    dy: (Math.random() + 0.3) * (Math.random() < 0.5 ? -1 : 1),
  }));
  return { points, colorIndex, trail: [] };
}

const TRAIL = 7;

function drawMystify(ctx, w, h, memory) {
  memory.shapes ||= [makeShape(1), makeShape(3)];
  clearTo(ctx, w, h);
  const speed = 0.0016 + audio.level * 0.0075;
  const kick = bass();
  if (kick - (memory.lastBass || 0) > 0.14) {
    for (const shape of memory.shapes) shape.colorIndex = (shape.colorIndex + 1) % VGA.length;
  }
  memory.lastBass = kick;
  for (const shape of memory.shapes) {
    for (const p of shape.points) {
      p.x += p.dx * speed;
      p.y += p.dy * speed;
      if (p.x < 0 || p.x > 1) { p.dx = -p.dx; p.x = Math.min(1, Math.max(0, p.x)); }
      if (p.y < 0 || p.y > 1) { p.dy = -p.dy; p.y = Math.min(1, Math.max(0, p.y)); }
    }
    shape.trail.push(shape.points.map((p) => [p.x * (w - 1), p.y * (h - 1)]));
    if (shape.trail.length > TRAIL) shape.trail.shift();
    ctx.fillStyle = VGA[shape.colorIndex];
    for (const pts of shape.trail) {
      pts.forEach(([x, y], i) => {
        const [nx, ny] = pts[(i + 1) % pts.length];
        line(ctx, x, y, nx, ny);
      });
    }
  }
}

function drawStars(ctx, w, h, memory) {
  memory.stars ||= Array.from({ length: 140 }, () => ({ x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random() }));
  clearTo(ctx, w, h);
  const speed = 0.003 + bass() * bass() * 0.04;
  for (const star of memory.stars) {
    star.z -= speed;
    if (star.z <= 0.02) {
      star.x = Math.random() * 2 - 1;
      star.y = Math.random() * 2 - 1;
      star.z = 1;
    }
    const x = w / 2 + (star.x / star.z) * (w / 2);
    const y = h / 2 + (star.y / star.z) * (h / 2);
    if (x < 0 || x >= w || y < 0 || y >= h) continue;
    ctx.fillStyle = star.z > 0.66 ? '#808080' : star.z > 0.33 ? '#c0c0c0' : '#ffffff';
    const size = star.z < 0.25 ? 2 : 1;
    ctx.fillRect(Math.round(x), Math.round(y), size, size);
  }
}

const MODES = {
  bars: { label: 'Spectrum', draw: drawBars },
  scope: { label: 'Oscilloscope', draw: drawScope },
  mystify: { label: 'Mystify', draw: drawMystify },
  stars: { label: 'Starfield', draw: drawStars },
};

function frame(now) {
  if (now - drawnAt < DRAW_EVERY_MS) {
    requestAnimationFrame(frame);
    return;
  }
  drawnAt = now;
  const going = step();
  for (const surface of surfaces) {
    const { canvas, mode, memory, pixel } = surface;
    if (!canvas.clientWidth) continue;
    const w = Math.max(1, Math.round(canvas.clientWidth / pixel));
    const h = Math.max(1, Math.round(canvas.clientHeight / pixel));
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    MODES[mode].draw(canvas.getContext('2d'), w, h, memory);
  }
  if (going) requestAnimationFrame(frame);
  else drawing = false;
}

function wake() {
  if (drawing) return;
  drawing = true;
  requestAnimationFrame(frame);
}

export function attachVisual(canvas, { mode = 'bars', pixel = 1 } = {}) {
  const surface = { canvas, mode, pixel, memory: {} };
  surfaces.add(surface);
  wake();
  return surface;
}

export function initVisualizerDemo() {
  const canvas = document.getElementById('viz-canvas');
  if (!canvas) return;
  const status = document.getElementById('viz-status');
  const surface = attachVisual(canvas, { pixel: 2 });
  const buttons = [...document.querySelectorAll('[data-mode]')];
  const describe = () => {
    status.textContent = `${MODES[surface.mode].label} - ${player.playing ? 'Live audio' : 'Waiting for music'}`;
  };
  for (const button of buttons) {
    button.addEventListener('click', () => {
      surface.mode = button.dataset.mode;
      surface.memory = {};
      for (const other of buttons) other.setAttribute('aria-pressed', String(other === button));
      describe();
      wake();
    });
  }
  onPlayerChange(describe);
}

onPlayerChange(wake);
addEventListener('resize', wake);
