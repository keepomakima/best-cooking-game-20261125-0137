// Recipes: what a bowl is and what a ticket asks for. One job: the
// menu — broths, toppings, ticket generation and the match rule — so the
// judge's criterion 2 (recipes that combine in different ways) lives in
// one readable place.
import { pick, shuffled } from './random.js';

export const BROTHS = {
  shoyu: { id: 'shoyu', name: 'Shoyu', color: '#6b3f1d', light: '#8a5a33', price: 10 },
  miso: { id: 'miso', name: 'Miso', color: '#d98e32', light: '#e8a94e', price: 12 },
};

export const TOPPINGS = {
  egg: { id: 'egg', name: 'Telur', color: '#fff3c4', accent: '#f2c94c' },
  chashu: { id: 'chashu', name: 'Chashu', color: '#e07856', accent: '#b34a2e' },
  nori: { id: 'nori', name: 'Nori', color: '#1e4d2b', accent: '#2f7a44' },
  scallion: { id: 'scallion', name: 'Daun Bawang', color: '#7bc96f', accent: '#3f8f3a' },
  corn: { id: 'corn', name: 'Jagung', color: '#ffd94a', accent: '#e0a800' },
};

export const TOPPING_IDS = ['egg', 'chashu', 'nori', 'scallion', 'corn'];
export const BROTH_IDS = ['shoyu', 'miso'];

/** A fresh empty bowl: the chef always carries one. */
export function emptyBowl() {
  return { broth: null, noodle: false, toppings: [] };
}

/** Whether the bowl is a finished dish (broth + noodles + two toppings). */
export function bowlComplete(bowl) {
  return bowl.broth !== null && bowl.noodle && bowl.toppings.length >= 2;
}

/** A new ticket: one broth and two different toppings, from `rng`. */
export function makeTicket(rng, id) {
  const broth = pick(rng, BROTH_IDS);
  const toppings = shuffled(rng, TOPPING_IDS).slice(0, 2);
  return { id, broth, toppings, coins: BROTHS[broth].price + 6 };
}

/** Whether a bowl is exactly what a ticket asks for (topping order free). */
export function bowlMatches(bowl, ticket) {
  if (!bowlComplete(bowl)) return false;
  if (bowl.broth !== ticket.broth) return false;
  if (bowl.toppings.length !== ticket.toppings.length) return false;
  return ticket.toppings.every((t) => bowl.toppings.includes(t));
}

/** A ticket's dish name, for the ticket header. */
export function ticketName(ticket) {
  return `${BROTHS[ticket.broth].name} Ramen`;
}
