import { COLORS, MONO, fitCanvas, makeDraggable, animationLoop, handle, label } from '../lib/canvas.js';

const X_RANGE = 10; // world units visible either side of the y-axis
const LIMITS = { a: [-3, 3], h: [-6, 6], k: [-6, 6] };
const PRESETS = [
  { a: 1, h: 0, k: 0 },
  { a: -1, h: 0, k: 4 },
  { a: 0.3, h: -3, k: -2 },
  { a: 2, h: 2.5, k: -4 },
  { a: -0.5, h: 3, k: 2 },
  { a: 1, h: -2, k: 1 },
];
const TWEEN_SECONDS = 1.6;

const clamp = (v, [lo, hi]) => Math.min(hi, Math.max(lo, v));
const round1 = (v) => Math.round(v * 10) / 10;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function fmt(n, digits = 2) {
  const v = Math.abs(n) < 1e-9 ? 0 : n;
  return Number(v.toFixed(digits)).toString();
}

// Leading coefficient: 1 → "", −1 → "−".
function coef(n, digits = 2) {
  const r = Number(n.toFixed(digits));
  if (r === 1) return '';
  if (r === -1) return '−';
  return r < 0 ? `−${fmt(-r, digits)}` : fmt(r, digits);
}

function signed(n, digits = 2) {
  return n < 0 ? ` − ${fmt(-n, digits)}` : ` + ${fmt(n, digits)}`;
}

export function initQuadratic() {
  const canvas = document.getElementById('quad-canvas');
  const $ = (id) => document.getElementById(id);
  const inputs = { a: $('quad-a'), h: $('quad-h'), k: $('quad-k') };
  const animateBtn = $('quad-animate');

  const state = { a: 1, h: 0, k: 0 };
  let tween = null; // { from, to, t, index }

  const view = fitCanvas(canvas, () => draw());

  const geom = () => {
    const { width: w, height: h } = view;
    const unit = w / (2 * X_RANGE);
    return {
      unit,
      toPx: (x, y) => [w / 2 + x * unit, h / 2 - y * unit],
      toWorld: (px, py) => [(px - w / 2) / unit, (h / 2 - py) / unit],
    };
  };

  const f = (x) => state.a * (x - state.h) ** 2 + state.k;

  function roots() {
    const { a, h, k } = state;
    if (Math.abs(a) < 1e-9) return Math.abs(k) < 1e-9 ? null : [];
    const q = -k / a;
    if (q < -1e-9) return [];
    if (Math.abs(q) < 1e-9) return [h];
    const r = Math.sqrt(q);
    return [h - r, h + r];
  }

  function drawGrid(ctx, w, h, unit, toPx) {
    const yRange = h / 2 / unit;
    ctx.lineWidth = 1;
    for (let x = -Math.floor(X_RANGE); x <= X_RANGE; x++) {
      const [px] = toPx(x, 0);
      ctx.strokeStyle = x === 0 ? COLORS.axis : COLORS.grid;
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, h); ctx.stroke();
      if (x !== 0 && x % 2 === 0) label(ctx, String(x), px, h / 2 + 14, { color: COLORS.muted, font: MONO });
    }
    for (let y = -Math.floor(yRange); y <= yRange; y++) {
      const [, py] = toPx(0, y);
      ctx.strokeStyle = y === 0 ? COLORS.axis : COLORS.grid;
      ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(w, py); ctx.stroke();
      if (y !== 0 && y % 2 === 0) label(ctx, String(y), w / 2 - 8, py, { color: COLORS.muted, font: MONO, align: 'right' });
    }
  }

  function plot(ctx, fn, w, toPx, unit) {
    ctx.beginPath();
    let started = false;
    for (let px = 0; px <= w; px += 2) {
      const x = (px - w / 2) / unit;
      const [, py] = toPx(x, fn(x));
      if (py < -2000 || py > 4000) { started = false; continue; }
      started ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      started = true;
    }
    ctx.stroke();
  }

  function draw() {
    const { ctx, width: w, height: h } = view;
    const { unit, toPx } = geom();
    ctx.clearRect(0, 0, w, h);
    drawGrid(ctx, w, h, unit, toPx);

    // reference parabola y = x²
    ctx.strokeStyle = 'rgba(244, 244, 240, 0.18)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    plot(ctx, (x) => x * x, w, toPx, unit);
    ctx.setLineDash([]);

    // axis of symmetry
    const [vx, vy] = toPx(state.h, state.k);
    ctx.strokeStyle = 'rgba(255, 212, 0, 0.35)';
    ctx.setLineDash([3, 6]);
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(vx, 0); ctx.lineTo(vx, h); ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, `x = ${fmt(state.h, 1)}`, vx + 6, 16, { color: COLORS.yellow, font: MONO, align: 'left' });

    // the parabola, with a soft glow
    ctx.strokeStyle = COLORS.yellowDim;
    ctx.lineWidth = 10;
    plot(ctx, f, w, toPx, unit);
    ctx.strokeStyle = COLORS.yellow;
    ctx.lineWidth = 3;
    plot(ctx, f, w, toPx, unit);

    // roots
    for (const r of roots() ?? []) {
      const [rx, ry] = toPx(r, 0);
      ctx.beginPath();
      ctx.arc(rx, ry, 7, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.black;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = COLORS.white;
      ctx.stroke();
      label(ctx, fmt(r), rx, ry + (state.a > 0 ? 20 : -20), { color: COLORS.white, font: MONO });
    }

    // y-intercept
    const [ix, iy] = toPx(0, f(0));
    if (iy > 0 && iy < h) {
      ctx.beginPath();
      ctx.arc(ix, iy, 4, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.white;
      ctx.fill();
    }

    // "a" handle: one step right of the vertex the curve rises by exactly a
    const [ax, ay] = toPx(state.h + 1, state.k + state.a);
    ctx.strokeStyle = COLORS.muted;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(vx, vy); ctx.lineTo(ax, vy); ctx.lineTo(ax, ay); ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, `a = ${fmt(state.a, 1)}`, ax + 12, (vy + ay) / 2, { color: COLORS.text, font: MONO, align: 'left' });
    handle(ctx, ax, ay, 6);

    handle(ctx, vx, vy, 9);
    label(ctx, `(${fmt(state.h, 1)}, ${fmt(state.k, 1)})`, vx - 12, vy + (state.a >= 0 ? 22 : -22), {
      color: COLORS.yellow, font: MONO, align: 'right',
    });

    updateReadout();
  }

  function updateReadout() {
    const { a, h, k } = state;
    for (const key of ['a', 'h', 'k']) {
      inputs[key].value = state[key];
      $(`quad-${key}-out`).textContent = state[key].toFixed(1);
    }

    const hPart = Math.abs(h) < 0.05 ? 'x' : `(x${signed(-h, 1)})`;
    $('quad-eq').textContent = `y = ${coef(a, 1)}${hPart}²${Math.abs(k) < 0.05 ? '' : signed(k, 1)}`;

    const b = -2 * a * h;
    const c = a * h * h + k;
    let std = Math.abs(a) < 1e-9 ? '' : `${coef(a)}x²`;
    if (Math.abs(b) > 1e-9) std += `${signed(b)}x`;
    if (Math.abs(c) > 1e-9) std += signed(c);
    if (!std) std = fmt(c);
    std = std.replace(/^ \+ /, '').replace(/^ − /, '−');
    $('quad-std').textContent = std;
    $('quad-vertex').textContent = `(${fmt(h, 1)}, ${fmt(k, 1)})`;

    const disc = b * b - 4 * a * c;
    $('quad-disc').textContent = fmt(disc);

    const r = roots();
    let text;
    if (r === null) text = 'every x';
    else if (r.length === 0) text = 'none (real)';
    else if (r.length === 1) text = `x = ${fmt(r[0])}`;
    else text = `x = ${fmt(r[0])}, ${fmt(r[1])}`;
    $('quad-roots').textContent = text;
  }

  function stopTween() {
    tween = null;
    animateBtn.textContent = 'Animate';
  }

  function startTween(index) {
    const to = PRESETS[index % PRESETS.length];
    tween = { from: { ...state }, to, t: 0, index };
    animateBtn.textContent = 'Stop';
  }

  // --- interaction ---
  makeDraggable(canvas, {
    hitTest: (p) => {
      const { toPx } = geom();
      const [vx, vy] = toPx(state.h, state.k);
      if (Math.hypot(p.x - vx, p.y - vy) < 20) return 'vertex';
      const [ax, ay] = toPx(state.h + 1, state.k + state.a);
      if (Math.hypot(p.x - ax, p.y - ay) < 16) return 'a';
      return null;
    },
    onStart: stopTween,
    onDrag: (p, which) => {
      const [x, y] = geom().toWorld(p.x, p.y);
      if (which === 'vertex') {
        state.h = clamp(round1(x), LIMITS.h);
        state.k = clamp(round1(y), LIMITS.k);
      } else {
        state.a = clamp(round1(y - state.k), LIMITS.a);
      }
      draw();
    },
  });

  for (const key of ['a', 'h', 'k']) {
    inputs[key].addEventListener('input', () => {
      stopTween();
      state[key] = Number(inputs[key].value);
      draw();
    });
  }

  animateBtn.addEventListener('click', () => {
    if (tween) stopTween();
    else startTween(1);
  });

  $('quad-reset').addEventListener('click', () => {
    stopTween();
    Object.assign(state, PRESETS[0]);
    draw();
  });

  animationLoop(canvas, (dt) => {
    if (!tween) return;
    tween.t = Math.min(1, tween.t + dt / TWEEN_SECONDS);
    const e = ease(tween.t);
    for (const key of ['a', 'h', 'k']) {
      state[key] = tween.from[key] + (tween.to[key] - tween.from[key]) * e;
    }
    if (tween.t >= 1) startTween(tween.index + 1);
    draw();
  });

  draw();
}
