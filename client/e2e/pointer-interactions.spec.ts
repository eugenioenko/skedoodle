import { test, expect } from "@playwright/test";
import {
  setupCanvas,
  canvasBBox,
  svgRoot,
  handlePaths,
  outlinePaths,
  selectTool,
  drawRect,
  drawLine,
  drawBrushStroke,
  clickAt,
  drag,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await setupCanvas(page);
});

test.describe("Pointer interactions", () => {
  test("select shape, move it, deselect — shape stays at new position", async ({ page }) => {
    const box = await canvasBBox(page);
    const cx = box.x + 400;
    const cy = box.y + 250;

    await drawRect(page, cx - 50, cy - 40, 100, 80);

    await selectTool(page, "pointer");
    await clickAt(page, cx, cy);
    expect(await handlePaths(page).count()).toBe(4);

    // Record handle position before move
    const handleBefore = await handlePaths(page).first().boundingBox();

    // Move the shape
    await drag(page, cx, cy, cx + 120, cy + 80);

    // Record handle position after move
    const handleAfter = await handlePaths(page).first().boundingBox();

    // Handles should have moved significantly
    expect(Math.abs(handleAfter!.x - handleBefore!.x)).toBeGreaterThan(50);

    // Deselect
    await clickAt(page, box.x + 100, box.y + box.height - 50);
    expect(await handlePaths(page).count()).toBe(0);

    // Re-select at new position — should find the shape there
    await clickAt(page, cx + 120, cy + 80);
    expect(await handlePaths(page).count()).toBe(4);
  });

  test("click empty space clears selection", async ({ page }) => {
    const box = await canvasBBox(page);
    const cx = box.x + 400;
    const cy = box.y + 200;

    await drawRect(page, cx - 50, cy - 50, 100, 100);

    await selectTool(page, "pointer");
    await clickAt(page, cx, cy);
    expect(await handlePaths(page).count()).toBe(4);

    // Click far from the shape
    await clickAt(page, box.x + 100, box.y + 100);
    expect(await handlePaths(page).count()).toBe(0);
  });

  test("shift+click adds to selection", async ({ page }) => {
    const box = await canvasBBox(page);
    const x1 = box.x + 300;
    const x2 = box.x + 500;
    const cy = box.y + 200;

    // Draw two separate rectangles
    await drawRect(page, x1 - 40, cy - 30, 80, 60);
    await drawRect(page, x2 - 40, cy - 30, 80, 60);

    await selectTool(page, "pointer");

    // Select first shape
    await clickAt(page, x1, cy);
    expect(await handlePaths(page).count()).toBe(4);

    // Shift+click second shape — should now have group selection
    await page.keyboard.down("Shift");
    await clickAt(page, x2, cy);
    await page.keyboard.up("Shift");

    // With multi-selection, we still get 4 corner handles (group handles)
    expect(await handlePaths(page).count()).toBe(4);
    // But the outline should encompass both shapes (wider than single shape)
    const outline = await outlinePaths(page).first().boundingBox();
    expect(outline!.width).toBeGreaterThan(150);
  });

  test("marquee selection selects shapes within bounds", async ({ page }) => {
    const box = await canvasBBox(page);
    const x1 = box.x + 350;
    const x2 = box.x + 500;
    const cy = box.y + 250;

    // Draw two shapes near each other
    await drawRect(page, x1 - 30, cy - 25, 60, 50);
    await drawRect(page, x2 - 30, cy - 25, 60, 50);

    await selectTool(page, "pointer");

    // Drag a marquee around both shapes
    await drag(page, x1 - 60, cy - 60, x2 + 60, cy + 60);
    await page.waitForTimeout(200);

    // Both should be selected (group handles visible)
    expect(await handlePaths(page).count()).toBe(4);

    // Outline should span both shapes
    const outline = await outlinePaths(page).first().boundingBox();
    expect(outline!.width).toBeGreaterThan(100);
  });

  test("node tool shows vertex handles, switching away clears them", async ({ page }) => {
    const box = await canvasBBox(page);
    const cx = box.x + 400;
    const cy = box.y + 250;

    // Draw a brush stroke (node-editable, has more area than a thin line)
    await drawBrushStroke(page, [
      { x: cx - 80, y: cy },
      { x: cx, y: cy - 40 },
      { x: cx + 80, y: cy },
    ]);

    // Switch to node tool and click on the stroke to edit its vertices
    await selectTool(page, "node");
    await clickAt(page, cx, cy - 20);
    await page.waitForTimeout(300);

    // Node vertex dots are Two.js Circle objects rendered as <path> elements
    // with white fill and cyan stroke — same pattern as resize handles.
    const nodeDots = handlePaths(page);
    expect(await nodeDots.count()).toBeGreaterThan(0);

    // Switch to pointer tool — node handles should be cleaned up
    await selectTool(page, "pointer");
    await page.waitForTimeout(200);

    expect(await nodeDots.count()).toBe(0);
  });
});
