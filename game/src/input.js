// Input: keyboard and mouse. One job: turn key presses and clicks into
// the input object the world steps with — including edge detection for
// interact, pause, mute and restart, and click-to-move with ticket select.
import { ORDER_BOARD } from './config.js';

/** The live input object the world reads each step. */
export function createInput() {
  return {
    up: false, down: false, left: false, right: false,
    interact: false, interactStation: null, restart: false, pause: false,
    click: null, selectTicket: null,
    _interactEdge: false, _pauseEdge: false,
  };
}

const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  KeyE: 'interact', Space: 'interact', Enter: 'interact',
  KeyR: 'restart', KeyP: 'pause', KeyM: 'mute',
};

/**
 * Wire keyboard + mouse on `canvas`. `hooks` carries {onMute, getState}
 * so M can flip the sound and a click can select a ticket.
 */
export function bindInput(canvas, input, hooks) {
  const down = new Set();
  window.addEventListener('keydown', (e) => {
    const action = KEYMAP[e.code];
    if (!action) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    down.add(e.code);
    if (action === 'interact') { input.interact = true; input._interactEdge = true; }
    else if (action === 'restart') input.restart = true;
    else if (action === 'pause') { input.pause = true; input._pauseEdge = true; }
    else if (action === 'mute') hooks.onMute();
    else input[action] = true;
  });
  window.addEventListener('keyup', (e) => {
    const action = KEYMAP[e.code];
    if (!action) return;
    down.delete(e.code);
    if (action === 'interact') input.interact = false;
    else if (action === 'restart') input.restart = false;
    else if (action === 'pause') input.pause = false;
    else if (action !== 'mute') input[action] = false;
  });
  window.addEventListener('blur', () => {
    down.clear();
    input.up = input.down = input.left = input.right = false;
    input.interact = false;
  });
  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const state = hooks.getState();
    // A click on a ticket selects it (serve prefers the selected ticket).
    if (state && state.screen === 'play') {
      const b = ORDER_BOARD;
      for (let i = 0; i < state.orders.list.length; i += 1) {
        const ty = b.y + i * (b.h + b.gap);
        if (x >= b.x && x <= b.x + b.w && y >= ty && y <= ty + b.h) {
          input.selectTicket = state.orders.list[i].id;
          return;
        }
      }
    }
    input.click = { x, y };
    hooks.onGesture();
  });
}

/** Clear one-shot flags after the world consumed them. */
export function endStepInput(input) {
  input.click = null;
  input.selectTicket = null;
  input.interactStation = null;
  input.restart = false;
  input.pause = false;
  input._interactEdge = false;
  input._pauseEdge = false;
}
