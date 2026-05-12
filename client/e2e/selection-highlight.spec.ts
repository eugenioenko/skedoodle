import { test, expect, Page } from "@playwright/test";

const CANVAS = ".canvas-container";
const svgRoot = (page: Page) => page.locator(`${CANVAS} svg`);
const HIGHLIGHT = "#0ea5cf";

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
    if (box && box.x < 60 && box.y > 50) sidebarOnly.push(btn);
  }
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
  await page.mouse.move(x, y);
  await page.waitForTimeout(100);
  await page.mouse.click(x, y);
  await page.waitForTimeout(200);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/sandbox");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await svgRoot(page).waitFor({ state: "attached", timeout: 5000 });
  await page.waitForTimeout(500);
});

test.describe("Selection highlight — original values preserved", () => {
  test("#45: properties panel shows original color, not highlight color", async ({ page }) => {
    const box = await canvasBBox(page);
    const cx = box.x + 400;
    const cy = box.y + 300;

    await drawRect(page, cx - 50, cy - 50, 100, 100);

    // Get the original stroke color from the SVG element
    const rectPath = svgRoot(page).locator("path").first();
    const originalStroke = await rectPath.getAttribute("stroke");
    expect(originalStroke).not.toBe(HIGHLIGHT);

    // Select with pointer tool
    await selectTool(page, "pointer");
    await clickAt(page, cx, cy);

    // Shape is now selected — its SVG stroke becomes the highlight color
    // But the properties panel should show the ORIGINAL color, not highlight
    const colorInput = page.locator('input[type="text"]').first();
    const displayedColor = await colorInput.inputValue();
    expect(
      displayedColor.toLowerCase(),
      "properties panel should show original color, not highlight"
    ).not.toBe(HIGHLIGHT);
  });

  test("#47: undo after delete restores original color, not highlight", async ({ page }) => {
    const box = await canvasBBox(page);
    const cx = box.x + 400;
    const cy = box.y + 300;

    await drawRect(page, cx - 50, cy - 50, 100, 100);

    // Capture original stroke
    const rectPath = svgRoot(page).locator("path").first();
    const originalStroke = await rectPath.getAttribute("stroke");
    expect(originalStroke).not.toBe(HIGHLIGHT);

    // Select and delete
    await selectTool(page, "pointer");
    await clickAt(page, cx, cy);
    await page.keyboard.press("Delete");
    await page.waitForTimeout(200);

    // Undo
    await page.keyboard.press("Control+z");
    await page.waitForTimeout(300);

    // The restored shape should have the original stroke, not highlight
    const restoredPath = svgRoot(page).locator("path").first();
    const restoredStroke = await restoredPath.getAttribute("stroke");
    expect(
      restoredStroke,
      "restored shape should have original stroke color"
    ).toBe(originalStroke);
  });

  test("#50: copy/paste preserves original color, not highlight", async ({ page }) => {
    const box = await canvasBBox(page);
    const cx = box.x + 400;
    const cy = box.y + 300;

    await drawRect(page, cx - 50, cy - 50, 100, 100);

    // Capture original stroke
    const rectPath = svgRoot(page).locator("path").first();
    const originalStroke = await rectPath.getAttribute("stroke");
    expect(originalStroke).not.toBe(HIGHLIGHT);

    // Select, copy, paste
    await selectTool(page, "pointer");
    await clickAt(page, cx, cy);
    await page.keyboard.press("Control+c");
    await page.waitForTimeout(100);
    await page.keyboard.press("Control+v");
    await page.waitForTimeout(300);

    // Find all non-highlight paths (the pasted shape should not have highlight color)
    const allPaths = svgRoot(page).locator("path");
    const count = await allPaths.count();
    for (let i = 0; i < count; i++) {
      const p = allPaths.nth(i);
      const fill = await p.getAttribute("fill");
      const stroke = await p.getAttribute("stroke");
      if (fill === "#ffffff" && stroke === HIGHLIGHT) continue;
      if (fill === "none" && stroke === HIGHLIGHT) continue;
      expect(stroke, `path ${i} should not have highlight stroke while selected`).not.toBe(HIGHLIGHT);
    }

    // Click empty space to deselect everything
    await clickAt(page, box.x + 200, box.y + box.height - 50);
    await page.waitForTimeout(200);

    // After deselect, check all paths have original color
    const afterPaths = svgRoot(page).locator("path");
    const afterCount = await afterPaths.count();
    for (let i = 0; i < afterCount; i++) {
      const p = afterPaths.nth(i);
      const stroke = await p.getAttribute("stroke");
      expect(
        stroke,
        `path ${i} should not have highlight color after deselect`
      ).not.toBe(HIGHLIGHT);
    }
  });

  test("#52: property edits persist after deselecting", async ({ page }) => {
    const box = await canvasBBox(page);
    const cx = box.x + 400;
    const cy = box.y + 300;

    await drawRect(page, cx - 50, cy - 50, 100, 100);

    const rectPath = svgRoot(page).locator("path").first();

    // Select shape
    await selectTool(page, "pointer");
    await clickAt(page, cx, cy);

    // Find the stroke width slider-input and change it
    const strokeInput = page.locator('input.slider-input').first();
    await strokeInput.click({ clickCount: 3 });
    await strokeInput.fill("10");
    await strokeInput.press("Tab");
    await page.waitForTimeout(300);

    // Deselect by clicking empty canvas
    await clickAt(page, box.x + 200, box.y + box.height - 50);
    await page.waitForTimeout(300);

    // After deselect, linewidth should be 10, not reverted to original
    const finalLinewidth = await rectPath.getAttribute("stroke-width");
    expect(
      finalLinewidth,
      "linewidth should persist after deselect, not revert"
    ).toBe("10");
  });
});
