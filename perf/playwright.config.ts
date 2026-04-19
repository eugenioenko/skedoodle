import { defineConfig, devices } from "@playwright/test";

// Perf measurement runs are intentionally serial: any other browser
// activity contaminates CDP CPU samples. Don't enable parallelism here.
export default defineConfig({
  testDir: "./scenarios",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    headless: true,
    viewport: { width: 1440, height: 900 },
    launchOptions: {
      args: [
        "--disable-extensions",
        "--no-first-run",
        "--disable-background-networking",
        "--disable-default-apps",
        "--disable-sync",
        "--disable-component-update",
        "--disable-features=Translate,BackForwardCache",
        "--metrics-recording-only",
      ],
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
