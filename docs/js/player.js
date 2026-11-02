// The player bar works: this short tune is synthesized in the browser, so the site can
// play real sound without loading anything from outside. The Visualizer and Karaoke
// demos follow this audio the way the app's follow a SoundCloud track.

const BPM = 112;
const STEP = 60 / BPM / 2;
export const BAR_SECONDS = STEP * 8;

const CHORDS = { C: [60, 64, 67], Am: [57, 60, 64], F: [53, 57, 60], G: [55, 59, 62] };
const A = [
  ['C', [76, 0, 79, 0, 84, 0, 79, 76]],
  ['Am', [72, 0, 76, 0, 81, 0, 79, 76]],
  ['F', [77, 0, 81, 0, 84, 0, 81, 77]],
  ['G', [74, 0, 79, 0, 83, 81, 79, 74]],
];
const B = [
  ['Am', [81, 0, 0, 79, 76, 0, 72, 0]],
  ['F', [77, 0, 0, 76, 72, 0, 69, 0]],
  ['C', [76, 0, 0, 74, 72, 0, 67, 0]],
  ['G', [74, 0, 79, 0, 83, 0, 86, 0]],
];
const BARS = [...A, ...A, ...B, B[0], B[1], A[3], ['C', [72, 0, 0, 0, 0, 0, 0, 0]]];
const STEPS = BARS.length * 8;
const LENGTH = STEPS * STEP;

const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
const clock = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

const listeners = new Set();
export const onPlayerChange = (fn) => listeners.add(fn);
const changed = () => listeners.forEach((fn) => fn());

let audio = null;
let master = null;
let bus = null;
let step = 0;
let nextAt = 0;
let startedAt = 0;
let timer = 0;
let volume = 0.8;

export const player = {
  playing: false,
  analyser: null,
  length: LENGTH,
  position: () => (audio ? (((audio.currentTime - startedAt) % LENGTH) + LENGTH) % LENGTH : 0),
  async play() {
    if (!audio) {
      audio = new AudioContext();
      master = audio.createGain();
      master.gain.value = volume;
      player.analyser = audio.createAnalyser();
      player.analyser.fftSize = 2048;
      player.analyser.smoothingTimeConstant = 0.6;
      master.connect(player.analyser).connect(audio.destination);
      jump(0);
    }
    await audio.resume();
    player.playing = true;
    schedule();
    clearInterval(timer);
    timer = setInterval(schedule, 250);
    changed();
  },
  pause() {
    if (!player.playing) return;
    clearInterval(timer);
    audio.suspend();
    player.playing = false;
    changed();
  },
  toggle: () => (player.playing ? player.pause() : player.play()),
  seek(seconds) {
    if (!audio) return;
    jump(seconds);
    if (player.playing) schedule();
    changed();
  },
  setVolume(value) {
    volume = value;
    if (master) master.gain.value = value;
  },
};

function note(type, midi, at, length, level) {
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.value = hz(midi);
  gain.gain.setValueAtTime(level, at);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
  osc.connect(gain).connect(bus);
  osc.start(at);
  osc.stop(at + length);
}

function playStep(index, at) {
  const [chord, lead] = BARS[Math.floor(index / 8)];
  const beat = index % 8;
  if (lead[beat]) note('square', lead[beat], at, STEP * 1.8, 0.11);
  if (beat % 4 === 0) note('triangle', CHORDS[chord][0] - 12, at, STEP * 3.6, 0.32);
  note('square', CHORDS[chord][beat % 3] + 12, at, STEP * 0.8, 0.028);
}

// Timers in a background tab fire about once a second, so notes go in well ahead.
function schedule() {
  while (nextAt < audio.currentTime + 1.3) {
    playStep(step, nextAt);
    nextAt += STEP;
    step = (step + 1) % STEPS;
  }
}

function jump(seconds) {
  bus?.disconnect();
  bus = audio.createGain();
  bus.connect(master);
  step = Math.floor(seconds / STEP) % STEPS;
  nextAt = audio.currentTime + 0.05;
  startedAt = nextAt - step * STEP;
}

export function initPlayerBar(setStatus) {
  const button = document.getElementById('tp-play');
  const seek = document.getElementById('seek');
  const now = document.getElementById('time-now');
  const slider = document.getElementById('volume');
  document.getElementById('time-total').textContent = clock(LENGTH);

  const showTime = () => {
    const at = player.position();
    now.textContent = clock(at);
    if (document.activeElement !== seek) seek.value = String(Math.round((at / LENGTH) * 1000));
  };
  button.addEventListener('click', player.toggle);
  document.getElementById('tp-prev').addEventListener('click', () => player.seek(0));
  seek.addEventListener('change', () => {
    if (!player.analyser) return player.play();
    player.seek((Number(seek.value) / 1000) * LENGTH);
    seek.blur();
  });
  slider.addEventListener('input', () => player.setVolume(Number(slider.value) / 100));

  let ticking = 0;
  onPlayerChange(() => {
    const { playing } = player;
    const glyph = button.querySelector('img');
    glyph.src = glyph.src.replace(playing ? 'play.svg' : 'pause.svg', playing ? 'pause.svg' : 'play.svg');
    button.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    button.title = playing ? 'Pause' : 'Play';
    setStatus(playing ? 'Playing the demo tune' : 'Ready');
    clearInterval(ticking);
    if (playing) ticking = setInterval(showTime, 250);
    showTime();
  });
}
