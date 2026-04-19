# Perf Results (in progress)

Preliminary measurements from the `perf/` framework. These are **smoke-test-grade**
numbers, not the finalized baseline — single 10-second runs per app, no warmup
discard, no repeats. Good enough to confirm the qualitative story; not yet what
the article will cite.

## Environment

- **Machine:** Microsoft Surface (Arch Linux), Intel Core i5-1035G7 @ 1.20GHz, 8 cores
- **OS:** Linux 6.14.2-arch1-1-surface x86_64
- **Browser:** Chromium bundled with Playwright 1.59.1 (ubuntu24.04 fallback build)
- **Methodology:** Chrome DevTools Protocol `Performance.metrics` sampled every
  500ms while the app sits on a blank canvas. CPU% = Δ`TaskDuration` / wall clock,
  attributed to the page only (not whole browser).
- **Repo:** `chore/perf-plan` @ `5a85cc6` (pre-commit for Phase 2 code)

## Idle CPU — 10s smoke test (2026-04-18)

Single run per app. 2s settle before sampling starts.

| App | Idle CPU | Script | Layout | Style | Heap Δ |
|---|---:|---:|---:|---:|---:|
| Skedoodle (sandbox) | **0.04%** | 0.00% | 0.00% | 0.00% | 0.0 MB |
| Excalidraw | 1.05% | 0.28% | 0.00% | 0.00% | +0.6 MB |
| tldraw | 1.51% | 0.51% | 0.00% | 0.00% | −4.8 MB |
| Figma | **2.89%** | 0.52% | 0.00% | 0.01% | +2.2 MB |

Raw sample files in `perf/results/raw/*-idle-2026-04-19T03-49*.json`.

### URLs under test

- Skedoodle: `https://skedoodle.top/sandbox`
- tldraw: `https://www.tldraw.com/`
- Excalidraw: `https://excalidraw.com/`
- Figma: blank design file (authenticated, personal)

## Observations

- **Skedoodle is at the noise floor (~0%).** Event-driven renderer — no rAF loop,
  so the main thread is genuinely idle.
- **tldraw and Excalidraw cluster around 1–1.5%.** Consistent with a rAF-driven
  render loop running quietly.
- **Figma pays ~3%** even on a blank file — collab/presence sockets, survey
  probes (`sprig.figma.com`), and the WebGL engine keep the page busy.
- **Heap Δ is not yet interesting** at 10s. Will matter at the 5-minute memory
  scenario.

## Caveats

1. **Single-run smoke tests.** No warmup discard, no median-of-N. Numbers will
   shift ±0.3% across runs. Treat magnitudes as approximate, ordering as robust.
2. **CDP attributes CPU to the page**, not the whole browser process. The
   absolute % will be lower than what system tools report for the browser.
3. **Figma's first paint is slow enough** that it may still be finishing work
   during the 2s settle — the later 30s run will be more representative.
4. **Battery / thermal state affects results.** Laptop on battery shows lower
   ceilings; plug in before collecting the published baseline.

## Comparison to pre-measurement guesses

Anecdotal numbers from `context.md`:

| App | Guessed idle | Measured (page CPU) | Note |
|---|---:|---:|---|
| Skedoodle | 0% | 0.04% | Confirmed |
| tldraw | ~2.5% | 1.51% | Lower — CDP is page-attributed, not process |
| Excalidraw | ~2.5% | 1.05% | Lower for same reason |
| Figma | high | 2.89% | "High" was vague; now it's ~3× the others |

Qualitative split holds: Skedoodle at zero, two mid-pack apps, Figma on its own.

## Next

- Lock in the 30-second × 5-runs baseline once the draw/panzoom scenarios are in.
- Add `results/baseline.json` from `scripts/report.ts` (not yet written).
- WebGL renderer mode for Skedoodle as a separate row.
