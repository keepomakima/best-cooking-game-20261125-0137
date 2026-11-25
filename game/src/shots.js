// Screenshot scenes behind ?shot=kitchen|rush|assembly|title.
// Each one sets the world to a fixed, seeded state and returns the
// screen to draw — the frame is what a real shift looks like at that
// moment, rendered by the game's own code, and the same seed always
// gives the same frame.
import { STATIONS, TOPPING_BINS } from './config.js';
import { makeTicket } from './recipes.js';
import { createWorld } from './world.js';

function ticket(world, id, broth, toppings, patience, maxPatience) {
  const t = makeTicket(world.rng, id);
  t.broth = broth;
  t.toppings = toppings;
  t.patience = patience;
  t.maxPatience = maxPatience;
  return t;
}

function steam(world, n) {
  const pots = [STATIONS.brothShoyu, STATIONS.brothMiso, STATIONS.boiler];
  for (let i = 0; i < n; i += 1) {
    const p = pots[i % pots.length];
    world.particles.push({
      kind: 'steam',
      x: p.x + 20 + world.rng() * (p.w - 40),
      y: p.y + 10 - world.rng() * 30,
      vx: 0, vy: -20, life: world.rng() * 0.8, max: 1.4,
      size: 6 + world.rng() * 7, color: '#cfd8ff',
    });
  }
}

/**
 * Set `world` to the named scene and return the screen to draw.
 * Any other name is the kitchen cover.
 */
export function stageShot(name, world) {
  const w = createWorld(world.seed);
  Object.assign(world, w);
  world.screen = 'play';
  if (name === 'title') {
    world.screen = 'title';
    world.best = 124;
    world.orders.list = [
      ticket(world, 1, 'shoyu', ['egg', 'nori'], 60, 78),
      ticket(world, 2, 'miso', ['chashu', 'corn'], 44, 78),
    ];
    steam(world, 10);
    return 'title';
  }
  if (name === 'rush') {
    world.elapsed = 122;
    world.timeLeft = 58;
    world.coins = 134;
    world.served = 9;
    world.combo = 4;
    world.bestCombo = 5;
    world.orders.wave = 2;
    world.orders.list = [
      ticket(world, 7, 'miso', ['chashu', 'nori'], 8, 60),
      ticket(world, 8, 'shoyu', ['egg', 'corn'], 34, 60),
      ticket(world, 9, 'miso', ['egg', 'scallion'], 47, 60),
      ticket(world, 10, 'shoyu', ['chashu', 'scallion'], 55, 60),
    ];
    world.bowl = { broth: 'miso', noodle: false, toppings: [] };
    world.boiler = { boiling: 1.2, ready: false };
    // Left of the RUSH HOUR banner (it spans x 380..900) so the chef
    // is not hidden behind it.
    world.chef.x = 330;
    world.chef.y = 250;
    world.banner = { text: 'RUSH HOUR — MAKIN RAMAI!', sub: 'Pesanan datang lebih cepat', t: 0.8 };
    steam(world, 16);
    return 'play';
  }
  if (name === 'assembly') {
    world.elapsed = 47;
    world.timeLeft = 133;
    world.coins = 52;
    world.served = 3;
    world.combo = 1;
    world.orders.list = [
      ticket(world, 4, 'shoyu', ['egg', 'nori'], 52, 78),
      ticket(world, 5, 'miso', ['chashu', 'corn'], 38, 78),
    ];
    world.selectedTicket = 4;
    world.bowl = { broth: 'shoyu', noodle: true, toppings: [] };
    const egg = TOPPING_BINS[0];
    world.chef.x = egg.x + egg.w / 2;
    world.chef.y = egg.y - 34;
    world.channel = { kind: 'topping', t: 0.21, dur: 0.35, label: 'Menambah Telur…', station: 'egg' };
    world.hint = 'Mangkuk hampir lengkap — satu topping lagi!';
    world.hintT = 3.5;
    steam(world, 10);
    return 'play';
  }
  // kitchen (the cover): a busy mid-shift frame with all six required
  // elements — kitchen, order board, ingredients, a dish mid-assembly,
  // the timer, and a plate ready to serve on the pass.
  world.elapsed = 29;
  world.timeLeft = 151;
  world.coins = 86;
  world.served = 5;
  world.combo = 2;
  world.bestCombo = 3;
  world.orders.list = [
    ticket(world, 1, 'shoyu', ['egg', 'nori'], 61, 78),
    ticket(world, 2, 'miso', ['chashu', 'corn'], 44, 78),
    ticket(world, 3, 'shoyu', ['scallion', 'egg'], 29, 78),
  ];
  world.bowl = { broth: 'shoyu', noodle: true, toppings: ['egg'] };
  world.boiler = { boiling: 0, ready: true };
  world.chef.x = 560;
  world.chef.y = 470;
  // The pass bowl is shown for 1.6s of game time; the screenshot lands
  // ~1.8s after staging, so start its clock in the past.
  world.passBowl = { bowl: { broth: 'miso', noodle: true, toppings: ['chashu', 'nori'] }, t: -1.2 };
  world.hint = 'Mangkuk hampir lengkap — tambah Nori, lalu antar ke PASS!';
  world.hintT = 3.5;
  steam(world, 12);
  return 'play';
}
