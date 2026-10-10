import { COLORS, MONO, fitCanvas, makeDraggable, animationLoop, handle, label, prefersReducedMotion } from '../lib/canvas.js';

const TAU = Math.PI * 2;
const SECONDS_PER_TURN = 8;

export function initUnitCircle() {
  const circleCanvas = document.getElementById('uc-circle');
  const waveCanvas = document.getElementById('uc-wave');
  const $ = (id) => document.getElementById(id);
  const playBtn = $('uc-play');
  const angleInput = $('uc-angle');
  const speedInput = $('uc-speed');
  const sinToggle = $('uc-sin');
  const cosToggle = $('uc-cos');

  const state = {
    theta: Math.PI / 6,
    playing: !prefersReducedMotion(),
    speed: 1,
    showSin: true,
    showCos: true,
  };

  const circle = fitCanvas(circleCanvas, () => draw());
  const wave = fitCanvas(waveCanvas, () => draw());

  const circleGeom = () => {
    const { width: w, height: h } = circle;
    return { cx: w / 2, cy: h / 2, r: Math.min(w, h) * 0.34 };
  };
  const waveGeom = () => {
    const { width: w, height: h } = wave;
    const pad = 36;
    return { x0: pad, x1: w - 20, cy: h / 2, r: Math.min(Math.min(circle.width, circle.height), h) * 0.34 };
  };

  function drawCircle() {
    const { ctx, width: w, height: h } = circle;
    const { cx, cy, r } = circleGeom();
    const c = Math.cos(state.theta);
    const s = Math.sin(state.theta);
    const px = cx + r * c;
    const py = cy - r * s;

    ctx.clearRect(0, 0, w, h);

    // axes
    ctx.strokeStyle = COLORS.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - r - 30, cy); ctx.lineTo(cx + r + 30, cy);
    ctx.moveTo(cx, cy - r - 30); ctx.lineTo(cx, cy + r + 30);
    ctx.stroke();
    label(ctx, '1', cx + r + 8, cy + 12, { color: COLORS.muted, font: MONO });
    label(ctx, '−1', cx - r - 12, cy + 12, { color: COLORS.muted, font: MONO });
    label(ctx, '1', cx - 10, cy - r - 8, { color: COLORS.muted, font: MONO });

    // circle
    ctx.strokeStyle = '#3a3a35';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.stroke();

    // swept sector
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, 0, -state.theta, true);
    ctx.closePath();
    ctx.fillStyle = COLORS.yellowFaint;
    ctx.fill();

    // angle arc
    ctx.beginPath();
    ctx.arc(cx, cy, 26, 0, -state.theta, true);
    ctx.strokeStyle = COLORS.yellow;
    ctx.lineWidth = 2;
    ctx.stroke();
    const mid = state.theta / 2;
    label(ctx, 'θ', cx + 42 * Math.cos(mid), cy - 42 * Math.sin(mid), { color: COLORS.yellow });

    // radius
    ctx.strokeStyle = COLORS.muted;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy); ctx.lineTo(px, py);
    ctx.stroke();

    // cos (horizontal) and sin (vertical) legs
    if (state.showCos) {
      ctx.strokeStyle = COLORS.white;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx, cy); ctx.lineTo(px, cy);
      ctx.stroke();
      label(ctx, `cos ${c.toFixed(2)}`, (cx + px) / 2, cy + (s >= 0 ? 16 : -16), { color: COLORS.white, font: MONO });
    }
    if (state.showSin) {
      ctx.strokeStyle = COLORS.yellow;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(px, cy); ctx.lineTo(px, py);
      ctx.stroke();
      label(ctx, `sin ${s.toFixed(2)}`, px + (c >= 0 ? 10 : -10), (cy + py) / 2, {
        color: COLORS.yellow, font: MONO, align: c >= 0 ? 'left' : 'right',
      });

      // guide line to the wave panel
      ctx.setLineDash([4, 5]);
      ctx.strokeStyle = 'rgba(255, 212, 0, 0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px, py); ctx.lineTo(w, py);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    handle(ctx, px, py);
  }

  function drawWave() {
    const { ctx, width: w, height: h } = wave;
    const { x0, x1, cy, r } = waveGeom();
    const xOf = (t) => x0 + (t / TAU) * (x1 - x0);

    ctx.clearRect(0, 0, w, h);

    // grid lines at quarter turns
    ctx.lineWidth = 1;
    const ticks = [[0, '0'], [Math.PI / 2, 'π/2'], [Math.PI, 'π'], [1.5 * Math.PI, '3π/2'], [TAU, '2π']];
    for (const [t, text] of ticks) {
      const x = xOf(t);
      ctx.strokeStyle = COLORS.grid;
      ctx.beginPath(); ctx.moveTo(x, cy - r - 20); ctx.lineTo(x, cy + r + 20); ctx.stroke();
      label(ctx, text, x, cy + r + 34, { color: COLORS.muted, font: MONO });
    }
    for (const v of [-1, 1]) {
      ctx.strokeStyle = COLORS.grid;
      ctx.beginPath(); ctx.moveTo(x0, cy - v * r); ctx.lineTo(x1, cy - v * r); ctx.stroke();
      label(ctx, String(v), x0 - 10, cy - v * r, { color: COLORS.muted, font: MONO, align: 'right' });
    }
    ctx.strokeStyle = COLORS.axis;
    ctx.beginPath(); ctx.moveTo(x0, cy); ctx.lineTo(x1, cy); ctx.stroke();

    const curve = (fn, color, upTo, width) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      const steps = 200;
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * upTo;
        const x = xOf(t);
        const y = cy - fn(t) * r;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    };

    const t = state.theta;
    if (state.showCos) {
      curve(Math.cos, 'rgba(244, 244, 240, 0.15)', TAU, 2);
      curve(Math.cos, COLORS.white, t, 3);
    }
    if (state.showSin) {
      curve(Math.sin, 'rgba(255, 212, 0, 0.18)', TAU, 2);
      curve(Math.sin, COLORS.yellow, t, 3);
    }

    // current θ marker
    const x = xOf(t);
    ctx.setLineDash([4, 5]);
    ctx.strokeStyle = COLORS.muted;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, cy - r - 20); ctx.lineTo(x, cy + r + 20); ctx.stroke();
    ctx.setLineDash([]);

    if (state.showSin) {
      ctx.setLineDash([4, 5]);
      ctx.strokeStyle = 'rgba(255, 212, 0, 0.45)';
      ctx.beginPath(); ctx.moveTo(0, cy - Math.sin(t) * r); ctx.lineTo(x, cy - Math.sin(t) * r); ctx.stroke();
      ctx.setLineDash([]);
      handle(ctx, x, cy - Math.sin(t) * r, 7);
    }
    if (state.showCos) {
      ctx.beginPath();
      ctx.arc(x, cy - Math.cos(t) * r, 6, 0, TAU);
      ctx.fillStyle = COLORS.white;
      ctx.fill();
    }

    label(ctx, 'y = sin θ', x0, 22, { color: COLORS.yellow, font: MONO, align: 'left' });
    label(ctx, 'y = cos θ', x0 + 90, 22, { color: COLORS.white, font: MONO, align: 'left' });
  }

  function updateReadout() {
    const deg = (state.theta * 180) / Math.PI;
    const s = Math.sin(state.theta);
    const c = Math.cos(state.theta);
    angleInput.value = Math.round(deg) % 361;
    $('uc-angle-out').textContent = `${Math.round(deg)}°`;
    $('uc-rad').textContent = state.theta.toFixed(3);
    $('uc-sinv').textContent = s.toFixed(3);
    $('uc-cosv').textContent = c.toFixed(3);
    $('uc-id').textContent = (s * s + c * c).toFixed(3);
  }

  function draw() {
    drawCircle();
    drawWave();
    updateReadout();
  }

  function setPlaying(playing) {
    state.playing = playing;
    playBtn.textContent = playing ? 'Pause' : 'Play';
  }

  const normalize = (t) => ((t % TAU) + TAU) % TAU;

  // --- interaction ---
  makeDraggable(circleCanvas, {
    hitTest: (p) => {
      const { cx, cy, r } = circleGeom();
      const d = Math.hypot(p.x - cx, p.y - cy);
      return d > r * 0.25 && d < r + 30;
    },
    onStart: () => setPlaying(false),
    onDrag: (p) => {
      const { cx, cy } = circleGeom();
      state.theta = normalize(Math.atan2(cy - p.y, p.x - cx));
      draw();
    },
  });

  makeDraggable(waveCanvas, {
    hitTest: (p) => {
      const { x0, x1 } = waveGeom();
      return p.x >= x0 - 10 && p.x <= x1 + 10;
    },
    onStart: () => setPlaying(false),
    onDrag: (p) => {
      const { x0, x1 } = waveGeom();
      const f = Math.min(Math.max((p.x - x0) / (x1 - x0), 0), 0.9999);
      state.theta = f * TAU;
      draw();
    },
  });

  playBtn.addEventListener('click', () => setPlaying(!state.playing));
  angleInput.addEventListener('input', () => {
    setPlaying(false);
    state.theta = normalize((Number(angleInput.value) * Math.PI) / 180);
    draw();
  });
  speedInput.addEventListener('input', () => {
    state.speed = Number(speedInput.value);
    $('uc-speed-out').textContent = `${state.speed}×`;
  });
  sinToggle.addEventListener('change', () => { state.showSin = sinToggle.checked; draw(); });
  cosToggle.addEventListener('change', () => { state.showCos = cosToggle.checked; draw(); });

  setPlaying(state.playing);
  draw();

  animationLoop(circleCanvas, (dt) => {
    if (!state.playing) return;
    state.theta = normalize(state.theta + (TAU / SECONDS_PER_TURN) * state.speed * dt);
    draw();
  });
}
