import Two from "two.js";
import { colord, RgbaColor } from "colord";
import { Doodle } from "./doodle.utils";

export interface ExportBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ExportOptions {
  doodles: Doodle[];
  padding: number;
  background: RgbaColor;
  transparent: boolean;
  filename: string;
}

export interface ExportPngOptions extends ExportOptions {
  scale: 1 | 2 | 3;
}

const FALLBACK_BOUNDS: ExportBounds = { x: 0, y: 0, width: 100, height: 100 };
const PNG_MAX_DIMENSION = 8192;

export function getExportBounds(
  doodles: Doodle[],
  padding: number
): ExportBounds | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const doodle of doodles) {
    const shape = doodle.shape as any;
    if (shape.isHighlight) continue;
    if (typeof shape.getBoundingClientRect !== "function") continue;
    const box = shape.getBoundingClientRect(true);
    if (!box) continue;
    if (!isFinite(box.left) || !isFinite(box.top)) continue;
    minX = Math.min(minX, box.left);
    minY = Math.min(minY, box.top);
    maxX = Math.max(maxX, box.right);
    maxY = Math.max(maxY, box.bottom);
  }

  if (!isFinite(minX)) return null;

  const p = Math.max(0, padding);
  return {
    x: minX - p,
    y: minY - p,
    width: maxX - minX + 2 * p,
    height: maxY - minY + 2 * p,
  };
}

export function exportSVG(opts: ExportOptions): void {
  const bounds = getExportBounds(opts.doodles, opts.padding) ?? FALLBACK_BOUNDS;

  const two = new Two({
    type: Two.Types.svg,
    width: Math.ceil(bounds.width),
    height: Math.ceil(bounds.height),
  });

  buildScene(two, opts.doodles, bounds, opts, 1);
  two.update();

  const svgEl = two.renderer.domElement as SVGElement;
  const svgString = new XMLSerializer().serializeToString(svgEl);
  const blob = new Blob([svgString], { type: "image/svg+xml" });
  downloadBlob(blob, opts.filename);
}

export function exportPNG(opts: ExportPngOptions): void {
  const bounds = getExportBounds(opts.doodles, opts.padding) ?? FALLBACK_BOUNDS;

  let scale = opts.scale;
  const longestSide = Math.max(bounds.width, bounds.height);
  if (longestSide * scale > PNG_MAX_DIMENSION) {
    scale = Math.max(1, Math.floor(PNG_MAX_DIMENSION / longestSide)) as 1 | 2 | 3;
  }

  const two = new Two({
    type: Two.Types.canvas,
    width: Math.ceil(bounds.width * scale),
    height: Math.ceil(bounds.height * scale),
  });

  buildScene(two, opts.doodles, bounds, opts, scale);
  two.update();

  const canvasEl = two.renderer.domElement as HTMLCanvasElement;
  canvasEl.toBlob((blob) => {
    if (blob) downloadBlob(blob, opts.filename);
  }, "image/png");
}

function buildScene(
  two: Two,
  doodles: Doodle[],
  bounds: ExportBounds,
  opts: ExportOptions,
  scale: number
): void {
  const w = bounds.width * scale;
  const h = bounds.height * scale;

  if (!opts.transparent) {
    const bg = two.makeRectangle(w / 2, h / 2, w, h);
    bg.fill = colord(opts.background).toRgbString();
    bg.noStroke();
  }

  const group = two.makeGroup();
  for (const doodle of doodles) {
    const shape = doodle.shape as any;
    if (shape.isHighlight) continue;
    if (typeof shape.clone !== "function") continue;
    const cloned = shape.clone();
    group.add(cloned);
  }
  group.translation.set(-bounds.x * scale, -bounds.y * scale);
  if (scale !== 1) {
    group.scale = scale;
  }
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function buildExportFilename(
  name: string | undefined,
  format: "svg" | "png"
): string {
  const base = sanitizeFilename(name?.trim() || "skedoodle");
  return `${base}.${format}`;
}

function sanitizeFilename(name: string): string {
  return name.replace(/\s+/g, "_").replace(/[^A-Za-z0-9._-]/g, "") || "skedoodle";
}
