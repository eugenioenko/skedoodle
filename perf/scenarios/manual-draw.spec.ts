/**
 * Human-driven draw scenario.
 *
 * For each app: open headed with the brush/pencil preselected, show an
 * on-page countdown overlay, then sample for N seconds while the user
 * draws. Intended as a sanity check against the scripted spiral — if
 * the numbers track, the synthetic trace is a reasonable stand-in.
 *
 * Runs headed. Watch the browser window for the red "DRAW NOW" cue.
 * Filter to one app with --grep '<app>' if you want to pace yourself.
 */
import { test, type Page } from "@playwright/test";
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
const DRAW_SECONDS = Number(process.env.PERF_MANUAL_DRAW_SECONDS ?? "10");
const COUNTDOWN_SECS = 5;
const SETTLE_MS = 2000;
const SAMPLE_INTERVAL_MS = 250;
const VIEWPORT = { width: 1440, height: 900 } as const;

const drivers: AppDriver[] = [
  skedoodleDriver,
  tldrawDriver,
  excalidrawDriver,
  figmaDriver,
];

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

async function setOverlay(
  page: Page,
  text: string,
  bg: string,
): Promise<void> {
  await page.evaluate(
    ({ t, b }) => {
      let el = document.getElementById("__perf_overlay__");
      if (!el) {
        el = document.createElement("div");
        el.id = "__perf_overlay__";
        el.style.cssText =
          "position:fixed;top:16px;left:50%;transform:translateX(-50%);" +
          "z-index:2147483647;padding:12px 24px;font:bold 20px/1.1 monospace;" +
          "color:white;border-radius:8px;pointer-events:none;" +
          "box-shadow:0 4px 16px rgba(0,0,0,.25)";
        document.body.appendChild(el);
      }
      el.style.background = b;
      el.textContent = t;
    },
    { t: text, b: bg },
  );
}

async function removeOverlay(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.getElementById("__perf_overlay__")?.remove();
  });
}

// Always run headed — the whole point is that you can see and draw.
// Pass --headed on the CLI (already the default for this file).
test.describe("manual draw CPU (headed, human-driven)", () => {
  for (const driver of drivers) {
    test(`${driver.name} manual draw ${DRAW_SECONDS}s`, async ({ browser }) => {
      const skip = driver.skipReason?.();
      if (skip) test.skip(true, skip);
      test.setTimeout((DRAW_SECONDS + COUNTDOWN_SECS + 180) * 1000);

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
        await page.bringToFront();

        for (let s = COUNTDOWN_SECS; s > 0; s--) {
          await setOverlay(page, `READY — ${s}`, "#f59e0b");
          await sleep(1000);
        }
        await setOverlay(page, `DRAW NOW — ${DRAW_SECONDS}s`, "#dc2626");

        // Sampler starts here; overlay stays static through the window
        // so no mid-measurement DOM mutation contaminates CPU%.
        const sampler = await startMetricsSampler(page, SAMPLE_INTERVAL_MS);
        await page.waitForTimeout(DRAW_SECONDS * 1000);
        const samples = await sampler.stop();
        await setOverlay(page, "DONE", "#16a34a");

        const result = summarize(driver.name, "manual-draw", samples);

        const ts = new Date().toISOString().replace(/[:.]/g, "-");
        await mkdir(RESULTS_DIR, { recursive: true });
        const outPath = join(
          RESULTS_DIR,
          `${driver.name}-manual-draw-${ts}.json`,
        );
        await writeFile(outPath, JSON.stringify(result, null, 2));

        console.log(
          `[${driver.name}] manual draw ${DRAW_SECONDS}s` +
            ` — mean CPU ${result.cpuPct.toFixed(2)}%` +
            ` peak ${result.peakCpuPct.toFixed(1)}%` +
            ` (script ${result.scriptPct.toFixed(2)}%)` +
            ` heap Δ ${result.heapDeltaMb.toFixed(1)}MB` +
            ` → ${outPath}`,
        );

        // Let the user briefly see the DONE badge before we tear down.
        await sleep(1000);
        await removeOverlay(page).catch(() => {});

        // Cleanup (e.g., Figma select-all+delete) so we don't leave
        // personal doodles in the user's Figma file.
        if (driver.cleanup) {
          await driver.cleanup(page).catch(() => {});
        }
      } finally {
        await page.close({ runBeforeUnload: false }).catch(() => {});
        await context.close().catch(() => {});
      }
    });
  }
});
