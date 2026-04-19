# Perf Plan: Why your drawing app uses 2.5% CPU when you're not using it

A reproducible Playwright-based comparison of CPU and memory characteristics across drawing/whiteboarding apps. The output backs an article making an architectural argument about render-loop ownership and event-driven rendering vs `requestAnimationFrame`-driven defaults.

## Working title

**Why your drawing app uses 2.5% CPU when you're not using it**

(Hook line. Final article title TBD.)

## Hypothesis

Drawing apps split cleanly into two camps based on idle CPU:

| App | Idle CPU (anecdotal) | Active draw CPU | Architecture cue |
|---|---|---|---|
| Skedoodle | 0% | ~30% | Event-driven, `throttledTwoUpdate()` only fires on tool/store changes |
| tldraw | ~2.5% | ~30% | rAF-driven render loop |
| Excalidraw | ~2.5% | high | rAF-driven render loop |
| Figma | high | very high | rAF + collab CRDT + heavy engine |

The hypothesis to validate with hard numbers: **the difference is render-loop ownership and the absence of background work**, not the choice of rendering library or framework. tldraw matches Skedoodle on active CPU despite using a custom React+canvas renderer (no shared library); both pay the active-work cost honestly. The 2.5% gap at idle is the cost of the rAF idiom that most modern canvas apps inherit by default.

## Goals

1. Produce a reproducible comparison that backs the article's claims with measurements rather than vibes.
2. Build the framework so a reader can clone, run, and confirm — that's the credibility multiplier.
3. (Stretch) keep the framework around as a long-lived perf regression suite for Skedoodle itself.

## Non-goals

- Microbenchmarking individual rendering operations
- Comparing JS framework overhead in isolation
- Beating tldraw on active drawing — they're a peer, not a target. The story is the *similarity* on active and the *difference* on idle.
- Load-testing other people's prod servers

## Scope

### Apps under test

- **Skedoodle** — local sandbox mode, no auth
- **tldraw** — anonymous mode, no auth
- **Excalidraw** — anonymous mode, no auth
- **Figma** — requires auth (storageState capture)

### Scenarios

1. **Idle CPU** — open a blank file, do nothing, sample for 30s. Direct support for the headline claim.
2. **Continuous drawing CPU** — synthesize a sustained brush stroke at constant cursor velocity for 15s, sample throughout.
3. **Pan/zoom CPU** — programmatic pan-around-then-zoom-out for 10s. Tests transform / repaint cost.
4. **(Stretch) Memory growth** — heap size after 5 min of light use as a long-session proxy.

Ship 1, 2, 3 in v1. Add 4 if there's appetite.

### Metrics

Per scenario, sample CDP `Performance.metrics` every 500ms and report:

- **TaskDuration** (cumulative CPU time attributed to the page) — primary metric
- **ScriptDuration**, **LayoutDuration**, **RecalcStyleDuration** — for breakdown
- **JSHeapUsedSize** — for memory tracking

Final outputs per (app × scenario × run):

```json
{
  "app": "skedoodle",
  "scenario": "idle",
  "durationMs": 30000,
  "samples": [...],
  "cpuPct": 0.04,
  "scriptPct": 0.02,
  "heapDeltaMb": 0.1
}
```

CPU% is computed as `(deltaTaskDuration / wallClockDuration) * 100`.

## Methodology

### Apples-to-apples principle

- **Same input traces.** Mouse-event JSON describing pointer position over time. Each driver feeds the same trace into its app's canvas. Each app processes the trace as it sees fit — that *is* the comparison.
- **Same Chromium.** Playwright bundles Chromium; pin a version.
- **Same flags.** `--disable-extensions --no-first-run --disable-background-networking` etc. Documented in `playwright.config.ts`.
- **Same machine.** Note CPU model, OS, browser version in results.
- **Warmup pass.** First run discarded per (app × scenario). Steady-state matters more than cold-start for the idle/active claims.
- **5 runs per cell.** Report median + min/max. Throw out the warmup run.

### Why CDP `Performance.metrics` over system-level CPU

CDP attributes CPU time to the page itself rather than the whole browser process (which includes other tabs, extensions, GPU process, etc.). This makes the comparison about the *app's* cost, not noise.

The trade-off: it's slightly less aligned with what users perceive (their fan spinning is process-level, not page-level). Note this in the methodology section of the article. For comparison fairness across apps, page-attributed is what we want.

### Auth handling

- **Figma** is the only app needing auth. Capture `storageState` once via `playwright codegen` after manual login (and MFA if applicable). Store outside the repo: `~/.config/skedoodle-perf/figma.storage.json`. Reload as needed.
- Sessions can expire; script needs a clear "re-auth me" path that prompts the user to re-run codegen.
- **Never commit session cookies.**

### Trace fixtures

Stroke trace is JSON: `[{ t: 0, x: 100, y: 100 }, { t: 16, x: 105, y: 102 }, ...]`. Constant velocity, sine-wave-ish pattern, 15s long, ~60 events/sec (realistic stylus-like rate). Saved once, replayed identically across drivers.

Pan/zoom trace: similar JSON describing pointer drags + wheel events.

### Per-app cleanup

Some apps autosave or sync in the background (Excalidraw, Figma). Try to:
- Use anonymous/local-only modes where possible
- Ensure no extensions or accounts trigger background sync during measurement
- Document any unavoidable background work in the report (e.g., "Excalidraw anonymous mode still polls X every Y ms")

## File structure

```
perf/
├── package.json              # Playwright + reporting deps, separate from client/
├── playwright.config.ts      # Pinned Chromium, clean flags, no parallelism
├── tsconfig.json
├── README.md                 # How to run, how to interpret results
├── auth/                     # Auth-state capture scripts (NOT results)
│   └── capture-figma.ts      # `npx tsx auth/capture-figma.ts` opens browser, user logs in, dumps storageState to ~/.config/...
├── drivers/                  # Per-app interaction layer
│   ├── skedoodle.ts          # goto, selectBrush, getCanvasBox
│   ├── tldraw.ts
│   ├── excalidraw.ts
│   └── figma.ts
├── lib/
│   ├── measure.ts            # measureIdleCpu, measureActiveCpu, sampleMetrics (CDP wrappers)
│   ├── trace.ts              # simulateStrokeTrace, simulatePanZoom
│   └── aggregate.ts          # median + min/max + outlier rejection
├── fixtures/
│   ├── stroke-15s.json       # Mouse-event trace for continuous drawing
│   └── panzoom-10s.json
├── scenarios/                # One file per scenario, runs all drivers
│   ├── idle.spec.ts
│   ├── draw.spec.ts
│   └── panzoom.spec.ts
├── results/
│   ├── raw/                  # Per-run JSON, gitignored
│   └── baseline.json         # Committed baseline used by the article (just enough to back claims)
└── scripts/
    ├── run-all.sh            # Orchestrates scenarios × drivers × runs
    ├── report.ts             # Aggregates raw/ → markdown table for article
    └── chart.ts              # (Optional) chart.js or similar → PNG/SVG for article
```

`perf/` lives at repo root, separate from `client/`, with its own `package.json`. Different goals (measurement, not regression testing), potentially different deps later (charting, system-level sampling if we add it).

## Phases

| # | Phase | Effort | Deliverable |
|---|---|---|---|
| 1 | Project scaffold + auth capture | 0.5d | `perf/` directory, `playwright.config.ts`, `auth/capture-figma.ts`, README skeleton |
| 2 | Per-app drivers | 1–1.5d | All four drivers implementing `goto()`, `setupBlankFile()`, `selectBrush()`, `getCanvasBox()` |
| 3 | Measurement primitives | 1d | CDP-based `measureIdleCpu`, `measureActiveCpu`, `sampleMetrics` with outlier rejection |
| 4 | Trace fixtures + replayers | 0.5d | `stroke-15s.json`, `panzoom-10s.json`; `simulateStrokeTrace` works across drivers |
| 5 | Run + aggregate | 0.5d | `scripts/run-all.sh` runs full matrix, `aggregate.ts` produces median/min/max JSON |
| 6 | (Optional) Memory scenario | 0.5d | `scenarios/memory.spec.ts` — 5-min light-use loop per app with forced GC between samples, emits heap trend over time |
| 7 | Reporting | 0.5d | `report.ts` → markdown table; optional simple chart |

Total: ~4–5 days focused work (~5d with Phase 6).

### Phase 6 details (if we pick it up)

Long-session heap-trend measurement. The idle/draw scenarios already
emit `heapDeltaMb`, but over 15–30s that's dominated by scenario-
specific allocation, not leak signal. Phase 6 adds a dedicated scenario:

- 5-min window per app (~24 min total across 4 apps)
- Loop: draw a small stroke, idle ~10s, force GC via CDP
  `HeapProfiler.collectGarbage`, sample `JSHeapUsedSize`
- Reports retained-heap trend (bytes/min) — can't distinguish real leak
  from unbounded cache growth, but either is worth flagging
- Hands-off: kick off and wait for the notification

## Risks & mitigations

- **Figma auth flakiness.** Sessions expire; storageState capture isn't bulletproof. Mitigation: clear re-auth UX in the script; fail loudly with instructions, don't fail silently with empty data.
- **App UI changes break drivers.** Excalidraw/Figma/tldraw can update their UIs and break the brush-selection helper. Mitigation: drivers should target stable test-id selectors where possible, fall back to coordinate-based input. Pin app versions if possible (none of these allow easy version pinning, so this is a known maintenance cost).
- **Background work confounders.** Excalidraw and Figma may do invisible network polling, presence sync, etc. that shows up in CPU. Mitigation: document what's happening in each app's `drivers/*.ts` README block and acknowledge in the article methodology section. Don't pretend these don't exist; they're part of the architectural cost being measured.
- **Apples-to-apples illusion.** "Identical mouse trace" doesn't mean "identical work for the app." Each app simplifies/handles strokes differently — Skedoodle has its stabilizer + simplification, Excalidraw uses rough.js, etc. The comparison is about CPU cost *per identical input*, not "did each app do the same internal work." Be explicit about this in the article.
- **Absolute CPU numbers vary by machine.** Mitigate by reporting on a documented machine spec AND by emphasizing the *relative* numbers and the qualitative split (0% vs 2.5% vs higher), which holds across machines.
- **TOS concerns.** Personal-use perf testing is fine. Don't load-test, don't publish session cookies. Probably worth a one-line disclaimer in the README.

## Article integration

The framework feeds the article. Specifically:

1. **A markdown table** generated by `report.ts` becomes the data section.
2. **Methodology section** of the article links to `perf/README.md` for reproducibility.
3. **Repo link** at the article's bottom — readers can clone and re-run.
4. **A small chart or two** for the visual hook (idle CPU bar chart, active CPU bar chart).

The article can lead with: "These numbers came from this script. Here's how to run it yourself." That's load-bearing for credibility.

## Open questions

- Pin Chromium version explicitly via Playwright's release channel, or accept the bundled version?
- Run on dev machine or a documented "clean" environment? (Dev machine is fine for v1; note specs in results.)
- Is this a one-off article project, or do we keep the framework as a long-lived perf regression suite for Skedoodle? (Lean: keep it. Cost is low after v1.)
- Include WebGL renderer mode for Skedoodle as a separate row, to show the within-Two.js comparison? (Probably yes — it's free data once the framework exists.)
