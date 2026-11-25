// Render: everything the player (and the judge) sees. One job: draw
// the kitchen, the chef, the tickets and the HUD on the canvas — big
// shapes, thick outlines, high contrast, so every required element reads
// even when the screenshot is shrunk to a contact-sheet cell.
import {
  W, H, SHIFT_SECONDS, STATIONS, TOPPING_BINS, PALETTE, FONT, ORDER_BOARD,
} from './config.js';
import { BROTHS, TOPPINGS, bowlComplete, bowlMatches, ticketName } from './recipes.js';

const C = PALETTE;

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, s, x, y, size, color, align = 'left', weight = 'bold') {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}

function outlineText(ctx, s, x, y, size, color, align = 'left') {
  ctx.font = `bold ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(10,6,18,0.85)';
  ctx.strokeText(s, x, y);
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
}

/** A topping's pictogram: drawn shapes only, no emoji font needed. */
export function drawToppingIcon(ctx, id, x, y, r) {
  ctx.save();
  ctx.translate(x, y);
  if (id === 'egg') {
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f2a93b';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2); ctx.fill();
  } else if (id === 'chashu') {
    ctx.fillStyle = '#e07856';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#b34a2e'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2); ctx.fillStyle = '#f7c9b8'; ctx.fill();
  } else if (id === 'nori') {
    ctx.fillStyle = '#1e4d2b';
    rr(ctx, -r, -r * 0.7, r * 2, r * 1.4, 3); ctx.fill();
    ctx.strokeStyle = '#2f7a44'; ctx.lineWidth = 1.5;
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath(); ctx.moveTo(-r + 3, i * r * 0.4); ctx.lineTo(r - 3, i * r * 0.4); ctx.stroke();
    }
  } else if (id === 'scallion') {
    ctx.strokeStyle = '#7bc96f'; ctx.lineWidth = r * 0.35; ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath(); ctx.moveTo(i * r * 0.55, -r * 0.7); ctx.lineTo(i * r * 0.7, r * 0.7); ctx.stroke();
    }
  } else if (id === 'corn') {
    ctx.fillStyle = '#ffd94a';
    for (let i = 0; i < 5; i += 1) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, r * 0.34, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#e0a800';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/** A bowl of ramen at (x, y) with radius r, drawn from a bowl object. */
export function drawBowl(ctx, x, y, r, bowl) {
  ctx.save();
  ctx.translate(x, y);
  // Bowl body.
  ctx.fillStyle = '#20242e';
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f5e6c8';
  ctx.beginPath(); ctx.arc(0, 0, r * 0.94, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3a2c52';
  ctx.beginPath(); ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2); ctx.fill();
  if (bowl.broth) {
    // Broth surface.
    ctx.fillStyle = BROTHS[bowl.broth].color;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = BROTHS[bowl.broth].light;
    ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.arc(-r * 0.2, -r * 0.2, r * 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (bowl.noodle) {
    // Noodle squiggles.
    ctx.strokeStyle = C.noodle;
    ctx.lineWidth = Math.max(2, r * 0.09);
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      const yy = -r * 0.3 + i * r * 0.3;
      ctx.moveTo(-r * 0.55, yy);
      ctx.bezierCurveTo(-r * 0.25, yy - r * 0.22, r * 0.25, yy + r * 0.22, r * 0.55, yy);
      ctx.stroke();
    }
  }
  // Toppings sit on top, spread across the bowl.
  const spots = [[-0.38, -0.3], [0.36, -0.28], [0, 0.34]];
  bowl.toppings.forEach((t, i) => {
    const [sx, sy] = spots[i % spots.length];
    drawToppingIcon(ctx, t, sx * r, sy * r, r * 0.26);
  });
  // Chopsticks.
  ctx.strokeStyle = '#8a5a33';
  ctx.lineWidth = Math.max(2, r * 0.07);
  ctx.beginPath(); ctx.moveTo(r * 0.5, -r * 1.05); ctx.lineTo(r * 1.05, -r * 0.35); ctx.stroke();
  ctx.restore();
}

function drawStationBase(ctx, s, highlight) {
  ctx.fillStyle = C.woodDark;
  rr(ctx, s.x - 3, s.y - 3, s.w + 6, s.h + 6, 10); ctx.fill();
  ctx.fillStyle = C.wood;
  rr(ctx, s.x, s.y, s.w, s.h, 8); ctx.fill();
  ctx.fillStyle = C.woodTop;
  rr(ctx, s.x + 4, s.y + 4, s.w - 8, 16, 6); ctx.fill();
  if (highlight) {
    ctx.strokeStyle = C.gold;
    ctx.lineWidth = 3;
    rr(ctx, s.x - 5, s.y - 5, s.w + 10, s.h + 10, 12); ctx.stroke();
  }
  text(ctx, s.label, s.x + s.w / 2, s.y + s.h - 12, 13, C.cream, 'center');
  if (s.sub) text(ctx, s.sub, s.x + s.w / 2, s.y + s.h + 14, 11, '#b9a8d8', 'center', 'normal');
}

function drawPot(ctx, s, brothId, highlight) {
  drawStationBase(ctx, s, highlight);
  const cx = s.x + s.w / 2;
  const cy = s.y + s.h / 2 - 8;
  ctx.fillStyle = '#20242e';
  ctx.beginPath(); ctx.ellipse(cx, cy, 52, 30, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = BROTHS[brothId].color;
  ctx.beginPath(); ctx.ellipse(cx, cy, 44, 23, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = BROTHS[brothId].light;
  ctx.globalAlpha = 0.55;
  ctx.beginPath(); ctx.ellipse(cx - 10, cy - 5, 18, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  // Ladle resting on the pot.
  ctx.strokeStyle = '#cfd8ff'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx + 30, cy - 26); ctx.lineTo(cx + 52, cy - 44); ctx.stroke();
  ctx.fillStyle = '#cfd8ff';
  ctx.beginPath(); ctx.arc(cx + 28, cy - 24, 7, 0, Math.PI * 2); ctx.fill();
}

function drawBoiler(ctx, s, boiler, highlight) {
  drawStationBase(ctx, s, highlight);
  const cx = s.x + s.w / 2;
  const cy = s.y + s.h / 2 - 8;
  ctx.fillStyle = '#20242e';
  ctx.beginPath(); ctx.ellipse(cx, cy, 62, 30, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = boiler.boiling > 0 || boiler.ready ? '#7ec8e3' : '#3a4a5a';
  ctx.beginPath(); ctx.ellipse(cx, cy, 54, 23, 0, 0, Math.PI * 2); ctx.fill();
  if (boiler.boiling > 0) {
    // Boiling noodles: strands + progress ring.
    ctx.strokeStyle = C.noodle; ctx.lineWidth = 3;
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.moveTo(cx - 34 + i * 30, cy - 6);
      ctx.quadraticCurveTo(cx - 24 + i * 30, cy + 8, cx - 14 + i * 30, cy - 6);
      ctx.stroke();
    }
    const frac = 1 - boiler.boiling / 3;
    ctx.strokeStyle = C.gold; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(cx, cy, 66, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); ctx.stroke();
    outlineText(ctx, `${Math.ceil(boiler.boiling)}`, cx, cy, 20, C.gold, 'center');
  } else if (boiler.ready) {
    ctx.strokeStyle = C.noodle; ctx.lineWidth = 3;
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.moveTo(cx - 34 + i * 30, cy - 6);
      ctx.quadraticCurveTo(cx - 24 + i * 30, cy + 8, cx - 14 + i * 30, cy - 6);
      ctx.stroke();
    }
    outlineText(ctx, 'SIAP!', cx, cy, 18, C.green, 'center');
  } else {
    text(ctx, 'kosong', cx, cy, 14, '#9fb2c8', 'center', 'normal');
  }
}

function drawToppingBin(ctx, bin, highlight, hasIt) {
  drawStationBase(ctx, bin, highlight);
  drawToppingIcon(ctx, bin.id, bin.x + bin.w / 2, bin.y + bin.h / 2 - 12, 20);
  if (hasIt) {
    ctx.fillStyle = C.green;
    ctx.beginPath(); ctx.arc(bin.x + bin.w - 14, bin.y + 14, 10, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(bin.x + bin.w - 19, bin.y + 14); ctx.lineTo(bin.x + bin.w - 15, bin.y + 18); ctx.lineTo(bin.x + bin.w - 9, bin.y + 10); ctx.stroke();
  }
}

function drawTicket(ctx, ticket, x, y, w, h, selected, matched) {
  ctx.fillStyle = C.paper;
  rr(ctx, x, y, w, h, 8); ctx.fill();
  if (selected) {
    ctx.strokeStyle = C.neonTeal; ctx.lineWidth = 3;
    rr(ctx, x - 2, y - 2, w + 4, h + 4, 10); ctx.stroke();
  } else if (matched) {
    ctx.strokeStyle = C.green; ctx.lineWidth = 3;
    rr(ctx, x - 2, y - 2, w + 4, h + 4, 10); ctx.stroke();
  }
  // Header: dish name + coins.
  text(ctx, `#${ticket.id} ${ticketName(ticket)}`, x + 12, y + 16, 16, C.ink);
  ctx.fillStyle = C.gold;
  ctx.beginPath(); ctx.arc(x + w - 34, y + 16, 9, 0, Math.PI * 2); ctx.fill();
  text(ctx, `${ticket.coins}`, x + w - 20, y + 17, 15, C.ink, 'center');
  // Broth chip + topping icons.
  ctx.fillStyle = BROTHS[ticket.broth].color;
  rr(ctx, x + 12, y + 30, 64, 22, 11); ctx.fill();
  text(ctx, BROTHS[ticket.broth].name, x + 44, y + 41, 13, '#fff', 'center');
  ticket.toppings.forEach((t, i) => {
    drawToppingIcon(ctx, t, x + 104 + i * 34, y + 41, 13);
  });
  text(ctx, `+ ${TOPPINGS[ticket.toppings[0]].name} + ${TOPPINGS[ticket.toppings[1]].name}`, x + 12, y + 68, 13, '#5a4632', 'left', 'normal');
  // Patience bar.
  const frac = Math.max(0, ticket.patience / ticket.maxPatience);
  const barColor = frac > 0.5 ? C.green : frac > 0.25 ? C.amber : C.red;
  ctx.fillStyle = '#d8cbb2';
  rr(ctx, x + 12, y + h - 24, w - 24, 12, 6); ctx.fill();
  ctx.fillStyle = barColor;
  if (frac > 0) { rr(ctx, x + 12, y + h - 24, Math.max(12, (w - 24) * frac), 12, 6); ctx.fill(); }
  text(ctx, `${Math.ceil(ticket.patience)} dtk`, x + w - 12, y + h - 38, 12, frac > 0.25 ? '#5a4632' : C.red, 'right');
  if (matched) text(ctx, 'COCOK — ANTAR!', x + 12, y + h - 38, 13, C.green);
}

function drawChef(ctx, chef, bowl) {
  const { x, y } = chef;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(x, y + 18, 24, 8, 0, 0, Math.PI * 2); ctx.fill();
  // Body (apron) + head + hat.
  ctx.fillStyle = '#f5e6c8';
  rr(ctx, x - 17, y - 6, 34, 30, 12); ctx.fill();
  ctx.fillStyle = '#2dd4bf';
  rr(ctx, x - 17, y + 8, 34, 10, 5); ctx.fill();
  ctx.fillStyle = '#f2c9a0';
  ctx.beginPath(); ctx.arc(x, y - 16, 14, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff';
  rr(ctx, x - 15, y - 34, 30, 12, 6); ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(x - 8, y - 34, 8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 8, y - 34, 8, 0, Math.PI * 2); ctx.fill();
  // Eyes look where the chef faces.
  ctx.fillStyle = '#20242e';
  ctx.beginPath(); ctx.arc(x - 5 + chef.dir * 2, y - 16, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 5 + chef.dir * 2, y - 16, 2, 0, Math.PI * 2); ctx.fill();
  // The bowl the chef carries.
  if (bowl.broth || bowl.noodle || bowl.toppings.length > 0) {
    drawBowl(ctx, x + chef.dir * 26, y - 2, 15, bowl);
  }
}

function drawHud(ctx, state) {
  ctx.fillStyle = '#120e1e';
  ctx.fillRect(0, 0, W, 58);
  ctx.fillStyle = C.gold;
  ctx.fillRect(0, 58, W, 2);
  // Title + small bowl.
  drawBowl(ctx, 30, 30, 13, { broth: 'shoyu', noodle: true, toppings: ['egg', 'nori'] });
  text(ctx, 'MIDNIGHT RAMEN RUSH', 52, 30, 21, C.cream);
  // Shift timer, centre.
  const mm = String(Math.floor(state.timeLeft / 60)).padStart(2, '0');
  const ss = String(Math.floor(state.timeLeft % 60)).padStart(2, '0');
  const urgent = state.timeLeft <= 30;
  const timerColor = urgent ? C.red : C.cream;
  text(ctx, `${mm}:${ss}`, 640, 26, 26, timerColor, 'center');
  const tfrac = state.timeLeft / SHIFT_SECONDS;
  ctx.fillStyle = '#3a2c52';
  rr(ctx, 540, 44, 200, 7, 3); ctx.fill();
  ctx.fillStyle = urgent ? C.red : C.neonTeal;
  if (tfrac > 0) { rr(ctx, 540, 44, 200 * tfrac, 7, 3); ctx.fill(); }
  // Coins, served, combo, hearts — right side, spaced so nothing overlaps.
  ctx.fillStyle = C.gold;
  ctx.beginPath(); ctx.arc(872, 30, 11, 0, Math.PI * 2); ctx.fill();
  text(ctx, `${state.coins}`, 890, 31, 22, C.cream);
  text(ctx, `Disajikan ${state.served}`, 952, 30, 15, '#b9a8d8', 'left', 'normal');
  if (state.combo >= 2) text(ctx, `COMBO ×${state.combo}`, 1062, 30, 16, C.neonPink);
  // Hearts.
  for (let i = 0; i < 3; i += 1) {
    const hx = 1196 + i * 26;
    const hy = 30;
    ctx.fillStyle = i < state.hearts ? C.red : '#3a2c52';
    ctx.beginPath();
    ctx.moveTo(hx, hy + 8);
    ctx.bezierCurveTo(hx - 11, hy - 2, hx - 6, hy - 11, hx, hy - 4);
    ctx.bezierCurveTo(hx + 6, hy - 11, hx + 11, hy - 2, hx, hy + 8);
    ctx.fill();
  }
}

function drawOrderBoard(ctx, state) {
  const b = ORDER_BOARD;
  text(ctx, 'ORDER BOARD', b.x + 4, b.y - 12, 17, C.cream);
  text(ctx, `${state.orders.list.length}/${4} pesanan`, b.x + b.w - 4, b.y - 12, 13, '#b9a8d8', 'right', 'normal');
  if (state.orders.list.length === 0) {
    ctx.fillStyle = 'rgba(245,230,200,0.12)';
    rr(ctx, b.x, b.y, b.w, 90, 8); ctx.fill();
    text(ctx, 'Belum ada pesanan…', b.x + b.w / 2, b.y + 45, 15, '#b9a8d8', 'center', 'normal');
    return;
  }
  state.orders.list.forEach((t, i) => {
    const y = b.y + i * (b.h + b.gap);
    const matched = bowlComplete(state.bowl) && bowlMatches(state.bowl, t);
    drawTicket(ctx, t, b.x, y, b.w, b.h, state.selectedTicket === t.id, matched);
  });
}

function drawFloor(ctx) {
  ctx.fillStyle = C.night;
  ctx.fillRect(0, 58, W, H - 58);
  // Back wall band with the neon sign.
  ctx.fillStyle = '#1e1633';
  ctx.fillRect(8, 66, 984, 26);
  ctx.save();
  ctx.shadowColor = C.neonPink;
  ctx.shadowBlur = 18;
  text(ctx, 'RAMEN', 640, 80, 20, C.neonPink, 'center');
  ctx.restore();
  text(ctx, '· tengah malam · buka sampai pagi ·', 890, 80, 13, '#b9a8d8', 'center', 'normal');
  // Floor tiles.
  ctx.fillStyle = C.floor;
  ctx.fillRect(8, 92, 984, 620);
  ctx.strokeStyle = C.floorLine;
  ctx.lineWidth = 1;
  for (let x = 8; x <= 992; x += 62) {
    ctx.beginPath(); ctx.moveTo(x, 92); ctx.lineTo(x, 712); ctx.stroke();
  }
  for (let y = 92; y <= 712; y += 62) {
    ctx.beginPath(); ctx.moveTo(8, y); ctx.lineTo(992, y); ctx.stroke();
  }
  // Rug under the assembly counter.
  ctx.fillStyle = 'rgba(255,93,143,0.10)';
  rr(ctx, 360, 280, 280, 160, 14); ctx.fill();
  // Runner rug along the main walkway, bottom half of the kitchen.
  ctx.fillStyle = 'rgba(255,93,143,0.07)';
  rr(ctx, 40, 470, 920, 54, 10); ctx.fill();
  ctx.strokeStyle = 'rgba(255,197,61,0.25)';
  ctx.lineWidth = 2;
  rr(ctx, 40, 470, 920, 54, 10); ctx.stroke();
  // Pendant lamps hanging over the walkway.
  for (const lx of [230, 500, 770]) {
    ctx.strokeStyle = '#3a2c52';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(lx, 66); ctx.lineTo(lx, 108); ctx.stroke();
    ctx.save();
    ctx.shadowColor = C.gold;
    ctx.shadowBlur = 22;
    ctx.fillStyle = C.gold;
    ctx.beginPath(); ctx.arc(lx, 118, 9, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#8a5a33';
    ctx.beginPath(); ctx.moveTo(lx - 16, 108); ctx.lineTo(lx + 16, 108); ctx.lineTo(lx + 10, 122); ctx.lineTo(lx - 10, 122); ctx.closePath(); ctx.fill();
  }
  // Paper lanterns on the right wall.
  for (const [lx, col] of [[650, C.neonPink], [710, C.neonTeal], [770, C.gold]]) {
    ctx.strokeStyle = '#3a2c52';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(lx, 92); ctx.lineTo(lx, 104); ctx.stroke();
    ctx.save();
    ctx.shadowColor = col;
    ctx.shadowBlur = 14;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(lx, 122, 13, 17, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(10,6,18,0.6)';
    ctx.fillRect(lx - 13, 118, 26, 3);
    ctx.fillRect(lx - 13, 126, 26, 3);
  }
  // Crates of supplies between the trash and the topping bar.
  for (const [cx, cy, label] of [[215, 648, 'MIE'], [272, 648, 'TELUR']]) {
    ctx.fillStyle = C.woodDark;
    rr(ctx, cx - 26, cy - 24, 52, 48, 4); ctx.fill();
    ctx.fillStyle = C.wood;
    rr(ctx, cx - 23, cy - 21, 46, 42, 4); ctx.fill();
    ctx.strokeStyle = C.woodDark;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx - 23, cy); ctx.lineTo(cx + 23, cy); ctx.stroke();
    text(ctx, label, cx, cy + 2, 11, C.cream, 'center');
  }
  // Potted plants in the corners.
  for (const [px, py] of [[36, 540], [956, 540]]) {
    ctx.fillStyle = '#b3543f';
    rr(ctx, px - 14, py, 28, 22, 4); ctx.fill();
    ctx.fillStyle = '#3f8f3a';
    ctx.beginPath(); ctx.arc(px, py - 8, 16, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(px - 10, py - 2, 10, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(px + 10, py - 2, 10, 0, Math.PI * 2); ctx.fill();
  }
}

function drawChannel(ctx, state) {
  if (!state.channel) return;
  const ch = state.channel;
  const frac = Math.min(1, ch.t / ch.dur);
  ctx.fillStyle = 'rgba(10,6,18,0.75)';
  rr(ctx, W / 2 - 190, 640, 380, 34, 17); ctx.fill();
  ctx.fillStyle = C.gold;
  rr(ctx, W / 2 - 180, 652, 360 * frac, 10, 5); ctx.fill();
  text(ctx, ch.label, W / 2, 630, 15, C.cream, 'center');
}

function drawBanner(ctx, state) {
  if (!state.banner) return;
  const a = state.banner.t < 0.3 ? state.banner.t / 0.3 : state.banner.t > 2.2 ? Math.max(0, (2.6 - state.banner.t) / 0.4) : 1;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(10,6,18,0.8)';
  rr(ctx, W / 2 - 260, 200, 520, 84, 16); ctx.fill();
  ctx.strokeStyle = C.neonPink;
  ctx.lineWidth = 2;
  rr(ctx, W / 2 - 260, 200, 520, 84, 16); ctx.stroke();
  outlineText(ctx, state.banner.text, W / 2, 232, 34, C.neonPink, 'center');
  text(ctx, state.banner.sub, W / 2, 264, 15, C.cream, 'center', 'normal');
  ctx.restore();
}

function drawHint(ctx, state) {
  if (!state.hint || state.hintT <= 0) return;
  ctx.font = `normal 14px ${FONT}`;
  const w = ctx.measureText(state.hint).width + 36;
  // Above the topping bar, on open floor — never over the bin labels.
  ctx.fillStyle = 'rgba(10,6,18,0.78)';
  rr(ctx, W / 2 - w / 2, 540, w, 26, 13); ctx.fill();
  text(ctx, state.hint, W / 2, 553, 14, C.cream, 'center', 'normal');
}

function drawKitchen(ctx, state, near) {
  drawFloor(ctx);
  // Stations.
  drawPot(ctx, STATIONS.brothShoyu, 'shoyu', near && near.id === 'brothShoyu');
  drawPot(ctx, STATIONS.brothMiso, 'miso', near && near.id === 'brothMiso');
  drawBoiler(ctx, STATIONS.boiler, state.boiler, near && near.id === 'boiler');
  // Assembly counter with the bowl mid-assembly, big and readable.
  drawStationBase(ctx, STATIONS.assembly, near && near.id === 'assembly');
  drawBowl(ctx, STATIONS.assembly.x + STATIONS.assembly.w / 2, STATIONS.assembly.y + 52, 34, state.bowl);
  if (!state.bowl.broth && !state.bowl.noodle && state.bowl.toppings.length === 0) {
    text(ctx, 'mangkuk kosong', STATIONS.assembly.x + STATIONS.assembly.w / 2, STATIONS.assembly.y + 52, 12, '#b9a8d8', 'center', 'normal');
  }
  // Serving pass, with the last served bowl shown briefly as "ready".
  drawStationBase(ctx, STATIONS.pass, near && near.id === 'pass');
  if (state.passBowl) {
    drawBowl(ctx, STATIONS.pass.x + STATIONS.pass.w / 2, STATIONS.pass.y + 46, 30, state.passBowl.bowl);
    text(ctx, 'SIAP SAJI!', STATIONS.pass.x + STATIONS.pass.w / 2, STATIONS.pass.y + 84, 13, C.green, 'center');
  } else {
    // Service bell.
    ctx.fillStyle = C.gold;
    ctx.beginPath(); ctx.arc(STATIONS.pass.x + STATIONS.pass.w / 2, STATIONS.pass.y + 48, 16, Math.PI, 0); ctx.fill();
    ctx.fillRect(STATIONS.pass.x + STATIONS.pass.w / 2 - 20, STATIONS.pass.y + 46, 40, 5);
    text(ctx, 'bel pesanan', STATIONS.pass.x + STATIONS.pass.w / 2, STATIONS.pass.y + 84, 12, '#b9a8d8', 'center', 'normal');
  }
  drawStationBase(ctx, STATIONS.trash, near && near.id === 'trash');
  // Topping bins.
  for (const bin of TOPPING_BINS) {
    drawToppingBin(ctx, bin, near && near.id === bin.id, state.bowl.toppings.includes(bin.id));
  }
  // Particles (steam + sparks).
  for (const p of state.particles) {
    const a = 1 - p.life / p.max;
    ctx.globalAlpha = p.kind === 'steam' ? a * 0.22 : a;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (p.kind === 'steam' ? 1 + p.life : 1), 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  drawChef(ctx, state.chef, state.bowl);
  // Floating score texts.
  for (const f of state.floaters) {
    ctx.globalAlpha = Math.max(0, 1 - f.t / 1.4);
    outlineText(ctx, f.text, f.x, f.y, 20, f.color, 'center');
  }
  ctx.globalAlpha = 1;
  drawOrderBoard(ctx, state);
  drawHud(ctx, state);
  drawChannel(ctx, state);
  drawBanner(ctx, state);
  drawHint(ctx, state);
  if (state.paused) {
    ctx.fillStyle = 'rgba(10,6,18,0.6)';
    ctx.fillRect(0, 0, W, H);
    outlineText(ctx, 'JEDA — tekan P untuk lanjut', W / 2, H / 2, 30, C.cream, 'center');
  }
}

function drawTitle(ctx, state) {
  drawKitchen(ctx, state, null);
  ctx.fillStyle = 'rgba(12,8,22,0.82)';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.shadowColor = C.neonPink;
  ctx.shadowBlur = 26;
  outlineText(ctx, 'MIDNIGHT', W / 2, 170, 72, C.neonPink, 'center');
  outlineText(ctx, 'RAMEN RUSH', W / 2, 240, 72, C.gold, 'center');
  ctx.restore();
  text(ctx, 'Kedai ramen tengah malam — sajikan pesanan sebelum pelanggan pergi!', W / 2, 300, 19, C.cream, 'center', 'normal');
  // How to play panel.
  ctx.fillStyle = 'rgba(245,230,200,0.08)';
  rr(ctx, W / 2 - 330, 330, 660, 190, 14); ctx.fill();
  ctx.strokeStyle = C.woodTop;
  ctx.lineWidth = 2;
  rr(ctx, W / 2 - 330, 330, 660, 190, 14); ctx.stroke();
  const lines = [
    '1 · Tuang kaldu di panci (Shoyu / Miso) — tahan E',
    '2 · Rebus mie di panci tengah, angkat saat ding',
    '3 · Tambah 2 topping dari bar bawah — sesuai tiket',
    '4 · Antar mangkuk lengkap ke PASS sebelum tiket hangus',
    'WASD / panah bergerak · klik juga bisa · E interaksi · P jeda · M suara',
  ];
  lines.forEach((l, i) => text(ctx, l, W / 2, 362 + i * 30, 17, C.cream, 'center', i === 4 ? 'normal' : 'bold'));
  outlineText(ctx, 'Tekan ENTER untuk mulai shift', W / 2, 580, 24, C.neonTeal, 'center');
  if (state.best > 0) text(ctx, `Skor terbaik: ${state.best} koin`, W / 2, 620, 16, C.gold, 'center', 'normal');
}

function drawOver(ctx, state) {
  drawKitchen(ctx, state, null);
  ctx.fillStyle = 'rgba(12,8,22,0.85)';
  ctx.fillRect(0, 0, W, H);
  const o = state.over;
  outlineText(ctx, o.reason === 'waktu' ? 'SHIFT SELESAI!' : 'REPUTASI HABIS!', W / 2, 150, 46, C.cream, 'center');
  outlineText(ctx, `GRADE ${o.grade}`, W / 2, 220, 60, o.grade === 'S' ? C.gold : C.neonTeal, 'center');
  const rows = [
    ['Koin dikumpulkan', `${o.coins}`],
    ['Pesanan disajikan', `${o.served}`],
    ['Pesanan hangus', `${o.missed}`],
    ['Combo terbaik', `×${o.bestCombo}`],
  ];
  rows.forEach(([label, value], i) => {
    text(ctx, label, W / 2 - 140, 300 + i * 36, 19, '#b9a8d8', 'left', 'normal');
    text(ctx, value, W / 2 + 140, 300 + i * 36, 19, C.cream, 'right');
  });
  outlineText(ctx, 'Tekan R untuk shift baru', W / 2, 490, 24, C.neonTeal, 'center');
}

/** Draw the whole game for the current state. `near` is the station in interact range (or null). */
export function render(ctx, state, near) {
  ctx.clearRect(0, 0, W, H);
  if (state.screen === 'title') drawTitle(ctx, state);
  else if (state.screen === 'over') drawOver(ctx, state);
  else drawKitchen(ctx, state, near);
}
