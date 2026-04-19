import type { Page } from "@playwright/test";
import type { AppDriver } from "../lib/driver";

const URL = process.env.EXCALIDRAW_URL ?? "https://excalidraw.com/";

export const excalidrawDriver: AppDriver = {
  name: "excalidraw",
  async goto(page: Page) {
    await page.goto(URL, { waitUntil: "networkidle" });
    await page.waitForSelector("canvas.excalidraw__canvas, canvas", {
      state: "attached",
    });
  },
};
