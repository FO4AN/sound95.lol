import { initKaraokeDemo } from './karaoke.js';
import { initPlayerBar, onPlayerChange, player } from './player.js';
import { loadRelease } from './release.js';
import { initVisualizerDemo, attachVisual } from './visualizer.js';

const $ = (id) => document.getElementById(id);

const status = $('status');
const setStatus = (text) => { status.textContent = text; };

function detectPlatform() {
  const agent = navigator.userAgent;
  if (/Android|iPhone|iPad|iPod/.test(agent) || (navigator.maxTouchPoints > 1 && /Mac/.test(agent))) return 'phone';
  if (/Windows/.test(agent)) return 'windows';
  if (/Linux|X11/.test(agent)) return 'linux';
  return 'other';
}

function offerPlatform(platform) {
  const label = $('get-label');
  const main = $('get-sound95');
  if (label && platform === 'windows') {
    label.textContent = 'Download for Windows';
    main.href = 'download/#windows';
  }
  if (label && platform === 'linux') {
    label.textContent = 'Download for Linux';
    main.href = 'download/#linux';
  }

  const windows = $('windows');
  const linux = $('linux');
  if (!windows) return;
  if (platform === 'linux') linux.parentElement.prepend(linux);
  if (platform === 'phone' || platform === 'other') $('other-device').hidden = false;
}

function initMenus() {
  const titles = [...document.querySelectorAll('.menu-title, #start-button')];
  const close = () => {
    for (const title of titles) {
      title.setAttribute('aria-expanded', 'false');
      $(title.getAttribute('aria-controls')).hidden = true;
    }
  };
  for (const title of titles) {
    title.addEventListener('click', (event) => {
      event.stopPropagation();
      const opening = title.getAttribute('aria-expanded') !== 'true';
      close();
      if (!opening) return;
      title.setAttribute('aria-expanded', 'true');
      const menu = $(title.getAttribute('aria-controls'));
      menu.hidden = false;
      menu.querySelector('a, button').focus({ preventScroll: true });
    });
    // Once a menu is open, sliding along the bar opens its neighbours.
    title.addEventListener('pointerenter', () => {
      const open = titles.find((item) => item !== title && item.getAttribute('aria-expanded') === 'true');
      if (open?.classList.contains('menu-title') && title.classList.contains('menu-title')) title.click();
    });
  }
  document.addEventListener('click', close);
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const open = titles.find((title) => title.getAttribute('aria-expanded') === 'true');
    close();
    open?.focus();
  });
}

function initWindow() {
  const win = $('main-window');
  const task = $('task-button');
  const maximize = $('win-max');

  const show = () => {
    win.hidden = false;
    task.hidden = false;
    task.classList.add('pressed');
    task.setAttribute('aria-pressed', 'true');
  };
  const hide = () => {
    win.hidden = true;
    task.classList.remove('pressed');
    task.setAttribute('aria-pressed', 'false');
  };
  for (const button of document.querySelectorAll('.caption')) button.hidden = false;
  task.addEventListener('click', () => (win.hidden ? show() : hide()));
  $('win-min').addEventListener('click', hide);
  $('win-close').addEventListener('click', () => {
    hide();
    task.hidden = true;
    player.pause();
  });
  maximize.addEventListener('click', () => {
    const on = document.body.classList.toggle('maximized');
    const glyph = maximize.querySelector('img');
    glyph.src = glyph.src.replace(on ? 'max.svg' : 'restore.svg', on ? 'restore.svg' : 'max.svg');
    maximize.setAttribute('aria-label', on ? 'Restore' : 'Maximize');
    dispatchEvent(new Event('resize'));
  });
  $('desk-open').addEventListener('click', show);
}

function initAbout() {
  const about = $('about');
  for (const item of document.querySelectorAll('.about-open')) item.addEventListener('click', () => about.showModal());
  for (const item of about.querySelectorAll('.about-close')) item.addEventListener('click', () => about.close());
}

function initToolbar() {
  $('nav-back').addEventListener('click', () => history.back());
  $('nav-forward').addEventListener('click', () => history.forward());
  for (const link of document.querySelectorAll('a[href]')) {
    if (link.host === location.host) continue;
    link.addEventListener('pointerenter', () => setStatus(link.href));
    link.addEventListener('pointerleave', () => setStatus(player.playing ? 'Playing the demo tune' : 'Ready'));
  }
}

// Keeps the tree on the left pointing at whichever section is on screen.
function initTree() {
  const links = [...document.querySelectorAll('.tree-item[href*="#"]')];
  if (!links.length) return;
  const select = (hash) => {
    for (const link of links) link.classList.toggle('selected', link.hash === hash);
  };
  const seen = new IntersectionObserver((entries) => {
    for (const entry of entries) if (entry.isIntersecting) select(`#${entry.target.id}`);
  }, { root: $('main'), rootMargin: '-20% 0px -70% 0px' });
  for (const link of links) {
    const target = document.querySelector(link.hash);
    if (target) seen.observe(target);
  }
}

function initDemoButtons() {
  const buttons = [...document.querySelectorAll('.demo-play')];
  for (const button of buttons) button.addEventListener('click', player.toggle);
  onPlayerChange(() => {
    for (const button of buttons) button.textContent = player.playing ? 'Pause' : 'Play';
  });
}

function initCopy() {
  for (const button of document.querySelectorAll('[data-copy]')) {
    button.addEventListener('click', async () => {
      const source = $(button.dataset.copy);
      try {
        await navigator.clipboard.writeText(source.textContent.trim());
        setStatus('Copied to the clipboard');
        button.textContent = 'Copied';
        setTimeout(() => { button.textContent = 'Copy'; }, 1600);
      } catch {
        const range = document.createRange();
        range.selectNodeContents(source);
        getSelection().removeAllRanges();
        getSelection().addRange(range);
        setStatus('Press Ctrl+C to copy');
      }
    });
  }
}

function startClock() {
  const tick = () => {
    $('clock').textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };
  tick();
  setInterval(tick, 10000);
}

offerPlatform(detectPlatform());
initPlayerBar(setStatus);
attachVisual($('mini-viz'));
initVisualizerDemo();
initKaraokeDemo();
initDemoButtons();
initMenus();
initWindow();
initAbout();
initToolbar();
initTree();
initCopy();
startClock();
loadRelease();
