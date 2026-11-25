// Dapur Kilat — boot and the one loop. One job: own the frame.
// Input is read every frame, the kitchen advances in fixed 1/60 s steps, and
// the renderer paints what is there. Screens: title, play, paused, over.
//
// ?seed=N fixes the tickets. ?shot=cover|start|rush|serve (with &seed=N)
// stages that scene instead of running the loop, paints it, and sets
// window.__shotReady for a screenshot.

import { STATIONS, VIEW_H, VIEW_W } from './config.js';
import { createRandom } from './random.js';
import { createInput, ACTION_CONFIRM, ACTION_INTERACT, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART } from './input.js';
import { createKitchen, interact, startShift, updateKitchen } from './kitchen.js';
import { drawGame } from './render.js';
import { stageShot } from './shots.js';
import { setMuted, sfx, unlockAudio } from './audio.js';

const STEP = 1 / 60;
const MAX_FRAME = 0.25;
const BEST_KEY = 'dapur-kilat-best';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);
const rng = createRandom(seed);
const state = createKitchen(seed, rng);
state.best = readBest();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest() {
  if (state.coins > state.best) {
    state.best = state.coins;
    try {
      window.localStorage.setItem(BEST_KEY, String(state.best));
    } catch {
      // A best score that cannot be stored is a shrug, not an error.
    }
  }
}

const input = createInput(canvas, () => unlockAudio());

// The playtest driver steers through this handle; players never need it.
window.__dapurKilat = { state, STATIONS, seed };

function toggleMute() {
  state.muted = !state.muted;
  setMuted(state.muted);
}

function handleAction(action) {
  if (action === ACTION_MUTE) {
    toggleMute();
    return;
  }
  if (action === ACTION_CONFIRM) {
    if (state.phase === 'title') {
      sfx.click();
      startShift(state);
    }
    return;
  }
  if (action === ACTION_PAUSE) {
    if (state.phase === 'play') state.phase = 'paused';
    else if (state.phase === 'paused') state.phase = 'play';
    sfx.click();
    return;
  }
  if (action === ACTION_RESTART) {
    if (state.phase === 'paused' || state.phase === 'over') {
      input.takeClickTarget();
      startShift(state);
    }
    return;
  }
  if (action === ACTION_INTERACT && state.phase === 'play') {
    interact(state);
  }
}

if (shot) {
  // A staged scene: paint it twice and signal the screenshot driver.
  stageShot(state, shot);
  drawGame(ctx, state);
  drawGame(ctx, state);
  window.__shotReady = true;
} else {
  let last = performance.now();
  let acc = 0;
  let wasOver = false;

  function frame(now) {
    requestAnimationFrame(frame);
    const elapsed = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;

    for (const action of input.takeActions()) handleAction(action);

    // A click on the title screen starts the shift.
    if (state.phase === 'title') {
      const click = input.takeClickTarget();
      if (click) {
        sfx.click();
        startShift(state);
      }
    }

    if (state.phase === 'play') {
      acc += elapsed;
      while (acc >= STEP) {
        updateKitchen(state, input, STEP);
        acc -= STEP;
        if (state.phase !== 'play') break;
      }
    } else {
      // Title, pause and game-over screens still animate (banner pulses,
      // the chef's idle bob), without advancing the shift.
      state.time += elapsed * 0.2;
      input.takeClickTarget();
      input.takeActions();
    }

    if (state.phase === 'over' && !wasOver) {
      saveBest();
      wasOver = true;
    }
    if (state.phase === 'play') wasOver = false;

    drawGame(ctx, state);
    window.__shotReady = true;
  }

  requestAnimationFrame(frame);
}
