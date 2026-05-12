import { test, expect, Page } from "@playwright/test";

const CANVAS = ".canvas-container";
const svgRoot = (page: Page) => page.locator(`${CANVAS} svg`);

async function canvasBBox(page: Page) {
  const box = await page.locator(CANVAS).boundingBox();
  if (!box) throw new Error("Canvas not found");
  return box;
}

async function selectTool(page: Page, tool: "pointer" | "brush" | "rect") {
  const sidebarButtons = page.locator('button[class*="p-1 rounded"]');
  const allBtns = await sidebarButtons.all();
  const sidebarOnly: typeof allBtns = [];
  for (const btn of allBtns) {
    const box = await btn.boundingBox();
    if (box && box.x < 60 && box.y > 50) sidebarOnly.push(btn);
  }
  const toolIndex: Record<string, number> = { pointer: 1, brush: 2, rect: 4 };
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

async function getShapeCount(page: Page): Promise<number> {
  return await page.evaluate(() => {
    const store = (window as any).doodler;
    if (!store) return -1;
    const children = store.canvas.children;
    let count = 0;
    for (const child of children) {
      if (child.id !== store.highlights.id) count++;
    }
    return count;
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto("/sandbox");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await svgRoot(page).waitFor({ state: "attached", timeout: 5000 });
  await page.waitForTimeout(500);
});

test.describe("Batch undo/redo", () => {
  test("#46: multi-delete undoes in a single step", async ({ page }) => {
    const box = await canvasBBox(page);
    const cx = box.x + 400;
    const cy = box.y + 300;

    // Draw 3 rectangles
    await drawRect(page, cx - 150, cy - 50, 80, 80);
    await drawRect(page, cx - 30, cy - 50, 80, 80);
    await drawRect(page, cx + 90, cy - 50, 80, 80);

    const initialCount = await getShapeCount(page);
    expect(initialCount).toBe(3);

    // Select all with marquee
    await selectTool(page, "pointer");
    await page.mouse.move(cx - 200, cy - 100);
    await page.mouse.down();
    await page.mouse.move(cx + 220, cy + 100, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(300);

    // Delete all
    await page.keyboard.press("Delete");
    await page.waitForTimeout(300);

    const afterDelete = await getShapeCount(page);
    expect(afterDelete).toBe(0);

    // Single undo should restore ALL shapes
    await page.keyboard.press("Control+z");
    await page.waitForTimeout(300);

    const afterUndo = await getShapeCount(page);
    expect(afterUndo, "single undo should restore all deleted shapes").toBe(3);

    // Single redo should remove ALL shapes again
    await page.keyboard.press("Control+Shift+z");
    await page.waitForTimeout(500);

    const afterRedo = await getShapeCount(page);
    expect(afterRedo, "single redo should remove all shapes again").toBe(0);
  });
});
