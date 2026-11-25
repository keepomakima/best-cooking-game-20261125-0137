// Orders: the ticket rail. One job: spawning tickets, ticking their
// patience, and expiring them — the pressure that grows through a shift.
import {
  MAX_ORDERS, PATIENCE_BASE, PATIENCE_RUSH, SPAWN_BASE, SPAWN_MID, SPAWN_RUSH,
  WAVE1_AT, WAVE2_AT,
} from './config.js';
import { makeTicket } from './recipes.js';

/** The rail's state: live tickets, spawn timer, wave number. */
export function createOrders() {
  return { list: [], spawnIn: 2.5, nextId: 1, wave: 0 };
}

/** Which wave the shift is in at `elapsed` seconds (0, 1 or 2). */
export function waveAt(elapsed) {
  if (elapsed >= WAVE2_AT) return 2;
  if (elapsed >= WAVE1_AT) return 1;
  return 0;
}

function spawnInterval(wave) {
  return wave === 0 ? SPAWN_BASE : wave === 1 ? SPAWN_MID : SPAWN_RUSH;
}

function patienceFor(wave) {
  return wave === 0 ? PATIENCE_BASE : PATIENCE_RUSH;
}

/**
 * Advance the rail by `dt` seconds. Returns the tickets that expired
 * this step (their patience hit zero) so the world can charge a heart.
 */
export function stepOrders(orders, rng, elapsed, dt) {
  const expired = [];
  const wave = waveAt(elapsed);
  const waveRose = wave > orders.wave;
  orders.wave = wave;
  // Spawn a ticket when the timer runs out and the rail has room.
  orders.spawnIn -= dt;
  if (orders.spawnIn <= 0 && orders.list.length < MAX_ORDERS) {
    const ticket = makeTicket(rng, orders.nextId);
    orders.nextId += 1;
    ticket.patience = patienceFor(wave);
    ticket.maxPatience = ticket.patience;
    orders.list.push(ticket);
    orders.spawnIn = spawnInterval(wave);
  }
  // Tick patience; collect the expired.
  for (let i = orders.list.length - 1; i >= 0; i -= 1) {
    const ticket = orders.list[i];
    ticket.patience -= dt;
    if (ticket.patience <= 0) {
      orders.list.splice(i, 1);
      expired.push(ticket);
    }
  }
  return { expired, waveRose };
}

/** Remove a ticket from the rail by id. */
export function removeTicket(orders, id) {
  const at = orders.list.findIndex((t) => t.id === id);
  if (at >= 0) orders.list.splice(at, 1);
}
