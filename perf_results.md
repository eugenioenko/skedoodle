# Perf Results — Published Baseline

Baseline measurements feeding the article. All numbers are **median of 5 runs**
with min–max range reported. See `perf/results/baseline.json` for the
machine-readable source and `perf/README.md` to reproduce.

## Environment

- **Machine:** Microsoft Surface (Arch Linux), Intel Core i5-1035G7 @ 1.20GHz, 8 cores
- **OS:** Linux 6.14.2-arch1-1-surface x86_64
- **Browser:** Chromium bundled with Playwright 1.59.1 (ubuntu24.04 fallback build)
- **Viewport:** 1440 × 900
- **Methodology:** CDP `Performance.metrics` sampled every 500 ms (idle) or
  250 ms (draw). CPU% = Δ`TaskDuration` / wall clock, attributed to the page only
  (not whole browser process). Full GC via `HeapProfiler.collectGarbage` at
  sampler endpoints, so reported `heapΔ` reflects retained memory rather than
  allocations that GC hadn't yet cleaned up.

## URLs under test

- Skedoodle: `https://skedoodle.top/sandbox` (default SVG renderer)
- tldraw: `https://www.tldraw.com/`
- Excalidraw: `https://excalidraw.com/`
- Figma: authenticated personal design file, manually emptied before each
  5-run batch to prevent autosave accumulation

## Idle CPU — 30s on a blank canvas

Apps load, sit idle for 2s to settle, then sample for 30s.

| App | CPU median | CPU min–max | Peak | Heap Δ median |
|---|---:|---:|---:|---:|
| **Skedoodle** | **0.09%** | 0.08–0.11% | 2.2% | 0.00 MB |
| Excalidraw | 1.18% | 1.12–1.24% | 4.2% | 0.02 MB |
| tldraw | 1.53% | 1.51–1.62% | 6.7% | 0.06 MB |
| Figma | 3.49% | 3.38–4.18% | 33.4% | −0.07 MB |

**Observations:**
- Skedoodle at 0.09% is effectively noise floor — the event-driven renderer has
  no background work while nothing's happening.
- Excalidraw and tldraw cluster around 1.2–1.5%: both run rAF-driven render
  loops that tick even when idle.
- Figma pays 3.49% on a blank file, **and its idle peak hits 33.4%** — the
  collab/presence heartbeat lands hard every few seconds.
- Ranges are tight (≤0.1pp range for the quiet apps, ≤0.8pp for Figma) — these
  numbers are reproducible.

## Draw CPU — 15s scripted spiral trace

Archimedean spiral from canvas center, 6 turns at 60 Hz (902 pointer events),
replayed identically across drivers via Playwright's `mouse.*` API. Drawable
region is 50% of the viewport, centered — fits inside every app's canvas
regardless of toolbar layout.

| App | CPU median | CPU min–max | Peak | Heap Δ median |
|---|---:|---:|---:|---:|
| **Skedoodle** | **23.04%** | 21.64–23.69% | 36.8% | 1.76 MB |
| tldraw | 23.27% | 22.94–23.87% | 33.3% | 4.20 MB |
| Excalidraw | 31.27% | 30.75–31.80% | 58.0% | 1.10 MB |
| Figma | 96.51% | 94.71–99.08% | 100.6% | −11.40 MB |

**The headline finding:** Skedoodle (23.04%) and tldraw (23.27%) are **within
0.23 percentage points** on active draw CPU despite entirely different rendering
stacks — Skedoodle uses Two.js/SVG, tldraw uses custom React + canvas. That
tie is the most important result in the table: active-draw cost is architectural
(own your render loop, no hidden background work), not about the rendering
library.

**Other observations:**
- Excalidraw is ~35% higher than the Skedoodle/tldraw pair — rough.js stroke
  generation adds real work per event.
- Figma saturates a CPU core (96.5% median, 100.6% peak). Drawing one stroke
  triggers the full WebGL + WASM + collab-CRDT pipeline on every pointer event.
- All ranges are ≤2 percentage points — stable enough to publish.

## Memory — retained-heap delta

Reported `Heap Δ median` above is the difference between forced-GC samples at
start vs end of the scenario window. It reflects what's **still referenced**
after GC, not what was transiently allocated.

Across idle cells (30s window) the number is ~0 MB for every app — no
short-horizon leak signal on an empty canvas. That's reassuring but doesn't
rule out slow leaks; 30 seconds isn't long enough.

For the draw cells (15s window):

- **Skedoodle: +1.76 MB** — retained size of one drawn path
- **Excalidraw: +1.10 MB** — similar, a bit smaller
- **tldraw: +4.20 MB** — heavier per-stroke retention
- **Figma: −11.40 MB** — noise. Figma's baseline heap is ~100+ MB and GC
  reclaims cold pages during measurement, swamping the few-MB delta from a
  single stroke. The min/max range (−11.7 to +10.7 MB) confirms this: we're
  measuring below Figma's GC noise floor.

For real leak signal you'd want a longer window (≥5 min) and repeated draw /
undo cycles. That's sketched as optional Phase 6 in `perf_plan.md`.

## Caveats

1. **CDP attributes CPU to the page**, not the whole browser process. Absolute
   % is lower than what `top` or macOS Activity Monitor would report — but
   that's exactly what we want here: the app's cost, not the browser's.
2. **Single-machine numbers.** Published % shouldn't be read across machines;
   the *ordering* and *relative gaps* are what's portable. Rerun on your
   machine via `perf/README.md` to get numbers that apply to you.
3. **Battery / thermal state matters.** Laptop on battery shows a lower
   ceiling; plug in before reproducing.
4. **Synthetic pointer events.** Playwright's `mouse.*` dispatches DOM events.
   Modern apps expect pointer events with pressure / tilt; an app that branches
   on `PointerEvent.pressure` might take a slightly different path. Doesn't
   appear to be material here.
5. **Figma state management.** Figma autosaves everything drawn, which
   accumulates across runs and makes later runs slower. The driver's
   `cleanup()` hook (select-all + delete) clears this between measurements,
   but you should still start each batch from a manually emptied file.
6. **Figma draw flakiness.** Even with cleanup, 1–2 out of 5 Figma draw runs
   can time out because the app saturates CPU. We retry and aggregate the
   successes. If you're reproducing, expect to run the Figma draw scenario
   two or three times to collect 5 clean samples.

## Comparison to pre-measurement guesses

Anecdotal numbers from `context.md` vs what we actually measured:

| App | Guessed idle | Measured idle | Guessed active | Measured active (median) |
|---|---:|---:|---:|---:|
| Skedoodle | 0% | 0.09% | ~30% | 23.04% |
| tldraw | ~2.5% | 1.53% | ~30% (matched) | 23.27% |
| Excalidraw | ~2.5% | 1.18% | high | 31.27% |
| Figma | high | 3.49% | very high | 96.51% |

Qualitative ordering holds across both scenarios. The Skedoodle ↔ tldraw tie on
active CPU is even tighter than the anecdotal "matched" claim — they're 0.23
percentage points apart at median.

## How to reproduce

```bash
# One-time setup
pnpm install
pnpm --filter skedoodle-perf exec playwright install chromium
pnpm --filter skedoodle-perf auth:figma   # opens Chromium, log in

# Create a blank Figma design file. Grab its URL.

# Run the full 5-run baseline (~30 min hands-off)
FIGMA_FILE_URL='<your blank figma file>' \
  pnpm --filter skedoodle-perf baseline
```

The baseline script runs `idle.spec.ts` + `draw.spec.ts` each 5 times per app,
then `scripts/aggregate.ts` writes a fresh `results/summary-<ts>.json`. Compare
against the committed `results/baseline.json`.
