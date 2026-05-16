import { MouseEvent } from "react";

import { colord, RgbaColor } from "colord";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { MultilineText } from "twojs-multiline-text";
import { Rectangle } from "two.js/src/shapes/rectangle";
import { ColorHighlight, eventToClientPosition, isPointInRect } from "../canvas.utils";
import { useCanvasStore } from "../canvas.store";
import { getDoodler } from "../doodler.client";
import { pushCreateCommand, pushRemoveCommand } from "../history.service";
import { Doodle } from "../doodle.utils";

export interface TextState {
  fontSize: number;
  fontFamily: string;
  fillColor: RgbaColor;
  alignment: "left" | "center" | "right";
  leading: number;
  setFontSize: (fontSize: number) => void;
  setFontFamily: (fontFamily: string) => void;
  setFillColor: (fillColor: RgbaColor) => void;
  setAlignment: (alignment: "left" | "center" | "right") => void;
  setLeading: (leading: number) => void;
}

export const useTextStore = create<TextState>()(
  persist(
    (set) => ({
      fontSize: 24,
      fontFamily: "sans-serif",
      fillColor: { r: 33, g: 33, b: 33, a: 1 },
      alignment: "left" as const,
      leading: 1.3,
      setFontSize: (fontSize) => set(() => ({ fontSize })),
      setFontFamily: (fontFamily) => set(() => ({ fontFamily })),
      setFillColor: (fillColor) => set(() => ({ fillColor })),
      setAlignment: (alignment) => set(() => ({ alignment })),
      setLeading: (leading) => set(() => ({ leading })),
    }),
    { name: "text-tool", version: 1 }
  )
);

// ── Module state ───────────────────────────────────────────────────

let activeOverlay: HTMLDivElement | undefined;
let previewRect: Rectangle | undefined;
let editingDoodle: Doodle | undefined;
let isDragging = false;
let originClientX = 0;
let originClientY = 0;
let originSurfaceX = 0;
let originSurfaceY = 0;

const PADDING = 6;
const MIN_DRAG_SIZE = 20;

// ── Event handlers ─────────────────────────────────────────────────

function editExistingText(_e: MouseEvent<HTMLDivElement>, doodle: Doodle): void {
  const doodler = getDoodler();
  const textShape = doodle.shape as unknown as MultilineText;
  const scale = doodler.zui.scale;
  const color = colord(textShape.fill as string).toRgbString();

  // Hide the existing shape while editing
  textShape.visible = false;
  doodler.throttledTwoUpdate();
  editingDoodle = doodle;

  // Position overlay at the shape's screen position
  const bbox = (textShape as any).getBoundingClientRect(false);
  const hasFixedWidth = textShape.width !== Infinity && textShape.width > 0;

  const overlay = document.createElement("div");
  overlay.contentEditable = "true";
  overlay.innerText = textShape.value;
  overlay.style.position = "fixed";
  overlay.style.left = `${bbox.left}px`;
  overlay.style.top = `${bbox.top}px`;
  overlay.style.minWidth = `${bbox.width}px`;
  overlay.style.minHeight = `${bbox.height}px`;
  if (hasFixedWidth) {
    overlay.style.width = `${textShape.width * scale}px`;
  }
  overlay.style.fontSize = `${textShape.size * scale}px`;
  overlay.style.fontFamily = textShape.family;
  overlay.style.color = color;
  overlay.style.textAlign = textShape.alignment;
  overlay.style.background = "transparent";
  overlay.style.border = "1px solid #0ea5cf";
  overlay.style.outline = "none";
  overlay.style.lineHeight = `${textShape.leading}`;
  overlay.style.zIndex = "10000";
  overlay.style.whiteSpace = "pre-wrap";
  overlay.style.cursor = "text";
  overlay.style.padding = `${PADDING}px`;
  overlay.style.boxSizing = "border-box";

  activeOverlay = overlay;
  document.body.appendChild(overlay);

  overlay.addEventListener("mousedown", (ev) => ev.stopPropagation());
  requestAnimationFrame(() => {
    overlay.focus();
    // Select all text for easy replacement
    const range = document.createRange();
    range.selectNodeContents(overlay);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  });

  function commitEdit(): void {
    const value = (overlay.innerText || "").trim();
    if (value) {
      // Update the existing shape in place
      textShape.value = value;
      textShape.visible = true;
      doodler.throttledTwoUpdate();
    } else {
      // Empty text — remove the shape
      doodler.removeDoodle(doodle);
      pushRemoveCommand(doodle);
      doodler.throttledTwoUpdate();
    }
    editingDoodle = undefined;
    cleanup();
  }

  function cleanup(): void {
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    activeOverlay = undefined;
    // Make sure shape is visible if cleanup happens without commit
    if (editingDoodle) {
      textShape.visible = true;
      doodler.throttledTwoUpdate();
      editingDoodle = undefined;
    }
  }

  overlay.addEventListener("blur", () => commitEdit());

  overlay.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && !ev.shiftKey) {
      ev.preventDefault();
      overlay.blur();
    }
    if (ev.key === "Escape") {
      ev.preventDefault();
      // Cancel — restore original text
      textShape.visible = true;
      editingDoodle = undefined;
      doodler.throttledTwoUpdate();
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      activeOverlay = undefined;
    }
    ev.stopPropagation();
  });
}

export function doTextStart(e: MouseEvent<HTMLDivElement>): void {
  if (activeOverlay) return;
  e.preventDefault();

  const doodler = getDoodler();
  const clientPos = eventToClientPosition(e);
  const surfacePos = doodler.zui.clientToSurface(clientPos);

  // Check if clicking an existing text shape to edit it
  const { doodles } = useCanvasStore.getState();
  for (const doodle of doodles) {
    if (doodle.type !== "text") continue;
    if (!(doodle.shape as any).getBoundingClientRect) continue;
    const item = (doodle.shape as any).getBoundingClientRect(false);
    if (isPointInRect(clientPos.x, clientPos.y, item.left, item.top, item.right, item.bottom)) {
      editExistingText(e, doodle);
      return;
    }
  }

  originClientX = e.clientX;
  originClientY = e.clientY;
  originSurfaceX = surfacePos.x;
  originSurfaceY = surfacePos.y;
  isDragging = true;

  // Create preview rectangle on canvas
  const rect = doodler.two.makeRectangle(surfacePos.x, surfacePos.y, 0, 0) as unknown as Rectangle;
  rect.noFill();
  rect.stroke = ColorHighlight;
  rect.linewidth = 1.5 / doodler.zui.scale;
  doodler.highlights.add(rect);
  previewRect = rect;
}

export function doTextMove(e: MouseEvent<HTMLDivElement>): void {
  if (!isDragging || !previewRect) return;

  const doodler = getDoodler();
  const clientPos = eventToClientPosition(e);
  const surfacePos = doodler.zui.clientToSurface(clientPos);

  const w = surfacePos.x - originSurfaceX;
  const h = surfacePos.y - originSurfaceY;
  previewRect.width = Math.abs(w);
  previewRect.height = Math.abs(h);
  previewRect.translation.x = originSurfaceX + w / 2;
  previewRect.translation.y = originSurfaceY + h / 2;

  doodler.throttledTwoUpdate();
}

export function doTextUp(e: MouseEvent<HTMLDivElement>): void {
  if (!isDragging) return;
  isDragging = false;

  // Remove preview rectangle
  if (previewRect) {
    previewRect.remove();
    previewRect = undefined;
  }

  const doodler = getDoodler();
  const { fontSize, fontFamily, fillColor, alignment, leading } =
    useTextStore.getState();
  const scale = doodler.zui.scale;
  const color = colord(fillColor).toRgbString();

  // Compute dragged rectangle in client space
  const dragW = Math.abs(e.clientX - originClientX);
  const dragH = Math.abs(e.clientY - originClientY);
  const isFixedBounds = dragW >= MIN_DRAG_SIZE && dragH >= MIN_DRAG_SIZE;

  // Rectangle top-left in client space
  const rectLeft = Math.min(e.clientX, originClientX);
  const rectTop = Math.min(e.clientY, originClientY);

  // Surface-space rectangle for final text positioning
  const clientPos = eventToClientPosition(e);
  const surfaceEnd = doodler.zui.clientToSurface(clientPos);
  const surfaceLeft = Math.min(originSurfaceX, surfaceEnd.x);
  const surfaceTop = Math.min(originSurfaceY, surfaceEnd.y);
  const surfaceW = Math.abs(surfaceEnd.x - originSurfaceX);
  const surfaceH = Math.abs(surfaceEnd.y - originSurfaceY);

  // Create overlay
  const overlay = document.createElement("div");
  overlay.contentEditable = "true";
  overlay.style.position = "fixed";
  overlay.style.fontSize = `${fontSize * scale}px`;
  overlay.style.fontFamily = fontFamily;
  overlay.style.color = color;
  overlay.style.textAlign = alignment;
  overlay.style.background = "transparent";
  overlay.style.border = "1px solid #0ea5cf";
  overlay.style.outline = "none";
  overlay.style.lineHeight = `${leading}`;
  overlay.style.zIndex = "10000";
  overlay.style.whiteSpace = "pre-wrap";
  overlay.style.cursor = "text";
  overlay.style.padding = `${PADDING}px`;
  overlay.style.boxSizing = "border-box";

  if (isFixedBounds) {
    // Fixed-bounds mode: sized to dragged rectangle
    overlay.style.left = `${rectLeft}px`;
    overlay.style.top = `${rectTop}px`;
    overlay.style.width = `${dragW}px`;
    overlay.style.height = `${dragH}px`;
    overlay.style.overflow = "hidden";
  } else {
    // Auto-expanding mode: grows with content
    overlay.style.left = `${originClientX}px`;
    overlay.style.top = `${originClientY}px`;
    overlay.style.minWidth = "20px";
    overlay.style.minHeight = `${fontSize * scale + PADDING * 2}px`;
  }

  activeOverlay = overlay;
  document.body.appendChild(overlay);

  overlay.addEventListener("mousedown", (ev) => ev.stopPropagation());
  requestAnimationFrame(() => overlay.focus());

  function commitText(): void {
    const value = (overlay.innerText || "").trim();
    if (value) {
      let textX: number;
      let textY: number;

      const paddingSurface = PADDING / scale;

      if (isFixedBounds) {
        textX = surfaceLeft + surfaceW / 2;
        textY = surfaceTop + surfaceH / 2;
      } else {
        textX = originSurfaceX + paddingSurface;
        textY = originSurfaceY + paddingSurface + fontSize / 2;
      }

      const text = new MultilineText(value, textX, textY, {
        fill: color,
        stroke: "none",
        family: fontFamily,
        size: fontSize,
        alignment,
        baseline: "middle",
        leading,
        width: isFixedBounds ? surfaceW - 2 * paddingSurface : Infinity,
      });

      doodler.addDoodle({ shape: text, type: "text" });
      pushCreateCommand({ shape: text, type: "text" });
      doodler.throttledTwoUpdate();
    }
    cleanup();
  }

  function cleanup(): void {
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    activeOverlay = undefined;
  }

  overlay.addEventListener("blur", () => {
    commitText();
  });

  overlay.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && !ev.shiftKey) {
      ev.preventDefault();
      overlay.blur();
    }
    if (ev.key === "Escape") {
      ev.preventDefault();
      cleanup();
    }
    ev.stopPropagation();
  });
}
