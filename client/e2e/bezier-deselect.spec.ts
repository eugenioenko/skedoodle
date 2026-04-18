import { test, expect, Page } from "@playwright/test";

const CANVAS = ".canvas-container";
const svgRoot = (page: Page) => page.locator(`${CANVAS} svg`);
const HIGHLIGHT = "#0ea5cf";

async function canvasBBox(page: Page) {
  const box = await page.locator(CANVAS).boundingBox();
  if (!box) throw new Error("Canvas not found");
  return box;
}

async function selectTool(page: Page, tool: "pointer" | "bezier") {
  const sidebarButtons = page.locator('button[class*="p-1 rounded"]');
  const allBtns = await sidebarButtons.all();
  const sidebarOnly: typeof allBtns = [];
  for (const btn of allBtns) {
    const box = await btn.boundingBox();
    // Sidebar buttons are in the left rail (x < 60) and below the top bar (y > 50)
    if (box && box.x < 60 && box.y > 50) sidebarOnly.push(btn);
  }
  // Sidebar order: hand, pointer(group), brush, bezier, rect(group), line(group), text, eraser, zoom
  const toolIndex: Record<string, number> = { pointer: 1, bezier: 3 };
  await sidebarOnly[toolIndex[tool]].click();
  await page.waitForTimeout(100);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/sandbox");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await svgRoot(page).waitFor({ state: "attached", timeout: 5000 });
  await page.waitForTimeout(500);
});

test.describe("Pointer tool — deselect after hover-click", () => {
  test("bezier shape stroke restores to original after select then deselect", async ({ page }) => {
    const box = await canvasBBox(page);
    const cx = box.x + 400;
    const cy = box.y + 300;

    // Draw a bezier path: 3 anchor points (click + small drag = anchor with handles).
    // Use click sequence at distinct positions.
    await selectTool(page, "bezier");
    await page.mouse.click(cx - 80, cy);
    await page.waitForTimeout(50);
    await page.mouse.click(cx, cy - 60);
    await page.waitForTimeout(50);
    await page.mouse.click(cx + 80, cy);
    await page.waitForTimeout(50);

    // Switching tools finalizes the bezier path
    await selectTool(page, "pointer");
    await page.waitForTimeout(300);

    // Find the finalized bezier path. It has fill="none" and a non-highlight stroke.
    const bezierPath = svgRoot(page).locator(
      `path[fill="none"]:not([stroke="${HIGHLIGHT}"])`
    );
    const originalStroke = await bezierPath.first().getAttribute("stroke");
    expect(originalStroke, "bezier should have a non-highlight original stroke").not.toBe(HIGHLIGHT);

    // Hover the path to set highlight
    await page.mouse.move(cx, cy - 55);
    await page.waitForTimeout(150);

    // Click to select (still hovering)
    await page.mouse.click(cx, cy - 55);
    await page.waitForTimeout(200);

    // Move cursor away (unhover)
    await page.mouse.move(box.x + 50, box.y + 50);
    await page.waitForTimeout(150);

    // Click outside the shape to deselect — must clear the left toolbar (~56px)
    // and the right panel (~320px), both absolute-positioned over the canvas.
    await page.mouse.click(box.x + 200, box.y + box.height - 50);
    await page.waitForTimeout(300);

    // After deselect, the path's stroke should be the original color, not the highlight.
    const allPaths = svgRoot(page).locator("path");
    const count = await allPaths.count();
    let foundHighlightedShape = false;
    for (let i = 0; i < count; i++) {
      const p = allPaths.nth(i);
      const fill = await p.getAttribute("fill");
      const stroke = await p.getAttribute("stroke");
      // Skip the resize-handle squares (they have white fill + highlight stroke)
      if (fill === "#ffffff" && stroke === HIGHLIGHT) continue;
      // Any remaining path with highlight stroke is a leaked outline/border
      if (stroke === HIGHLIGHT) {
        foundHighlightedShape = true;
        break;
      }
    }

    expect(
      foundHighlightedShape,
      "no path should retain the highlight stroke after deselection"
    ).toBe(false);

    // Confirm the bezier specifically restored to its original stroke
    const finalStroke = await bezierPath.first().getAttribute("stroke");
    expect(finalStroke).toBe(originalStroke);
  });
});
