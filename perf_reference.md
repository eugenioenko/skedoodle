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

## When we might test other things here

- Brush stabilizer on vs off (stabilizer cost in active draw)
- Different throttle rates (16ms vs 33ms vs 0)
- Very long strokes (10k+ points, does simplification kick in cleanly)
- Grid on vs off (re-rendering grid during pan)
- Memory growth over 10 minutes of casual use

Add rows here as we measure.
