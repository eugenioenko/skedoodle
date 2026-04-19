#!/usr/bin/env bash
# Baseline run: execute idle + draw scenarios N times per (app, scenario),
# then aggregate results.
#
# Usage:
#   FIGMA_FILE_URL=... pnpm --filter skedoodle-perf baseline
#
# Env vars:
#   PERF_RUNS          — runs per cell (default 5)
#   PERF_IDLE_SECONDS  — idle sample window (default 30)
#   FIGMA_FILE_URL     — blank Figma file URL; unset = skip figma tests
set -euo pipefail
cd "$(dirname "$0")/.."

RUNS="${PERF_RUNS:-5}"
IDLE_SECS="${PERF_IDLE_SECONDS:-30}"

echo "== baseline =="
echo "  runs per cell:  ${RUNS}"
echo "  idle seconds:   ${IDLE_SECS}"
echo "  figma enabled:  $([ -n "${FIGMA_FILE_URL:-}" ] && echo yes || echo no)"
echo

export PERF_RUNS="$RUNS"
export PERF_IDLE_SECONDS="$IDLE_SECS"

pnpm exec playwright test scenarios/idle.spec.ts scenarios/draw.spec.ts

echo
echo "== aggregate =="
pnpm exec tsx scripts/aggregate.ts --runs "$RUNS"
