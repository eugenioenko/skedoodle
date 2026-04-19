import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Page } from "@playwright/test";
import type { AppDriver } from "../lib/driver";

const configHome =
  process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config");
const STORAGE_PATH =
  process.env.SKEDOODLE_PERF_FIGMA_STORAGE ??
  join(configHome, "skedoodle-perf", "figma.storage.json");

// Figma's editor only renders inside a specific file; there is no stable
// "blank file" URL we can guess. Require the user to create a blank design
// file once and pin it via FIGMA_FILE_URL.
const FILE_URL = process.env.FIGMA_FILE_URL;

export const figmaDriver: AppDriver = {
  name: "figma",
  storageState: STORAGE_PATH,
  skipReason() {
    if (!existsSync(STORAGE_PATH)) {
      return `Figma storageState not found at ${STORAGE_PATH}. ` +
        `Run: pnpm --filter skedoodle-perf auth:figma`;
    }
    if (!FILE_URL) {
      return "FIGMA_FILE_URL env var not set (point it at a blank design file)";
    }
    return null;
  },
  async goto(page: Page) {
    // networkidle never fires on Figma (collab, presence, surveys keep the
    // pipe open). Use domcontentloaded + explicit canvas wait instead.
    await page.goto(FILE_URL!, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("canvas", {
      state: "attached",
      timeout: 60_000,
    });
    // Editor keeps painting for a while after canvas mounts; let it settle.
    await page.waitForTimeout(5000);
  },
  async selectBrush(page: Page) {
    // Figma: Shift+P = Pencil (freehand). Plain P is Pen (vector).
    await page.keyboard.press("Shift+P");
  },
};
