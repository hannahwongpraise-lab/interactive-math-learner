export const COLORS = {
  bg: '#131313',
  grid: '#232323',
  axis: '#4a4a44',
  text: '#f4f4f0',
  muted: '#a3a39a',
  yellow: '#ffd400',
  yellowDim: 'rgba(255, 212, 0, 0.18)',
  yellowFaint: 'rgba(255, 212, 0, 0.08)',
  white: '#f4f4f0',
  black: '#0a0a0a',
};

export const FONT = '600 13px Inter, system-ui, sans-serif';
export const MONO = '600 13px ui-monospace, Menlo, Consolas, monospace';

/**
 * Keeps a canvas sized to its CSS box at device-pixel resolution and calls
 * `onResize` whenever that box changes. Drawing code works in CSS pixels.
 */
export function fitCanvas(canvas, onResize) {
  const ctx = canvas.getContext('2d');
  const state = { ctx, width: 0, height: 0 };

  const resize = (notify = true) => {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    state.width = rect.width;
    state.height = rect.height;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (notify) onResize?.(state);
  };

  // The observer fires once on observe(), so the first onResize arrives
  // after the caller has finished wiring up its state.
  new ResizeObserver(() => resize()).observe(canvas);
  resize(false);
  return state;
}

/** Pointer position in CSS pixels relative to the canvas. */
export function pointerPos(canvas, e) {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

/**
 * Wires pointer drag handling. `hitTest(pos)` returns truthy when a drag may
 * start at pos; `onDrag(pos)` is called while dragging.
 */
export function makeDraggable(canvas, { hitTest, onDrag, onStart, onEnd }) {
  let active = null;

  canvas.addEventListener('pointerdown', (e) => {
    const pos = pointerPos(canvas, e);
    const hit = hitTest(pos);
    if (!hit) return;
    active = hit;
    canvas.setPointerCapture(e.pointerId);
    onStart?.(hit, pos);
    onDrag(pos, hit);
    e.preventDefault();
  });

  canvas.addEventListener('pointermove', (e) => {
    const pos = pointerPos(canvas, e);
    if (active) {
      onDrag(pos, active);
    } else {
      canvas.style.cursor = hitTest(pos) ? 'grab' : 'default';
    }
  });

  const end = () => {
    if (!active) return;
    onEnd?.(active);
    active = null;
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
}

/** Runs `tick(dt)` each frame while the canvas is on screen. */
export function animationLoop(canvas, tick) {
  let last = 0;
  let visible = true;
  let raf = 0;

  const frame = (t) => {
    const dt = last ? Math.min((t - last) / 1000, 0.05) : 0;
    last = t;
    tick(dt);
    raf = visible ? requestAnimationFrame(frame) : 0;
  };

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !raf) {
      last = 0;
      raf = requestAnimationFrame(frame);
    }
  }).observe(canvas);

  raf = requestAnimationFrame(frame);
}

export function handle(ctx, x, y, r = 9) {
  ctx.beginPath();
  ctx.arc(x, y, r + 5, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.yellowDim;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.yellow;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = COLORS.black;
  ctx.stroke();
}

export function label(ctx, text, x, y, { color = COLORS.text, font = FONT, align = 'center', baseline = 'middle' } = {}) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillText(text, x, y);
}

export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
