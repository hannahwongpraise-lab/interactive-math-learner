# interactive-math-learner

**MathPlay** — a website that lets students learn math concepts in an interactive way.
Built with [Vite](https://vite.dev) and vanilla JavaScript + `<canvas>`, themed in black and yellow.

## Interactive labs

| Lab | Concept | What you can do |
| --- | --- | --- |
| 01 · The Unit Circle & Sine Waves | Trigonometry | Drag the point around the circle (or along the graph) and watch `sin θ` / `cos θ` trace out waves. Play/pause, change speed, toggle each curve. |
| 02 · Shape-Shifting Parabolas | Quadratics | Drag the vertex and the `a` handle, or use sliders for `y = a(x − h)² + k`. Live standard form, discriminant and roots. "Animate" morphs through presets. |
| 03 · Seeing the Pythagorean Theorem | Geometry | Drag the triangle's corners to resize the squares on each side, then play the rearrangement proof that shows `a² + b² = c²`. |

The landing page hero also has a small animation of stacked spinning circles drawing a curve.

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm run build    # production build into dist/
npm run preview  # serve the production build
```

## Project layout

```
index.html              landing page markup
src/main.js             entry point, starts each animation
src/style.css           black & yellow theme
src/lib/canvas.js       shared canvas helpers (HiDPI sizing, dragging, animation loop)
src/demos/hero.js       hero animation
src/demos/unitCircle.js Lab 01
src/demos/quadratic.js  Lab 02
src/demos/pythagoras.js Lab 03
```

Animations pause when scrolled off screen and respect `prefers-reduced-motion`.
