import { MouseEvent } from "react";

import { colord, RgbaColor } from "colord";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Text } from "two.js/src/text";
import { eventToClientPosition } from "../canvas.utils";
import { getDoodler } from "../doodler.client";
import { pushCreateCommand } from "../history.service";

export interface TextState {
  fontSize: number;
  fontFamily: string;
  fillColor: RgbaColor;
  alignment: "left" | "center" | "right";
  setFontSize: (fontSize: number) => void;
  setFontFamily: (fontFamily: string) => void;
  setFillColor: (fillColor: RgbaColor) => void;
  setAlignment: (alignment: "left" | "center" | "right") => void;
}

export const useTextStore = create<TextState>()(
  persist(
    (set) => ({
      fontSize: 24,
      fontFamily: "sans-serif",
      fillColor: { r: 33, g: 33, b: 33, a: 1 },
      alignment: "left" as const,
      setFontSize: (fontSize) => set(() => ({ fontSize })),
      setFontFamily: (fontFamily) => set(() => ({ fontFamily })),
      setFillColor: (fillColor) => set(() => ({ fillColor })),
      setAlignment: (alignment) => set(() => ({ alignment })),
    }),
    { name: "text-tool", version: 1 }
  )
);

let activeOverlay: HTMLDivElement | undefined;

export function doTextStart(e: MouseEvent<HTMLDivElement>): void {
  // Don't create a new overlay if one is already active
  if (activeOverlay) return;

  // Prevent the canvas div (tabIndex=0) from stealing focus
  e.preventDefault();

  const doodler = getDoodler();
  const { fontSize, fontFamily, fillColor, alignment } =
    useTextStore.getState();

  const surfacePos = doodler.zui.clientToSurface(eventToClientPosition(e));
  const scale = doodler.zui.scale;
  const color = colord(fillColor).toRgbString();

  const overlay = document.createElement("div");
  overlay.contentEditable = "true";
  overlay.style.position = "fixed";
  overlay.style.left = `${e.clientX}px`;
  overlay.style.top = `${e.clientY}px`;
  overlay.style.fontSize = `${fontSize * scale}px`;
  overlay.style.fontFamily = fontFamily;
  overlay.style.color = color;
  overlay.style.textAlign = alignment;
  overlay.style.background = "transparent";
  overlay.style.border = "1px dashed #0ea5cf";
  overlay.style.outline = "none";
  overlay.style.minWidth = "60px";
  overlay.style.minHeight = `${(fontSize * scale) + 8}px`;
  overlay.style.lineHeight = "1.2";
  overlay.style.zIndex = "10000";
  overlay.style.whiteSpace = "pre-wrap";
  overlay.style.cursor = "text";

  activeOverlay = overlay;
  document.body.appendChild(overlay);

  // Prevent clicks on the overlay from triggering canvas mouse handlers
  overlay.addEventListener("mousedown", (ev) => ev.stopPropagation());

  // Defer focus to next frame so the browser finishes processing the mousedown
  requestAnimationFrame(() => overlay.focus());

  function commitText(): void {
    const value = (overlay.innerText || "").trim();
    if (value) {
      // Two.js Text uses center-based positioning (default baseline="middle").
      // Offset y by half the font size so the visual top aligns with the click point.
      const text = new Text(value, surfacePos.x, surfacePos.y + fontSize / 2);
      text.fill = color;
      text.noStroke();
      text.family = fontFamily;
      text.size = fontSize;
      text.alignment = alignment;

      doodler.addDoodle({ shape: text, type: "text" });
      pushCreateCommand("Add text", { shape: text, type: "text" });
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
    // Stop propagation so canvas shortcuts don't fire
    ev.stopPropagation();
  });
}
