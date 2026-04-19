import { test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AppDriver } from "../lib/driver";
import { startMetricsSampler, summarize } from "../lib/measure";
import {
  loadTrace,
  replayTrace,
  traceDurationMs,
  viewportCenteredBox,
} from "../lib/trace";
import { excalidrawDriver } from "../drivers/excalidraw";
import { figmaDriver } from "../drivers/figma";
import { skedoodleDriver } from "../drivers/skedoodle";
import { tldrawDriver } from "../drivers/tldraw";

const here = dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = join(here, "..", "results", "raw");
const TRACE_PATH = join(here, "..", "fixtures", "spiral-15s.json");
const RUNS = Number(process.env.PERF_RUNS ?? "1");
const SETTLE_MS = 2000;
const SAMPLE_INTERVAL_MS = 250;
const VIEWPORT = { width: 1440, height: 900 } as const;

const drivers: AppDriver[] = [
  skedoodleDriver,
  tldrawDriver,
  excalidrawDriver,
  figmaDriver,
];

test.describe("draw CPU", () => {
  // workers:1 already serializes; avoid mode:"serial" so one flaky test
  // doesn't skip everything downstream in the same describe block.

  for (const driver of drivers) {
    for (let run = 0; run < RUNS; run++) {
      const suffix = RUNS > 1 ? ` (run ${run + 1}/${RUNS})` : "";
      test(`${driver.name} draw (spiral)${suffix}`, async ({ browser }) => {
        const skip = driver.skipReason?.();
        if (skip) test.skip(true, skip);
        const trace = await loadTrace(TRACE_PATH);
        const traceMs = traceDurationMs(trace);
        // 180s headroom: Figma accumulates file-state over runs and draw+
        // close can take a while. Better to spend a few extra seconds per
        // test than to lose data to a marginal timeout.
        test.setTimeout((traceMs / 1000 + 180) * 1000);

        const context = await browser.newContext({
          viewport: VIEWPORT,
          storageState: driver.storageState,
        });
        const page = await context.newPage();

        try {
          await driver.goto(page);
          await page.waitForTimeout(SETTLE_MS);
          if (driver.selectBrush) await driver.selectBrush(page);
          await page.waitForTimeout(500);

          const box = viewportCenteredBox(page, 0.5);
          const sampler = await startMetricsSampler(page, SAMPLE_INTERVAL_MS);
          await replayTrace(page, box, trace);
          const samples = await sampler.stop();

          const result = summarize(driver.name, "draw", samples);

          const ts = new Date().toISOString().replace(/[:.]/g, "-");
          await mkdir(RESULTS_DIR, { recursive: true });
          const outPath = join(
            RESULTS_DIR,
            `${driver.name}-draw-${ts}.json`,
          );
          await writeFile(outPath, JSON.stringify(result, null, 2));

          // Cleanup runs after we've saved the result, so a cleanup
          // failure never costs us the measurement data.
          if (driver.cleanup) {
            await driver.cleanup(page).catch(() => {});
          }

          console.log(
            `[${driver.name}] draw ${(traceMs / 1000).toFixed(0)}s${suffix}` +
              ` — mean CPU ${result.cpuPct.toFixed(2)}%` +
              ` peak ${result.peakCpuPct.toFixed(1)}%` +
              ` (script ${result.scriptPct.toFixed(2)}%)` +
              ` heap Δ ${result.heapDeltaMb.toFixed(1)}MB` +
              ` → ${outPath}`,
          );
        } finally {
          // page.close with runBeforeUnload:false short-circuits Figma's
          // slow teardown (it otherwise waits on collab/presence sockets
          // to drain gracefully).
          await page
            .close({ runBeforeUnload: false })
            .catch(() => {});
          await context.close().catch(() => {});
        }
      });
    }
  }
});
