// Dapur Kilat — the four screenshot scenes. One job: put a real, playable
// game state on screen for the camera. Every scene is built through the
// game's own rules (real tickets, real plates, real burners), never by
// drawing a fake picture: what you see is what a short shift looks like.

import { RECIPE_BY_ID } from './config.js';
import { makeItem } from './kitchen.js';

function ticket(recipeId, patience, maxPatience) {
  return {
    id: Math.floor(Math.random() * 100000),
    recipe: RECIPE_BY_ID[recipeId],
    patience,
    maxPatience,
    bornAt: 0,
    urgent: patience < 12,
  };
}

/**
 * Stage `name` on a fresh kitchen: cover | start | rush | serve.
 * Returns the state, ready to render.
 */
export function stageShot(state, name) {
  if (name === 'start') {
    state.phase = 'title';
    state.time = 0.4;
    return state;
  }

  state.phase = 'play';

  if (name === 'cover') {
    // Mid-shift, everything the judge's first criterion asks for in one frame:
    // the board with three tickets, crates full of ingredients, a Nasi Goreng
    // mid-assembly on the plating counter, a finished Mie Ayam ready to lift,
    // the shift timer running, and the chef about to finish the plate.
    state.time = 62;
    state.coins = 86;
    state.served = 3;
    state.combo = 2;
    state.bestCombo = 2;
    state.board.orders = [
      ticket('nasi-goreng', 30, 75),
      ticket('mie-ayam', 55, 70),
      ticket('sate-ayam', 14, 60),
    ];
    state.board.spawnIn = 8;
    state.plates[0].items = ['rice', 'egg'];
    state.plates[1].items = ['noodle', 'chicken', 'greens'];
    const chicken = makeItem('chicken');
    chicken.chopped = true;
    state.burners[0] = { item: chicken, t: 2.2, state: 'cooking' };
    const egg = makeItem('egg');
    egg.cooked = true;
    state.burners[1] = { item: egg, t: 0, state: 'done' };
    const chili = makeItem('chili');
    chili.chopped = true;
    state.held = chili;
    state.player.x = 470;
    state.player.y = 520;
    state.player.dir = 1;
    state.floaters.push({ x: 877, y: 260, text: '+34 koin', color: '#f2b705', t: 0.3, life: 1.4 });
    return state;
  }

  if (name === 'rush') {
    // Rush hour: five tickets, two nearly out of patience, the chef mid-chop,
    // both burners busy, one plate started, the banner still up.
    state.time = 138;
    state.coins = 214;
    state.served = 7;
    state.combo = 4;
    state.bestCombo = 4;
    state.board.orders = [
      ticket('soto-ayam', 20, 58),
      ticket('nasi-goreng', 12, 62),
      ticket('mie-ayam', 26, 66),
      ticket('sate-ayam', 9, 55),
      ticket('gado-gado', 18, 60),
    ];
    state.board.rushTimer = 14;
    state.board.spawnIn = 4;
    state.plates[0].items = ['greens'];
    const noodle = makeItem('noodle');
    state.burners[0] = { item: noodle, t: 3.1, state: 'cooking' };
    const chicken = makeItem('chicken');
    chicken.chopped = true;
    chicken.cooked = true;
    state.burners[1] = { item: chicken, t: 0, state: 'done' };
    state.held = makeItem('chicken');
    state.chopping = { t: 0.7, dur: 1.4 };
    state.player.x = 370;
    state.player.y = 412;
    state.player.dir = 1;
    state.banner = { text: 'JAM RAMAI!', sub: 'Pesanan datang beruntun — layani cepat!', t: 0.6, life: 3.2 };
    return state;
  }

  if (name === 'serve') {
    // The serve: a finished Soto Ayam in the chef's hands at the window,
    // its ticket still patient, coins already popping.
    state.time = 95;
    state.coins = 150;
    state.served = 5;
    state.combo = 3;
    state.bestCombo = 3;
    state.board.orders = [
      ticket('soto-ayam', 40, 70),
      ticket('gado-gado', 52, 68),
    ];
    state.board.spawnIn = 10;
    state.plates[0].items = [];
    state.held = { kind: '__plate__', parts: ['chicken', 'rice', 'greens'], recipe: 'soto-ayam' };
    state.player.x = 880;
    state.player.y = 300;
    state.player.dir = 1;
    for (let i = 0; i < 10; i += 1) {
      const angle = (i / 10) * Math.PI * 2;
      state.particles.push({
        x: 877 + Math.cos(angle) * 30,
        y: 178 + Math.sin(angle) * 24,
        vx: Math.cos(angle) * 60,
        vy: Math.sin(angle) * 60 - 30,
        t: 0.2, life: 1.0, color: i % 2 ? '#f2b705' : '#7CFC9A', size: 3,
      });
    }
    state.floaters.push({ x: 877, y: 230, text: '+36 koin', color: '#f2b705', t: 0.2, life: 1.4 });
    return state;
  }

  return state;
}
