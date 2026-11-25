// Dapur Kilat — every sound is synthesized with WebAudio, so the game ships
// no audio files at all. One job: short kitchen noises. Silent until the
// player presses a key or clicks (browsers demand a gesture first).

let ctx = null;
let muted = false;

export function setMuted(value) {
  muted = value;
}

export function isMuted() {
  return muted;
}

/** Call from the first keydown / click so later sounds are allowed. */
export function unlockAudio() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
}

function tone(freq, dur, type, vol, slideTo) {
  if (!ctx || muted) return;
  try {
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur);
  } catch {
    // A sound that fails to play must never break the game.
  }
}

function noise(dur, vol, filterFreq) {
  if (!ctx || muted) return;
  try {
    const t0 = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(t0);
  } catch {
    // See tone(): never let audio break the game.
  }
}

export const sfx = {
  chop() {
    noise(0.07, 0.5, 900);
    tone(180, 0.08, 'triangle', 0.25, 90);
  },
  pickup() {
    tone(520, 0.07, 'sine', 0.2, 660);
  },
  place() {
    tone(300, 0.08, 'triangle', 0.22, 210);
  },
  sizzle() {
    noise(0.35, 0.16, 5200);
  },
  done() {
    tone(880, 0.12, 'sine', 0.2);
    tone(1320, 0.14, 'sine', 0.14);
  },
  serve() {
    tone(660, 0.1, 'sine', 0.22);
    tone(880, 0.1, 'sine', 0.22);
    tone(1174, 0.18, 'sine', 0.22);
  },
  error() {
    tone(160, 0.16, 'square', 0.12, 110);
  },
  expire() {
    tone(392, 0.14, 'sawtooth', 0.1, 196);
    tone(262, 0.22, 'sawtooth', 0.1, 131);
  },
  rush() {
    tone(523, 0.12, 'square', 0.14);
    tone(659, 0.12, 'square', 0.14);
    tone(784, 0.2, 'square', 0.16);
  },
  click() {
    tone(700, 0.05, 'sine', 0.14);
  },
};
