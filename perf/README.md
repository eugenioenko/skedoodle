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

This opens a Chromium window. Log in (with MFA if applicable), wait until your file dashboard renders, then return to the terminal and press Enter. The session is saved to `~/.config/skedoodle-perf/figma.storage.json` (override with `SKEDOODLE_PERF_FIGMA_STORAGE`).

The storage file lives outside the repo. **Never commit session cookies.** Sessions expire — re-run this command when Figma scenarios start failing.

## Apps under test

- Skedoodle (local sandbox)
- tldraw (anonymous)
- Excalidraw (anonymous)
- Figma (authenticated)

## Running scenarios

Not yet implemented (Phases 2–6).

## Disclaimer

This framework is for personal-use perf measurement. It is not a load test. Do not publish captured session cookies.
