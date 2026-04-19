import type { Page } from "@playwright/test";
import type { AppDriver } from "../lib/driver";

const URL = process.env.SKEDOODLE_URL ?? "https://skedoodle.top/sandbox";

export type SkedoodleRenderer = "svg" | "canvas" | "webgl";

// Must match the persisted shape of Skedoodle's "options" Zustand store
// (src/canvas/canvas.store.ts). We only write the one field we care about;
// Skedoodle fills in the rest from its defaults.
const seedRendererScript = (renderer: SkedoodleRenderer): string => `
  try {
    const key = "options";
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : { state: {}, version: 4 };
    parsed.state = Object.assign({}, parsed.state, { rendererType: ${JSON.stringify(renderer)} });
    if (!parsed.version) parsed.version = 4;
    localStorage.setItem(key, JSON.stringify(parsed));
  } catch {
    // If localStorage is unavailable we fall back to the app's default (svg).
  }
`;

export function makeSkedoodleDriver(
  renderer: SkedoodleRenderer = "svg",
): AppDriver {
  return {
    name: renderer === "svg" ? "skedoodle" : `skedoodle-${renderer}`,
    async goto(page: Page) {
      if (renderer !== "svg") {
        await page.addInitScript(seedRendererScript(renderer));
      }
      await page.goto(URL, { waitUntil: "networkidle" });
      // canvas-container holds either <svg>, <canvas>, or a WebGL <canvas>
      // depending on renderer — match any child.
      await page.waitForSelector(".canvas-container > *", {
        state: "attached",
      });
    },
  };
}

export const skedoodleDriver = makeSkedoodleDriver("svg");
