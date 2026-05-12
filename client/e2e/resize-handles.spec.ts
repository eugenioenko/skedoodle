import { test, expect, Page } from "@playwright/test";

// ── Helpers ────────────────────────────────────────────────────────

const CANVAS = ".canvas-container";
const svgRoot = (page: Page) => page.locator(`${CANVAS} svg`);

/**
 * Two.js renders circles as <path> elements with bezier curves.
 * Resize handles have fill="#ffffff" and stroke="#0ea5cf".
 */
const handlePaths = (page: Page) =>
  svgRoot(page).locator('path[fill="#ffffff"][stroke="#0ea5cf"]');

/**
 * Selection/highlight outlines have stroke="#0ea5cf" and fill="none".
 */
const outlinePaths = (page: Page) =>
  svgRoot(page).locator('path[fill="none"][stroke="#0ea5cf"]');

async function canvasBBox(page: Page) {
  const box = await page.locator(CANVAS).boundingBox();
  if (!box) throw new Error("Canvas not found");
  return box;
}

async function selectTool(page: Page, tool: "hand" | "pointer" | "brush" | "rect") {
  const sidebarButtons = page.locator('button[class*="p-1 rounded"]');
  const allBtns = await sidebarButtons.all();
  const sidebarOnly: typeof allBtns = [];
  for (const btn of allBtns) {
    const box = await btn.boundingBox();
    if (box && box.x < 60 && box.y > 50) {
      sidebarOnly.push(btn);
    }
  }
  // Sidebar order: hand, pointer(group), brush, bezier, rect(group), line(group), text, eraser, zoom
  const toolIndex: Record<string, number> = { hand: 0, pointer: 1, brush: 2, rect: 4 };
  await sidebarOnly[toolIndex[tool]].click();
  await page.waitForTimeout(100);
}

async function drawRect(page: Page, x: number, y: number, w: number, h: number) {
  await selectTool(page, "rect");
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + w, y + h, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(150);
}

async function clickAt(page: Page, x: number, y: number) {
  // Hover first to ensure highlight/hit-testing state is set
  await page.mouse.move(x, y);
  await page.waitForTimeout(100);
  await page.mouse.click(x, y);
  await page.waitForTimeout(200);
}

async function drag(page: Page, fromX: number, fromY: number, toX: number, toY: number) {
  await page.mouse.move(fromX, fromY);
  await page.mouse.down();
  await page.mouse.move(toX, toY, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(200);
}

// ── Tests ──────────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  await page.goto("/sandbox");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await svgRoot(page).waitFor({ state: "attached", timeout: 5000 });
  await page.waitForTimeout(500);
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
