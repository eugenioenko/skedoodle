# Perf Reference Notes

Internal benchmarks that aren't cited by the article but are useful for
product decisions and future debugging. Unlike `perf_results.md` (which
feeds the article), this file is free to shift as we learn more.

Methodology matches the article's framework: Playwright + CDP
`Performance.metrics`, page-attributed CPU%, same 1440×900 viewport,
same spiral-15s.json trace, single runs. See `perf/README.md`.

## Skedoodle renderer modes — SVG vs Canvas vs WebGL (2026-04-18)

Compares Skedoodle's three renderer types on the same workload. All three
are exposed via the Settings panel (`rendererType` in the options store).
Spec: `perf/scenarios/skedoodle-renderers.spec.ts`.

### Idle (15s)

| Renderer | CPU | Peak | Heap Δ |
|---|---:|---:|---:|
| SVG (default) | 0.03% | 0.1% | 0.0 MB |
| Canvas | 0.03% | 0.1% | 0.0 MB |
| WebGL | 0.04% | 0.1% | 0.0 MB |

Idle is effectively identical across renderers. The event-driven render
loop is what drives idle cost — the renderer choice is irrelevant when
there's nothing to render.

### Draw (spiral, 15s)

| Renderer | Mean CPU | Peak CPU | Heap Δ | Multiple vs SVG |
|---|---:|---:|---:|---:|
| SVG (default) | 22.92% | 35.9% | +7.6 MB | 1.00× |
| Canvas | 50.25% | 58.1% | +4.6 MB | **2.19×** |
| WebGL | 64.44% | 83.9% | +7.9 MB | **2.81×** |

**SVG is by far the fastest for Skedoodle's workload.** The conventional
web-graphics wisdom ("Canvas beats SVG for many shapes") does not apply
here, and neither does the naive expectation that WebGL > Canvas for
anything with GPU acceleration.

### Why the inversion

Best guess (unverified — would take a trace to confirm):

- **SVG:** each stroke becomes one `<path>` node that's mutated
  in-place as new points arrive. The browser handles compositing and
  dirty-rect repaint; Two.js only does DOM mutation. Work per frame is
  proportional to the *delta* since last frame.
- **Canvas:** Two.js redraws the entire scene graph every frame via 2D
  canvas ops. Work is proportional to *total shapes on canvas*, not the
  delta. With N strokes already on screen, every new pointer event pays
  O(N) cost.
- **WebGL:** like Canvas, but with extra overhead on shader setup /
  buffer uploads per frame, and Two.js's WebGL backend probably doesn't
  batch or cache geometry across frames.

Translation: Two.js's SVG renderer gets the browser to do the hard work;
Canvas and WebGL redo the work in JS every frame. Sparse-update
workloads like a drawing app favor the former.

### Product implication

The Settings dropdown's "(Recommended)" label on SVG is load-bearing.
Canvas/WebGL modes should probably stay as escape hatches rather than
being promoted. For workloads where Canvas/WebGL would win (10k+
animated shapes, particle systems), we'd need a different renderer
architecture anyway — not just the Two.js sibling backends.

## Manual-draw validation vs scripted spiral (2026-04-18)

Sanity check on the scripted trace. Each app opened headed with the
pencil/brush pre-selected, then sampled for 10s while I drew fast
free-form doodles via mouse.

Spec: `perf/scenarios/manual-draw.spec.ts`. Single run per app — not
baseline-grade, but enough to check that the scripted numbers are in
the right ballpark.

| App | Manual mean | Scripted mean | Manual peak | Scripted peak |
|---|---:|---:|---:|---:|
| Skedoodle | 15.12% | 23.04% | 25.1% | 36.8% |
| tldraw | 17.63% | 23.27% | 30.4% | 33.3% |
| Excalidraw | 19.06% | 31.27% | 33.2% | 58.0% |
| Figma | 70.24% | 96.51% | 97.6% | 100.6% |

### What this tells us

- **Scripted runs harder than human input on every app.** The synthetic
  trace fires one pointer event every 16 ms with no gaps; real drawing
  has micro-pauses at every direction change. So published baseline
  numbers are a **worst-case sustained load**, not a "here's what a
  user feels" number. That's fine for the article's thesis (comparing
  apps under identical stress), but readers should be told.
- **Orderings match the scripted baseline**: Skedoodle < tldraw <
  Excalidraw ≪ Figma on both mean and peak. The qualitative story
  doesn't depend on scripted vs manual.
- **Excalidraw is the most event-rate-sensitive** — a 12 pp mean CPU
  drop from scripted to manual. Likely rough.js's per-pointer-event
  work scaling with event frequency.
- **Figma's script% behaves strangely under manual input** (56% of
  wall clock vs 11% on scripted). Possible explanations: pencil's
  real-time smoothing is cheaper on the very regular scripted trace
  than on irregular human timing, or scripted events land on a faster
  Figma code path. Didn't chase further.
- **Skedoodle ↔ tldraw tie still holds** but is noisier on a single
  manual run (15.12 vs 17.63) than on 5-run scripted (23.04 vs 23.27).
  The scripted numbers are the right citation for the article.

### Caveat on this comparison

Single run per app, no replay control, no warmup. Variance is
high — don't read decimals. The takeaway is *order of magnitude* +
*qualitative order*, both of which match the scripted baseline.

## When we might test other things here

- Brush stabilizer on vs off (stabilizer cost in active draw)
- Different throttle rates (16ms vs 33ms vs 0)
- Very long strokes (10k+ points, does simplification kick in cleanly)
- Grid on vs off (re-rendering grid during pan)
- Memory growth over 10 minutes of casual use

Add rows here as we measure.
