// Dapur Kilat — everything the player sees, painted on one canvas. One job:
// draw the kitchen, the food, the chef, and the HUD from the live state.
// No game rule lives here; render only reads state.

import {
  BOARD_H,
  CHOP_TIME,
  COOK_TIME,
  DAY_LENGTH,
  FLOOR,
  INGREDIENTS,
  PALETTE,
  RECIPES,
  STATIONS,
  VIEW_H,
  VIEW_W,
  gradeFor,
} from './config.js';
import { interactLabel, itemReady, nearestStation } from './kitchen.js';
import { matchingOrder } from './orders.js';

const TICKET_W = 196;
const TICKET_H = 76;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align, weight) {
  ctx.fillStyle = color;
  ctx.font = `${weight || '700'} ${size}px 'Trebuchet MS', Verdana, sans-serif`;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function shadowedText(ctx, str, x, y, size, color, align, weight) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.font = `${weight || '700'} ${size}px 'Trebuchet MS', Verdana, sans-serif`;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x + 2, y + 2);
  text(ctx, str, x, y, size, color, align, weight);
}

/** One ingredient, drawn appetisingly at (x, y) with radius r. */
export function drawIngredient(ctx, kind, x, y, r, opts) {
  const o = opts || {};
  const spec = INGREDIENTS[kind];
  ctx.save();
  ctx.translate(x, y);
  if (o.ghost) ctx.globalAlpha = 0.35;
  if (kind === 'rice') {
    // a bowl of steaming white rice
    ctx.fillStyle = '#b8452c';
    ctx.beginPath();
    ctx.arc(0, r * 0.25, r * 0.95, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = spec.color;
    ctx.beginPath();
    ctx.arc(0, -r * 0.1, r * 0.72, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#fffbe8';
    for (let i = 0; i < 5; i += 1) {
      ctx.beginPath();
      ctx.arc(-r * 0.4 + i * r * 0.2, -r * 0.25 - (i % 2) * r * 0.12, r * 0.14, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'noodle') {
    ctx.fillStyle = '#b8452c';
    ctx.beginPath();
    ctx.arc(0, r * 0.25, r * 0.95, 0, Math.PI);
    ctx.fill();
    ctx.strokeStyle = spec.color;
    ctx.lineWidth = r * 0.22;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.arc(0, -r * 0.1, r * (0.55 - i * 0.14), Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    }
    ctx.strokeStyle = spec.dark;
    ctx.lineWidth = r * 0.08;
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, -r * 0.35);
    ctx.lineTo(r * 0.5, -r * 0.55);
    ctx.stroke();
  } else if (kind === 'chicken') {
    // a golden drumstick
    ctx.save();
    ctx.rotate(-0.6);
    ctx.fillStyle = spec.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.72, r * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = spec.dark;
    ctx.beginPath();
    ctx.ellipse(r * 0.1, r * 0.1, r * 0.4, r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f6efdc';
    ctx.lineWidth = r * 0.22;
    ctx.beginPath();
    ctx.moveTo(r * 0.62, r * 0.1);
    ctx.lineTo(r * 1.05, r * 0.35);
    ctx.stroke();
    ctx.restore();
  } else if (kind === 'egg') {
    ctx.fillStyle = '#fffdf2';
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.95, r * 0.72, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = spec.dark;
    ctx.beginPath();
    ctx.arc(r * 0.1, 0, r * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f7c948';
    ctx.beginPath();
    ctx.arc(r * 0.1, 0, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'chili') {
    ctx.strokeStyle = spec.color;
    ctx.lineWidth = r * 0.42;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, -r * 0.2);
    ctx.quadraticCurveTo(0, r * 0.75, r * 0.75, -r * 0.35);
    ctx.stroke();
    ctx.strokeStyle = spec.dark;
    ctx.lineWidth = r * 0.16;
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, -r * 0.2);
    ctx.quadraticCurveTo(-r * 0.85, -r * 0.55, -r * 0.55, -r * 0.7);
    ctx.stroke();
  } else if (kind === 'greens') {
    ctx.fillStyle = spec.color;
    for (let i = 0; i < 3; i += 1) {
      const a = -0.9 + i * 0.9;
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.5, r * 0.3, r * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = spec.dark;
    ctx.beginPath();
    ctx.arc(0, r * 0.3, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }
  if (o.chopped) {
    // chopped bits read at a glance: small cubes on top
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(-r * 0.5, -r * 0.15, r * 0.22, r * 0.22);
    ctx.fillRect(r * 0.1, -r * 0.4, r * 0.22, r * 0.22);
    ctx.fillRect(r * 0.28, r * 0.05, r * 0.2, r * 0.2);
  }
  ctx.restore();
}

/** A small plate with its components arranged on it. */
export function drawPlate(ctx, x, y, r, parts) {
  ctx.fillStyle = '#f8f4ec';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c9bda6';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#e8dfc9';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.62, 0, Math.PI * 2);
  ctx.fill();
  const spots = [[-0.3, -0.2], [0.32, -0.18], [0, 0.3]];
  parts.forEach((kind, i) => {
    const s = spots[i % spots.length];
    drawIngredient(ctx, kind, x + s[0] * r, y + s[1] * r, r * 0.42, {});
  });
}

function drawFloor(ctx) {
  ctx.fillStyle = PALETTE.floorA;
  ctx.fillRect(0, BOARD_H, VIEW_W, VIEW_H - BOARD_H);
  const tile = 64;
  for (let ty = 0; ty < (VIEW_H - BOARD_H) / tile; ty += 1) {
    for (let tx = 0; tx < VIEW_W / tile; tx += 1) {
      if ((tx + ty) % 2 === 0) {
        ctx.fillStyle = PALETTE.floorB;
        ctx.fillRect(tx * tile, BOARD_H + ty * tile, tile, tile);
      }
    }
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  ctx.lineWidth = 2;
  for (let tx = 0; tx <= VIEW_W / tile; tx += 1) {
    ctx.beginPath();
    ctx.moveTo(tx * tile, BOARD_H);
    ctx.lineTo(tx * tile, VIEW_H);
    ctx.stroke();
  }
  // batik-style border runner along the bottom edge
  ctx.fillStyle = PALETTE.wallTrim;
  ctx.fillRect(0, VIEW_H - 14, VIEW_W, 14);
  ctx.fillStyle = PALETTE.gold;
  for (let x = 10; x < VIEW_W; x += 46) {
    ctx.beginPath();
    ctx.arc(x, VIEW_H - 7, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawStation(ctx, state, station) {
  const { x, y, w, h } = station;
  const near = nearestStation(state) === station;
  ctx.save();
  if (near) {
    ctx.shadowColor = PALETTE.gold;
    ctx.shadowBlur = 18;
  }
  if (station.kind === 'pantry') {
    ctx.fillStyle = PALETTE.wood;
    roundRect(ctx, x, y, w, h, 8);
    ctx.fill();
    ctx.fillStyle = PALETTE.woodLight;
    ctx.fillRect(x + 6, y + 6, w - 12, 10);
    drawIngredient(ctx, station.item, x + 34, y + h / 2 + 4, 20, {});
    text(ctx, INGREDIENTS[station.item].name, x + 62, y + h / 2 - 8, 17, PALETTE.cream, 'left', '800');
    const spec = INGREDIENTS[station.item];
    const needs = [spec.chop ? 'cincang' : null, spec.cook ? 'masak' : null].filter(Boolean).join(' + ');
    text(ctx, needs || 'siap pakai', x + 62, y + h / 2 + 13, 12, '#e8c9a0', 'left', '600');
  } else if (station.kind === 'stove') {
    const burner = state.burners[station.burner];
    ctx.fillStyle = PALETTE.steelDark;
    roundRect(ctx, x, y, w, h, 10);
    ctx.fill();
    ctx.fillStyle = PALETTE.steel;
    roundRect(ctx, x + 8, y + 8, w - 16, h - 16, 8);
    ctx.fill();
    // burner ring
    ctx.fillStyle = '#3a3f44';
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h / 2, 34, 0, Math.PI * 2);
    ctx.fill();
    if (burner.state === 'cooking') {
      const flick = 0.75 + 0.25 * Math.sin(state.time * 14 + station.burner * 2);
      ctx.fillStyle = `rgba(255,${Math.floor(120 + 60 * flick)},40,${0.85 * flick})`;
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, 40 * flick, 0, Math.PI * 2);
      ctx.fill();
      drawIngredient(ctx, burner.item.kind, x + w / 2, y + h / 2, 22, { chopped: burner.item.chopped });
      drawProgressRing(ctx, x + w / 2, y + h / 2, 46, burner.t / COOK_TIME, '#ffb347');
    } else if (burner.state === 'done') {
      ctx.fillStyle = '#7CFC9A';
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, 40, 0, Math.PI * 2);
      ctx.globalAlpha = 0.35;
      ctx.fill();
      ctx.globalAlpha = 1;
      drawIngredient(ctx, burner.item.kind, x + w / 2, y + h / 2, 22, { chopped: burner.item.chopped });
      text(ctx, 'MATANG!', x + w / 2, y + 14, 13, '#14532d', 'center', '800');
    } else if (burner.state === 'burnt') {
      drawIngredient(ctx, burner.item.kind, x + w / 2, y + h / 2, 22, {});
      ctx.fillStyle = 'rgba(20,10,5,0.55)';
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, 24, 0, Math.PI * 2);
      ctx.fill();
      text(ctx, 'GOSONG', x + w / 2, y + h - 4, 13, '#fff', 'center', '800');
    } else {
      ctx.fillStyle = '#565e66';
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, 26, 0, Math.PI * 2);
      ctx.fill();
      text(ctx, 'KOMPOR', x + w / 2, y + 16, 12, '#2e3438', 'center', '800');
    }
  } else if (station.kind === 'board') {
    ctx.fillStyle = PALETTE.wood;
    roundRect(ctx, x, y, w, h, 10);
    ctx.fill();
    ctx.fillStyle = '#e8d3a8';
    roundRect(ctx, x + 12, y + 12, w - 24, h - 24, 6);
    ctx.fill();
    // knife
    ctx.save();
    ctx.translate(x + w - 42, y + h / 2);
    ctx.rotate(0.5);
    ctx.fillStyle = '#c0c8d0';
    ctx.fillRect(-26, -5, 40, 10);
    ctx.fillStyle = '#5d371c';
    ctx.fillRect(14, -5, 16, 10);
    ctx.restore();
    text(ctx, 'TALENAN', x + 22, y + h - 12, 12, '#7a5a34', 'left', '800');
    if (state.chopping) {
      drawProgressRing(ctx, x + w / 2, y + h / 2, 30, state.chopping.t / CHOP_TIME, '#4caf50');
      text(ctx, 'CINCANG...', x + w / 2, y + h - 12, 13, '#2e7d32', 'center', '800');
    }
  } else if (station.kind === 'plate') {
    ctx.fillStyle = PALETTE.woodDark;
    roundRect(ctx, x, y, w, h, 10);
    ctx.fill();
    ctx.fillStyle = PALETTE.woodLight;
    ctx.fillRect(x + 8, y + 8, w - 16, 8);
    text(ctx, 'MEJA SAJI — rakit piring di sini', x + 16, y + 22, 13, PALETTE.cream, 'left', '700');
    state.plates.forEach((plate, i) => {
      const px = x + 100 + i * 200;
      const py = y + 58;
      const ready = matchingOrder(state.board.orders, plate.items) != null;
      // status sits to the left of its plate, clear of the header
      const statusX = px - 38;
      if (ready) {
        ctx.save();
        ctx.shadowColor = '#7CFC9A';
        ctx.shadowBlur = 16;
        drawPlate(ctx, px, py, 28, plate.items);
        ctx.restore();
        text(ctx, 'SIAP!', statusX, py, 13, '#7CFC9A', 'right', '800');
      } else if (plate.items.length > 0) {
        drawPlate(ctx, px, py, 28, plate.items);
        text(ctx, `${plate.items.length}/3`, statusX, py, 12, '#e8c9a0', 'right', '700');
      } else {
        ctx.strokeStyle = 'rgba(255,246,227,0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.arc(px, py, 28, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        text(ctx, 'kosong', statusX, py, 12, '#e8c9a0', 'right', '600');
      }
    });
  } else if (station.kind === 'window') {
    ctx.fillStyle = PALETTE.wallTrim;
    roundRect(ctx, x, y, w, h, 10);
    ctx.fill();
    ctx.fillStyle = '#2b1a10';
    roundRect(ctx, x + 10, y + 34, w - 20, h - 44, 6);
    ctx.fill();
    text(ctx, 'JENDELA SAJI', x + w / 2, y + 18, 15, PALETTE.cream, 'center', '800');
    // bell
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath();
    ctx.arc(x + w - 40, y + 18, 10, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(x + w - 44, y + 18, 8, 3);
    text(ctx, 'Sajikan piring siap di sini', x + w / 2, y + h - 16, 13, '#ffd97a', 'center', '700');
    if (state.held && state.held.kind === '__plate__') {
      text(ctx, 'TEKAN E UNTUK MENYAJIKAN!', x + w / 2, y + h / 2 + 8, 16, '#7CFC9A', 'center', '800');
    }
  } else if (station.kind === 'trash') {
    ctx.fillStyle = '#4a4f55';
    roundRect(ctx, x, y, w, h, 8);
    ctx.fill();
    ctx.fillStyle = '#33373c';
    ctx.fillRect(x + 8, y + 6, w - 16, 12);
    text(ctx, 'SAMPAH', x + w / 2, y + h / 2 + 8, 13, '#cfd4d8', 'center', '800');
    text(ctx, 'buang bahan', x + w / 2, y + h / 2 + 26, 11, '#9aa0a6', 'center', '600');
  } else if (station.kind === 'decor') {
    if (station.id === 'rack') {
      ctx.fillStyle = PALETTE.wood;
      roundRect(ctx, x, y, w, h, 8);
      ctx.fill();
      text(ctx, 'BUMBU', x + w / 2, y + 16, 12, PALETTE.cream, 'center', '800');
      const jars = ['#d7263d', '#f2b705', '#4caf50', '#e8a87c'];
      jars.forEach((c, i) => {
        ctx.fillStyle = c;
        roundRect(ctx, x + 14 + i * 34, y + 34, 26, 44, 5);
        ctx.fill();
        ctx.fillStyle = '#fff6e3';
        ctx.fillRect(x + 14 + i * 34, y + 50, 26, 12);
      });
      text(ctx, 'warung Bu Kilat', x + w / 2, y + h - 12, 12, '#e8c9a0', 'center', '600');
    } else {
      ctx.fillStyle = '#b8452c';
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h - 18, 26, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = '#2e7d32';
      for (let i = 0; i < 5; i += 1) {
        const a = -Math.PI / 2 + (i - 2) * 0.5;
        ctx.beginPath();
        ctx.ellipse(x + w / 2 + Math.cos(a) * 22, y + h - 34 + Math.sin(a) * 22, 10, 22, a, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

function drawProgressRing(ctx, x, y, r, frac, color) {
  ctx.save();
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, frac));
  ctx.stroke();
  ctx.restore();
}

function drawChef(ctx, state) {
  const p = state.player;
  const bob = p.moving ? Math.sin(state.time * 14) * 2 : 0;
  ctx.save();
  ctx.translate(p.x, p.y + bob);
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(0, 20 - bob, 22, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  // body (white apron)
  ctx.fillStyle = '#f8f4ec';
  ctx.beginPath();
  ctx.arc(0, 4, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c9bda6';
  ctx.lineWidth = 2;
  ctx.stroke();
  // apron stripe
  ctx.fillStyle = '#c0392b';
  ctx.fillRect(-8, 2, 16, 16);
  // head
  ctx.fillStyle = '#f2c89b';
  ctx.beginPath();
  ctx.arc(0, -16, 13, 0, Math.PI * 2);
  ctx.fill();
  // chef hat
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-7, -28, 8, 0, Math.PI * 2);
  ctx.arc(0, -31, 9, 0, Math.PI * 2);
  ctx.arc(7, -28, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-13, -30, 26, 6);
  // eyes look where the chef walks
  ctx.fillStyle = '#2e1d12';
  ctx.beginPath();
  ctx.arc(p.dir * 3 - 4, -16, 2, 0, Math.PI * 2);
  ctx.arc(p.dir * 3 + 4, -16, 2, 0, Math.PI * 2);
  ctx.fill();
  // held item floats above the hat
  if (state.held) {
    if (state.held.kind === '__plate__') {
      drawPlate(ctx, 0, -52, 20, state.held.parts);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.arc(0, -52, 18, 0, Math.PI * 2);
      ctx.fill();
      drawIngredient(ctx, state.held.kind, 0, -52, 13, {
        chopped: state.held.chopped,
        ghost: state.held.burnt,
      });
      if (state.held.burnt) {
        text(ctx, 'GOSONG', 0, -76, 11, '#fff', 'center', '800');
      }
    }
  }
  // chopping progress ring while working a board
  if (state.chopping) {
    drawProgressRing(ctx, 0, -52, 24, state.chopping.t / CHOP_TIME, '#4caf50');
  }
  ctx.restore();
}

function drawTicket(ctx, order, x, y, scaleX) {
  const frac = Math.max(0, order.patience / order.maxPatience);
  const urgent = order.urgent;
  const shake = urgent ? Math.sin(order.patience * 18) * 2 : 0;
  ctx.save();
  ctx.translate(x + shake, y);
  ctx.scale(scaleX || 1, 1);
  ctx.fillStyle = PALETTE.ticket;
  roundRect(ctx, 0, 0, TICKET_W, TICKET_H, 8);
  ctx.fill();
  ctx.strokeStyle = urgent ? '#c0392b' : '#d9cba6';
  ctx.lineWidth = urgent ? 3 : 2;
  ctx.stroke();
  text(ctx, order.recipe.name, 10, 15, 15, PALETTE.ink, 'left', '800');
  order.recipe.parts.forEach((kind, i) => {
    drawIngredient(ctx, kind, 24 + i * 34, 42, 13, {});
  });
  text(ctx, `${order.recipe.price} koin`, TICKET_W - 10, 15, 13, '#8a6d1b', 'right', '800');
  // patience bar
  ctx.fillStyle = '#e5d9bd';
  roundRect(ctx, 10, TICKET_H - 14, TICKET_W - 20, 8, 4);
  ctx.fill();
  ctx.fillStyle = frac > 0.5 ? '#4caf50' : frac > 0.25 ? '#f2b705' : '#c0392b';
  roundRect(ctx, 10, TICKET_H - 14, (TICKET_W - 20) * frac, 8, 4);
  ctx.fill();
  text(ctx, `${Math.ceil(order.patience)} dtk`, TICKET_W - 10, TICKET_H - 26, 11, urgent ? '#c0392b' : '#8a6d1b', 'right', '700');
  ctx.restore();
}

function drawOrderBoard(ctx, state) {
  // the board itself
  ctx.fillStyle = PALETTE.woodDark;
  ctx.fillRect(0, 0, VIEW_W, BOARD_H);
  ctx.fillStyle = PALETTE.wood;
  ctx.fillRect(0, BOARD_H - 8, VIEW_W, 8);
  text(ctx, 'PAPAN PESANAN', 16, 14, 13, '#e8c9a0', 'left', '800');
  if (state.board.orders.length === 0) {
    text(ctx, 'Belum ada pesanan — siap-siap!', 16, 56, 15, '#e8c9a0', 'left', '600');
  }
  // Five tickets would run into the hearts/served cluster, so they shrink
  // a touch to keep every ticket clear of the HUD.
  const ticketW = state.board.orders.length > 4 ? 186 : TICKET_W;
  state.board.orders.forEach((order, i) => {
    drawTicket(ctx, order, 16 + i * (ticketW + 8), 20, ticketW / TICKET_W);
  });
  // right cluster: shift timer, coins, combo, hearts
  const rx = VIEW_W - 16;
  const remain = Math.max(0, DAY_LENGTH - state.time);
  const mm = Math.floor(remain / 60);
  const ss = Math.floor(remain % 60);
  const timerColor = remain < 30 ? '#ff9d9d' : PALETTE.cream;
  text(ctx, `⏱ ${mm}:${String(ss).padStart(2, '0')}`, rx, 18, 20, timerColor, 'right', '800');
  text(ctx, `🪙 ${state.coins} koin`, rx, 44, 18, PALETTE.gold, 'right', '800');
  if (state.combo >= 2) {
    text(ctx, `🔥 KOMBO x${state.combo}`, rx, 68, 16, '#ff8a5c', 'right', '800');
  }
  let hearts = '';
  for (let i = 0; i < 3; i += 1) hearts += i < state.hearts ? '❤' : '🤍';
  text(ctx, hearts, rx - 160, 18, 18, '#fff', 'right', '400');
  text(ctx, `Disajikan: ${state.served}`, rx - 160, 44, 14, '#e8c9a0', 'right', '700');
}

function drawPrompt(ctx, state) {
  if (state.phase !== 'play') return;
  const station = nearestStation(state);
  if (!station) return;
  const line = interactLabel(state);
  if (!line) return;
  const p = state.player;
  ctx.save();
  ctx.font = "700 14px 'Trebuchet MS', Verdana, sans-serif";
  const w = ctx.measureText(line).width + 92;
  const x = Math.max(8, Math.min(VIEW_W - w - 8, p.x - w / 2));
  const y = p.y - 96;
  ctx.fillStyle = 'rgba(30,20,12,0.88)';
  roundRect(ctx, x, y, w, 28, 14);
  ctx.fill();
  ctx.fillStyle = PALETTE.gold;
  ctx.beginPath();
  ctx.arc(x + 18, y + 14, 9, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, 'E', x + 18, y + 15, 13, '#2e1d12', 'center', '800');
  text(ctx, line, x + 34, y + 15, 14, '#fff6e3', 'left', '700');
  ctx.restore();
}
function drawParticles(ctx, state) {
  for (const p of state.particles) {
    const a = 1 - p.t / p.life;
    ctx.globalAlpha = p.steam ? a * 0.5 : a;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (p.steam ? 1 + p.t : 1), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawFloaters(ctx, state) {
  for (const f of state.floaters) {
    const a = 1 - f.t / f.life;
    ctx.globalAlpha = Math.min(1, a * 1.5);
    shadowedText(ctx, f.text, f.x, f.y, 17, f.color, 'center', '800');
  }
  ctx.globalAlpha = 1;
}

function drawBanner(ctx, state) {
  if (!state.banner) return;
  const a = state.banner.t < 0.3 ? state.banner.t / 0.3 : state.banner.t > state.banner.life - 0.5 ? (state.banner.life - state.banner.t) / 0.5 : 1;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, a));
  const w = 460;
  const x = (VIEW_W - w) / 2;
  const y = 130;
  ctx.fillStyle = 'rgba(30,20,12,0.9)';
  roundRect(ctx, x, y, w, 64, 12);
  ctx.fill();
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 2;
  ctx.stroke();
  shadowedText(ctx, state.banner.text, VIEW_W / 2, y + 20, 24, PALETTE.gold, 'center', '800');
  text(ctx, state.banner.sub, VIEW_W / 2, y + 46, 14, '#fff6e3', 'center', '600');
  ctx.restore();
}

function drawTitle(ctx, state) {
  ctx.fillStyle = 'rgba(20,12,6,0.55)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = PALETTE.cream;
  roundRect(ctx, 290, 130, 700, 460, 18);
  ctx.fill();
  ctx.strokeStyle = PALETTE.wallTrim;
  ctx.lineWidth = 4;
  ctx.stroke();
  shadowedText(ctx, '🍳 DAPUR KILAT', 640, 190, 52, '#a4552f', 'center', '800');
  text(ctx, 'Warung Bu Kilat — masak cepat, sajikan tepat waktu!', 640, 235, 18, PALETTE.ink, 'center', '600');
  // mini menu preview
  RECIPES.forEach((recipe, i) => {
    const y = 285 + i * 42;
    text(ctx, recipe.name, 380, y, 16, PALETTE.ink, 'left', '700');
    recipe.parts.forEach((kind, j) => drawIngredient(ctx, kind, 640 + j * 36, y, 12, {}));
    text(ctx, `${recipe.price} koin`, 900, y, 15, '#8a6d1b', 'right', '700');
  });
  text(ctx, 'WASD / Panah — bergerak   •   E / Spasi — pakai stasiun   •   Klik — jalan & pakai', 640, 510, 15, '#5d4a32', 'center', '600');
  text(ctx, 'Ambil bahan → cincang di talenan → masak di kompor → rakit di meja saji → sajikan!', 640, 536, 15, '#5d4a32', 'center', '600');
  const pulse = 0.7 + 0.3 * Math.sin(state.time * 4);
  ctx.globalAlpha = pulse;
  shadowedText(ctx, 'TEKAN ENTER UNTUK MULAI SHIFT', 640, 566, 20, '#c0392b', 'center', '800');
  ctx.globalAlpha = 1;
  if (state.best > 0) text(ctx, `Rekor: ${state.best} koin`, 640, 596, 14, '#8a6d1b', 'center', '700');
}

function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(20,12,6,0.6)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  shadowedText(ctx, 'JEDA', 640, 360, 56, PALETTE.cream, 'center', '800');
  text(ctx, 'P / Esc — lanjut   •   R — mulai ulang   •   M — suara', 640, 420, 18, '#fff6e3', 'center', '600');
}

function drawOver(ctx, state) {
  ctx.fillStyle = 'rgba(20,12,6,0.65)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = PALETTE.cream;
  roundRect(ctx, 340, 170, 600, 400, 18);
  ctx.fill();
  ctx.strokeStyle = PALETTE.wallTrim;
  ctx.lineWidth = 4;
  ctx.stroke();
  shadowedText(ctx, 'SHIFT SELESAI', 640, 220, 44, '#a4552f', 'center', '800');
  text(ctx, state.overReason, 640, 262, 16, PALETTE.ink, 'center', '600');
  text(ctx, `Koin: ${state.coins}`, 640, 320, 26, '#8a6d1b', 'center', '800');
  text(ctx, `Piring disajikan: ${state.served}   •   Pesanan hangus: ${state.missed}`, 640, 356, 17, PALETTE.ink, 'center', '600');
  text(ctx, `Kombo terbaik: x${state.bestCombo}`, 640, 388, 17, PALETTE.ink, 'center', '600');
  const grade = gradeFor(state.coins, state.served);
  shadowedText(ctx, `Nilai: ${grade}`, 640, 440, 34, grade === 'S' ? '#c0392b' : '#2e7d32', 'center', '800');
  if (state.best > 0) text(ctx, `Rekor: ${state.best} koin`, 640, 478, 15, '#8a6d1b', 'center', '700');
  const pulse = 0.7 + 0.3 * Math.sin(state.time * 4);
  ctx.globalAlpha = pulse;
  text(ctx, 'TEKAN R UNTUK MASAK LAGI', 640, 522, 18, '#c0392b', 'center', '800');
  ctx.globalAlpha = 1;
}

/** Paint one frame of the game. */
export function drawGame(ctx, state) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  drawFloor(ctx);
  for (const station of STATIONS) drawStation(ctx, state, station);
  drawChef(ctx, state);
  drawParticles(ctx, state);
  drawFloaters(ctx, state);
  drawOrderBoard(ctx, state);
  drawPrompt(ctx, state);
  drawBanner(ctx, state);
  if (state.phase === 'title') drawTitle(ctx, state);
  else if (state.phase === 'paused') drawPaused(ctx);
  else if (state.phase === 'over') drawOver(ctx, state);
}
