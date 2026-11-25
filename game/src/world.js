// World: the game's state machine. One job: rules and simulation —
// movement, collisions, station channels, serving, scoring, the shift
// clock. Pure logic: no document, no canvas, no audio, so the headless
// balance sim can import it in Node.
import {
  W, H, STEP, SHIFT_SECONDS, MAX_HEARTS, CHEF_SPEED, CHEF_RADIUS, INTERACT_RANGE,
  LADLE_SECONDS, BOIL_SECONDS, TAKE_SECONDS, TOPPING_SECONDS, SERVE_SECONDS,
  DUMP_SECONDS, STATIONS, TOPPING_BINS, COMBO_BONUS, ORDER_BOARD,
} from './config.js';
import { mulberry32, pick } from './random.js';
import { emptyBowl, bowlComplete, bowlMatches, BROTHS, TOPPINGS } from './recipes.js';
import { createOrders, stepOrders, removeTicket, waveAt } from './orders.js';

export const ORDER_BOARD_RECT = ORDER_BOARD;

/** Every station the chef can use, with its rect and kind. */
export function allStations() {
  const list = [
    { id: 'brothShoyu', kind: 'broth', broth: 'shoyu', ...STATIONS.brothShoyu },
    { id: 'brothMiso', kind: 'broth', broth: 'miso', ...STATIONS.brothMiso },
    { id: 'boiler', kind: 'boiler', ...STATIONS.boiler },
    { id: 'assembly', kind: 'assembly', ...STATIONS.assembly },
    { id: 'pass', kind: 'pass', ...STATIONS.pass },
    { id: 'trash', kind: 'trash', ...STATIONS.trash },
  ];
  for (const bin of TOPPING_BINS) list.push({ id: bin.id, kind: 'topping', topping: bin.id, ...bin });
  return list;
}

/** Distance from a point to a rect (0 when inside). */
function distToRect(x, y, r) {
  const dx = Math.max(r.x - x, 0, x - (r.x + r.w));
  const dy = Math.max(r.y - y, 0, y - (r.y + r.h));
  return Math.hypot(dx, dy);
}

/** The nearest station within interact range of the chef, or null. */
export function nearestStation(state) {
  let best = null;
  let bestD = Infinity;
  for (const s of allStations()) {
    const d = distToRect(state.chef.x, state.chef.y, s);
    if (d <= INTERACT_RANGE && d < bestD) {
      best = s;
      bestD = d;
    }
  }
  return best;
}

/** A fresh state for a shift with the given seed. */
export function createWorld(seed) {
  return {
    screen: 'title',
    seed,
    rng: mulberry32(seed),
    elapsed: 0,
    timeLeft: SHIFT_SECONDS,
    coins: 0,
    served: 0,
    missed: 0,
    combo: 0,
    bestCombo: 0,
    hearts: MAX_HEARTS,
    chef: { x: 490, y: 500, tx: 490, ty: 500, dir: 1 },
    bowl: emptyBowl(),
    boiler: { boiling: 0, ready: false },
    orders: createOrders(),
    channel: null,
    interactCooldown: 0,
    particles: [],
    floaters: [],
    banner: null,
    hint: 'Tekan ENTER untuk mulai shift',
    hintT: 0,
    selectedTicket: null,
    passBowl: null,
    events: [],
    paused: false,
    over: null,
    steamAcc: 0,
    stats: { ladled: 0, boiled: 0, topped: 0 },
  };
}

/** Start (or restart) a shift, keeping the same seed. */
export function startShift(state) {
  const fresh = createWorld(state.seed);
  Object.assign(state, fresh, { screen: 'play' });
  state.events.push('start');
}

function setHint(state, text) {
  state.hint = text;
  state.hintT = 3.5;
}

function addFloater(state, x, y, text, color) {
  state.floaters.push({ x, y, text, color, t: 0 });
}

function burst(state, x, y, color, n) {
  for (let i = 0; i < n; i += 1) {
    const a = state.rng() * Math.PI * 2;
    const sp = 40 + state.rng() * 90;
    state.particles.push({
      kind: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
      life: 0, max: 0.7, size: 3 + state.rng() * 3, color,
    });
  }
}

function gradeFor(coins) {
  if (coins >= 320) return 'S';
  if (coins >= 240) return 'A';
  if (coins >= 150) return 'B';
  return 'C';
}

function endShift(state, reason) {
  state.screen = 'over';
  state.channel = null;
  state.over = {
    reason,
    grade: gradeFor(state.coins),
    coins: state.coins,
    served: state.served,
    missed: state.missed,
    bestCombo: state.bestCombo,
  };
  state.events.push('gameover');
}

/** Circle-vs-rect collision, as a point in the rect inflated by the
 * chef's radius: two stations whose gap is narrower than the chef then
 * merge into one obstacle, so the chef can never wedge between two
 * neighbouring corners (a pocket no axis move can leave). */
function collides(state, x, y) {
  if (x < 8 + CHEF_RADIUS || x > 992 - CHEF_RADIUS) return true;
  if (y < 66 + CHEF_RADIUS || y > 712 - CHEF_RADIUS) return true;
  for (const s of allStations()) {
    if (s.kind === 'assembly') continue; // the assembly counter is low: walk past it
    if (x >= s.x - CHEF_RADIUS && x <= s.x + s.w + CHEF_RADIUS
      && y >= s.y - CHEF_RADIUS && y <= s.y + s.h + CHEF_RADIUS) return true;
  }
  return false;
}

/**
 * Try to start a channel action at a station. `intendId` names the
 * station the actor means (the autopilot's target, or the station a
 * mouse click landed on): when it is in range it wins over the nearest
 * station, so standing under the miso pot never ladles miso when the
 * shoyu pot was the intent. Without an intent, the nearest station wins.
 */
function tryInteract(state, intendId) {
  if (state.channel) return;
  let s = null;
  if (intendId) {
    const wanted = allStations().find((x) => x.id === intendId);
    if (wanted && distToRect(state.chef.x, state.chef.y, wanted) <= INTERACT_RANGE) s = wanted;
  }
  if (!s) s = nearestStation(state);
  if (!s) {
    setHint(state, 'Dekati stasiun dulu — panah/WASD untuk bergerak');
    return;
  }
  const bowl = state.bowl;
  const start = (kind, dur, label) => {
    state.channel = { kind, t: 0, dur, label, station: s.id };
  };
  if (s.kind === 'broth') {
    if (bowl.broth) { setHint(state, 'Mangkuk sudah berisi kaldu'); state.events.push('fail'); return; }
    start('ladle', LADLE_SECONDS, `Menuang kaldu ${BROTHS[s.broth].name}…`);
    return;
  }
  if (s.kind === 'boiler') {
    if (state.boiler.ready) { start('take', TAKE_SECONDS, 'Mengangkat mie…'); return; }
    if (state.boiler.boiling > 0) { setHint(state, 'Mie masih direbus — tunggu ding!'); return; }
    if (!bowl.broth) { setHint(state, 'Tuang kaldu dulu sebelum merebus mie'); state.events.push('fail'); return; }
    if (bowl.noodle) { setHint(state, 'Mie sudah ada di mangkuk'); return; }
    state.boiler.boiling = BOIL_SECONDS;
    state.events.push('boilStart');
    setHint(state, 'Mie direbus… tunggu sampai matang!');
    return;
  }
  if (s.kind === 'topping') {
    if (!bowl.noodle) { setHint(state, 'Rebus mie dulu sebelum topping'); state.events.push('fail'); return; }
    if (bowl.toppings.length >= 2) { setHint(state, 'Topping sudah lengkap (2)'); return; }
    if (bowl.toppings.includes(s.topping)) { setHint(state, `Sudah ada ${TOPPINGS[s.topping].name}`); return; }
    start('topping', TOPPING_SECONDS, `Menambah ${TOPPINGS[s.topping].name}…`);
    return;
  }
  if (s.kind === 'assembly') {
    if (bowlComplete(bowl)) setHint(state, 'Mangkuk siap — antar ke PASS di kanan!');
    else setHint(state, 'Rakit mangkukmu: kaldu → mie → 2 topping');
    return;
  }
  if (s.kind === 'pass') {
    if (!bowlComplete(bowl)) { setHint(state, 'Mangkuk belum lengkap — kaldu + mie + 2 topping'); state.events.push('fail'); return; }
    const match = state.orders.list.find((t) => state.selectedTicket === t.id && bowlMatches(bowl, t))
      || state.orders.list.find((t) => bowlMatches(bowl, t));
    if (!match) { setHint(state, 'Tidak ada pesanan yang cocok — cek tiket atau buang'); state.events.push('fail'); return; }
    start('serve', SERVE_SECONDS, 'Mengantar pesanan…');
    return;
  }
  if (s.kind === 'trash') {
    if (!bowl.broth && !bowl.noodle && bowl.toppings.length === 0) { setHint(state, 'Mangkuk sudah kosong'); return; }
    start('dump', DUMP_SECONDS, 'Membuang mangkuk…');
  }
}

/** Apply a finished channel's effect. */
function finishChannel(state) {
  const ch = state.channel;
  state.channel = null;
  const s = allStations().find((x) => x.id === ch.station);
  const cx = s ? s.x + s.w / 2 : state.chef.x;
  const cy = s ? s.y + s.h / 2 : state.chef.y;
  if (ch.kind === 'ladle') {
    state.bowl.broth = s.broth;
    state.stats.ladled += 1;
    state.events.push('ladle');
    burst(state, cx, cy - 20, '#ffd94a', 8);
    setHint(state, `Kaldu ${BROTHS[s.broth].name} dituang — sekarang rebus mie!`);
  } else if (ch.kind === 'take') {
    state.bowl.noodle = true;
    state.boiler.ready = false;
    state.stats.boiled += 1;
    state.events.push('take');
    setHint(state, 'Mie masuk — tambah 2 topping dari bar bawah!');
  } else if (ch.kind === 'topping') {
    state.bowl.toppings.push(s.topping);
    state.stats.topped += 1;
    state.events.push('topping');
    burst(state, cx, cy - 10, TOPPINGS[s.topping].accent, 8);
    if (state.bowl.toppings.length >= 2) setHint(state, 'Mangkuk lengkap — antar ke PASS!');
  } else if (ch.kind === 'serve') {
    const match = state.orders.list.find((t) => state.selectedTicket === t.id && bowlMatches(state.bowl, t))
      || state.orders.list.find((t) => bowlMatches(state.bowl, t));
    if (match) {
      const tip = Math.round(8 * (match.patience / match.maxPatience));
      state.combo += 1;
      state.bestCombo = Math.max(state.bestCombo, state.combo);
      const bonus = (state.combo - 1) * COMBO_BONUS;
      const earned = match.coins + tip + bonus;
      state.coins += earned;
      state.served += 1;
      removeTicket(state.orders, match.id);
      state.selectedTicket = null;
      state.passBowl = { bowl: { ...state.bowl, toppings: state.bowl.toppings.slice() }, t: 0 };
      state.bowl = emptyBowl();
      state.events.push('serve');
      burst(state, cx, cy, '#7bc96f', 16);
      addFloater(state, cx, cy - 40, `+${earned} koin`, '#ffc53d');
      if (state.combo >= 3) addFloater(state, cx, cy - 66, `COMBO ×${state.combo}!`, '#ff5d8f');
      setHint(state, `Pesanan #${match.id} disajikan — +${earned} koin!`);
    }
  } else if (ch.kind === 'dump') {
    state.bowl = emptyBowl();
    state.events.push('dump');
    setHint(state, 'Mangkuk dibuang — rakit yang baru');
  }
}

/** One fixed step. `input` is {up,down,left,right,interact,click,selectTicket}. */
export function stepWorld(state, input, dt = STEP) {
  if (state.screen === 'title') {
    if (input.interact || input.click) startShift(state);
    return;
  }
  if (state.screen === 'over') {
    if (input.restart) {
      state.seed = (state.seed + 7919) % 100000;
      startShift(state);
    }
    return;
  }
  if (input.pause) {
    state.paused = !state.paused;
    return;
  }
  if (state.paused) return;

  if (input.selectTicket !== undefined && input.selectTicket !== null) {
    state.selectedTicket = state.orders.list.some((t) => t.id === input.selectTicket)
      ? input.selectTicket : null;
  }

  // Click-to-move: a click sets a walk target (cleared by any arrow key).
  if (input.click) {
    state.chef.tx = Math.max(30, Math.min(970, input.click.x));
    state.chef.ty = Math.max(88, Math.min(690, input.click.y));
    state.clickStation = null;
    for (const s of allStations()) {
      if (input.click.x >= s.x - 6 && input.click.x <= s.x + s.w + 6
        && input.click.y >= s.y - 6 && input.click.y <= s.y + s.h + 6) {
        state.clickStation = s.id;
      }
    }
  }

  const keyMove = input.up || input.down || input.left || input.right;
  if (keyMove) state.clickStation = null;

  // Movement (locked while a channel runs).
  if (!state.channel) {
    let vx = 0;
    let vy = 0;
    if (input.left) vx -= 1;
    if (input.right) vx += 1;
    if (input.up) vy -= 1;
    if (input.down) vy += 1;
    if (vx === 0 && vy === 0 && input.click) {
      const dx = state.chef.tx - state.chef.x;
      const dy = state.chef.ty - state.chef.y;
      const d = Math.hypot(dx, dy);
      if (d > 6) {
        vx = dx / d;
        vy = dy / d;
      }
    }
    if (vx !== 0 || vy !== 0) {
      const len = Math.hypot(vx, vy);
      vx /= len;
      vy /= len;
      state.chef.dir = vx < 0 ? -1 : vx > 0 ? 1 : state.chef.dir;
      const nx = state.chef.x + vx * CHEF_SPEED * dt;
      const ny = state.chef.y + vy * CHEF_SPEED * dt;
      if (!collides(state, nx, state.chef.y)) state.chef.x = nx;
      if (!collides(state, state.chef.x, ny)) state.chef.y = ny;
    }
    // Clicked a station and arrived: interact by itself, at that station.
    if (state.clickStation) {
      const s = allStations().find((x) => x.id === state.clickStation);
      if (s && distToRect(state.chef.x, state.chef.y, s) <= INTERACT_RANGE) {
        const wanted = state.clickStation;
        state.clickStation = null;
        tryInteract(state, wanted);
      }
    }
  }

  // Interact on the rising edge, then retry while held (every 0.4s):
  // a first press consumed by a no-op branch (wrong station, not ready
  // yet) must not deadlock a held key — holding E retries politely.
  if (state.interactCooldown > 0) state.interactCooldown -= dt;
  if (input.interact && (!state.prevInteract || state.interactCooldown <= 0)) {
    tryInteract(state, input.interactStation);
    state.interactCooldown = 0.4;
  }
  state.prevInteract = !!input.interact;

  // Channel progress.
  if (state.channel) {
    state.channel.t += dt;
    if (state.channel.t >= state.channel.dur) finishChannel(state);
  }

  // Noodle boiler countdown.
  if (state.boiler.boiling > 0) {
    state.boiler.boiling -= dt;
    if (state.boiler.boiling <= 0) {
      state.boiler.boiling = 0;
      state.boiler.ready = true;
      state.events.push('ding');
      setHint(state, 'Mie matang — angkat dari panci!');
    }
  }

  // Orders, rush waves, the shift clock.
  state.elapsed += dt;
  state.timeLeft = Math.max(0, SHIFT_SECONDS - state.elapsed);
  const { expired, waveRose } = stepOrders(state.orders, state.rng, state.elapsed, dt);
  if (waveRose) {
    const wave = state.orders.wave;
    state.banner = { text: wave === 1 ? 'RUSH HOUR!' : 'RUSH HOUR — MAKIN RAMAI!', sub: 'Pesanan datang lebih cepat', t: 0 };
    state.events.push('wave');
  }
  for (const t of expired) {
    state.missed += 1;
    state.combo = 0;
    state.hearts -= 1;
    state.events.push('expire');
    addFloater(state, 1134, 200, `Pesanan #${t.id} hangus!`, '#e5484d');
    setHint(state, `Pesanan #${t.id} keburu hangus — hati tinggal ${state.hearts}`);
  }
  if (state.banner) {
    state.banner.t += dt;
    if (state.banner.t > 2.6) state.banner = null;
  }
  if (state.hintT > 0) state.hintT -= dt;
  if (state.passBowl) {
    state.passBowl.t += dt;
    if (state.passBowl.t > 1.6) state.passBowl = null;
  }

  // Steam from the pots and the boiler.
  state.steamAcc += dt;
  while (state.steamAcc > 0.14) {
    state.steamAcc -= 0.14;
    const pots = [STATIONS.brothShoyu, STATIONS.brothMiso, STATIONS.boiler];
    const p = pick(state.rng, pots);
    state.particles.push({
      kind: 'steam',
      x: p.x + 20 + state.rng() * (p.w - 40),
      y: p.y + 10,
      vx: (state.rng() - 0.5) * 8,
      vy: -26 - state.rng() * 18,
      life: 0, max: 1.4, size: 5 + state.rng() * 7, color: '#cfd8ff',
    });
  }
  // Particles and floaters.
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const p = state.particles[i];
    p.life += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.kind === 'steam') p.vy -= 6 * dt;
    if (p.life >= p.max) state.particles.splice(i, 1);
  }
  if (state.particles.length > 140) state.particles.splice(0, state.particles.length - 140);
  for (let i = state.floaters.length - 1; i >= 0; i -= 1) {
    const f = state.floaters[i];
    f.t += dt;
    f.y -= 26 * dt;
    if (f.t > 1.4) state.floaters.splice(i, 1);
  }

  if (state.hearts <= 0) endShift(state, 'reputasi');
  else if (state.timeLeft <= 0) endShift(state, 'waktu');
}

/**
 * The playtest autopilot: the same greedy brain the headless sim uses.
 * Returns an input object for this step (keys + interact), driving the
 * chef through broth → noodles → toppings → pass for the oldest ticket.
 * It steers to an approach point in open floor beside each station —
 * never at the station's centre — so it walks around a station's
 * corner instead of pushing into it (a centre target strands the chef
 * sliding along a neighbour's edge with too little vertical pull).
 */
export function autoplayInput(state) {
  const none = { up: false, down: false, left: false, right: false, interact: false, click: null };
  if (state.screen !== 'play' || state.channel || state.paused) return none;
  const ticket = state.orders.list[0];
  if (!ticket) return none;
  const bowl = state.bowl;
  // Stations by id (allStations carries the ids; the raw STATIONS
  // config objects do not, so the autopilot must not use them as targets).
  const S = {};
  for (const s of allStations()) S[s.id] = s;
  let target = null;
  let wantInteract = false;
  const pot = ticket.broth === 'shoyu' ? S.brothShoyu : S.brothMiso;
  const missingTopping = ticket.toppings.find((t) => !bowl.toppings.includes(t));
  if (bowl.broth && bowl.broth !== ticket.broth) {
    target = S.trash;
    wantInteract = true;
  } else if (!bowl.broth) {
    target = pot;
    wantInteract = true;
  } else if (!bowl.noodle) {
    if (state.boiler.ready) { target = S.boiler; wantInteract = true; }
    else if (state.boiler.boiling > 0) return none; // wait for the ding
    else { target = S.boiler; wantInteract = true; }
  } else if (missingTopping) {
    target = TOPPING_BINS.find((b) => b.id === missingTopping);
    wantInteract = true;
  } else if (bowlComplete(bowl)) {
    if (bowlMatches(bowl, ticket)) { target = S.pass; wantInteract = true; }
    else { target = S.trash; wantInteract = true; }
  }
  if (!target) return none;
  const d = distToRect(state.chef.x, state.chef.y, target);
  // In range: interact at the intended station (not merely the nearest).
  if (d <= INTERACT_RANGE - 4) return { ...none, interact: wantInteract, interactStation: target.id };
  const ap = approachPoint(target);
  const dx = ap.x - state.chef.x;
  const dy = ap.y - state.chef.y;
  return {
    ...none,
    left: dx < -4,
    right: dx > 4,
    up: dy < -4,
    down: dy > 4,
  };
}

/** Open-floor point to walk to for a station: below the pots/boiler, above the topping bins, beside the pass/trash. */
function approachPoint(s) {
  if (s.kind === 'topping') return { x: s.x + s.w / 2, y: s.y - CHEF_RADIUS - 10 };
  if (s.kind === 'pass') return { x: s.x - CHEF_RADIUS - 10, y: s.y + s.h / 2 };
  if (s.kind === 'trash') return { x: s.x + s.w + CHEF_RADIUS + 10, y: s.y + s.h / 2 };
  return { x: s.x + s.w / 2, y: s.y + s.h + CHEF_RADIUS + 10 };
}
