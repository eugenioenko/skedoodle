import { Point } from "@/models/point.model";
import { MouseEvent, TouchEvent } from "react";
import { BoundingBox } from "two.js";
import { ZUI } from "two.js/extras/jsm/zui";
import { getDoodler } from "./doodle.service";

export const ColorHighlight = "#0ea5cf";

export enum MouseButton {
  Left = 0,
  Middle = 1,
  Right = 2,
}

export function eventToSurfacePosition(
  e: MouseEvent<HTMLDivElement>,
  zui?: ZUI
): Point {
  zui = zui || getDoodler().zui;
  const rect = e.currentTarget.getBoundingClientRect();
  const position = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
  return zui.clientToSurface(position);
}

export function eventToClientPosition(e: MouseEvent<HTMLDivElement>): Point {
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

export function isPointInBoundingBox(
  point: { x: number; y: number },
  box: BoundingBox
): boolean {
  return isPointInRect(
    point.x,
    point.y,
    box.left,
    box.top,
    box.right,
    box.bottom
  );
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

export function touchEventToMouseEvent(
  e: TouchEvent<HTMLDivElement>
): MouseEvent<HTMLDivElement> {
  const event = e as unknown as MouseEvent<HTMLDivElement>;
  const touches = e.touches?.[0] ||
    e.changedTouches?.[0] || { clientX: 0, clientY: 0 };
  event.clientX = touches.clientX;
  event.clientY = touches.clientY;
  return event;
}
