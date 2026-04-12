import { test, expect } from "@playwright/test";
import {
  setupCanvas,
  canvasBBox,
  svgRoot,
  handlePaths,
  selectTool,
  drawRect,
  drawLine,
  drawBrushStroke,
  clickAt,
  countUserPaths,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await setupCanvas(page);
});

test.describe("Tool switching cleanup", () => {
  test("pointer handles are removed when switching to brush", async ({ page }) => {
    const box = await canvasBBox(page);
    const cx = box.x + 400;
    const cy = box.y + 200;

    await drawRect(page, cx - 50, cy - 50, 100, 100);
    await selectTool(page, "pointer");
    await clickAt(page, cx, cy);
    expect(await handlePaths(page).count()).toBe(4);

    await selectTool(page, "brush");
    expect(await handlePaths(page).count()).toBe(0);
  });

  test("pointer handles are removed when switching to eraser", async ({ page }) => {
    const box = await canvasBBox(page);
    const cx = box.x + 400;
    const cy = box.y + 200;

    await drawRect(page, cx - 50, cy - 50, 100, 100);
    await selectTool(page, "pointer");
    await clickAt(page, cx, cy);
    expect(await handlePaths(page).count()).toBe(4);

    await selectTool(page, "eraser");
    expect(await handlePaths(page).count()).toBe(0);
  });

  test("bezier mid-draw is finalized when switching tool", async ({ page }) => {
    const box = await canvasBBox(page);
    const cx = box.x + 400;
    const cy = box.y + 200;

    const before = await countUserPaths(page);

    // Start a bezier path with 3 points (enough to finalize)
    await selectTool(page, "bezier");
    await clickAt(page, cx, cy);
    await clickAt(page, cx + 80, cy - 60);
    await clickAt(page, cx + 160, cy);

    // Switch tool — should finalize the bezier, not leave orphans
    await selectTool(page, "pointer");
    await page.waitForTimeout(200);

    // The bezier path should be finalized as a user path
    expect(await countUserPaths(page)).toBeGreaterThan(before);

    // No cyan-colored anchor dots should remain (bezier helper elements)
    const anchorDots = svgRoot(page).locator(`circle[fill="#0ea5cf"]`);
    expect(await anchorDots.count()).toBe(0);
  });

  test("bezier single-point is discarded when switching tool", async ({ page }) => {
    const box = await canvasBBox(page);
    const cx = box.x + 400;
    const cy = box.y + 200;

    const before = await countUserPaths(page);

    // Start a bezier with only 1 point (not enough to finalize)
    await selectTool(page, "bezier");
    await clickAt(page, cx, cy);

    // Switch tool — single point should be discarded
    await selectTool(page, "pointer");
    await page.waitForTimeout(200);

    expect(await countUserPaths(page)).toBe(before);
  });

  test("text overlay is removed when switching tool", async ({ page }) => {
    const box = await canvasBBox(page);
    const cx = box.x + 400;
    const cy = box.y + 200;

    // Create text overlay
    await selectTool(page, "text");
    await clickAt(page, cx, cy);
    await page.waitForTimeout(200);

    // Verify overlay exists
    const overlay = page.locator('div[contenteditable="true"]');
    expect(await overlay.count()).toBeGreaterThanOrEqual(1);

    // Switch tool — overlay should be dismissed (blur triggers commit or cleanup)
    await selectTool(page, "brush");
    await page.waitForTimeout(300);

    // Overlay should be gone
    expect(await overlay.count()).toBe(0);
  });

  test("node tool handles are removed when switching away", async ({ page }) => {
    const box = await canvasBBox(page);
    const cx = box.x + 400;
    const cy = box.y + 200;

    // Draw a brush stroke (editable by node tool, larger hit area than a line)
    await drawBrushStroke(page, [
      { x: cx - 80, y: cy },
      { x: cx, y: cy - 40 },
      { x: cx + 80, y: cy },
    ]);

    // Switch to node tool and click on the stroke
    await selectTool(page, "node");
    await clickAt(page, cx, cy - 20);
    await page.waitForTimeout(300);

    // Node vertex dots are Two.js Circle objects rendered as <path> elements.
    // They have white fill with cyan stroke — same selector as resize handles.
    const nodeDots = handlePaths(page);
    expect(await nodeDots.count()).toBeGreaterThan(0);

    // Switch to hand tool
    await selectTool(page, "hand");
    await page.waitForTimeout(200);

    // Node dots should be gone
    expect(await nodeDots.count()).toBe(0);
  });
});
