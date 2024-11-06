import { MouseEvent } from "react";
import { useCanvasStore } from "./canvas.store";
import { Coordinates } from "./canvas.service";
import { ZUI } from "two.js/extras/jsm/zui";
import { RgbaColor } from "react-colorful";

export function eventToGlobalPosition(
  e: MouseEvent<HTMLDivElement>,
  zui?: ZUI
): Coordinates {
  zui = zui || (useCanvasStore.getState().zui as ZUI);
  const rect = e.currentTarget.getBoundingClientRect();
  const position = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
  return zui.clientToSurface(position);
}

export function mouseEventToPosition(e: MouseEvent<HTMLDivElement>): {
  x: number;
  y: number;
} {
  const rect = e.currentTarget.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
}

export function debounce(func: (...args: unknown[]) => void, delay: number) {
  let timeout: NodeJS.Timeout;
  return (...args: unknown[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
}

export function colorToRgbaString(color?: RgbaColor): string {
  if (!color) {
    return "rgba(0,0,0,1)";
  }
  return `rgba(${color.r},${color.g},${color.b},${color.a})`;
}

export function isPointInRect(
  x: number,
  y: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
) {
  return x >= x1 && x <= x2 && y >= y1 && y <= y2;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function truncateToDecimals(num: number, decimals: number) {
  const factor = Math.pow(10, decimals);
  return Math.floor(num * factor) / factor;
}

export function radiansToDegrees(radians: number): number {
  return (radians * (180 / Math.PI)) % 360;
}

export function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}
