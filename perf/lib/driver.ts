import type { Page } from "@playwright/test";

export interface AppDriver {
  name: string;
  /**
   * Optional path to a Playwright storageState JSON for auth.
   * When set, the scenario must create a fresh context with this state.
   */
  storageState?: string;
  /** Navigate to a blank canvas and wait until it's ready and idle. */
  goto(page: Page): Promise<void>;
  /** Optional human-readable reason to skip this driver (missing env, etc). */
  skipReason?(): string | null;
}
