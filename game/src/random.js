// Dapur Kilat — a tiny seeded random source, so a ?seed=N run always plays
// the same tickets in the same order. One job: deterministic randomness.

/** Mulberry32: a small, fast seeded PRNG. */
export function createRandom(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick one element of `list` with `rng`. */
export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

/** Fisher-Yates shuffle of a copy of `list`, with `rng`. */
export function shuffle(rng, list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
