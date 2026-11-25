// Seeded random numbers (mulberry32). One job: every die roll in the
// game comes from here, so a seed always replays the same shift — the
// screenshots and the headless balance sim both depend on it.
/** A seeded PRNG: returns a function yielding [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** An integer in [min, max] from `rng`. */
export function randInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

/** One element of `arr`, uniformly, from `rng`. */
export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

/** A shuffled copy of `arr` (Fisher–Yates) from `rng`. */
export function shuffled(rng, arr) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
