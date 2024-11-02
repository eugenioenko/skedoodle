import { MouseEvent, WheelEvent } from "react";
import Two from "two.js";
import { ZUI } from "two.js/extras/jsm/zui";
import { Group } from "two.js/src/group";
import { Tool, useCanvasStore } from "./canvas.store";
import { doDragStart, doDragMove } from "./drag.tool";
import { doBrushMove, doBrushStart, doBrushUp } from "./brush.tool";
import { eventToGlobalPosition } from "./canvas.utils";

export interface Coordinates {
  x: number;
  y: number;
}

interface Context {
  two: Two;
  canvas: Group;
  zui: ZUI;
  selectedTool?: Tool;
  activeTool?: Tool;
  cursor?: Coordinates;
}

export const ctx = (): Context => {
  const state = useCanvasStore.getState();
  return {
    two: state.two as Two,
    canvas: state.canvas as Group,
    zui: state.zui as ZUI,
    selectedTool: state.selectedTool,
    activeTool: state.activeTool,
    cursor: state.cursor,
  };
};

function doMouseWheel(e: WheelEvent<HTMLDivElement>): void {
  const { zui } = ctx();
  var dy = -e.deltaY / 1000;
  zui.zoomBy(dy, e.clientX, e.clientY);
}

function doMouseDown(e: MouseEvent<HTMLDivElement>) {
  const { selectedTool, setActiveTool } = useCanvasStore.getState();

  setActiveTool(selectedTool || "hand");

  if (selectedTool === "hand") {
    doDragStart(e);
    return;
  }

  if (selectedTool === "brush") {
    doBrushStart(e);
    return;
  }
}

function doMouseMove(e: MouseEvent<HTMLDivElement>) {
  const { activeTool, setCursor, zui } = useCanvasStore.getState();
  setCursor(eventToGlobalPosition(e, zui));

  if (!activeTool) {
    return;
  }

  if (activeTool === "hand") {
    doDragMove(e);
    return;
  }

  if (activeTool === "brush") {
    doBrushMove(e);
    return;
  }
}

function doMouseUp(e: MouseEvent<HTMLDivElement>) {
  const activeTool = useCanvasStore.getState().activeTool;
  if (!activeTool) {
    return;
  }

  if (activeTool === "hand") {
    useCanvasStore.getState().setActiveTool(undefined);
  }

  if (activeTool === "brush") {
    doBrushUp(e);
    useCanvasStore.getState().setActiveTool(undefined);
    return;
  }
}

function doMouseOut(e: MouseEvent<HTMLDivElement>) {
  const { setCursor } = useCanvasStore.getState();
  setCursor(undefined);
}

export const handlers = {
  doMouseWheel,
  doMouseDown,
  doMouseMove,
  doMouseUp,
  doMouseOut,
};
