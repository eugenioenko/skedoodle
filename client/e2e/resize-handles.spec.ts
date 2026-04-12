import { test, expect } from "@playwright/test";
import {
  setupCanvas,
  canvasBBox,
  handlePaths,
  outlinePaths,
  selectTool,
  drawRect,
  clickAt,
  drag,
} from "./helpers";

// ── Tests ──────────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  await setupCanvas(page);
});

test.describe("Resize handles", () => {
  test("selecting a shape shows exactly 4 handle paths", async ({ page }) => {
    const box = await canvasBBox(page);
    const cx = box.x + 400;
    const cy = box.y + 200;

    await drawRect(page, cx - 50, cy - 50, 100, 100);

    expect(await handlePaths(page).count()).toBe(0);

    await selectTool(page, "pointer");
    await clickAt(page, cx, cy);

    expect(await handlePaths(page).count()).toBe(4);
  });

  test("deselecting removes all handles", async ({ page }) => {
    const box = await canvasBBox(page);
    const cx = box.x + 400;
    const cy = box.y + 200;

    await drawRect(page, cx - 50, cy - 50, 100, 100);
    await selectTool(page, "pointer");
    await clickAt(page, cx, cy);

    expect(await handlePaths(page).count()).toBe(4);

    // Click empty canvas area to deselect (avoid right panel)
    await clickAt(page, box.x + 100, box.y + box.height - 50);

    expect(await handlePaths(page).count()).toBe(0);
  });

  test("resize then move: no orphaned handles or outlines", async ({ page }) => {
    const box = await canvasBBox(page);
    const cx = box.x + 400;
    const cy = box.y + 250;

    await drawRect(page, cx - 60, cy - 40, 120, 80);

    await selectTool(page, "pointer");
    await clickAt(page, cx, cy);

    // 4 handles + 1 group outline
    expect(await handlePaths(page).count()).toBe(4);
    expect(await outlinePaths(page).count()).toBe(1);

    // Resize: drag the SE handle
    const seHandle = handlePaths(page).last();
    const seBox = await seHandle.boundingBox();
    await drag(page, seBox!.x + seBox!.width / 2, seBox!.y + seBox!.height / 2,
               seBox!.x + 30, seBox!.y + 20);

    // After resize: still exactly 4 handles
    expect(await handlePaths(page).count()).toBe(4);

    // Move the shape by dragging from a point within the group outline
    const outline = outlinePaths(page).last();
    const outlineBox = await outline.boundingBox();
    const moveSrcX = outlineBox!.x + outlineBox!.width / 2;
    const moveSrcY = outlineBox!.y + outlineBox!.height / 2;
    await drag(page, moveSrcX, moveSrcY, moveSrcX + 50, moveSrcY + 30);

    // After move: still exactly 4 handles
    expect(await handlePaths(page).count()).toBe(4);

    // Deselect (click empty canvas, avoid right panel)
    await clickAt(page, box.x + 100, box.y + box.height - 50);

    // All handles and outlines gone
    expect(await handlePaths(page).count()).toBe(0);
    expect(await outlinePaths(page).count()).toBe(0);
  });

  test("resize then hover: no extra elements", async ({ page }) => {
    const box = await canvasBBox(page);
    const cx = box.x + 400;
    const cy = box.y + 250;

    await drawRect(page, cx - 60, cy - 40, 120, 80);

    await selectTool(page, "pointer");
    await clickAt(page, cx, cy);

    // Resize SE handle
    const seHandle = handlePaths(page).last();
    const seBox = await seHandle.boundingBox();
    await drag(page, seBox!.x + seBox!.width / 2, seBox!.y + seBox!.height / 2,
               seBox!.x + 30, seBox!.y + 20);

    // Move via outline center
    const outline = outlinePaths(page).first();
    const outlineBox = await outline.boundingBox();
    const moveSrcX = outlineBox!.x + outlineBox!.width / 2;
    const moveSrcY = outlineBox!.y + outlineBox!.height / 2;
    await drag(page, moveSrcX, moveSrcY, moveSrcX + 30, moveSrcY + 20);

    // Hover over shape at new position
    await page.mouse.move(moveSrcX + 30, moveSrcY + 20);
    await page.waitForTimeout(300);

    // Still exactly 4 handles (no orphans from resize/move)
    expect(await handlePaths(page).count()).toBe(4);
  });

  test("switching tools removes handles", async ({ page }) => {
    const box = await canvasBBox(page);
    const cx = box.x + 400;
    const cy = box.y + 200;

    await drawRect(page, cx - 50, cy - 50, 100, 100);

    await selectTool(page, "pointer");
    await clickAt(page, cx, cy);
    expect(await handlePaths(page).count()).toBe(4);

    // Switch to hand tool
    await selectTool(page, "hand");
    await page.waitForTimeout(100);

    expect(await handlePaths(page).count()).toBe(0);
  });
});
