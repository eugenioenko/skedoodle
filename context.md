# Context for the perf project (resume notes)

Notes from the session that produced `perf_plan.md`. For the next agent / future
self picking this up cold.

## Why this exists

User wants to write a staff/principal-level technical article about drawing-app
CPU usage. Skedoodle measurably outperforms Excalidraw and Figma on idle and
active CPU; tldraw matches it on active. The article needs hard, reproducible
numbers — anecdotal observations aren't enough at the audience level we're
aiming for. `perf_plan.md` is the framework for collecting those numbers.

## Anecdotal data already in hand (needs confirmation)

| App | Idle CPU | Active draw CPU |
|---|---|---|
| Skedoodle | 0% | ~30% (with rendering at "high performance") |
| tldraw | ~2.5% | ~30% (matched Skedoodle on a quick test) |
| Excalidraw | ~2.5% | high |
| Figma | high | very high |

The split that matters: Skedoodle vs everyone else on idle (0% vs ~2.5%+).
Active CPU clusters Skedoodle and tldraw together, separate from Excalidraw
and Figma.

## The thesis (evolved during the session)

Started as "thin libraries beat thick libraries." Discarded — tldraw uses no
rendering library at all (custom React + canvas) and matches Skedoodle. The
real principle is:

> **Drawing apps that don't burn CPU all share two things: they own their
> render schedule, and they have no hidden background work.**

The corollary that hooks the article:

> **The default `requestAnimationFrame`-driven render loop costs ~2.5% CPU
> even when nothing's happening. Event-driven rendering eliminates it.**

Skedoodle's `throttledTwoUpdate()` only fires when a tool/store mutation
actually happens. tldraw and Excalidraw appear to use rAF loops (to be
verified empirically — that's the article's job).

## Working title

**"Why your drawing app uses 2.5% CPU when you're not using it"**

User explicitly liked this hook line. Final title TBD but this is the spirit.

## Hard constraints (do not pitch otherwise)

- **Two.js is locked in.** User has explicitly stated switching to Konva,
  Fabric, three.js, custom WebGL, etc. is off the table. Don't suggest it.
  See `~/.claude/projects/-home-enko-Documents-skedoodle/memory/project_twojs_tradeoffs.md`.
- **The article must be honest about costs**, not advocacy. Real costs to
  enumerate include: writing interaction state from scratch (selection,
  hover, transformers), re-discovering bug classes (the hover/select
  layering bug fixed in PR #37), sparse Two.js docs, dropdown asChild
  quirk, having to disable Two.js auto-render and write the throttled
  update loop ourselves.
- **The throttled update loop is product surface, not just plumbing.** The
  user had the foresight to design it as a configurable rate from day one,
  which is now exposed as the "Update Frequency" Settings option (10/30/60/120
  FPS / High Performance). This is a load-bearing point for the article: it's
  the kind of decision a thick-library architecture would prevent. User
  asked whether this was staff or principal thinking — answer landed at
  "strong staff with principal flavor" (forward-looking, but scoped to one
  app's one knob, not a cross-team pattern).

## Honest about Two.js docs

User remembered Two.js docs saying canvas is faster than SVG. We fact-checked
via WebFetch — Two.js docs don't actually make that claim. The "Canvas is
faster" idea comes from general web rendering wisdom (Boris Smus's classic
post), not Two.js's own guidance. For Skedoodle's workload, SVG empirically
wins (sparse updates + GPU-composited transforms via ZUI vs Canvas's
full-redraw-per-frame). The Settings dropdown was updated to mark SVG as
"(Recommended)" during this session.

## Article structure (sketched, not final)

1. Hook: the CPU numbers (with methodology)
2. Why most drawing apps cost CPU when idle (rAF loops, animation queues,
   transformers, polling)
3. Two.js as a thin renderer — what it gives, what it doesn't
4. The tradeoff: code complexity (one-time) vs runtime overhead (forever)
5. The bugs we re-discovered (selection layering, etc.) — be honest
6. The peer: tldraw — same active CPU, different idle, same architectural
   instinct (own your render loop)
7. When this is the WRONG choice (high-animation scenes, particle systems,
   10k+ shapes — counterexamples)
8. Meta-principle: pick rendering strategy by workload, not by feature list
9. Closing: links + maybe ~70% of Skedoodle's code being interaction layer
   (concrete number — needs verification)

## Plan-vs-reality time estimate

`perf_plan.md` lists 4-5 days. That's human-calibrated. Agent-calibrated
estimate: ~4-6 hours of focused session, with one human-in-the-loop step:

- **Figma auth capture** requires the user to log in interactively (incl.
  MFA). Cannot be automated. ~5-10 min of user time at the very start.

After auth is captured to a storageState file (kept outside the repo), the
rest is autonomous:

- Scaffold + drivers + measurement primitives + traces + runners + report
- ~30 min of pure measurement runtime (60 runs at 30s each)
- ~1-2 hr of debugging when first end-to-end run breaks (drivers always
  break first time)

## Open decisions for the next session

- Pin Chromium version explicitly via Playwright release channel, or accept
  the bundled version? (Lean: accept bundled, document.)
- One-off article project, or keep the framework as a long-lived perf
  regression suite for Skedoodle? (Lean: keep it. Cost is low after v1.)
- Include WebGL renderer mode for Skedoodle as a separate row? (Probably
  yes — it's free data once the framework exists, and shows the within-Two.js
  comparison.)

## Where things were left

- `perf_plan.md` committed and pushed to `chore/perf-plan` branch
- No PR opened (intentional — user will pick up later)
- This `context.md` is a resume aid, not part of the deliverable

## What to do when picking up

1. Read `perf_plan.md` first.
2. Read this file second.
3. Confirm the article angle still feels right (drawing-app perf, idle CPU
   thesis). If user has shifted angle, much of this becomes stale.
4. Phase 1 of the plan is the right starting point: scaffold `perf/` and
   the Figma auth capture script.
5. Get Figma auth captured early — it's the human-in-the-loop dependency.
   Everything else can run unattended after that.
