import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const configHome =
  process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config");
const STORAGE_PATH =
  process.env.SKEDOODLE_PERF_FIGMA_STORAGE ??
  join(configHome, "skedoodle-perf", "figma.storage.json");

// Poll for an authenticated URL rather than blocking on readline — stdin is
// unreliable when this script runs under a harness that backgrounds it.
const LOGIN_TIMEOUT_MS = 5 * 60 * 1000;

async function main() {
  console.log("Opening Chromium for Figma login...");
  console.log(`Storage state will be saved to: ${STORAGE_PATH}`);
  console.log(
    `\nLog in (complete MFA if needed). Capture happens automatically once you reach the Figma dashboard. Timeout: ${LOGIN_TIMEOUT_MS / 1000}s.\n`,
  );

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("https://www.figma.com/login");

  // Figma redirects to /files/* (recent, drafts, team...) on successful login.
  await page.waitForURL(
    (url) =>
      url.hostname.endsWith("figma.com") && url.pathname.startsWith("/files"),
    { timeout: LOGIN_TIMEOUT_MS },
  );
  // Let auth cookies and localStorage settle before capture.
  await page.waitForTimeout(2000);

  await mkdir(dirname(STORAGE_PATH), { recursive: true });
  await context.storageState({ path: STORAGE_PATH });
  console.log(`Saved storage state to ${STORAGE_PATH}`);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
