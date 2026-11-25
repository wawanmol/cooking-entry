// Dapur Kilat — the order board: tickets arrive, wait, and leave. One job:
// spawn tickets, age their patience, match a finished plate, price a serve.

import { MAX_ORDERS, RECIPES, patienceAt, serveValue, spawnIntervalAt } from './config.js';
import { pick } from './random.js';

let nextOrderId = 1;

/** A fresh ticket: a recipe, its price, and a patience bar that only shrinks. */
export function createOrder(rng, elapsed, maxPatienceOverride) {
  const recipe = pick(rng, RECIPES);
  const maxPatience = maxPatienceOverride ?? patienceAt(elapsed, rng);
  return {
    id: nextOrderId,
    recipe,
    patience: maxPatience,
    maxPatience,
    bornAt: elapsed,
    urgent: false,
  };
}

export function createOrderBoard() {
  return {
    orders: [],
    spawnIn: 6, // first ticket lands a few seconds after opening
    rushIn: 70,
    rushTimer: 0,
  };
}

/** Does this plate (a list of ready ingredient kinds) fill any open ticket? */
export function matchingOrder(orders, plateItems) {
  const sorted = plateItems.slice().sort().join('|');
  return orders.find((o) => o.recipe.parts.slice().sort().join('|') === sorted) ?? null;
}

/** True when the plate could still become some open ticket (no wrong part). */
export function plateStillUseful(orders, plateItems) {
  return orders.some((o) => plateItems.every((part) => o.recipe.parts.includes(part)));
}

/**
 * Advances the board by `dt` seconds. Returns events the kitchen must answer:
 * spawned tickets, expired tickets, and whether a rush just began.
 */
export function updateOrderBoard(board, rng, elapsed, dt, maxOrders) {
  const events = { spawned: [], expired: [], rush: false };
  board.spawnIn -= dt;
  if (board.spawnIn <= 0 && board.orders.length < (maxOrders ?? MAX_ORDERS)) {
    board.orders.push(createOrder(rng, elapsed));
    events.spawned.push(board.orders[board.orders.length - 1]);
    board.spawnIn = spawnIntervalAt(elapsed);
  }
  board.rushIn -= dt;
  if (board.rushIn <= 0) {
    board.rushIn = 70;
    board.rushTimer = 20;
    events.rush = true;
  }
  if (board.rushTimer > 0) {
    board.rushTimer -= dt;
    if (board.rushTimer <= 0) board.rushTimer = 0;
  }
  for (const order of board.orders) {
    order.patience -= dt;
    order.urgent = order.patience < 12;
  }
  const stillOpen = [];
  for (const order of board.orders) {
    if (order.patience <= 0) events.expired.push(order);
    else stillOpen.push(order);
  }
  board.orders = stillOpen;
  return events;
}

/** Price a serve of `order` on the current combo streak. */
export function priceServe(order, combo) {
  return serveValue(order.recipe, Math.max(0, order.patience), order.maxPatience, combo);
}

/** Remove a served ticket from the board. */
export function removeOrder(board, orderId) {
  board.orders = board.orders.filter((o) => o.id !== orderId);
}
