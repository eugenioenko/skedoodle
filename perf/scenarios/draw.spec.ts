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
  test.describe.configure({ mode: "serial" });

  for (const driver of drivers) {
    test(`${driver.name} draw (spiral)`, async ({ browser }) => {
      const skip = driver.skipReason?.();
      if (skip) test.skip(true, skip);
      const trace = await loadTrace(TRACE_PATH);
      const traceMs = traceDurationMs(trace);
      test.setTimeout((traceMs / 1000 + 120) * 1000);

      const context = await browser.newContext({
        viewport: VIEWPORT,
        storageState: driver.storageState,
      });
      const page = await context.newPage();

      try {
        await driver.goto(page);
        await page.waitForTimeout(SETTLE_MS);
        if (driver.selectBrush) await driver.selectBrush(page);
        // Tool switch + any toolbar animation should settle before sampling.
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

        console.log(
          `[${driver.name}] draw ${(traceMs / 1000).toFixed(0)}s` +
            ` — mean CPU ${result.cpuPct.toFixed(2)}%` +
            ` peak ${result.peakCpuPct.toFixed(1)}%` +
            ` (script ${result.scriptPct.toFixed(2)}%)` +
            ` heap Δ ${result.heapDeltaMb.toFixed(1)}MB` +
            ` → ${outPath}`,
        );
      } finally {
        await context.close();
      }
    });
  }
});
