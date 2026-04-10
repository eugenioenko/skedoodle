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
    if (box && box.x < 60) {
      sidebarOnly.push(btn);
    }
  }
  const toolIndex: Record<string, number> = { hand: 0, pointer: 1, brush: 2, rect: 3 };
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
  await page.goto("/local");
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

    // 4 handles + 1 selection outline
    expect(await handlePaths(page).count()).toBe(4);
    expect(await outlinePaths(page).count()).toBe(1);

    // Resize: drag the SE handle (bottom-right corner of the shape)
    // Shape is 120x80 centered at (cx, cy), so SE corner is at (cx+60, cy+40)
    await drag(page, cx + 60, cy + 40, cx + 90, cy + 60);

    // After resize: still exactly 4 handles, 1 outline
    expect(await handlePaths(page).count()).toBe(4);
    expect(await outlinePaths(page).count()).toBe(1);

    // Move the shape
    await drag(page, cx, cy, cx + 50, cy + 30);

    // After move: still exactly 4 handles, 1 outline
    expect(await handlePaths(page).count()).toBe(4);
    expect(await outlinePaths(page).count()).toBe(1);

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

    // Resize SE corner
    await drag(page, cx + 60, cy + 40, cx + 90, cy + 60);

    // Move
    await drag(page, cx, cy, cx + 30, cy + 20);

    // Hover over shape at new position
    await page.mouse.move(cx + 30, cy + 20);
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
