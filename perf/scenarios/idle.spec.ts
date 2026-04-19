import { test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AppDriver } from "../lib/driver";
import { startMetricsSampler, summarize } from "../lib/measure";
import { excalidrawDriver } from "../drivers/excalidraw";
import { figmaDriver } from "../drivers/figma";
import { skedoodleDriver } from "../drivers/skedoodle";
import { tldrawDriver } from "../drivers/tldraw";

const here = dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = join(here, "..", "results", "raw");
const IDLE_SECONDS = Number(process.env.PERF_IDLE_SECONDS ?? "30");
const SETTLE_MS = 2000;
const SAMPLE_INTERVAL_MS = 500;
const VIEWPORT = { width: 1440, height: 900 } as const;

const drivers: AppDriver[] = [
  skedoodleDriver,
  tldrawDriver,
  excalidrawDriver,
  figmaDriver,
];

test.describe("idle CPU", () => {
  test.describe.configure({ mode: "serial" });

  for (const driver of drivers) {
    test(`${driver.name} idle ${IDLE_SECONDS}s`, async ({ browser }) => {
      const skip = driver.skipReason?.();
      if (skip) test.skip(true, skip);
      // Extra headroom covers slow teardown on apps with many open
      // connections (Figma keeps collab/presence sockets alive).
      test.setTimeout((IDLE_SECONDS + 120) * 1000);

      const context = await browser.newContext({
        viewport: VIEWPORT,
        storageState: driver.storageState,
      });
      const page = await context.newPage();

      try {
        await driver.goto(page);
        // Let initial render and hydration settle before sampling; otherwise
        // the first window captures startup cost as "idle".
        await page.waitForTimeout(SETTLE_MS);

        const sampler = await startMetricsSampler(page, SAMPLE_INTERVAL_MS);
        await page.waitForTimeout(IDLE_SECONDS * 1000);
        const samples = await sampler.stop();

        const result = summarize(driver.name, "idle", samples);

        const ts = new Date().toISOString().replace(/[:.]/g, "-");
        await mkdir(RESULTS_DIR, { recursive: true });
        const outPath = join(
          RESULTS_DIR,
          `${driver.name}-idle-${ts}.json`,
        );
        await writeFile(outPath, JSON.stringify(result, null, 2));

        console.log(
          `[${driver.name}] idle ${IDLE_SECONDS}s` +
            ` — CPU ${result.cpuPct.toFixed(2)}%` +
            ` (script ${result.scriptPct.toFixed(2)}%,` +
            ` layout ${result.layoutPct.toFixed(2)}%,` +
            ` style ${result.recalcStylePct.toFixed(2)}%)` +
            ` heap Δ ${result.heapDeltaMb.toFixed(1)}MB` +
            ` → ${outPath}`,
        );
      } finally {
        await context.close();
      }
    });
  }
});
