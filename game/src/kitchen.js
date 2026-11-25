// Dapur Kilat — the kitchen itself: the chef, the stations, and every verb
// the player has (grab, chop, cook, plate, serve, trash). One job: the rules.
// Rendering lives in render.js; tickets live in orders.js.

import {
  BOARD_H,
  BURN_GRACE,
  CHOP_TIME,
  COOK_TIME,
  DAY_LENGTH,
  FLOOR,
  INGREDIENTS,
  INTERACT_DIST,
  MAX_HEARTS,
  MAX_ORDERS,
  PLAYER_RADIUS,
  PLAYER_SPAWN,
  PLAYER_SPEED,
  RUSH_ORDERS,
  SOLIDS,
  STATIONS,
} from './config.js';
import { createOrder, createOrderBoard, matchingOrder, priceServe, removeOrder, updateOrderBoard } from './orders.js';
import { sfx } from './audio.js';

export function makeItem(kind) {
  const spec = INGREDIENTS[kind];
  return { kind, chopped: !spec.chop, cooked: !spec.cook, burnt: false };
}

/** True when the item has had every prep its ingredient needs. */
export function itemReady(item) {
  return item && !item.burnt && item.chopped && item.cooked;
}

export function createKitchen(seed, rng) {
  return {
    seed,
    rng,
    phase: 'title', // title | play | paused | over
    time: 0,
    player: { x: PLAYER_SPAWN.x, y: PLAYER_SPAWN.y, dir: 1, moving: false },
    moveTarget: null,
    held: null,
    burners: [
      { item: null, t: 0, state: 'empty' },
      { item: null, t: 0, state: 'empty' },
    ],
    plates: [{ items: [] }, { items: [] }],
    board: createOrderBoard(),
    coins: 0,
    served: 0,
    missed: 0,
    hearts: MAX_HEARTS,
    combo: 0,
    bestCombo: 0,
    chopping: null, // { t, dur } while the chef works a board
    pendingInteract: null, // station id to use once the chef arrives
    particles: [],
    floaters: [],
    banner: null, // { text, sub, t }
    overReason: '',
    muted: false,
  };
}

/** Distance from a point to the nearest point of a rectangle (0 when inside). */
function distToRect(px, py, rect) {
  const cx = Math.max(rect.x, Math.min(px, rect.x + rect.w));
  const cy = Math.max(rect.y, Math.min(py, rect.y + rect.h));
  return Math.hypot(px - cx, py - cy);
}

/** The station the chef can reach right now, nearest first, or null. */
export function nearestStation(state) {
  let best = null;
  let bestDist = INTERACT_DIST;
  for (const station of STATIONS) {
    if (station.kind === 'decor') continue;
    const d = distToRect(state.player.x, state.player.y, station);
    if (d <= bestDist) {
      best = station;
      bestDist = d;
    }
  }
  return best;
}

/**
 * Where the chef should stand to use `station`: the middle of one of its
 * edges, pushed out by 34 px. The middle matters — a point near a corner can
 * sit closer to the neighbouring station than to this one (two pantry crates
 * share an edge; the two boards sit 40 px apart) — so candidates are tested
 * against every other station and against the floor, and the closest usable
 * one to the chef wins. A stand point inside another station's reach would
 * strand the chef, so it must clear all of them.
 */
export function standPointFor(station, from) {
  const cx = station.x + station.w / 2;
  const cy = station.y + station.h / 2;
  const candidates = [
    { x: station.x + station.w + 34, y: cy },
    { x: station.x - 34, y: cy },
    { x: cx, y: station.y + station.h + 34 },
    { x: cx, y: station.y - 34 },
  ];
  const usable = candidates.filter((p) => {
    if (p.x < FLOOR.x + 24 || p.x > FLOOR.x + FLOOR.w - 24) return false;
    if (p.y < FLOOR.y + 24 || p.y > FLOOR.y + FLOOR.h - 24) return false;
    return STATIONS.every(
      (other) => other === station || distToRect(p.x, p.y, other) >= 30,
    );
  });
  const pool = usable.length > 0 ? usable : candidates;
  let best = pool[0];
  let bestDist = Math.hypot(best.x - from.x, best.y - from.y);
  for (const p of pool) {
    const d = Math.hypot(p.x - from.x, p.y - from.y);
    if (d < bestDist) {
      best = p;
      bestDist = d;
    }
  }
  return best;
}

function addFloater(state, x, y, text, color) {
  state.floaters.push({ x, y, text, color: color || '#f2b705', t: 0, life: 1.4 });
}

function burst(state, x, y, color, n, speed) {
  for (let i = 0; i < n; i += 1) {
    const angle = state.rng() * Math.PI * 2;
    const v = (speed || 90) * (0.4 + state.rng() * 0.8);
    state.particles.push({
      x, y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v - 40,
      t: 0, life: 0.5 + state.rng() * 0.5,
      color, size: 2 + state.rng() * 3,
    });
  }
}

function steam(state, x, y) {
  state.particles.push({
    x: x + (state.rng() - 0.5) * 40, y,
    vx: (state.rng() - 0.5) * 12, vy: -46 - state.rng() * 20,
    t: 0, life: 0.9, color: '#ffffff', size: 5 + state.rng() * 5, steam: true,
  });
}

function showBanner(state, text, sub) {
  state.banner = { text, sub: sub || '', t: 0, life: 3.2 };
}

function cancelChop(state) {
  state.chopping = null;
}

/** Move the chef, sliding along counters and walls. Returns true if moved. */
function movePlayer(state, vx, vy, dt) {
  const p = state.player;
  const step = PLAYER_SPEED * dt;
  let moved = false;
  const nx = p.x + vx * step;
  if (!hitsSolid(nx, p.y)) {
    p.x = nx;
    moved = true;
  }
  const ny = p.y + vy * step;
  if (!hitsSolid(p.x, ny)) {
    p.y = ny;
    moved = true;
  }
  p.x = Math.max(FLOOR.x + PLAYER_RADIUS, Math.min(FLOOR.x + FLOOR.w - PLAYER_RADIUS, p.x));
  p.y = Math.max(FLOOR.y + PLAYER_RADIUS, Math.min(FLOOR.y + FLOOR.h - PLAYER_RADIUS, p.y));
  if (vx !== 0) p.dir = vx > 0 ? 1 : -1;
  p.moving = moved && (vx !== 0 || vy !== 0);
  if (p.moving) cancelChop(state);
  return moved;
}

function hitsSolid(x, y) {
  for (const s of SOLIDS) {
    const cx = Math.max(s.x, Math.min(x, s.x + s.w));
    const cy = Math.max(s.y, Math.min(y, s.y + s.h));
    if (Math.hypot(x - cx, y - cy) < PLAYER_RADIUS - 2) return true;
  }
  return false;
}

/** What the E key (or a click) would do at the nearest station, in words. */
export function interactLabel(state) {
  const station = nearestStation(state);
  if (!station) return '';
  const held = state.held;
  // A finished plate only travels: to the window, or to the trash. It must
  // never be chopped, cooked, or read as an ingredient (a plate has no
  // chopped/cooked flags, and naming it as one would crash the prompt).
  if (held && held.kind === '__plate__' && station.kind !== 'window' && station.kind !== 'trash') {
    return 'Bawa piring ke jendela saji';
  }
  if (station.kind === 'pantry') {
    return held ? 'Tangan penuh!' : `Ambil ${INGREDIENTS[station.item].name}`;
  }
  if (station.kind === 'board') {
    if (!held) return 'Butuh bahan dulu';
    if (held.chopped) return 'Sudah dicincang';
    return `Cincang ${INGREDIENTS[held.kind].name}`;
  }
  if (station.kind === 'stove') {
    const burner = state.burners[station.burner];
    if (burner.state === 'empty') {
      if (!held) return 'Kompor kosong';
      if (held.cooked) return 'Sudah matang';
      return `Masak ${INGREDIENTS[held.kind].name}`;
    }
    if (burner.state === 'done' || burner.state === 'burnt') {
      return held ? 'Tangan penuh!' : `Angkat ${INGREDIENTS[burner.item.kind].name}`;
    }
    return 'Memasak...';
  }
  if (station.kind === 'plate') {
    if (held) {
      if (!itemReady(held)) return 'Belum siap disajikan';
      return `Taruh ${INGREDIENTS[held.kind].name} di piring`;
    }
    const ready = state.plates.find((pl) => matchingOrder(state.board.orders, pl.items));
    if (ready) return 'Angkat piring siap saji';
    const some = state.plates.find((pl) => pl.items.length > 0);
    return some ? 'Buang isi piring' : 'Piring kosong';
  }
  if (station.kind === 'window') {
    if (!held || held.kind !== '__plate__') return 'Bawa piring siap saji ke sini';
    const order = matchingOrder(state.board.orders, held.parts);
    return order ? `Sajikan ${order.recipe.name}!` : 'Tidak ada pesanan cocok';
  }
  if (station.kind === 'trash') {
    return held ? 'Buang bahan' : 'Tempat sampah';
  }
  return '';
}

/** The one verb: use the nearest station. */
export function interact(state) {
  const station = nearestStation(state);
  if (!station) return;
  const held = state.held;
  // A finished plate only travels: to the window, or to the trash. Refuse
  // every other station while one is in hand.
  if (held && held.kind === '__plate__' && station.kind !== 'window' && station.kind !== 'trash') {
    sfx.error();
    return;
  }
  const cx = station.x + station.w / 2;
  const cy = station.y + station.h / 2;

  if (station.kind === 'pantry') {
    if (held) {
      sfx.error();
      return;
    }
    state.held = makeItem(station.item);
    sfx.pickup();
    burst(state, cx, cy, INGREDIENTS[station.item].color, 6, 60);
    return;
  }

  if (station.kind === 'board') {
    if (!held || held.chopped || state.chopping) {
      sfx.error();
      return;
    }
    state.chopping = { t: 0, dur: CHOP_TIME };
    sfx.chop();
    return;
  }

  if (station.kind === 'stove') {
    const burner = state.burners[station.burner];
    if (burner.state === 'empty') {
      if (!held || held.cooked) {
        sfx.error();
        return;
      }
      burner.item = held;
      burner.t = 0;
      burner.state = 'cooking';
      state.held = null;
      sfx.place();
      return;
    }
    if (burner.state === 'done' || burner.state === 'burnt') {
      if (held) {
        sfx.error();
        return;
      }
      state.held = burner.item;
      burner.item = null;
      burner.t = 0;
      burner.state = 'empty';
      sfx.pickup();
      return;
    }
    sfx.error();
    return;
  }

  if (station.kind === 'plate') {
    if (held) {
      if (held.kind === '__plate__') {
        sfx.error();
        return;
      }
      if (!itemReady(held)) {
        sfx.error();
        return;
      }
      const slot = state.plates.find(
        (pl) => pl.items.length < 3 && !pl.items.includes(held.kind),
      );
      if (!slot) {
        sfx.error();
        return;
      }
      slot.items.push(held.kind);
      state.held = null;
      sfx.place();
      burst(state, cx, cy, '#ffd97a', 8, 70);
      const order = matchingOrder(state.board.orders, slot.items);
      if (order) {
        addFloater(state, cx, station.y - 8, 'PIRING SIAP!', '#7CFC9A');
        sfx.done();
      }
      return;
    }
    const readyIndex = state.plates.findIndex((pl) => matchingOrder(state.board.orders, pl.items));
    if (readyIndex >= 0) {
      const slot = state.plates[readyIndex];
      const order = matchingOrder(state.board.orders, slot.items);
      state.held = { kind: '__plate__', parts: slot.items.slice(), recipe: order.recipe.id };
      slot.items = [];
      sfx.pickup();
      return;
    }
    const someIndex = state.plates.findIndex((pl) => pl.items.length > 0);
    if (someIndex >= 0) {
      state.plates[someIndex].items = [];
      sfx.error();
      addFloater(state, cx, station.y - 8, 'Dibuang', '#ff9d9d');
      return;
    }
    sfx.error();
    return;
  }

  if (station.kind === 'window') {
    if (!held || held.kind !== '__plate__') {
      sfx.error();
      return;
    }
    const order = matchingOrder(state.board.orders, held.parts);
    if (!order) {
      sfx.error();
      addFloater(state, cx, station.y - 8, 'Tak ada pesanan cocok', '#ff9d9d');
      return;
    }
    const value = priceServe(order, state.combo);
    state.coins += value.total;
    state.served += 1;
    state.combo += 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    removeOrder(state.board, order.id);
    state.held = null;
    sfx.serve();
    burst(state, cx, cy, '#f2b705', 22, 150);
    burst(state, cx, cy, '#7CFC9A', 12, 110);
    addFloater(state, cx, cy - 30, `+${value.total} koin`, '#f2b705');
    if (value.tip > 0) addFloater(state, cx, cy - 52, `Tip +${value.tip}`, '#7CFC9A');
    return;
  }

  if (station.kind === 'trash') {
    if (!held) {
      sfx.error();
      return;
    }
    state.held = null;
    sfx.place();
    burst(state, cx, cy, '#8a8a8a', 8, 60);
  }
}

/** Advance the whole kitchen by `dt` seconds. */
export function updateKitchen(state, input, dt) {
  if (state.phase !== 'play') return;

  state.time += dt;

  // Click-to-move: steer toward the tapped floor point until we arrive.
  // A click on a station walks the chef there, then uses it once.
  const click = input.takeClickTarget();
  if (click && click.y > BOARD_H + 20) {
    const clickedStation = STATIONS.find(
      (s) => s.kind !== 'decor' && distToRect(click.x, click.y, s) <= INTERACT_DIST,
    );
    if (clickedStation) {
      state.moveTarget = standPointFor(clickedStation, state.player);
      state.pendingInteract = clickedStation.id;
    } else {
      state.moveTarget = click;
      state.pendingInteract = null;
    }
  }
  let vx = 0;
  let vy = 0;
  const keys = input.moveVector();
  if (keys.x !== 0 || keys.y !== 0) {
    state.moveTarget = null;
    vx = keys.x;
    vy = keys.y;
  } else if (state.moveTarget) {
    const dx = state.moveTarget.x - state.player.x;
    const dy = state.moveTarget.y - state.player.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 12) {
      state.moveTarget = null;
    } else {
      vx = dx / dist;
      vy = dy / dist;
    }
  }
  if (vx !== 0 || vy !== 0) movePlayer(state, vx, vy, dt);
  else state.player.moving = false;

  // Arrived at a clicked station: use it once.
  if (state.pendingInteract && !state.moveTarget) {
    const station = STATIONS.find((s) => s.id === state.pendingInteract);
    state.pendingInteract = null;
    if (station && nearestStation(state) === station) interact(state);
  }

  // Actions (E / pause / restart / mute) are dispatched by main.js, which
  // owns the frame; the kitchen only moves, cooks, and serves here.

  // Chopping finishes while the chef stands still at the board.
  if (state.chopping) {
    state.chopping.t += dt;
    if (state.chopping.t >= state.chopping.dur) {
      if (state.held) state.held.chopped = true;
      state.chopping = null;
      sfx.done();
      burst(state, state.player.x, state.player.y - 30, '#bfe3ff', 8, 70);
    } else if (Math.floor(state.chopping.t * 10) !== Math.floor((state.chopping.t - dt) * 10)) {
      sfx.chop();
    }
  }

  // Burners cook, then wait, then burn.
  for (const burner of state.burners) {
    if (burner.state === 'cooking') {
      burner.t += dt;
      if (Math.random() < dt * 6) {
        const station = STATIONS.find((s) => s.kind === 'stove' && state.burners[s.burner] === burner);
        if (station) steam(state, station.x + station.w / 2, station.y + 10);
      }
      if (burner.t >= COOK_TIME) {
        burner.state = 'done';
        burner.t = 0;
        burner.item.cooked = true;
        sfx.done();
        if (Math.random() < 0.7) sfx.sizzle();
      }
    } else if (burner.state === 'done') {
      burner.t += dt;
      if (burner.t >= BURN_GRACE) {
        burner.state = 'burnt';
        burner.item.burnt = true;
        burner.item.cooked = false;
        sfx.expire();
      }
    }
  }

  // Tickets, rushes, and the end of the shift.
  const maxOrders = state.board.rushTimer > 0 ? MAX_ORDERS + 1 : MAX_ORDERS;
  const events = updateOrderBoard(state.board, state.rng, state.time, dt, maxOrders);
  if (events.rush) {
    for (let i = 0; i < RUSH_ORDERS; i += 1) {
      if (state.board.orders.length < MAX_ORDERS + 1) {
        state.board.orders.push(createOrder(state.rng, state.time));
      }
    }
    showBanner(state, 'JAM RAMAI!', 'Pesanan datang beruntun — layani cepat!');
    sfx.rush();
  }
  for (const expired of events.expired) {
    state.missed += 1;
    state.hearts -= 1;
    state.combo = 0;
    sfx.expire();
    addFloater(state, 640, 130, `${expired.recipe.name} hangus! -1 hati`, '#ff9d9d');
  }

  // Particles and floating texts age out.
  for (const p of state.particles) {
    p.t += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += p.steam ? -30 * dt : 260 * dt;
  }
  state.particles = state.particles.filter((p) => p.t < p.life);
  for (const f of state.floaters) {
    f.t += dt;
    f.y -= 34 * dt;
  }
  state.floaters = state.floaters.filter((f) => f.t < f.life);
  if (state.banner) {
    state.banner.t += dt;
    if (state.banner.t > state.banner.life) state.banner = null;
  }

  if (state.hearts <= 0) {
    state.phase = 'over';
    state.overReason = 'Pelanggan kecewa semua — dapur tutup lebih awal.';
    return;
  }
  if (state.time >= DAY_LENGTH) {
    state.phase = 'over';
    state.overReason = 'Shift selesai! Dapur tutup dengan bangga.';
  }
}

/** Start a fresh shift from the title screen. */
export function startShift(state) {
  const fresh = createKitchen(state.seed, state.rng);
  fresh.phase = 'play';
  fresh.muted = state.muted;
  Object.keys(fresh).forEach((key) => {
    state[key] = fresh[key];
  });
  state.board.spawnIn = 3;
  showBanner(state, 'SHIFT DIMULAI!', 'Ambil bahan, cincang, masak, sajikan!');
  sfx.rush();
}
