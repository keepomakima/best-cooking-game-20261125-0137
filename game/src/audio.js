// Audio: synthesized sound, no audio files. One job: turn game events
// into short WebAudio sounds (sizzle, ding, chop, jingle, buzz) so the
// game answers at once — criterion 3 — without loading anything.
let ctx = null;
let muted = false;

/** Create/resume the audio context on the first user gesture. */
export function ensureAudio() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
  return ctx;
}

export function setMuted(m) {
  muted = m;
}
export function isMuted() {
  return muted;
}

function tone(freq, dur, type = 'sine', gain = 0.12, when = 0) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noise(dur, gain = 0.1, filterFreq = 1200, when = 0) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + when;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = filterFreq;
  const g = ctx.createGain();
  g.gain.value = gain;
  src.connect(filter).connect(g).connect(ctx.destination);
  src.start(t0);
}

/** Play the sound for a game event name (from world.events). */
export function playEvent(name) {
  if (!ctx || muted) return;
  if (name === 'ladle') {
    noise(0.35, 0.1, 900);
    tone(220, 0.25, 'sine', 0.06);
  } else if (name === 'boilStart') {
    noise(0.5, 0.08, 2400);
  } else if (name === 'ding') {
    tone(1175, 0.4, 'sine', 0.14);
    tone(1568, 0.5, 'sine', 0.1, 0.08);
  } else if (name === 'take') {
    tone(330, 0.12, 'triangle', 0.1);
    tone(440, 0.15, 'triangle', 0.1, 0.07);
  } else if (name === 'topping') {
    noise(0.08, 0.14, 3000);
    tone(520, 0.1, 'triangle', 0.08, 0.02);
  } else if (name === 'serve') {
    tone(523, 0.14, 'triangle', 0.12);
    tone(659, 0.14, 'triangle', 0.12, 0.09);
    tone(784, 0.22, 'triangle', 0.12, 0.18);
  } else if (name === 'fail') {
    tone(160, 0.25, 'sawtooth', 0.07);
  } else if (name === 'expire') {
    tone(196, 0.3, 'sawtooth', 0.08);
    tone(147, 0.4, 'sawtooth', 0.08, 0.12);
  } else if (name === 'dump') {
    noise(0.2, 0.08, 500);
  } else if (name === 'wave') {
    tone(392, 0.15, 'square', 0.06);
    tone(523, 0.2, 'square', 0.06, 0.1);
  } else if (name === 'gameover') {
    tone(392, 0.25, 'triangle', 0.1);
    tone(330, 0.25, 'triangle', 0.1, 0.2);
    tone(262, 0.45, 'triangle', 0.1, 0.4);
  } else if (name === 'start') {
    tone(262, 0.12, 'triangle', 0.1);
    tone(392, 0.12, 'triangle', 0.1, 0.08);
    tone(523, 0.2, 'triangle', 0.1, 0.16);
  }
}
