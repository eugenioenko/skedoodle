import type { Page } from "@playwright/test";
import type { AppDriver } from "../lib/driver";

const URL = process.env.TLDRAW_URL ?? "https://www.tldraw.com/";

export const tldrawDriver: AppDriver = {
  name: "tldraw",
  async goto(page: Page) {
    await page.goto(URL, { waitUntil: "networkidle" });
    // tldraw renders into a .tl-canvas wrapper around an SVG/canvas.
    await page.waitForSelector(".tl-canvas, .tl-container canvas", {
      state: "attached",
    });
  },
};
