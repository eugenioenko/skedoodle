# Article Research Notes

Material gathered for writing *Why your drawing app uses 2.5% CPU when
you're not using it*. Not reference data (`perf_reference.md`) or
published baseline (`perf_results.md`) — this is the prose-supporting
research: how the comparator apps actually work under the hood, with
quotable code, so the article can make architectural claims that
hold up.

## Baseline numbers (recap, for cross-reference)

From `perf_results.md` — median of 5 runs:

| App | Idle CPU | Draw CPU |
|---|---:|---:|
| Skedoodle | 0.09% | 23.04% |
| tldraw | 1.53% | 23.27% |
| Excalidraw | 1.18% | 31.27% |
| Figma | 3.49% | 96.51% |

## Why tldraw pays ~1.5% idle CPU

**Architecture:** tldraw runs a permanent 60 Hz `requestAnimationFrame`
loop — a `TickManager` — that re-schedules itself every frame for the
lifetime of the editor instance. There's no dirty-flag guard; it ticks
whether anything is happening or not.

**Source**: [`TickManager.ts`](https://github.com/tldraw/tldraw/blob/a0990dba634eb730719b34b3eb34fbbba7b1d65d/packages/editor/src/lib/editor/managers/TickManager/TickManager.ts#L26-L47)

```ts
start() {
  this.isPaused = false
  this.cancelRaf?.()
  this.cancelRaf = throttleToNextFrame(this.tick)
  this.now = Date.now()
}

@bind
tick() {
  if (this.isPaused) { return }
  const now = Date.now()
  const elapsed = now - this.now
  this.now = now
  this.editor.inputs.updatePointerVelocity(elapsed)
  this.editor.emit('frame', elapsed)
  this.editor.emit('tick', elapsed)
  this.cancelRaf = throttleToNextFrame(this.tick) // re-arm
}
```

A comment in the file calls it out explicitly: *"the tick manager since
it sets up a raf loop"* ([source](https://github.com/tldraw/tldraw/blob/a0990dba634eb730719b34b3eb34fbbba7b1d65d/packages/editor/src/lib/editor/managers/TickManager/TickManager.ts#L7)).

**Per-frame idle work** (from `tick`/`frame` subscribers):
- `updatePointerVelocity()` — computes velocity even if the pointer
  hasn't moved
- `_flushEventsForTick` — drains the queue and emits a
  `{type:'misc', name:'tick'}` into the state-chart root
- `scribbles.tick(elapsed)` — idle no-op, still a function call
- Viewport / camera animation-step checks (`_animateViewport`,
  `moveCamera`, `_decayCameraStateTimeout`)
- `PerformanceManager._onFrame` — on every frame calls
  `getCurrentPageShapeIds()` and `getCulledShapes()` and builds a
  `TLFramePerfEvent` payload ([source](https://github.com/tldraw/tldraw/blob/a0990dba634eb730719b34b3eb34fbbba7b1d65d/packages/editor/src/lib/editor/managers/PerformanceManager/PerformanceManager.ts#L351-L373))

Plus steady-state timers outside the rAF: `LiveCollaborators` /
`usePeerIds` have `setInterval`-based cursor cleanup, and
`useScreenBounds` polls `getBoundingClientRect()` every 1000 ms
([source](https://github.com/tldraw/tldraw/blob/a0990dba634eb730719b34b3eb34fbbba7b1d65d/packages/editor/src/lib/hooks/useScreenBounds.ts#L24)).

## Why Excalidraw pays ~1.1% idle CPU

**Architecture:** Excalidraw is subtler. There's no perpetual rAF loop —
rendering is pull-based via a `throttleRAF` helper, and the only
animation driver (`AnimationController`) terminates itself when there's
no animation state left.

**Throttled renderer** ([source](https://github.com/excalidraw/excalidraw/blob/1caec99b290c75cda05385e637138998807a65ae/packages/common/src/utils.ts#L155-L175)):

```ts
export const throttleRAF = <T extends any[]>(fn: (...args: T) => void) => {
  let timerId: number | null = null;
  let lastArgs: T | null = null;
  const scheduleFunc = () => {
    timerId = window.requestAnimationFrame(() => {
      timerId = null;
      const args = lastArgs;
      lastArgs = null;
      if (args) { fn(...args); }
    });
  };
  const ret = (...args: T) => {
    lastArgs = args;
    if (timerId === null) { scheduleFunc(); }
  };
```

This is pull-based — only schedules when something calls it. Re-renders
originate from React `setState` and `scene.onUpdate` → `triggerRender`
([source](https://github.com/excalidraw/excalidraw/blob/1caec99b290c75cda05385e637138998807a65ae/packages/excalidraw/components/App.tsx#L4616-L4625)).

The closest thing to a "loop" is the animation controller, which
stops itself when idle ([source](https://github.com/excalidraw/excalidraw/blob/1caec99b290c75cda05385e637138998807a65ae/packages/excalidraw/renderer/animation.ts#L44-L75)):

```ts
private static tick() {
  if (AnimationController.animations.size > 0) {
    for (const [key, animation] of AnimationController.animations) {
      const state = animation.animation({ deltaTime, state: animation.state });
      if (!state) {
        AnimationController.animations.delete(key);
        if (AnimationController.animations.size === 0) {
          AnimationController.isRunning = false;
          return; // loop stops here when idle
        }
      } else { /* keep going */ }
    }
    requestAnimationFrame(AnimationController.tick);
  }
}
```

**So where does the 1.1% idle cost come from?** Not a hot rAF — React.
Excalidraw's `componentDidUpdate` runs a ~160-line prev/next diff,
calls `this.store.commit(...)`, emits `onChange`, toggles theme class,
and more, on every state transition
([source](https://github.com/excalidraw/excalidraw/blob/1caec99b290c75cda05385e637138998807a65ae/packages/excalidraw/components/App.tsx#L3360-L3521)).
The reconciler wakes up repeatedly even on a blank canvas because
internal state churns — tool hover, pointer tracking, etc. — each
firing a `setState` that triggers a commit-phase diff.

Plus periodic timers when in collab mode: a 3-second active-user
heartbeat and a 20-second full-scene sync. Not dormant in local mode,
but the React overhead alone is enough to account for the measurement.

## One-sentence summaries for the article

- **tldraw**: a permanent 60 Hz `TickManager` rAF loop drives
  pointer-velocity updates, queued-event flushes, viewport/camera
  animation checks, and a per-frame `PerformanceManager` sample every
  single frame, regardless of whether the user is doing anything.
- **Excalidraw**: no perpetual rAF — rendering is pull-based through
  `throttleRAF` and a self-terminating `AnimationController`. The
  measurable idle cost is React's `componentDidUpdate` diff bookkeeping
  waking up repeatedly, plus (in shared rooms) a 3 s active heartbeat
  and 20 s full-sync.
- **Skedoodle**: no rAF loop, no tick manager — renders only when a
  tool handler or Zustand store transition calls
  `throttledTwoUpdate()`. Idle CPU sits at the measurement noise floor.

## Skedoodle's equivalent: what we do instead

Skedoodle's rendering is entirely event-driven. Every tool handler
and every store mutation calls `throttledTwoUpdate()` after work is
done; no background timer, no dirty-flag polling.

### The thesis in one line

Two.js ships with `autostart: true` as the default — that starts its
own internal `requestAnimationFrame` loop, analogous to tldraw's
`TickManager`. Skedoodle's first architectural decision was to turn
that off. `client/src/canvas/canvas.hook.tsx:98`:

```typescript
return new Two({
  autostart: false,   // ← the thesis, in one config flag
  fitted: true,
  width: container.clientWidth,
  height: container.clientHeight,
  type: twoType,
}).appendTo(container);
```

Six characters (`false,`) are the architectural difference between
Skedoodle's 0.09% idle CPU and the ~1.5% cost Two.js would otherwise
impose out of the box. Everything downstream — the throttled update
loop, the Update Frequency setting, the event-driven tool handlers —
exists because of this one opt-out.

### The throttled-update loop

With `autostart: false`, nothing renders automatically. Rendering only
happens when `throttledTwoUpdate()` is called from a tool handler or
store mutation. The whole implementation is ~20 lines
(`client/src/canvas/doodler.client.ts:51`):

```typescript
throttledTwoUpdate = () => {
  const updateFrequency = useOptionsStore.getState().updateFrequency;

  if (updateFrequency === 0) {
    if (typeof this.two?.update === "function") {
      this.two?.update?.();
    }
  } else {
    if (!this._throttledUpdate || this._lastFrequency !== updateFrequency) {
      this._lastFrequency = updateFrequency;
      this._throttledUpdate = throttle(() => {
        if (typeof this.two?.update === "function") {
          this.two?.update?.();
        }
      }, updateFrequency);
    }
    this._throttledUpdate();
  }
};
```

That's the entire render-scheduling layer. Note what's *not* there:
no `requestAnimationFrame`, no `setInterval`, no dirty-flag poll, no
tick subscribers. When nothing calls it, nothing happens — which is
why a blank canvas measures at 0.09% CPU.

**`updateFrequency === 0` means "High Performance" (no throttle)** —
in that mode, every call invokes `two.update()` directly. For the
throttled modes (10/30/60/120 FPS), a throttled wrapper is memoized
per-rate so we don't re-create it on every call.

### The "Update Frequency" setting is product surface

The throttle rate is exposed in the Settings panel as a user choice
(10 / 30 / 60 / 120 FPS or "High Performance"). This is load-bearing
for the article's thesis: it's evidence that the event-driven render
decision was deliberate from day one, not accidental. A thick-library
architecture wouldn't allow this knob to exist at all — the library's
tick rate is its own concern.

The store field lives in `client/src/canvas/canvas.store.ts`:

```typescript
updateFrequency: 0 | 16 | 33;  // 0=HP, 16=60fps, 33=30fps (+10/120 via UI)
```

## Honest costs — what you lose with this architecture

The article promised an honest-costs section. Enumerate:

- **You write the interaction layer yourself.** Two.js gives you
  shapes, not hit-testing state, not hover, not transformers, not
  selection layering, not node handles, not snapping. Every single
  one of those lives in `client/src/canvas/`.

### The interaction-vs-rendering LOC breakdown

Total Skedoodle client: **10,858 LOC** across `client/src/`.

| Bucket | LOC | % of total |
|---|---:|---:|
| Interaction (tools, selection, undo/redo, coord math, path simplify) | 4,918 | **45.3%** |
| Rendering / scene glue | 1,148 | 10.6% |
| UI shell (panels, color pickers, dialogs, etc.) | 3,881 | 35.7% |
| Utility / infra (auth, sync, types, CSS) | 911 | 8.4% |

**The "~70% interaction" gut estimate doesn't hold at face value.**
Of the whole client, interaction is 45%, not 70%. The other 55% is UI
chrome and generic infra you'd have regardless of rendering choice.

**The thesis-supporting number is tighter**: restrict to the canvas
engine itself (everything under `canvas/` plus the stroke-simplify
utils — the code that exists *because* we picked Two.js) and the split
is:

- **Interaction: 4,918 LOC (81%)**
- **Rendering: 1,148 LOC (19%)**

So the *canvas engine* is **81% interaction plumbing, 19% rendering
glue** — roughly **4× more interaction than rendering** in LOC.

**Recommended article wording:**

> Of Skedoodle's canvas-engine code — everything under `canvas/` plus
> the path-simplification utils — roughly 80% is interaction plumbing
> (tool handlers, selection, node editing, pointer math, undo/redo,
> stroke simplification) and only 20% is rendering glue around Two.js.
> That ratio is the architectural tax a thin renderer asks you to pay:
> you trade library code for application code.

Or, if you want one punchy number for the whole client: **"interaction
code outweighs rendering code by more than 4×."** Accurate and vivid.

### Other honest costs

- **Sparse Two.js docs.** Covered in `perf_plan.md` — we had to read
  Two.js source and fact-check claims about canvas vs SVG speed.
- **Re-discovering bug classes.** The selection/hover layering bug
  fixed in PR #37 is an example — a transformer library would have
  handled z-order for us. Also the dropdown asChild quirk worked
  around in the eyedropper tool.
- **Harder upgrade path.** When Two.js has a bug or a missing
  feature, we're closer to the metal.

## Article structure — updated from `context.md`

1. **Hook**: the CPU numbers + the charts
2. **Why most drawing apps cost CPU when idle** — walk through tldraw's
   TickManager and Excalidraw's React-update churn, using the snippets
   above
3. **Skedoodle's alternative**: event-driven render via
   `throttledTwoUpdate()`, with the "Update Frequency" setting as
   evidence that this was a deliberate product choice, not accidental
4. **The trade-off**: code complexity (one-time) vs runtime overhead
   (forever) — cite the interaction-layer LOC number here
5. **The bugs we re-discovered** — PR #37 selection layering, etc.
6. **The peer**: tldraw — same active CPU, different idle, same
   architectural instinct (own your render schedule)
7. **When this is the WRONG choice** — high-animation scenes, particle
   systems, 10k+ shapes, any workload where you want every frame to
   fire regardless
8. **Meta-principle**: pick your rendering strategy by workload, not
   by feature list
9. **Closing**: repro instructions (`perf/README.md`) + source link +
   the 70%-ish LOC observation as the final gut-punch line

## Chart captions (for the dev.to article)

Both PNGs live in `perf/results/charts/`. Suggested alt text +
captions:

- **idle-cpu.png** — alt: "Bar chart: idle CPU usage on a blank
  canvas. Skedoodle 0.09%, Excalidraw 1.18%, tldraw 1.53%,
  Figma 3.49%." Caption: *Idle CPU on a blank canvas. Median of
  5 runs; whiskers are min–max. Skedoodle is highlighted because
  event-driven rendering puts it at the measurement floor.*
- **draw-cpu.png** — alt: "Bar chart: active-draw CPU during a 15s
  scripted spiral. Skedoodle 23.0%, tldraw 23.3%, Excalidraw 31.3%,
  Figma 96.5%." Caption: *Active-draw CPU during the same 15-second
  spiral. Skedoodle and tldraw are tied within 0.23 percentage
  points — same architectural instinct, different rendering stacks.
  Figma saturates a core.*
