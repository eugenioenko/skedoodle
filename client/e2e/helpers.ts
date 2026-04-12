import { Page } from "@playwright/test";

// ── Selectors ─────────────────────────────────────────────────────

export const CANVAS = ".canvas-container";

export const svgRoot = (page: Page) => page.locator(`${CANVAS} svg`);

/**
 * Resize handles: white fill with cyan stroke.
 */
export const handlePaths = (page: Page) =>
  svgRoot(page).locator('path[fill="#ffffff"][stroke="#0ea5cf"]');

/**
 * Selection/highlight outlines: cyan stroke, no fill.
 */
export const outlinePaths = (page: Page) =>
  svgRoot(page).locator('path[fill="none"][stroke="#0ea5cf"]');

// ── Canvas helpers ────────────────────────────────────────────────

export async function canvasBBox(page: Page) {
  const box = await page.locator(CANVAS).boundingBox();
  if (!box) throw new Error("Canvas not found");
  return box;
}

/**
 * Count all SVG <path> elements that are NOT handles or outlines
 * (i.e. user-created shapes). Excludes cyan-colored elements.
 */
export async function countUserPaths(page: Page) {
  return svgRoot(page)
    .locator('path:not([fill="#ffffff"][stroke="#0ea5cf"]):not([fill="none"][stroke="#0ea5cf"])')
    .count();
}

// ── Setup ─────────────────────────────────────────────────────────

export async function setupCanvas(page: Page) {
  await page.goto("/local");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await svgRoot(page).waitFor({ state: "attached", timeout: 5000 });
  await page.waitForTimeout(500);
}

// ── Tool selection ────────────────────────────────────────────────

/**
 * Select a tool by clicking its `data-testid="tool-{name}"` button.
 * For grouped tools (node, ellipse, arrow), hover the group button first
 * to open the flyout, then click the specific tool.
 */
export async function selectTool(page: Page, tool: string) {
  // Tool groups: each pair shares a button. The visible button shows whichever
  // tool in the group was last selected. To select a grouped tool, we may need
  // to hover the current group button to open the flyout.
  const GROUPS: string[][] = [
    ["pointer", "node"],
    ["square", "ellipse"],
    ["line", "arrow"],
  ];

  // Find if this tool is in a group
  const group = GROUPS.find((g) => g.includes(tool));

  if (group) {
    // Try clicking the tool directly first (it's the active one in the group)
    const direct = page.locator(`[data-testid="tool-${tool}"]`).first();
    if (await direct.isVisible({ timeout: 200 }).catch(() => false)) {
      await direct.click();
      await page.waitForTimeout(100);
      return;
    }

    // Not visible — hover the sibling that IS visible to open flyout
    for (const sibling of group) {
      if (sibling === tool) continue;
      const siblingBtn = page.locator(`[data-testid="tool-${sibling}"]`).first();
      if (await siblingBtn.isVisible({ timeout: 200 }).catch(() => false)) {
        await siblingBtn.hover();
        await page.waitForTimeout(200);
        // Click the flyout item
        await page.locator(`[data-testid="tool-${tool}"]`).click();
        await page.waitForTimeout(100);
        return;
      }
    }
  }

  await page.locator(`[data-testid="tool-${tool}"]`).first().click();
  await page.waitForTimeout(100);
}

// ── Mouse helpers ─────────────────────────────────────────────────

export async function clickAt(page: Page, x: number, y: number) {
  await page.mouse.move(x, y);
  await page.waitForTimeout(100);
  await page.mouse.click(x, y);
  await page.waitForTimeout(200);
}

export async function drag(
  page: Page,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  steps = 10
) {
  await page.mouse.move(fromX, fromY);
  await page.mouse.down();
  await page.mouse.move(toX, toY, { steps });
  await page.mouse.up();
  await page.waitForTimeout(200);
}

// ── Drawing helpers ───────────────────────────────────────────────

export async function drawRect(
  page: Page,
  x: number,
  y: number,
  w: number,
  h: number
) {
  await selectTool(page, "square");
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + w, y + h, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(150);
}

export async function drawEllipse(
  page: Page,
  x: number,
  y: number,
  w: number,
  h: number
) {
  await selectTool(page, "ellipse");
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + w, y + h, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(150);
}

export async function drawLine(
  page: Page,
  x1: number,
  y1: number,
  x2: number,
  y2: number
) {
  await selectTool(page, "line");
  await page.mouse.move(x1, y1);
  await page.mouse.down();
  await page.mouse.move(x2, y2, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(150);
}

export async function drawBrushStroke(
  page: Page,
  points: { x: number; y: number }[]
) {
  if (points.length < 2) throw new Error("Need at least 2 points");
  await selectTool(page, "brush");
  await page.mouse.move(points[0].x, points[0].y);
  await page.mouse.down();
  for (let i = 1; i < points.length; i++) {
    await page.mouse.move(points[i].x, points[i].y, { steps: 3 });
  }
  await page.mouse.up();
  await page.waitForTimeout(150);
}

// ── Keyboard shortcuts ────────────────────────────────────────────

export async function undo(page: Page) {
  await page.keyboard.press("Control+z");
  await page.waitForTimeout(200);
}

export async function redo(page: Page) {
  await page.keyboard.press("Control+Shift+z");
  await page.waitForTimeout(200);
}
