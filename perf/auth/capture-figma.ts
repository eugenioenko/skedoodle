import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const configHome =
  process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config");
const STORAGE_PATH =
  process.env.SKEDOODLE_PERF_FIGMA_STORAGE ??
  join(configHome, "skedoodle-perf", "figma.storage.json");

async function main() {
  console.log("Opening Chromium for Figma login...");
  console.log(`Storage state will be saved to: ${STORAGE_PATH}\n`);

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("https://www.figma.com/login");

  console.log("— Log in to Figma in the browser window (complete MFA if needed).");
  console.log("— When you see your file dashboard, return here and press Enter.\n");

  const rl = createInterface({ input, output });
  await rl.question("Press Enter to capture the session... ");
  rl.close();

  await mkdir(dirname(STORAGE_PATH), { recursive: true });
  await context.storageState({ path: STORAGE_PATH });
  console.log(`\nSaved storage state to ${STORAGE_PATH}`);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
