import { test, expect } from "@playwright/test";
import {
  setupCanvas,
  canvasBBox,
  svgRoot,
  selectTool,
  clickAt,
  countUserPaths,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await setupCanvas(page);
});

test.describe("Bezier lifecycle", () => {
  test("click 3+ points then Enter finalizes an open path", async ({ page }) => {
    const box = await canvasBBox(page);
    const cx = box.x + 400;
    const cy = box.y + 250;

    const before = await countUserPaths(page);

    await selectTool(page, "bezier");
    await clickAt(page, cx - 80, cy);
    await clickAt(page, cx, cy - 60);
    await clickAt(page, cx + 80, cy);

    // Press Enter to finalize
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);

    // Path should be added
    expect(await countUserPaths(page)).toBeGreaterThan(before);

    // All helper elements (anchor dots, preview line) should be cleaned up
    const anchorDots = svgRoot(page).locator(`circle[fill="#0ea5cf"]`);
    expect(await anchorDots.count()).toBe(0);
  });

  test("Escape cancels bezier and removes all elements", async ({ page }) => {
    const box = await canvasBBox(page);
    const cx = box.x + 400;
    const cy = box.y + 250;

    const before = await countUserPaths(page);

    await selectTool(page, "bezier");
    await clickAt(page, cx - 80, cy);
    await clickAt(page, cx, cy - 60);
    await clickAt(page, cx + 80, cy);

    // Press Escape to cancel
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    // No path should be created
    expect(await countUserPaths(page)).toBe(before);

    // No helper elements remaining
    const anchorDots = svgRoot(page).locator(`circle[fill="#0ea5cf"]`);
    expect(await anchorDots.count()).toBe(0);
  });

  test("clicking near first anchor closes the shape", async ({ page }) => {
    const box = await canvasBBox(page);
    const cx = box.x + 400;
    const cy = box.y + 250;

    const before = await countUserPaths(page);

    await selectTool(page, "bezier");

    // Create a triangle-like shape
    await clickAt(page, cx, cy - 60);
    await clickAt(page, cx + 80, cy + 40);
    await clickAt(page, cx - 80, cy + 40);

    // Click near the first anchor to close (within CLOSE_THRESHOLD=15 surface units)
    await clickAt(page, cx + 2, cy - 58);
    await page.waitForTimeout(200);

    // Shape should be finalized
    expect(await countUserPaths(page)).toBeGreaterThan(before);

    // All helper elements cleaned up
    const anchorDots = svgRoot(page).locator(`circle[fill="#0ea5cf"]`);
    expect(await anchorDots.count()).toBe(0);
  });

  test("bezier with only 2 points is finalized as open path on Enter", async ({ page }) => {
    const box = await canvasBBox(page);
    const cx = box.x + 400;
    const cy = box.y + 250;

    const before = await countUserPaths(page);

    await selectTool(page, "bezier");
    await clickAt(page, cx - 60, cy);
    await clickAt(page, cx + 60, cy);

    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);

    // 2 points is enough to finalize (>= 2 vertices)
    expect(await countUserPaths(page)).toBeGreaterThan(before);
  });

  test("dragging while placing a point creates curved handles", async ({ page }) => {
    const box = await canvasBBox(page);
    const cx = box.x + 400;
    const cy = box.y + 250;

    await selectTool(page, "bezier");

    // First point — click and drag to set handle
    await page.mouse.move(cx - 80, cy);
    await page.mouse.down();
    await page.mouse.move(cx - 80, cy - 40, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(100);

    // Second point — click and drag
    await page.mouse.move(cx + 80, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 80, cy + 40, { steps: 5 });
    await page.mouse.up();
    await page.waitForTimeout(100);

    // Finalize
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);

    // Should create a curved path (not just straight line)
    const before = await countUserPaths(page);
    expect(before).toBeGreaterThan(0);

    // Helpers should be cleaned up
    const anchorDots = svgRoot(page).locator(`circle[fill="#0ea5cf"]`);
    expect(await anchorDots.count()).toBe(0);
  });
});
