import { RgbaColor } from "colord";
import Two from "two.js";

const SVG_NS = "http://www.w3.org/2000/svg";

// SVG-specific state
let patternEl: SVGPatternElement | null = null;
let rectEl: SVGRectElement | null = null;
let defsEl: SVGDefsElement | null = null;

// Canvas-specific state
let canvasElement: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let twoInstance: Two | null = null;
let rafId: number | null = null;

// Shared state
let baseGridSize = 20;
let currentType: "none" | "dots" | "lines" = "dots";
let currentColor = "rgba(0,0,0,0.15)";
let minZoom = 0.5;
let lastScale = 1;
let lastTx = 0;
let lastTy = 0;
let rendererType: "svg" | "canvas" = "svg";

function rgbaToString(color: RgbaColor): string {
  return `rgba(${color.r},${color.g},${color.b},${color.a})`;
}

// ===== SVG Implementation =====

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

function initSVGGrid(
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

function updateSVGGrid(scale: number, tx: number, ty: number): void {
  if (!patternEl || !rectEl) return;

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

function refreshSVGGrid(): void {
  if (!patternEl) return;
  buildPatternContent();
  updateSVGGrid(lastScale, lastTx, lastTy);
}

function destroySVGGrid(): void {
  defsEl?.remove();
  rectEl?.remove();
  patternEl = null;
  rectEl = null;
  defsEl = null;
}

// ===== Canvas Implementation =====

function drawCanvasGrid(): void {
  if (!ctx || !canvasElement) {
    return;
  }

  const width = canvasElement.width;
  const height = canvasElement.height;

  // Always clear the canvas first
  ctx.clearRect(0, 0, width, height);

  // Return early if grid should not be drawn
  if (currentType === "none" || lastScale < minZoom) {
    return;
  }

  const scaledSize = baseGridSize * lastScale;

  ctx.save();
  ctx.fillStyle = currentColor;
  ctx.strokeStyle = currentColor;

  // Calculate grid offset based on translation
  const offsetX = lastTx % scaledSize;
  const offsetY = lastTy % scaledSize;

  if (currentType === "dots") {
    const radius = Math.min(Math.max(lastScale, 0.5), 2);

    for (let x = offsetX; x < width; x += scaledSize) {
      for (let y = offsetY; y < height; y += scaledSize) {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else {
    const lineWidth = Math.min(Math.max(lastScale * 0.5, 0.3), 1);
    ctx.lineWidth = lineWidth;
    ctx.beginPath();

    // Draw vertical lines
    for (let x = offsetX; x < width; x += scaledSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }

    // Draw horizontal lines
    for (let y = offsetY; y < height; y += scaledSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }

    ctx.stroke();
  }

  ctx.restore();
}

function initCanvasGrid(
  container: HTMLDivElement,
  two: Two,
  gridSize: number,
  gridType: "none" | "dots" | "lines",
  gridColor: RgbaColor,
  gridMinZoom: number
): void {
  baseGridSize = gridSize;
  currentType = gridType;
  currentColor = rgbaToString(gridColor);
  minZoom = gridMinZoom / 100;
  twoInstance = two;

  // Create a canvas element for the grid
  canvasElement = document.createElement("canvas");
  canvasElement.style.position = "absolute";
  canvasElement.style.top = "0";
  canvasElement.style.left = "0";
  canvasElement.style.pointerEvents = "none";
  canvasElement.style.zIndex = "0";

  ctx = canvasElement.getContext("2d");

  // Size the canvas to match container
  const resizeCanvas = () => {
    if (canvasElement && container) {
      canvasElement.width = container.clientWidth;
      canvasElement.height = container.clientHeight;
      drawCanvasGrid();
    }
  };

  resizeCanvas();

  // Insert canvas as first child so it's behind the Two.js canvas
  container.insertBefore(canvasElement, container.firstChild);

  // Add resize observer
  const resizeObserver = new ResizeObserver(resizeCanvas);
  resizeObserver.observe(container);

  // Store observer for cleanup
  (canvasElement as any)._resizeObserver = resizeObserver;

  // Bind to Two.js update cycle
  if (twoInstance) {
    twoInstance.bind("update", drawCanvasGrid);
  }

  // Initial draw with default values
  updateCanvasGrid(1, 0, 0);
}

function updateCanvasGrid(_scale: number, _tx: number, _ty: number): void {
  // Draw immediately for smooth updates
  drawCanvasGrid();
}

function destroyCanvasGrid(): void {
  if (twoInstance) {
    twoInstance.unbind("update", drawCanvasGrid);
  }

  if (canvasElement) {
    const observer = (canvasElement as any)._resizeObserver;
    if (observer) {
      observer.disconnect();
    }
    canvasElement.remove();
  }

  if (rafId) {
    cancelAnimationFrame(rafId);
  }

  canvasElement = null;
  ctx = null;
  twoInstance = null;
  rafId = null;
}

// ===== Public API (renderer-agnostic) =====

export function initGrid(
  containerOrSvg: HTMLDivElement | SVGSVGElement,
  twoOrGridSize: Two | number,
  gridSizeOrType: number | "none" | "dots" | "lines",
  gridTypeOrColor: "none" | "dots" | "lines" | RgbaColor,
  gridColorOrMinZoom: RgbaColor | number,
  gridMinZoom?: number
): void {
  // Detect if this is SVG mode (old signature) or Canvas mode (new signature)
  if (containerOrSvg instanceof SVGSVGElement) {
    // SVG mode: initGrid(svgElement, gridSize, gridType, gridColor, gridMinZoom)
    rendererType = "svg";
    initSVGGrid(
      containerOrSvg,
      twoOrGridSize as number,
      gridSizeOrType as "none" | "dots" | "lines",
      gridTypeOrColor as RgbaColor,
      gridColorOrMinZoom as number
    );
  } else {
    // Canvas mode: initGrid(container, two, gridSize, gridType, gridColor, gridMinZoom)
    rendererType = "canvas";
    initCanvasGrid(
      containerOrSvg,
      twoOrGridSize as Two,
      gridSizeOrType as number,
      gridTypeOrColor as "none" | "dots" | "lines",
      gridColorOrMinZoom as RgbaColor,
      gridMinZoom!
    );
  }
}

export function updateGrid(scale: number, tx: number, ty: number): void {
  lastScale = scale;
  lastTx = tx;
  lastTy = ty;

  if (rendererType === "svg") {
    updateSVGGrid(scale, tx, ty);
  } else {
    updateCanvasGrid(scale, tx, ty);
  }
}

export function setGridSize(size: number): void {
  baseGridSize = size;
  if (rendererType === "svg") {
    refreshSVGGrid();
  } else {
    drawCanvasGrid();
  }
}

export function setGridType(type: "none" | "dots" | "lines"): void {
  currentType = type;
  if (rendererType === "svg") {
    if (rectEl) {
      rectEl.setAttribute("display", type === "none" ? "none" : "block");
    }
    if (type !== "none") {
      refreshSVGGrid();
    }
  } else {
    drawCanvasGrid();
  }
}

export function setGridColor(color: RgbaColor): void {
  currentColor = rgbaToString(color);
  if (rendererType === "svg") {
    refreshSVGGrid();
  } else {
    drawCanvasGrid();
  }
}

export function setGridMinZoom(zoom: number): void {
  minZoom = zoom / 100;
  if (rendererType === "svg") {
    updateSVGGrid(lastScale, lastTx, lastTy);
  } else {
    drawCanvasGrid();
  }
}

export function destroyGrid(): void {
  if (rendererType === "svg") {
    destroySVGGrid();
  } else {
    destroyCanvasGrid();
  }

  // Reset shared state
  lastScale = 1;
  lastTx = 0;
  lastTy = 0;
}
