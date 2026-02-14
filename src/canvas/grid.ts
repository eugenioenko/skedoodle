const SVG_NS = "http://www.w3.org/2000/svg";

let patternEl: SVGPatternElement | null = null;
let circleEl: SVGCircleElement | null = null;
let rectEl: SVGRectElement | null = null;
let defsEl: SVGDefsElement | null = null;
let baseGridSize = 20;

export function initGrid(svgElement: SVGSVGElement, gridSize: number): void {
  baseGridSize = gridSize;

  defsEl = document.createElementNS(SVG_NS, "defs");

  patternEl = document.createElementNS(SVG_NS, "pattern");
  patternEl.setAttribute("id", "dot-grid-pattern");
  patternEl.setAttribute("patternUnits", "userSpaceOnUse");
  patternEl.setAttribute("width", String(gridSize));
  patternEl.setAttribute("height", String(gridSize));

  circleEl = document.createElementNS(SVG_NS, "circle");
  circleEl.setAttribute("cx", String(gridSize / 2));
  circleEl.setAttribute("cy", String(gridSize / 2));
  circleEl.setAttribute("r", "1");
  circleEl.setAttribute("fill", "rgba(0,0,0,0.3)");

  patternEl.appendChild(circleEl);
  defsEl.appendChild(patternEl);

  rectEl = document.createElementNS(SVG_NS, "rect");
  rectEl.setAttribute("id", "dot-grid-rect");
  rectEl.setAttribute("width", "100%");
  rectEl.setAttribute("height", "100%");
  rectEl.setAttribute("fill", "url(#dot-grid-pattern)");

  // Insert defs at the top, rect before the canvas group
  svgElement.insertBefore(defsEl, svgElement.firstChild);
  svgElement.insertBefore(rectEl, defsEl.nextSibling);
}

export function updateGrid(surfaceMatrix: { elements: number[] }): void {
  if (!patternEl || !circleEl) return;

  const scale = surfaceMatrix.elements[0];
  const tx = surfaceMatrix.elements[2];
  const ty = surfaceMatrix.elements[5];
  const scaledSize = baseGridSize * scale;

  patternEl.setAttribute("x", String(tx % scaledSize));
  patternEl.setAttribute("y", String(ty % scaledSize));
  patternEl.setAttribute("width", String(scaledSize));
  patternEl.setAttribute("height", String(scaledSize));

  circleEl.setAttribute("cx", String(scaledSize / 2));
  circleEl.setAttribute("cy", String(scaledSize / 2));
  circleEl.setAttribute("r", String(Math.min(Math.max(scale, 0.5), 2)));
}

export function showGrid(visible: boolean): void {
  if (rectEl) {
    rectEl.setAttribute("display", visible ? "block" : "none");
  }
}

export function setGridSize(size: number): void {
  baseGridSize = size;
}

export function destroyGrid(): void {
  defsEl?.remove();
  rectEl?.remove();
  patternEl = null;
  circleEl = null;
  rectEl = null;
  defsEl = null;
}
