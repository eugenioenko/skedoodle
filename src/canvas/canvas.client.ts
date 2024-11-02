import { MouseEvent, WheelEvent } from "react";
import Two from "two.js";
import { ZUI } from "two.js/extras/jsm/zui";
import { Group } from "two.js/src/group";
import { Tool, useCanvasStore } from "./canvas.store";
import { doDragStart, doDragMove } from "./drag.tool";
import { doBrushMove, doBrushStart, doBrushUp } from "./brush.tool";

interface Context {
  two: Two;
  canvas: Group;
  zui: ZUI;
  selectedTool?: Tool;
  activeTool?: Tool;
}

export const ctx = (): Context => ({
  two: useCanvasStore.getState().two as Two,
  canvas: useCanvasStore.getState().canvas as Group,
  zui: useCanvasStore.getState().zui as ZUI,
  selectedTool: useCanvasStore.getState().selectedTool,
  activeTool: useCanvasStore.getState().activeTool,
});

function doMouseWheel(e: WheelEvent<HTMLDivElement>): void {
  const { zui } = ctx();
  var dy = -e.deltaY / 1000;
  zui.zoomBy(dy, e.clientX, e.clientY);
}

function doMouseDown(e: MouseEvent<HTMLDivElement>) {
  console.log(e.clientX);
  const selectedTool = useCanvasStore.getState().selectedTool || "hand";
  useCanvasStore.getState().setActiveTool(selectedTool);

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
  const activeTool = useCanvasStore.getState().activeTool;
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

export const handlers = {
  doMouseWheel,
  doMouseDown,
  doMouseMove,
  doMouseUp,
};
