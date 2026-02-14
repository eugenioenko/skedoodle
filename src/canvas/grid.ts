import { RgbaColor } from "colord";

const SVG_NS = "http://www.w3.org/2000/svg";

let patternEl: SVGPatternElement | null = null;
let rectEl: SVGRectElement | null = null;
let defsEl: SVGDefsElement | null = null;
let baseGridSize = 20;
let currentType: "none" | "dots" | "lines" = "dots";
let currentColor = "rgba(0,0,0,0.15)";
let minZoom = 0.5;
let lastScale = 1;
let lastTx = 0;
let lastTy = 0;

function rgbaToString(color: RgbaColor): string {
  return `rgba(${color.r},${color.g},${color.b},${color.a})`;
}

function buildPatternContent(): void {
  if (!patternEl) return;
  // Clear existing content
  while (patternEl.firstChild) {
    patternEl.removeChild(patternEl.firstChild);
  }

  const size = baseGridSize;

  if (currentType === "dots") {
    const circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("cx", String(size / 2));
    circle.setAttribute("cy", String(size / 2));
    circle.setAttribute("r", "1");
    circle.setAttribute("fill", currentColor);
    patternEl.appendChild(circle);
  } else {
    const lineH = document.createElementNS(SVG_NS, "line");
    lineH.setAttribute("x1", "0");
    lineH.setAttribute("y1", String(size));
    lineH.setAttribute("x2", String(size));
    lineH.setAttribute("y2", String(size));
    lineH.setAttribute("stroke", currentColor);
    lineH.setAttribute("stroke-width", "1");
    patternEl.appendChild(lineH);

    const lineV = document.createElementNS(SVG_NS, "line");
    lineV.setAttribute("x1", String(size));
    lineV.setAttribute("y1", "0");
    lineV.setAttribute("x2", String(size));
    lineV.setAttribute("y2", String(size));
    lineV.setAttribute("stroke", currentColor);
    lineV.setAttribute("stroke-width", "1");
    patternEl.appendChild(lineV);
  }
}

export function initGrid(
  svgElement: SVGSVGElement,
  gridSize: number,
  gridType: "none" | "dots" | "lines",
  gridColor: RgbaColor,
  gridMinZoom: number
): void {
  baseGridSize = gridSize;
  currentType = gridType;
  currentColor = rgbaToString(gridColor);
  minZoom = gridMinZoom / 100;

  defsEl = document.createElementNS(SVG_NS, "defs");

  patternEl = document.createElementNS(SVG_NS, "pattern");
  patternEl.setAttribute("id", "dot-grid-pattern");
  patternEl.setAttribute("patternUnits", "userSpaceOnUse");
  patternEl.setAttribute("width", String(gridSize));
  patternEl.setAttribute("height", String(gridSize));

  buildPatternContent();

  defsEl.appendChild(patternEl);

  rectEl = document.createElementNS(SVG_NS, "rect");
  rectEl.setAttribute("id", "dot-grid-rect");
  rectEl.setAttribute("width", "100%");
  rectEl.setAttribute("height", "100%");
  rectEl.setAttribute("fill", "url(#dot-grid-pattern)");

  if (gridType === "none") {
    rectEl.setAttribute("display", "none");
  }

  // Insert defs at the top, rect before the canvas group
  svgElement.insertBefore(defsEl, svgElement.firstChild);
  svgElement.insertBefore(rectEl, defsEl.nextSibling);
}

export function updateGrid(scale: number, tx: number, ty: number): void {
  if (!patternEl || !rectEl) return;
  lastScale = scale;
  lastTx = tx;
  lastTy = ty;

  if (currentType !== "none" && scale < minZoom) {
    rectEl.setAttribute("display", "none");
    return;
  } else if (currentType !== "none") {
    rectEl.setAttribute("display", "block");
  }

  const scaledSize = baseGridSize * scale;

  patternEl.setAttribute("x", String(tx % scaledSize));
  patternEl.setAttribute("y", String(ty % scaledSize));
  patternEl.setAttribute("width", String(scaledSize));
  patternEl.setAttribute("height", String(scaledSize));

  // Update child elements for current scale
  if (currentType === "dots") {
    const circle = patternEl.querySelector("circle");
    if (circle) {
      circle.setAttribute("cx", String(scaledSize / 2));
      circle.setAttribute("cy", String(scaledSize / 2));
      circle.setAttribute("r", String(Math.min(Math.max(scale, 0.5), 2)));
    }
  } else {
    const lines = patternEl.querySelectorAll("line");
    const lineH = lines[0];
    const lineV = lines[1];
    if (lineH) {
      lineH.setAttribute("x2", String(scaledSize));
      lineH.setAttribute("y1", String(scaledSize));
      lineH.setAttribute("y2", String(scaledSize));
      lineH.setAttribute("stroke-width", String(Math.min(Math.max(scale * 0.5, 0.3), 1)));
    }
    if (lineV) {
      lineV.setAttribute("x1", String(scaledSize));
      lineV.setAttribute("x2", String(scaledSize));
      lineV.setAttribute("y2", String(scaledSize));
      lineV.setAttribute("stroke-width", String(Math.min(Math.max(scale * 0.5, 0.3), 1)));
    }
  }
}

export function setGridSize(size: number): void {
  baseGridSize = size;
  refreshGrid();
}

export function setGridType(type: "none" | "dots" | "lines"): void {
  currentType = type;
  if (rectEl) {
    rectEl.setAttribute("display", type === "none" ? "none" : "block");
  }
  if (type !== "none") {
    refreshGrid();
  }
}

export function setGridColor(color: RgbaColor): void {
  currentColor = rgbaToString(color);
  refreshGrid();
}

export function setGridMinZoom(zoom: number): void {
  minZoom = zoom / 100;
  updateGrid(lastScale, lastTx, lastTy);
}

function refreshGrid(): void {
  if (!patternEl) return;
  buildPatternContent();
  updateGrid(lastScale, lastTx, lastTy);
}

export function destroyGrid(): void {
  defsEl?.remove();
  rectEl?.remove();
  patternEl = null;
  rectEl = null;
  defsEl = null;
  lastScale = 1;
  lastTx = 0;
  lastTy = 0;
}
