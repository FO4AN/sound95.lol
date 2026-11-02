// The app's karaoke screen, singing along to the demo tune. Words are spread across
// each line by length, which is what the app does when a song has no word timing.

import { BAR_SECONDS, onPlayerChange, player } from './player.js';
import { attachVisual } from './visualizer.js';

const LINES = [
  'Dialing up the midnight line',
  'Every tone a little sign',
  'Close the tab and let it play',
  'Ninety-five is here to stay',
  'Tiny bars go up and down',
  'Blue screen shining over town',
  'Press the key and sing along',
  'Now you know the modem song',
];

function spreadWords(text, start, end) {
  const pieces = text.match(/\S+\s*/g);
  const total = pieces.reduce((sum, piece) => sum + piece.trim().length, 0);
  let at = start;
  return pieces.map((piece) => {
    const length = ((end - start) * piece.trim().length) / total;
    const word = { at, length, text: piece };
    at += length;
    return word;
  });
}

const CUES = LINES.map((text, i) => {
  const start = i * 2 * BAR_SECONDS;
  return { start, words: spreadWords(text, start, start + 1.7 * BAR_SECONDS) };
});

function lineNode(cue, kind) {
  const line = document.createElement('div');
  line.className = `k-line ${kind}`;
  for (const word of cue.words) {
    const span = document.createElement('span');
    span.className = 'k-word';
    span.textContent = word.text;
    line.append(span);
  }
  return line;
}

export function initKaraokeDemo() {
  const lines = document.getElementById('k-lines');
  if (!lines) return;
  attachVisual(document.getElementById('k-strip'), { pixel: 2 });
  const status = document.getElementById('k-status');
  let shown = -1;
  let spans = [];

  function show(index) {
    shown = index;
    const previous = CUES[(index + CUES.length - 1) % CUES.length];
    const next = CUES[(index + 1) % CUES.length];
    const current = lineNode(CUES[index], 'current');
    lines.replaceChildren(lineNode(previous, 'past'), current, lineNode(next, 'coming'));
    spans = [...current.children];
  }

  function wipe() {
    const at = player.position();
    let index = 0;
    while (index + 1 < CUES.length && CUES[index + 1].start <= at) index += 1;
    if (index !== shown) show(index);
    CUES[index].words.forEach((word, i) => {
      const done = Math.min(1, Math.max(0, (at - word.at) / word.length));
      spans[i].style.setProperty('--fill', `${Math.round(done * 100)}%`);
    });
    if (player.playing) requestAnimationFrame(wipe);
  }

  onPlayerChange(() => {
    status.textContent = player.playing ? 'Singing along to the demo tune' : 'Waiting for music';
    wipe();
  });
  wipe();
}
