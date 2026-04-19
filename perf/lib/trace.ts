import { readFile } from "node:fs/promises";
import type { Page } from "@playwright/test";

export type TraceEventType = "down" | "move" | "up";

export interface TraceEvent {
  /** ms since trace start. */
  t: number;
  /** normalized [0, 1] within the canvas box. */
  x: number;
  y: number;
  type: TraceEventType;
}

export interface CanvasBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function loadTrace(path: string): Promise<TraceEvent[]> {
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw) as TraceEvent[];
}

/**
 * Replay a trace against a page by dispatching mouse events on wall-clock
 * time. Normalized (x,y) are mapped into the given canvas box.
 *
 * Returns when the final event has been dispatched. The caller controls
 * what's sampled during replay.
 */
export async function replayTrace(
  page: Page,
  canvas: CanvasBox,
  trace: TraceEvent[],
): Promise<void> {
  const start = Date.now();
  for (const ev of trace) {
    const target = start + ev.t;
    const delay = target - Date.now();
    if (delay > 0) await new Promise((r) => setTimeout(r, delay));

    const x = canvas.x + ev.x * canvas.width;
    const y = canvas.y + ev.y * canvas.height;

    if (ev.type === "down") {
      await page.mouse.move(x, y);
      await page.mouse.down();
    } else if (ev.type === "up") {
      await page.mouse.move(x, y);
      await page.mouse.up();
    } else {
      await page.mouse.move(x, y);
    }
  }
}

export function traceDurationMs(trace: TraceEvent[]): number {
  return trace.length === 0 ? 0 : trace[trace.length - 1].t;
}

/**
 * A canvas box centered in the current viewport, occupying `frac` of each
 * axis. At frac=0.5 the box is half the viewport, centered — safely inside
 * every app's drawing area regardless of per-app toolbars.
 */
export function viewportCenteredBox(
  page: Page,
  frac = 0.5,
): CanvasBox {
  const vp = page.viewportSize();
  if (!vp) throw new Error("page has no viewport");
  const width = vp.width * frac;
  const height = vp.height * frac;
  return {
    x: (vp.width - width) / 2,
    y: (vp.height - height) / 2,
    width,
    height,
  };
}
