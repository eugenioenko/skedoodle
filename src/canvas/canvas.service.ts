import { MouseEvent, TouchEvent } from "react";
import Two from "two.js";
import { ZUI } from "two.js/extras/jsm/zui";
import { Group } from "two.js/src/group";
import { Tool, useCanvasStore } from "./canvas.store";
import { doDragStart, doDragMove } from "./drag.tool";
import { doBrushMove, doBrushStart, doBrushUp } from "./brush.tool";
import { eventToGlobalPosition } from "./canvas.utils";
import { Circle } from "two.js/src/shapes/circle";
import { doWheelZoom } from "./zoom.tool";
import { doShapeMove, doShapeStart, doShapeUp } from "./shape.tool";

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

  if (selectedTool === "square") {
    doShapeStart(e);
    return;
  }
}

function doMouseMove(e: MouseEvent<HTMLDivElement>) {
  const { activeTool, setCursor, zui, two } = useCanvasStore.getState();
  const cursor = eventToGlobalPosition(e, zui);
  setCursor(cursor);

  const circle = window["circle"] as Circle;
  if (circle) {
    circle.position.set(cursor.x, cursor.y);
  }

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

  if (activeTool === "square") {
    doShapeMove(e);
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

  if (activeTool === "square") {
    doShapeUp();
    useCanvasStore.getState().setActiveTool(undefined);
    return;
  }
}

function doMouseOut(e: MouseEvent<HTMLDivElement>) {
  const { setCursor } = useCanvasStore.getState();
  setCursor(undefined);
}

function doMouseWheel(e: WheelEvent): void {
  e.preventDefault();
  const { zui } = ctx();

  if (e.ctrlKey) {
    doWheelZoom(e);
  } else {
    zui.translateSurface(-e.deltaX, -e.deltaY);
  }
}

function doTouchStart(e: TouchEvent<HTMLDivElement>) {}
function doTouchMove(e: TouchEvent<HTMLDivElement>) {}
function doTouchEnd(e: TouchEvent<HTMLDivElement>) {}

export const handlers = {
  doMouseWheel,
  doMouseDown,
  doMouseMove,
  doMouseUp,
  doMouseOut,
  doTouchStart,
  doTouchMove,
  doTouchEnd,
};
