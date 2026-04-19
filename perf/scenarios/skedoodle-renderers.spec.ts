/**
 * Reference-only: compare Skedoodle's three renderer modes (SVG, Canvas, WebGL).
 * Not for article use — the article cites the default SVG mode only.
 */
import { test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { startMetricsSampler, summarize } from "../lib/measure";
import {
  loadTrace,
  replayTrace,
  traceDurationMs,
  viewportCenteredBox,
} from "../lib/trace";
import {
  makeSkedoodleDriver,
  type SkedoodleRenderer,
} from "../drivers/skedoodle";

const here = dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = join(here, "..", "results", "raw");
const TRACE_PATH = join(here, "..", "fixtures", "spiral-15s.json");
const IDLE_SECONDS = Number(process.env.PERF_IDLE_SECONDS ?? "15");
const SETTLE_MS = 2000;
const VIEWPORT = { width: 1440, height: 900 } as const;

const RENDERERS: SkedoodleRenderer[] = ["svg", "canvas", "webgl"];

test.describe("skedoodle renderers (reference)", () => {
  test.describe.configure({ mode: "serial" });

  for (const renderer of RENDERERS) {
    const driver = makeSkedoodleDriver(renderer);

    test(`${driver.name} idle ${IDLE_SECONDS}s`, async ({ browser }) => {
      test.setTimeout((IDLE_SECONDS + 60) * 1000);

      const context = await browser.newContext({ viewport: VIEWPORT });
      const page = await context.newPage();
      try {
        await driver.goto(page);
        await page.waitForTimeout(SETTLE_MS);

        const sampler = await startMetricsSampler(page, 500);
        await page.waitForTimeout(IDLE_SECONDS * 1000);
        const samples = await sampler.stop();

        const result = summarize(driver.name, "idle", samples);
        const ts = new Date().toISOString().replace(/[:.]/g, "-");
        await mkdir(RESULTS_DIR, { recursive: true });
        const outPath = join(RESULTS_DIR, `${driver.name}-idle-${ts}.json`);
        await writeFile(outPath, JSON.stringify(result, null, 2));

        console.log(
          `[${driver.name}] idle ${IDLE_SECONDS}s` +
            ` — CPU ${result.cpuPct.toFixed(2)}%` +
            ` peak ${result.peakCpuPct.toFixed(1)}%` +
            ` heap Δ ${result.heapDeltaMb.toFixed(1)}MB` +
            ` → ${outPath}`,
        );
      } finally {
        await context.close();
      }
    });

    test(`${driver.name} draw (spiral)`, async ({ browser }) => {
      const trace = await loadTrace(TRACE_PATH);
      const traceMs = traceDurationMs(trace);
      test.setTimeout((traceMs / 1000 + 120) * 1000);

      const context = await browser.newContext({ viewport: VIEWPORT });
      const page = await context.newPage();
      try {
        await driver.goto(page);
        await page.waitForTimeout(SETTLE_MS);

        const box = viewportCenteredBox(page, 0.5);
        const sampler = await startMetricsSampler(page, 250);
        await replayTrace(page, box, trace);
        const samples = await sampler.stop();

        const result = summarize(driver.name, "draw", samples);
        const ts = new Date().toISOString().replace(/[:.]/g, "-");
        await mkdir(RESULTS_DIR, { recursive: true });
        const outPath = join(RESULTS_DIR, `${driver.name}-draw-${ts}.json`);
        await writeFile(outPath, JSON.stringify(result, null, 2));

        console.log(
          `[${driver.name}] draw ${(traceMs / 1000).toFixed(0)}s` +
            ` — mean CPU ${result.cpuPct.toFixed(2)}%` +
            ` peak ${result.peakCpuPct.toFixed(1)}%` +
            ` heap Δ ${result.heapDeltaMb.toFixed(1)}MB` +
            ` → ${outPath}`,
        );
      } finally {
        await context.close();
      }
    });
  }
});
