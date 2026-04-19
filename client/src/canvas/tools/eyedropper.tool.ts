import { MouseEvent } from "react";
import { colord, RgbaColor } from "colord";
import { useCanvasStore, useOptionsStore, Tool } from "../canvas.store";
import { eventToClientPosition, isPointInRect } from "../canvas.utils";
import { useBrushStore } from "./brush.tool";
import { useSquareStore } from "./square.tool";
import { useBezierStore } from "./bezier.tool";
import { useLineStore } from "./line.tool";
import { useTextStore } from "./text.tool";

interface SampledColors {
  stroke?: RgbaColor;
  fill?: RgbaColor;
}

function sampleShape(shape: any): SampledColors {
  const result: SampledColors = {};
  if (shape.stroke && shape.stroke !== "none") {
    result.stroke = colord(shape.stroke as string).toRgb();
  }
  if (shape.fill && shape.fill !== "none") {
    result.fill = colord(shape.fill as string).toRgb();
  }
  return result;
}

// For tools with a single color slot, prefer the source's fill (the visible
// area the user is most likely aiming at) and fall back to stroke when the
// source has no fill. Alt inverts: take stroke even when fill exists.
function pickSingleSlot(sampled: SampledColors, altKey: boolean): RgbaColor | undefined {
  if (altKey && sampled.stroke) return sampled.stroke;
  return sampled.fill ?? sampled.stroke;
}

function applyToTool(tool: Tool, sampled: SampledColors, altKey: boolean): void {
  switch (tool) {
    case "brush": {
      const color = pickSingleSlot(sampled, altKey);
      if (color) useBrushStore.getState().setStrokeColor(color);
      break;
    }
    case "square":
    case "ellipse":
      if (sampled.stroke) useSquareStore.getState().setStrokeColor(sampled.stroke);
      if (sampled.fill) useSquareStore.getState().setFillColor(sampled.fill);
      break;
    case "bezier":
      if (sampled.stroke) useBezierStore.getState().setStrokeColor(sampled.stroke);
      if (sampled.fill) useBezierStore.getState().setFillColor(sampled.fill);
      break;
    case "line":
    case "arrow": {
      const color = pickSingleSlot(sampled, altKey);
      if (color) useLineStore.getState().setStrokeColor(color);
      break;
    }
    case "text": {
      const color = pickSingleSlot(sampled, altKey);
      if (color) useTextStore.getState().setFillColor(color);
      break;
    }
  }
}

export function doEyedropperPick(e: MouseEvent<HTMLDivElement>): void {
  const { doodles } = useCanvasStore.getState();
  const pointer = eventToClientPosition(e);

  for (const doodle of doodles) {
    const shape: any = doodle.shape;
    if (shape.isHighlight) continue;
    if (!shape.getBoundingClientRect) continue;
    const item = shape.getBoundingClientRect(false);
    if (!isPointInRect(pointer.x, pointer.y, item.left, item.top, item.right, item.bottom)) {
      continue;
    }

    const sampled = sampleShape(shape);
    if (!sampled.stroke && !sampled.fill) return;

    const {
      syncColors,
      setGlobalStrokeColor,
      setGlobalFillColor,
      restoreTool,
    } = useOptionsStore.getState();

    if (syncColors) {
      if (sampled.stroke) setGlobalStrokeColor(sampled.stroke);
      if (sampled.fill) setGlobalFillColor(sampled.fill);
    } else if (restoreTool) {
      applyToTool(restoreTool, sampled, e.altKey);
    }
    return;
  }
}
