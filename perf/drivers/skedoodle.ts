import type { Page } from "@playwright/test";
import type { AppDriver } from "../lib/driver";

const URL = process.env.SKEDOODLE_URL ?? "https://skedoodle.top/sandbox";

export const skedoodleDriver: AppDriver = {
  name: "skedoodle",
  async goto(page: Page) {
    await page.goto(URL, { waitUntil: "networkidle" });
    await page.waitForSelector(".canvas-container svg", { state: "attached" });
  },
};
