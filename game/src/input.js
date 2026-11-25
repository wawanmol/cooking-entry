// Dapur Kilat — keyboard and mouse, read once per frame. One job: turn raw
// browser events into the game's verbs (move, interact, pause, restart).

export const ACTION_INTERACT = 'interact';
export const ACTION_PAUSE = 'pause';
export const ACTION_RESTART = 'restart';
export const ACTION_MUTE = 'mute';
export const ACTION_CONFIRM = 'confirm';

const KEY_ACTIONS = {
  KeyE: ACTION_INTERACT,
  Space: ACTION_INTERACT,
  Enter: ACTION_CONFIRM,
  KeyP: ACTION_PAUSE,
  Escape: ACTION_PAUSE,
  KeyR: ACTION_RESTART,
  KeyM: ACTION_MUTE,
};

const MOVE_KEYS = {
  ArrowUp: { x: 0, y: -1 },
  KeyW: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  KeyS: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  KeyA: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  KeyD: { x: 1, y: 0 },
};

/**
 * Creates the input state for one canvas. `onFirstGesture` runs once, on the
 * first key or click, so audio can unlock. Edge-triggered actions are queued
 * and must be drained every frame with takeActions().
 */
export function createInput(canvas, onFirstGesture) {
  const down = new Set();
  const queue = [];
  let mouse = { x: 0, y: 0, clicked: false };
  let gestured = false;

  function gesture() {
    if (!gestured) {
      gestured = true;
      onFirstGesture();
    }
  }

  function toGameCoords(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  window.addEventListener('keydown', (event) => {
    gesture();
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (!event.repeat) {
      down.add(event.code);
      const action = KEY_ACTIONS[event.code];
      if (action) queue.push(action);
    }
  });
  window.addEventListener('keyup', (event) => {
    down.delete(event.code);
  });
  window.addEventListener('blur', () => down.clear());

  canvas.addEventListener('pointerdown', (event) => {
    gesture();
    const pos = toGameCoords(event);
    mouse = { x: pos.x, y: pos.y, clicked: true };
  });
  canvas.addEventListener('pointermove', (event) => {
    const pos = toGameCoords(event);
    mouse.x = pos.x;
    mouse.y = pos.y;
  });

  return {
    /** Normalised movement vector from held keys, plus a click-to-move target. */
    moveVector() {
      let x = 0;
      let y = 0;
      for (const code of down) {
        const dir = MOVE_KEYS[code];
        if (dir) {
          x += dir.x;
          y += dir.y;
        }
      }
      const len = Math.hypot(x, y);
      if (len > 0) return { x: x / len, y: y / len };
      return { x: 0, y: 0 };
    },

    /** The click target for click-to-move, or null. Consumes the click. */
    takeClickTarget() {
      if (!mouse.clicked) return null;
      mouse.clicked = false;
      return { x: mouse.x, y: mouse.y };
    },

    /** Mouse position in game coordinates (for hover prompts). */
    mousePos() {
      return { x: mouse.x, y: mouse.y };
    },

    /** Edge-triggered actions since the last drain, in order. */
    takeActions() {
      const out = queue.splice(0, queue.length);
      return out;
    },

    /** True while any movement key is held. */
    isMoving() {
      return this.moveVector().x !== 0 || this.moveVector().y !== 0;
    },
  };
}
