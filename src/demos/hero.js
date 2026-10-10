import { COLORS, fitCanvas, animationLoop, prefersReducedMotion } from '../lib/canvas.js';

// Three spinning circles stacked end to end trace a looping curve —
// a small taste of how sums of circular motion build complex shapes.
const ARMS = [
  { r: 0.42, speed: 1 },
  { r: 0.2, speed: -3 },
  { r: 0.09, speed: 7 },
];
const TRAIL = 520;

export function initHero() {
  const canvas = document.getElementById('hero-canvas');
  const view = fitCanvas(canvas, () => draw());
  const trail = [];
  let t = 0;

  function tip(time, R, cx, cy) {
    let x = cx, y = cy;
    const joints = [[x, y]];
    for (const arm of ARMS) {
      x += arm.r * R * Math.cos(arm.speed * time);
      y += arm.r * R * Math.sin(arm.speed * time);
      joints.push([x, y]);
    }
    return joints;
  }

  function draw() {
    const { ctx, width: w, height: h } = view;
    const R = Math.min(w, h) * 0.55;
    const cx = w / 2, cy = h / 2;
    ctx.clearRect(0, 0, w, h);

    // dotted backdrop
    ctx.fillStyle = '#262626';
    for (let x = 12; x < w; x += 24) {
      for (let y = 12; y < h; y += 24) ctx.fillRect(x, y, 2, 2);
    }

    // trail of the pen
    if (trail.length > 1) {
      for (let i = 1; i < trail.length; i++) {
        ctx.strokeStyle = `rgba(255, 212, 0, ${(i / trail.length) * 0.95})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx + trail[i - 1][0] * R, cy + trail[i - 1][1] * R);
        ctx.lineTo(cx + trail[i][0] * R, cy + trail[i][1] * R);
        ctx.stroke();
      }
    }

    // arms and circles
    const joints = tip(t, R, cx, cy);
    ctx.lineWidth = 1.5;
    for (let i = 0; i < ARMS.length; i++) {
      const [x, y] = joints[i];
      ctx.strokeStyle = 'rgba(244, 244, 240, 0.18)';
      ctx.beginPath();
      ctx.arc(x, y, ARMS[i].r * R, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(244, 244, 240, 0.7)';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(...joints[i + 1]);
      ctx.stroke();
    }
    const [px, py] = joints[joints.length - 1];
    ctx.beginPath();
    ctx.arc(px, py, 7, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.yellow;
    ctx.fill();
  }

  const step = (dt) => {
    t += dt * 0.6;
    const R = Math.min(view.width, view.height) * 0.55 || 1;
    const [x, y] = tip(t, R, 0, 0).at(-1);
    trail.push([x / R, y / R]);
    if (trail.length > TRAIL) trail.shift();
  };

  if (prefersReducedMotion()) {
    // Draw the finished curve once instead of animating it.
    for (let i = 0; i < TRAIL; i++) step(1 / 60);
    draw();
    return;
  }

  animationLoop(canvas, (dt) => {
    step(dt);
    draw();
  });
}
