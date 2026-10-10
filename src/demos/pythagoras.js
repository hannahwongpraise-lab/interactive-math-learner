import { COLORS, MONO, FONT, fitCanvas, makeDraggable, animationLoop, handle, label, prefersReducedMotion } from '../lib/canvas.js';

const LIMITS = [1, 12];
const PROOF_SECONDS = 4;
const HOLD_SECONDS = 1.2;

const clamp = (v) => Math.min(LIMITS[1], Math.max(LIMITS[0], v));
const round1 = (v) => Math.round(v * 10) / 10;
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/**
 * Four copies of the triangle inside a square of side a + b. Each pose is a
 * quarter-turn rotation plus a translation of the canonical triangle
 * (0,0)-(a,0)-(0,b). "start" leaves a tilted c² hole in the middle;
 * "end" leaves an a² and a b² hole. Every triangle only translates.
 */
function poses(a, b) {
  const s = a + b;
  return [
    { rot: 0, start: [0, 0], end: [0, a] },
    { rot: 1, start: [s, 0], end: [s, 0] },
    { rot: 2, start: [s, s], end: [a, s] },
    { rot: 3, start: [0, s], end: [a, a] },
  ];
}

// Which slice of the proof timeline each triangle moves in.
const MOVE_WINDOWS = [[0, 0.34], null, [0.33, 0.67], [0.66, 1]];

function rotate([x, y], quarterTurns) {
  switch (quarterTurns % 4) {
    case 1: return [-y, x];
    case 2: return [-x, -y];
    case 3: return [y, -x];
    default: return [x, y];
  }
}

export function initPythagoras() {
  const sqCanvas = document.getElementById('py-squares');
  const proofCanvas = document.getElementById('py-proof');
  const $ = (id) => document.getElementById(id);
  const aInput = $('py-a');
  const bInput = $('py-b');
  const tInput = $('py-t');
  const playBtn = $('py-play');

  const state = { a: 3, b: 4, t: 0, playing: false, dir: 1, hold: 0 };
  let frozenTransform = null; // keep scale fixed while dragging a corner

  const sq = fitCanvas(sqCanvas, () => draw());
  const proof = fitCanvas(proofCanvas, () => draw());

  // ---------- squares-on-sides view ----------
  function sqTransform() {
    if (frozenTransform) return frozenTransform;
    const { a, b } = state;
    const { width: w, height: h } = sq;
    // bounding box of the triangle plus its three squares
    const minX = -b, maxX = a + b, minY = -a, maxY = a + b;
    const pad = 36;
    const unit = Math.min((w - 2 * pad) / (maxX - minX), (h - 2 * pad) / (maxY - minY));
    const ox = (w - (maxX - minX) * unit) / 2 - minX * unit;
    const oy = (h + (maxY - minY) * unit) / 2 + minY * unit;
    return { unit, ox, oy };
  }

  const toPx = ({ unit, ox, oy }, [x, y]) => [ox + x * unit, oy - y * unit];

  function drawSquare(ctx, T, corners, fill, stroke, gridCells) {
    const pts = corners.map((p) => toPx(T, p));
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();

    // unit grid inside the square, in the square's own frame
    if (gridCells) {
      ctx.save();
      ctx.clip();
      const [p0, p1, , p3] = corners;
      const u = [(p1[0] - p0[0]) / gridCells, (p1[1] - p0[1]) / gridCells];
      const v = [(p3[0] - p0[0]) / gridCells, (p3[1] - p0[1]) / gridCells];
      ctx.strokeStyle = 'rgba(10, 10, 10, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 1; i < Math.ceil(gridCells); i++) {
        const a0 = toPx(T, [p0[0] + u[0] * i, p0[1] + u[1] * i]);
        const a1 = toPx(T, [p3[0] + u[0] * i, p3[1] + u[1] * i]);
        const b0 = toPx(T, [p0[0] + v[0] * i, p0[1] + v[1] * i]);
        const b1 = toPx(T, [p1[0] + v[0] * i, p1[1] + v[1] * i]);
        ctx.moveTo(...a0); ctx.lineTo(...a1);
        ctx.moveTo(...b0); ctx.lineTo(...b1);
      }
      ctx.stroke();
      ctx.restore();
    }

    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function drawSquares() {
    const { ctx, width: w, height: h } = sq;
    const { a, b } = state;
    const c = Math.hypot(a, b);
    const T = sqTransform();
    ctx.clearRect(0, 0, w, h);

    const A = [a, 0], B = [0, b], C = [0, 0];
    const sqA = [C, A, [a, -a], [0, -a]];
    const sqB = [B, C, [-b, 0], [-b, b]];
    const sqC = [A, [a + b, a], [b, a + b], B];

    // Cells are unit-sized, so integer legs show countable squares.
    drawSquare(ctx, T, sqA, '#e6c000', COLORS.yellow, a);
    drawSquare(ctx, T, sqB, '#e6c000', COLORS.yellow, b);
    drawSquare(ctx, T, sqC, COLORS.yellow, COLORS.yellow, c);

    // the triangle itself
    const tri = [A, B, C].map((p) => toPx(T, p));
    ctx.beginPath();
    tri.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = COLORS.black;
    ctx.fill();
    ctx.strokeStyle = COLORS.white;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // right-angle marker
    const m = Math.min(14, T.unit * 0.4);
    const [cx, cy] = toPx(T, C);
    ctx.strokeStyle = COLORS.white;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx, cy - m, m, m);

    // area labels
    const centre = (pts) => toPx(T, [pts.reduce((s, p) => s + p[0], 0) / 4, pts.reduce((s, p) => s + p[1], 0) / 4]);
    const boxLabel = (text, [x, y]) => {
      ctx.font = MONO;
      const tw = ctx.measureText(text).width + 12;
      ctx.fillStyle = COLORS.black;
      ctx.fillRect(x - tw / 2, y - 11, tw, 22);
      label(ctx, text, x, y, { color: COLORS.yellow, font: MONO });
    };
    boxLabel(`a² = ${(a * a).toFixed(1)}`, centre(sqA));
    boxLabel(`b² = ${(b * b).toFixed(1)}`, centre(sqB));
    boxLabel(`c² = ${(c * c).toFixed(1)}`, centre(sqC));

    // side labels
    const [ax, ay] = toPx(T, [a / 2, 0]);
    label(ctx, 'a', ax, ay - 12, { color: COLORS.white, font: FONT });
    const [bx, by] = toPx(T, [0, b / 2]);
    label(ctx, 'b', bx + 12, by, { color: COLORS.white, font: FONT });
    // nudge the hypotenuse label into the triangle, towards the right angle
    const [hx, hy] = toPx(T, [a / 2, b / 2]);
    const [rx, ry] = toPx(T, C);
    const d = Math.hypot(rx - hx, ry - hy) || 1;
    label(ctx, 'c', hx + ((rx - hx) / d) * 14, hy + ((ry - hy) / d) * 14, { color: COLORS.white, font: FONT });

    handle(ctx, ...toPx(T, A), 8);
    handle(ctx, ...toPx(T, B), 8);
  }

  // ---------- rearrangement proof view ----------
  function proofTransform() {
    const { width: w, height: h } = proof;
    const s = state.a + state.b;
    const size = Math.min(w, h) - 90;
    const unit = size / s;
    return { unit, ox: (w - size) / 2, oy: (h + size) / 2 + 10 };
  }

  function drawProof() {
    const { ctx, width: w, height: h } = proof;
    const { a, b, t } = state;
    const s = a + b;
    const T = proofTransform();
    ctx.clearRect(0, 0, w, h);

    const [x0, y0] = toPx(T, [0, 0]);
    const size = s * T.unit;

    // The yellow background is whatever area the triangles leave uncovered.
    ctx.fillStyle = COLORS.yellow;
    ctx.fillRect(x0, y0 - size, size, size);

    const canon = [[0, 0], [a, 0], [0, b]];
    poses(a, b).forEach((pose, i) => {
      const win = MOVE_WINDOWS[i];
      const local = win ? Math.min(1, Math.max(0, (t - win[0]) / (win[1] - win[0]))) : 0;
      const e = ease(local);
      const o = [pose.start[0] + (pose.end[0] - pose.start[0]) * e, pose.start[1] + (pose.end[1] - pose.start[1]) * e];
      const pts = canon.map((p) => {
        const [rx, ry] = rotate(p, pose.rot);
        return toPx(T, [rx + o[0], ry + o[1]]);
      });
      ctx.beginPath();
      pts.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.fillStyle = '#1e1e1e';
      ctx.fill();
      ctx.strokeStyle = COLORS.white;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.stroke();
    });

    ctx.strokeStyle = COLORS.white;
    ctx.lineWidth = 2;
    ctx.strokeRect(x0, y0 - size, size, size);

    // labels fade between the two arrangements
    const big = '700 18px ui-monospace, Menlo, Consolas, monospace';
    ctx.globalAlpha = Math.max(0, 1 - t * 4);
    label(ctx, 'c²', ...toPx(T, [s / 2, s / 2]), { color: COLORS.black, font: big });
    ctx.globalAlpha = Math.max(0, (t - 0.75) * 4);
    label(ctx, 'a²', ...toPx(T, [a / 2, a / 2]), { color: COLORS.black, font: big });
    label(ctx, 'b²', ...toPx(T, [a + b / 2, a + b / 2]), { color: COLORS.black, font: big });
    ctx.globalAlpha = 1;

    // side length brace
    label(ctx, 'side = a + b', w / 2, y0 + 22, { color: COLORS.muted, font: MONO });
    const caption = t < 0.02
      ? 'Uncovered area: c²'
      : t > 0.98
        ? 'Same triangles, uncovered area: a² + b²'
        : 'Sliding the triangles…';
    label(ctx, caption, w / 2, 24, { color: COLORS.yellow, font: FONT });
  }

  function updateReadout() {
    const { a, b, t } = state;
    aInput.value = a;
    bInput.value = b;
    tInput.value = t;
    $('py-a-out').textContent = a.toFixed(1);
    $('py-b-out').textContent = b.toFixed(1);
    $('py-t-out').textContent = `${Math.round(t * 100)}%`;
    $('py-a2').textContent = (a * a).toFixed(2);
    $('py-b2').textContent = (b * b).toFixed(2);
    $('py-sum').textContent = (a * a + b * b).toFixed(2);
    const c = Math.hypot(a, b);
    $('py-c').textContent = c.toFixed(2);
    $('py-c2').textContent = (c * c).toFixed(2);
  }

  function draw() {
    drawSquares();
    drawProof();
    updateReadout();
  }

  function setPlaying(playing) {
    state.playing = playing;
    playBtn.textContent = playing ? 'Pause' : 'Play proof';
    if (playing) {
      state.hold = 0;
      if (state.t >= 1) state.dir = -1;
      else if (state.t <= 0) state.dir = 1;
    }
  }

  // --- interaction ---
  makeDraggable(sqCanvas, {
    hitTest: (p) => {
      const T = sqTransform();
      const [ax, ay] = toPx(T, [state.a, 0]);
      if (Math.hypot(p.x - ax, p.y - ay) < 18) return 'a';
      const [bx, by] = toPx(T, [0, state.b]);
      if (Math.hypot(p.x - bx, p.y - by) < 18) return 'b';
      return null;
    },
    onStart: () => { frozenTransform = sqTransform(); },
    onDrag: (p, which) => {
      const T = frozenTransform;
      if (which === 'a') state.a = clamp(round1((p.x - T.ox) / T.unit));
      else state.b = clamp(round1((T.oy - p.y) / T.unit));
      draw();
    },
    onEnd: () => { frozenTransform = null; draw(); },
  });

  aInput.addEventListener('input', () => { state.a = Number(aInput.value); draw(); });
  bInput.addEventListener('input', () => { state.b = Number(bInput.value); draw(); });
  tInput.addEventListener('input', () => { setPlaying(false); state.t = Number(tInput.value); draw(); });
  playBtn.addEventListener('click', () => setPlaying(!state.playing));
  document.querySelectorAll('[data-triple]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const [a, b] = btn.dataset.triple.split(',').map(Number);
      Object.assign(state, { a: Math.min(a, LIMITS[1]), b: Math.min(b, LIMITS[1]) });
      draw();
    });
  });

  animationLoop(proofCanvas, (dt) => {
    if (!state.playing) return;
    if (state.hold > 0) {
      state.hold -= dt;
      return;
    }
    state.t += (state.dir * dt) / PROOF_SECONDS;
    if (state.t >= 1 || state.t <= 0) {
      state.t = Math.min(1, Math.max(0, state.t));
      state.dir *= -1;
      state.hold = HOLD_SECONDS;
    }
    draw();
  });

  draw();
  if (!prefersReducedMotion()) setPlaying(true);
}
