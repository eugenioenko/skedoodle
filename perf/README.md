# perf — Drawing app CPU comparison

Reproducible Playwright-based comparison of CPU and memory characteristics across drawing/whiteboarding apps. Data backs the article *Why your drawing app uses 2.5% CPU when you're not using it*.

Full plan: `../perf_plan.md`.

## Status

Phase 1 only — scaffold + Figma auth capture. Drivers, measurement primitives, scenarios, and reporting are not yet implemented.

## Setup

From the repo root:

```bash
pnpm install
pnpm --filter skedoodle-perf exec playwright install chromium
```

## Figma auth capture

Figma is the only app under test that requires login. Capture the session once:

```bash
pnpm --filter skedoodle-perf auth:figma
```

This opens a Chromium window. Log in (with MFA if applicable). The script automatically captures the session once Figma redirects you to a `/files/*` dashboard page — no Enter keypress needed. The session is saved to `~/.config/skedoodle-perf/figma.storage.json` (override with `SKEDOODLE_PERF_FIGMA_STORAGE`).

The storage file lives outside the repo. **Never commit session cookies.** Sessions expire — re-run this command when Figma scenarios start failing.

## Apps under test

- Skedoodle (local sandbox)
- tldraw (anonymous)
- Excalidraw (anonymous)
- Figma (authenticated)

## Running scenarios

Single runs (useful for iterating on a driver):

```bash
# Idle, 4 apps, 30s each
FIGMA_FILE_URL='<your blank figma file>' pnpm --filter skedoodle-perf exec playwright test scenarios/idle.spec.ts

# Draw, 4 apps, spiral-15s.json
FIGMA_FILE_URL='<your blank figma file>' pnpm --filter skedoodle-perf exec playwright test scenarios/draw.spec.ts

# Skedoodle renderer variants (reference, not article)
pnpm --filter skedoodle-perf exec playwright test scenarios/skedoodle-renderers.spec.ts
```

Full baseline (N runs × 4 apps × 2 scenarios, aggregated):

```bash
FIGMA_FILE_URL='<your blank figma file>' pnpm --filter skedoodle-perf baseline
```

- `PERF_RUNS` (default 5) — runs per cell
- `PERF_IDLE_SECONDS` (default 30) — idle window length
- Omit `FIGMA_FILE_URL` to skip Figma tests gracefully

Aggregating without re-running (reads the most recent N per cell from
`results/raw/`):

```bash
pnpm --filter skedoodle-perf aggregate --runs 5
```

Writes `results/summary-<timestamp>.json` plus a terminal table.
Summaries are gitignored; when one is publishable, copy it to
`results/baseline.json` to commit.

## Disclaimer

This framework is for personal-use perf measurement. It is not a load test. Do not publish captured session cookies.
