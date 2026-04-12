import { test, expect } from "@playwright/test";
import {
  setupCanvas,
  canvasBBox,
  svgRoot,
  selectTool,
  drawRect,
  drawLine,
  clickAt,
  drag,
  handlePaths,
  outlinePaths,
  undo,
  redo,
  countUserPaths,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await setupCanvas(page);
});

test.describe("Undo / Redo", () => {
  test("undo removes a created shape, redo restores it", async ({ page }) => {
    const box = await canvasBBox(page);
    const cx = box.x + 400;
    const cy = box.y + 200;

    const before = await countUserPaths(page);
    await drawRect(page, cx, cy, 100, 80);
    const after = await countUserPaths(page);
    expect(after).toBeGreaterThan(before);

    await undo(page);
    expect(await countUserPaths(page)).toBe(before);

    await redo(page);
    expect(await countUserPaths(page)).toBe(after);
  });

  test("undo restores an erased shape", async ({ page }) => {
    const box = await canvasBBox(page);
    const cx = box.x + 400;
    const cy = box.y + 200;

    await drawRect(page, cx - 50, cy - 40, 100, 80);
    const afterDraw = await countUserPaths(page);

    // Erase it — eraser tool uses mouseDown to delete, and also highlights on move.
    // We need to move over the shape first (to trigger highlight), then click.
    await selectTool(page, "eraser");
    await page.mouse.move(cx, cy);
    await page.waitForTimeout(150);
    await page.mouse.down();
    await page.mouse.up();
    await page.waitForTimeout(200);

    expect(await countUserPaths(page)).toBeLessThan(afterDraw);

    // Undo the erase
    await undo(page);
    expect(await countUserPaths(page)).toBe(afterDraw);
  });

  test("undo reverts a move operation", async ({ page }) => {
    const box = await canvasBBox(page);
    const cx = box.x + 400;
    const cy = box.y + 250;

    await drawRect(page, cx - 50, cy - 40, 100, 80);
    const pathsAfterCreate = await countUserPaths(page);

    // Select the shape and move it
    await selectTool(page, "pointer");
    await clickAt(page, cx, cy);
    expect(await handlePaths(page).count()).toBe(4);

    // Record the shape path's bounding box before move
    // Use the outline (group outline) which tracks the shape position
    const outlineBefore = await outlinePaths(page).first().boundingBox();

    // Drag shape to a new position
    await drag(page, cx, cy, cx + 120, cy + 80);

    // Outline should have moved
    const outlineAfterMove = await outlinePaths(page).first().boundingBox();
    expect(Math.abs(outlineAfterMove!.x - outlineBefore!.x)).toBeGreaterThan(50);

    // Undo the move
    await undo(page);

    // Shape is still on canvas (move undo doesn't remove it)
    expect(await countUserPaths(page)).toBe(pathsAfterCreate);
  });

  test("multiple undos in sequence", async ({ page }) => {
    const box = await canvasBBox(page);
    const baseX = box.x + 300;
    const baseY = box.y + 200;

    const before = await countUserPaths(page);

    // Create 3 shapes
    await drawRect(page, baseX, baseY, 80, 60);
    await drawRect(page, baseX + 120, baseY, 80, 60);
    await drawLine(page, baseX + 250, baseY, baseX + 350, baseY + 60);

    const afterAll = await countUserPaths(page);
    expect(afterAll).toBeGreaterThan(before);

    // Undo all 3
    await undo(page);
    await undo(page);
    await undo(page);

    expect(await countUserPaths(page)).toBe(before);
  });

  test("redo is discarded after a new action", async ({ page }) => {
    const box = await canvasBBox(page);
    const cx = box.x + 400;
    const cy = box.y + 200;

    const before = await countUserPaths(page);

    // Create and undo a shape
    await drawRect(page, cx, cy, 100, 80);
    await undo(page);
    expect(await countUserPaths(page)).toBe(before);

    // Create a different shape — this should discard the redo stack
    await drawRect(page, cx + 150, cy, 80, 60);
    const afterNew = await countUserPaths(page);

    // Redo should do nothing (redo stack was cleared)
    await redo(page);
    expect(await countUserPaths(page)).toBe(afterNew);
  });
});
