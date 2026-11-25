// Midnight Ramen Rush — boot and game loop. One job: start the world,
// run it on a fixed timestep, drain its sound events, and draw it.
// Also exposes window.__game, the handle the headless playtest drives
// (autopilot win/loss runs and the staged screenshots).
import { W, H, STEP } from './config.js';
import { createWorld, stepWorld, nearestStation, autoplayInput, startShift } from './world.js';
import { render } from './render.js';
import { bindInput, createInput, endStepInput } from './input.js';
import { ensureAudio, playEvent, setMuted, isMuted } from './audio.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed') || '') || (shot ? 7 : (Date.now() % 100000));

const canvas = document.getElementById('game');
canvas.width = W;
canvas.height = H;
const ctx = canvas.getContext('2d');

const world = createWorld(seed);
const input = createInput();
let muted = false;

const hooks = {
  onMute() {
    muted = !muted;
    setMuted(muted);
  },
  getState() {
    return world;
  },
  onGesture() {
    ensureAudio();
  },
};
bindInput(canvas, input, hooks);
window.addEventListener('keydown', () => ensureAudio(), { once: true });

if (shot) stageShot(shot, world);

let last = performance.now();
let acc = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  acc += dt;
  let guard = 0;
  while (acc >= STEP && guard < 5) {
    acc -= STEP;
    guard += 1;
    stepWorld(world, input, STEP);
    endStepInput(input);
  }
  // Drain sound events.
  for (const e of world.events.splice(0)) playEvent(e);
  render(ctx, world, world.screen === 'play' ? nearestStation(world) : null);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/** The playtest handle: state, stepping, autopilot, staging. */
window.__game = {
  get state() {
    return world;
  },
  get input() {
    return input;
  },
  start() {
    startShift(world);
  },
  stage(name) {
    return stageShot(name, world);
  },
  auto() {
    return autoplayInput(world);
  },
  snapshot() {
    return {
      screen: world.screen,
      coins: world.coins,
      served: world.served,
      missed: world.missed,
      hearts: world.hearts,
      timeLeft: Math.round(world.timeLeft),
      orders: world.orders.list.length,
      muted: isMuted(),
    };
  },
};
